import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { PoolClient } from "pg";
import { saveRecordBatch } from "./batch.js";
import { sanitizeRawPayload } from "../collectors/raw-policy.js";
import type { NormalizedRecord, RawPayloadInput } from "../normalization/types.js";
import type { DomDiscoveryReport } from "../dom/discovery.js";
import type { DomProfile } from "../dom/extractor.js";
import type { AccessibilityReport } from "../accessibility/discovery.js";
import type { AccessibilityProfile } from "../accessibility/extractor.js";
import type { VisualReport } from "../visual/discovery.js";
import { parseVisualProfile, type VisualProfile } from "../visual/extractor.js";
import type { CatalogRow, RegistryUrl } from "../sources/registry.js";

const execFileAsync = promisify(execFile);
const QUERY_TIMEOUT_MS = 90_000;

function jsonLiteral(value: unknown): string {
  const text = JSON.stringify(value);
  let tag = "codex_json";
  while (text.includes(`$${tag}$`)) tag += "_x";
  return `$${tag}$${text}$${tag}$::jsonb`;
}

function textLiteral(value: string): string {
  let tag = "codex_text";
  while (value.includes(`$${tag}$`)) tag += "_x";
  return `$${tag}$${value}$${tag}$`;
}

/**
 * Local authenticated fallback for linked Supabase projects. The CLI keeps
 * its access token in its own secure credential store; no database password
 * or API key is copied into this process or written to disk.
 */
export class SupabaseManagementDiscoveryRepository {
  private constructor(private readonly projectRef: string) {}

  static async fromLinkedProject(cwd = process.cwd()): Promise<SupabaseManagementDiscoveryRepository> {
    let projectRef: string;
    try {
      projectRef = (await readFile(resolve(cwd, "supabase/.temp/project-ref"), "utf8")).trim();
    } catch {
      throw new Error("No linked Supabase project ref was found; link this workspace with the Supabase CLI first");
    }
    if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new Error("The linked Supabase project ref is invalid");
    return new SupabaseManagementDiscoveryRepository(projectRef);
  }

  private async query<T extends Record<string, unknown>>(sql: string): Promise<T[]> {
    for (let attempt = 0; attempt < 3; attempt++) try {
      const { stdout } = await execFileAsync("supabase", ["db", "query", "--linked", "--dns-resolver", "https", "-o", "json", sql], {
        cwd: process.cwd(), encoding: "utf8", timeout: QUERY_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024
      });
      const start = stdout.indexOf("{");
      const end = stdout.lastIndexOf("\n}");
      if (start < 0 || end < start) throw new Error("Supabase SQL response was not JSON");
      const result = JSON.parse(stdout.slice(start, end + 2)) as { rows?: T[] };
      if (!Array.isArray(result.rows)) throw new Error("Supabase SQL response did not contain rows");
      return result.rows;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (attempt < 2 && /timeout|timed out|network|connect|resolv|fetch failed|socket|temporary|temporarily|econn|ehost|auth|sasl|circuitbreaker|context canceled/.test(message)) { await delay((attempt + 1) * 2_000); continue; }
      // CLI output can echo query fragments. Do not propagate it: SQL values
      // may contain rendered source evidence and must not leak into logs.
      throw new Error(`Authenticated Supabase SQL query failed for linked project ${this.projectRef}; CLI output suppressed`);
    }
    throw new Error(`Authenticated Supabase SQL query failed for linked project ${this.projectRef}; CLI output suppressed`);
  }

  async sync(rows: CatalogRow[]): Promise<RegistryUrl[]> {
    const input = rows.map(({ url, domain, adapterKey, sport, sourceName, sourceKind, catalogStatus }) => ({
      url, domain, adapter_key: adapterKey, sport, source_name: sourceName, source_kind: sourceKind, catalog_status: catalogStatus
    }));
    await this.query(`WITH input AS (
        SELECT * FROM jsonb_to_recordset(${jsonLiteral(input)}) AS x(url text,domain text,adapter_key text,sport text,source_name text,source_kind text,catalog_status text)
      ), urls AS (
        INSERT INTO public.source_urls(url,domain,adapter_key)
        SELECT DISTINCT url,domain,adapter_key FROM input
        ON CONFLICT(url) DO UPDATE SET domain=EXCLUDED.domain,adapter_key=EXCLUDED.adapter_key,updated_at=now()
        RETURNING id,url
      ), links AS (
        INSERT INTO public.source_registry(source_url_id,sport,source_name,source_kind,catalog_status)
        SELECT u.id,i.sport,i.source_name,i.source_kind,i.catalog_status FROM input i JOIN urls u USING(url)
        ON CONFLICT(source_url_id,sport,source_name) DO UPDATE SET source_kind=EXCLUDED.source_kind,catalog_status=EXCLUDED.catalog_status,updated_at=now()
        RETURNING id
      ) SELECT (SELECT count(*) FROM urls)::int AS urls,(SELECT count(*) FROM links)::int AS registry_rows;`);
    return this.sourcesForDomains([...new Set(rows.map((row) => row.domain))]);
  }

  async sourcesForDomains(domains: string[]): Promise<RegistryUrl[]> {
    const rows = await this.query<RegistryUrl>(`WITH wanted AS (
        SELECT value AS domain FROM jsonb_array_elements_text(${jsonLiteral(domains)}) AS d(value)
      ), candidates AS (
        SELECT DISTINCT ON (replace(u.domain,'www.','')) u.id,u.url,u.domain,u.adapter_key
        FROM public.source_urls u JOIN wanted d ON replace(u.domain,'www.','')=d.domain
        ORDER BY replace(u.domain,'www.',''),u.id
      ) SELECT c.id,c.url,c.domain,c.adapter_key AS "adapterKey",
          array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,
          array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames"
        FROM candidates c JOIN public.source_registry r ON r.source_url_id=c.id
        GROUP BY c.id,c.url,c.domain,c.adapter_key ORDER BY c.domain,c.url;`);
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  async sourceForExactUrl(url: string): Promise<RegistryUrl | null> {
    const rows = await this.query<RegistryUrl>(`SELECT u.id,u.url,u.domain,u.adapter_key AS "adapterKey",array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames" FROM public.source_urls u JOIN public.source_registry r ON r.source_url_id=u.id WHERE u.url=${textLiteral(url)} GROUP BY u.id,u.url,u.domain,u.adapter_key;`);
    return rows[0] ? { ...rows[0], id: Number(rows[0].id) } : null;
  }

  async sourcesForAccessibilityFallback(): Promise<RegistryUrl[]> {
    const rows = await this.query<RegistryUrl>(`SELECT u.id,u.url,u.domain,u.adapter_key AS "adapterKey",
      array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames"
      FROM public.dom_extraction_profiles d JOIN public.source_urls u ON u.id=d.source_url_id
      JOIN public.source_registry r ON r.source_url_id=u.id
      WHERE d.status <> 'DOM_RECOVERED'
      GROUP BY u.id,u.url,u.domain,u.adapter_key ORDER BY
      CASE replace(u.domain,'www.','') WHEN 'esportsinsider.com' THEN 0 WHEN 'm71p.io' THEN 1 WHEN 'tk791.io' THEN 2 ELSE 3 END,u.domain;`);
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  async getDomProfile(domain: string): Promise<DomProfile | null> {
    const rows = await this.query<{ profile: unknown }>(`SELECT profile FROM public.dom_extraction_profiles WHERE domain=${textLiteral(domain)} LIMIT 1;`);
    const value = rows[0]?.profile;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const profile = (value as Record<string, unknown>).profile ?? value;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
    const candidate = profile as Record<string, unknown>;
    return typeof candidate.version === "string" && typeof candidate.eventSelector === "string" ? candidate as unknown as DomProfile : null;
  }

  async getAccessibilityProfile(domain: string): Promise<AccessibilityProfile | null> {
    const rows = await this.query<{ profile: unknown }>(`SELECT profile->'profile' AS profile FROM public.accessibility_extraction_profiles WHERE domain=${textLiteral(domain)} LIMIT 1;`);
    const value = rows[0]?.profile;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.version === "string" && Array.isArray(candidate.eventRoles) && Array.isArray(candidate.marketRoles) && Array.isArray(candidate.selectionRoles) && candidate.requireExplicitSelection === true && candidate.rejectIllustrative === true ? candidate as AccessibilityProfile : null;
  }

  async saveAccessibilityDiscovery(source: RegistryUrl, report: AccessibilityReport, profile: AccessibilityProfile, rawPayloads: RawPayloadInput[], records: NormalizedRecord[]): Promise<void> {
    const rawRows = rawPayloads.map((value) => {
      const row = sanitizeRawPayload(value);
      return { sportsbook: row.sportsbook, account_alias: row.accountAlias, source_type: row.sourceType, source_url: row.sourceUrl ?? null, retrieved_at: row.retrievedAt ?? new Date().toISOString(), raw_payload: row.rawPayload, parser_version: row.parserVersion, payload_size_bytes: row.payloadSizeBytes ?? null, normalized_record_count: row.normalizedRecordCount ?? null };
    });
    const summary = { status: report.status, pageUrl: report.pageUrl, loaded: report.loaded, nodeCount: report.nodeCount, scrolls: report.scrolls, treeHash: report.treeHash, relevantNodes: report.extraction.relevantNodes, eventCandidates: report.extraction.eventCandidates, oddsCandidates: report.extraction.oddsCandidates, excludedIllustrative: report.extraction.excludedIllustrative, normalizedRecords: records.length, profile, error: report.error ?? null };
    const statements = ["BEGIN;"];
    if (rawRows.length) statements.push(`INSERT INTO public.raw_payloads(sportsbook,account_alias,source_type,source_url,retrieved_at,raw_payload,parser_version,payload_size_bytes,normalized_record_count)
      SELECT x.sportsbook,x.account_alias,x.source_type,x.source_url,x.retrieved_at,x.raw_payload,x.parser_version,x.payload_size_bytes,x.normalized_record_count
      FROM jsonb_to_recordset(${jsonLiteral(rawRows)}) AS x(sportsbook text,account_alias text,source_type text,source_url text,retrieved_at timestamptz,raw_payload jsonb,parser_version text,payload_size_bytes integer,normalized_record_count integer)
      WHERE NOT EXISTS (SELECT 1 FROM public.raw_payloads old WHERE old.source_type=x.source_type AND old.source_url=x.source_url AND old.parser_version=x.parser_version AND old.raw_payload->>'treeHash'=x.raw_payload->>'treeHash');`);
    statements.push(`INSERT INTO public.accessibility_extraction_profiles(domain,source_url_id,status,profile,last_observed_at)
      VALUES (${textLiteral(source.domain)},${Number(source.id)},${textLiteral(report.status)},${jsonLiteral(summary)},now())
      ON CONFLICT(domain) DO UPDATE SET source_url_id=EXCLUDED.source_url_id,status=EXCLUDED.status,profile=EXCLUDED.profile,last_observed_at=EXCLUDED.last_observed_at;`);
    if (records.length) {
      const captured: string[] = [];
      const collector = { query: async (statement: string, values?: unknown[]) => {
        if (values?.length) {
          if (values.length !== 1 || typeof values[0] !== "string" || !statement.includes("$1::jsonb")) throw new Error("Unsupported parameter shape while preparing accessibility batch");
          captured.push(statement.replace("$1::jsonb", jsonLiteral(JSON.parse(values[0]))));
        } else captured.push(statement);
        return { rows: [], rowCount: 0 };
      } } as unknown as PoolClient;
      await saveRecordBatch(collector, records);
      statements.push(...captured.map((statement) => `${statement};`));
    }
    statements.push("COMMIT; SELECT 1 AS persisted;");
    await this.query(statements.join("\n"));
  }

  async accessibilityCounts(): Promise<Record<string, number>> {
    const rows = await this.query<Record<string, number>>(`SELECT (SELECT count(*) FROM public.raw_payloads WHERE source_type='accessibility-extraction')::int AS raw,
      (SELECT count(*) FROM public.accessibility_extraction_profiles)::int AS profiles,
      (SELECT count(*) FROM public.events)::int AS events,(SELECT count(*) FROM public.markets)::int AS markets,
      (SELECT count(*) FROM public.selections)::int AS selections,(SELECT count(*) FROM public.odds_observations)::int AS observations;`);
    return rows[0] ?? {};
  }

  async visualCounts(): Promise<Record<string, number>> {
    const rows = await this.query<Record<string, number>>(`SELECT (SELECT count(*) FROM public.events)::int AS events,(SELECT count(*) FROM public.markets)::int AS markets,(SELECT count(*) FROM public.selections)::int AS selections,(SELECT count(*) FROM public.odds_observations)::int AS observations,(SELECT count(*) FROM public.raw_payloads)::int AS raw,(SELECT count(*) FROM public.raw_payloads WHERE source_type='visual-extraction')::int AS visual_raw,(SELECT count(*) FROM public.visual_extraction_profiles)::int AS visual_profiles;`);
    return rows[0] ?? {};
  }

  /** Persist existing connector output into the linked Supabase project. */
  async saveMarketCollection(rawPayloads: RawPayloadInput[], records: NormalizedRecord[]): Promise<{ rawSubmitted: number; recordsSubmitted: number }> {
    for (let offset = 0; offset < rawPayloads.length; offset += 80) {
      const rows = rawPayloads.slice(offset, offset + 80).map((input) => {
        const row = sanitizeRawPayload(input);
        const captureHash = createHash("sha256").update(JSON.stringify([row.sportsbook, row.sourceType, row.sourceUrl, row.externalEventId ?? null, row.parserVersion, row.rawPayload])).digest("hex");
        return { sportsbook: row.sportsbook, account_alias: row.accountAlias, source_type: row.sourceType, source_url: row.sourceUrl ?? null, retrieved_at: row.retrievedAt ?? new Date().toISOString(), provider_timestamp: row.providerTimestamp ?? null, external_event_id: row.externalEventId ?? null, raw_payload: { ...(row.rawPayload && typeof row.rawPayload === "object" && !Array.isArray(row.rawPayload) ? row.rawPayload : { value: row.rawPayload }), captureHash }, parser_version: row.parserVersion, payload_size_bytes: row.payloadSizeBytes ?? null, normalized_record_count: row.normalizedRecordCount ?? null };
      });
      await this.query(`WITH input AS (SELECT * FROM jsonb_to_recordset(${jsonLiteral(rows)}) AS x(sportsbook text,account_alias text,source_type text,source_url text,retrieved_at timestamptz,provider_timestamp timestamptz,external_event_id text,raw_payload jsonb,parser_version text,payload_size_bytes integer,normalized_record_count integer)), deduped AS (SELECT DISTINCT ON(raw_payload->>'captureHash') * FROM input ORDER BY raw_payload->>'captureHash') INSERT INTO public.raw_payloads(sportsbook,account_alias,source_type,source_url,retrieved_at,provider_timestamp,external_event_id,raw_payload,parser_version,payload_size_bytes,normalized_record_count) SELECT x.sportsbook,x.account_alias,x.source_type,x.source_url,x.retrieved_at,x.provider_timestamp,x.external_event_id,x.raw_payload,x.parser_version,x.payload_size_bytes,x.normalized_record_count FROM deduped x WHERE NOT EXISTS (SELECT 1 FROM public.raw_payloads old WHERE old.source_type=x.source_type AND old.source_url IS NOT DISTINCT FROM x.source_url AND old.raw_payload->>'captureHash'=x.raw_payload->>'captureHash'); SELECT 1 AS persisted;`);
    }
    for (let offset = 0; offset < records.length; offset += 250) {
      const captured: string[] = [];
      const collector = { query: async (statement: string, values?: unknown[]) => { if (values?.length) { if (values.length !== 1 || typeof values[0] !== "string" || !statement.includes("$1::jsonb")) throw new Error("Unsupported parameter shape in market batch"); captured.push(statement.replace("$1::jsonb", jsonLiteral(JSON.parse(values[0])))); } else captured.push(statement); return { rows: [], rowCount: 0 }; } } as unknown as PoolClient;
      await saveRecordBatch(collector, records.slice(offset, offset + 250));
      await this.query(`BEGIN; ${captured.map((statement) => `${statement};`).join("\n")} COMMIT; SELECT 1 AS persisted;`);
    }
    return { rawSubmitted: rawPayloads.length, recordsSubmitted: records.length };
  }

  async getVisualProfile(domain: string): Promise<VisualProfile | null> {
    const rows = await this.query<{ profile: unknown }>(`SELECT profile->'profile' AS profile FROM public.visual_extraction_profiles WHERE domain=${textLiteral(domain)} LIMIT 1;`);
    return parseVisualProfile(rows[0]?.profile);
  }

  async saveVisualDiscovery(source: RegistryUrl, report: VisualReport, profile: VisualProfile, rawPayloads: RawPayloadInput[], records: NormalizedRecord[]): Promise<void> {
    const rawRows = rawPayloads.map((value) => { const row = sanitizeRawPayload(value); return { sportsbook: row.sportsbook, account_alias: row.accountAlias, source_type: row.sourceType, source_url: row.sourceUrl ?? null, retrieved_at: row.retrievedAt ?? new Date().toISOString(), raw_payload: row.rawPayload, parser_version: row.parserVersion, payload_size_bytes: row.payloadSizeBytes ?? null, normalized_record_count: row.normalizedRecordCount ?? null }; });
    const summary = { status: report.status, pageUrl: report.pageUrl, loaded: report.loaded, pages: report.pages, screenshotRegions: report.screenshotRegions, screenshotHashes: report.screenshotHashes, scrolls: report.scrolls, boardHash: report.boardHash, eventRegions: report.extraction.eventRegions, marketRegions: report.extraction.marketRegions, selectionCandidates: report.extraction.selectionCandidates, oddsCandidates: report.extraction.oddsCandidates, completeMarkets: report.extraction.completeMarkets, accepted: report.extraction.accepted, rejected: report.extraction.rejected, primaryRejection: report.extraction.primaryRejection, profile, error: report.error ?? null };
    const statements = ["BEGIN;"];
    if (rawRows.length) statements.push(`INSERT INTO public.raw_payloads(sportsbook,account_alias,source_type,source_url,retrieved_at,raw_payload,parser_version,payload_size_bytes,normalized_record_count) SELECT x.sportsbook,x.account_alias,x.source_type,x.source_url,x.retrieved_at,x.raw_payload,x.parser_version,x.payload_size_bytes,x.normalized_record_count FROM jsonb_to_recordset(${jsonLiteral(rawRows)}) AS x(sportsbook text,account_alias text,source_type text,source_url text,retrieved_at timestamptz,raw_payload jsonb,parser_version text,payload_size_bytes integer,normalized_record_count integer) WHERE NOT EXISTS (SELECT 1 FROM public.raw_payloads old WHERE old.source_type=x.source_type AND old.source_url=x.source_url AND old.parser_version=x.parser_version AND old.raw_payload->>'boardHash' IS NOT DISTINCT FROM x.raw_payload->>'boardHash');`);
    statements.push(`INSERT INTO public.visual_extraction_profiles(domain,source_url_id,status,profile,last_observed_at) VALUES (${textLiteral(source.domain)},${Number(source.id)},${textLiteral(report.status)},${jsonLiteral(summary)},now()) ON CONFLICT(domain) DO UPDATE SET source_url_id=EXCLUDED.source_url_id,status=EXCLUDED.status,profile=EXCLUDED.profile,last_observed_at=EXCLUDED.last_observed_at;`);
    if (records.length) {
      const captured: string[] = [];
      const collector = { query: async (statement: string, values?: unknown[]) => { if (values?.length) { if (values.length !== 1 || typeof values[0] !== "string" || !statement.includes("$1::jsonb")) throw new Error("Unsupported parameter shape while preparing visual batch"); captured.push(statement.replace("$1::jsonb", jsonLiteral(JSON.parse(values[0])))); } else captured.push(statement); return { rows: [], rowCount: 0 }; } } as unknown as PoolClient;
      await saveRecordBatch(collector, records);
      statements.push(...captured.map((statement) => `${statement};`));
    }
    statements.push("COMMIT; SELECT 1 AS persisted;");
    await this.query(statements.join("\n"));
  }

  async saveDomDiscovery(
    source: RegistryUrl,
    report: DomDiscoveryReport,
    profile: DomProfile | null,
    rawPayloads: RawPayloadInput[],
    records: NormalizedRecord[]
  ): Promise<void> {
    const rawRows = rawPayloads.map((value) => {
      const row = sanitizeRawPayload(value);
      return {
        sportsbook: row.sportsbook, account_alias: row.accountAlias, source_type: row.sourceType,
        source_url: row.sourceUrl ?? null, retrieved_at: row.retrievedAt ?? new Date().toISOString(),
        provider_timestamp: row.providerTimestamp ?? null, external_event_id: row.externalEventId ?? null,
        raw_payload: row.rawPayload, parser_version: row.parserVersion, source_topic: row.sourceTopic ?? null,
        source_request_id: row.sourceRequestId ?? null, observation_direction: row.observationDirection ?? null,
        payload_size_bytes: row.payloadSizeBytes ?? null, normalized_record_count: row.normalizedRecordCount ?? null
      };
    });
    const savedProfile = profile ?? { version: "generic-v1", eventSelector: "[data-event-id],[data-fixture-id],[data-match-id]" };
    const summary = {
      status: report.status, pageUrl: report.pageUrl, loaded: report.loaded, rawSaved: rawRows.length,
      normalizedRecords: records.length, scrolls: report.scrolls, profileEventCount: report.profileEventCount,
      eventCards: report.extraction.detectedEventCards, visibleOdds: report.extraction.visibleOdds,
      profile: savedProfile, error: report.error ?? null
    };
    const statements: string[] = ["BEGIN;"];
    if (rawRows.length) statements.push(`INSERT INTO public.raw_payloads
      (sportsbook,account_alias,source_type,source_url,retrieved_at,provider_timestamp,external_event_id,raw_payload,parser_version,source_topic,source_request_id,observation_direction,payload_size_bytes,normalized_record_count)
      SELECT sportsbook,account_alias,source_type,source_url,retrieved_at,provider_timestamp,external_event_id,raw_payload,parser_version,source_topic,source_request_id,observation_direction,payload_size_bytes,normalized_record_count
      FROM jsonb_to_recordset(${jsonLiteral(rawRows)}) AS x(sportsbook text,account_alias text,source_type text,source_url text,retrieved_at timestamptz,provider_timestamp timestamptz,external_event_id text,raw_payload jsonb,parser_version text,source_topic text,source_request_id text,observation_direction text,payload_size_bytes integer,normalized_record_count integer);`);
    statements.push(`INSERT INTO public.dom_extraction_profiles(domain,source_url_id,status,profile,last_observed_at)
      VALUES (${textLiteral(source.domain)},${Number(source.id)},${textLiteral(report.status)},${jsonLiteral(summary)},now())
      ON CONFLICT(domain) DO UPDATE SET source_url_id=EXCLUDED.source_url_id,status=EXCLUDED.status,profile=EXCLUDED.profile,last_observed_at=EXCLUDED.last_observed_at;`);
    if (records.length) {
      const captured: string[] = [];
      const collector = {
        query: async (text: string, values?: unknown[]) => {
          if (values?.length) {
            if (values.length !== 1 || typeof values[0] !== "string" || !text.includes("$1::jsonb")) throw new Error("Unsupported parameter shape while preparing normalized DOM batch");
            captured.push(text.replace("$1::jsonb", jsonLiteral(JSON.parse(values[0]))));
          } else captured.push(text);
          return { rows: [], rowCount: 0 };
        }
      } as unknown as PoolClient;
      await saveRecordBatch(collector, records);
      statements.push(...captured.map((statement) => `${statement};`));
    }
    statements.push("COMMIT; SELECT 1 AS persisted;");
    await this.query(statements.join("\n"));
  }
}
