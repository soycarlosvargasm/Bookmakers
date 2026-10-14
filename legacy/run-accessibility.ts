import { AccessibilityDiscoveryEngine, ACCESSIBILITY_STATUSES, type AccessibilityReport } from "./accessibility/discovery.js";
import { DEFAULT_ACCESSIBILITY_PROFILE } from "./accessibility/extractor.js";
import type { NormalizedRecord, RawPayloadInput } from "./normalization/types.js";
import { SupabaseManagementDiscoveryRepository } from "./storage/supabase-management.js";

class CaptureBuffer {
  readonly rawPayloads: RawPayloadInput[] = [];
  readonly records: NormalizedRecord[] = [];
  async saveRawPayload(payload: RawPayloadInput): Promise<void> { this.rawPayloads.push(payload); }
  async saveNormalizedRecords(records: NormalizedRecord[]): Promise<void> { this.records.push(...records); }
  clear(): void { this.rawPayloads.length = 0; this.records.length = 0; }
}

const repository = await SupabaseManagementDiscoveryRepository.fromLinkedProject();
const before = await repository.accessibilityCounts();
const requested = process.env.ACCESSIBILITY_DOMAINS?.split(",").map((value) => value.trim()).filter(Boolean);
const sources = requested?.length ? await repository.sourcesForDomains(requested) : await repository.sourcesForAccessibilityFallback();
if (!sources.length) throw new Error("No domains reached the Accessibility fallback");
if (requested?.length) {
  const found = new Set(sources.map((source) => source.domain.replace(/^www\./, "")));
  const missing = requested.filter((domain) => !found.has(domain.replace(/^www\./, "")));
  if (missing.length) throw new Error(`Requested domains absent from source registry: ${missing.join(", ")}`);
}
const buffer = new CaptureBuffer();
const engine = new AccessibilityDiscoveryEngine(buffer, { timeoutMs: Number(process.env.ACCESSIBILITY_TIMEOUT_MS ?? 20_000), renderWaitMs: Number(process.env.ACCESSIBILITY_RENDER_WAIT_MS ?? 1_200), maxScrolls: Number(process.env.ACCESSIBILITY_MAX_SCROLLS ?? 4) });
const reports: AccessibilityReport[] = [];
console.log(JSON.stringify({ accessibility: "before", counts: before, domains: sources.map((source) => source.domain) }));
try {
  for (const source of sources) {
    const savedProfile = await repository.getAccessibilityProfile(source.domain);
    const profile = savedProfile?.version === DEFAULT_ACCESSIBILITY_PROFILE.version ? savedProfile : DEFAULT_ACCESSIBILITY_PROFILE;
    const report = await engine.discover(source, profile);
    await repository.saveAccessibilityDiscovery(source, report, profile, buffer.rawPayloads, buffer.records);
    buffer.clear();
    reports.push(report);
    console.log(JSON.stringify({ accessibility: "domain", domain: source.domain, status: report.status, nodes: report.nodeCount, relevantNodes: report.extraction.relevantNodes, eventCandidates: report.extraction.eventCandidates, oddsCandidates: report.extraction.oddsCandidates, excludedIllustrative: report.extraction.excludedIllustrative, observations: report.normalizedRecords, error: report.error ?? null }));
  }
} finally { await engine.close(); }
const after = await repository.accessibilityCounts();
console.log(JSON.stringify({ accessibility: "finished", before, after, statuses: Object.fromEntries(ACCESSIBILITY_STATUSES.map((status) => [status, reports.filter((report) => report.status === status).length])) }));
