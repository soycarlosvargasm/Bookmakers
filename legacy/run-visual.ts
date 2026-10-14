import { VisualDiscoveryEngine } from "./visual/discovery.js";
import { ACTION_PROFILE, INSPECTION_PROFILE } from "./visual/extractor.js";
import type { NormalizedRecord, RawPayloadInput } from "./normalization/types.js";
import { SupabaseManagementDiscoveryRepository } from "./storage/supabase-management.js";

class CaptureBuffer {
  readonly rawPayloads: RawPayloadInput[] = [];
  readonly records: NormalizedRecord[] = [];
  async saveRawPayload(value: RawPayloadInput): Promise<void> { this.rawPayloads.push(value); }
  async saveNormalizedRecords(values: NormalizedRecord[]): Promise<void> { this.records.push(...values); }
  clear(): void { this.rawPayloads.length = 0; this.records.length = 0; }
}

const repository = await SupabaseManagementDiscoveryRepository.fromLinkedProject();
const before = await repository.visualCounts();
const requested = process.env.VISUAL_DOMAINS?.split(",").map((value) => value.trim().replace(/^www\./, "")).filter(Boolean);
const urls = ["https://www.actionnetwork.com/nfl/odds", "https://esportsinsider.com/betting-odds/r6"].filter((url) => !requested?.length || requested.includes(new URL(url).hostname.replace(/^www\./, "")));
if (!urls.length) throw new Error("No requested Visual Collector domains are configured");
console.log(JSON.stringify({ visual: "before", counts: before }));
const buffer = new CaptureBuffer();
const engine = new VisualDiscoveryEngine(buffer);
try {
  for (const url of urls) {
    const source = await repository.sourceForExactUrl(url);
    if (!source) throw new Error(`Catalog URL absent from linked Supabase source registry: ${url}`);
    const defaultProfile = source.domain.replace(/^www\./, "") === "actionnetwork.com" ? ACTION_PROFILE : INSPECTION_PROFILE;
    const savedProfile = await repository.getVisualProfile(source.domain);
    const profile = savedProfile?.version === defaultProfile.version ? savedProfile : defaultProfile;
    const report = await engine.discover(source, profile);
    await repository.saveVisualDiscovery(source, report, profile, buffer.rawPayloads, buffer.records);
    console.log(JSON.stringify({ visual: "domain", domain: source.domain, status: report.status, pages: report.pages, screenshotRegions: report.screenshotRegions, eventRegions: report.extraction.eventRegions, marketRegions: report.extraction.marketRegions, selectionCandidates: report.extraction.selectionCandidates, oddsCandidates: report.extraction.oddsCandidates, completeMarkets: report.extraction.completeMarkets, accepted: report.extraction.accepted, rejected: report.extraction.rejected, primaryRejection: report.extraction.primaryRejection, rawSaved: report.rawSaved, error: report.error ?? null, counts: await repository.visualCounts() }));
    buffer.clear();
  }
} finally { await engine.close(); }
console.log(JSON.stringify({ visual: "finished", before, after: await repository.visualCounts() }));
