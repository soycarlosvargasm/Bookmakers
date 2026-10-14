import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Pool, PoolClient } from "pg";
import { sanitizeRawPayload } from "../collectors/raw-policy.js";
import type { RawPayloadInput } from "../normalization/types.js";
import type { DiscoveryReport } from "../network/discovery.js";
import type { DomDiscoveryReport } from "../dom/discovery.js";
import type { DomProfile } from "../dom/extractor.js";

export const RUNTIME_STATUSES = ["WORKING", "PARTIAL", "BLOCKED", "BROKEN", "NO_CURRENT_MARKETS", "INVALID_URL"] as const;
export type RuntimeStatus = typeof RUNTIME_STATUSES[number];
export type CatalogStatus = "ACTIVA" | "CANDIDATA" | "BLOQUEADA";
export type SourceKind = "Agregador" | "Sportsbook" | "Exchange";

export type CatalogRow = {
  sport: string;
  sourceName: string;
  sourceKind: SourceKind;
  catalogStatus: CatalogStatus;
  url: string;
  domain: string;
  adapterKey: string;
};

export type RegistryUrl = {
  id: number;
  url: string;
  domain: string;
  adapterKey: string;
  sports: string[];
  sourceNames: string[];
};

export type AttemptResult = {
  status: RuntimeStatus;
  strategy: string;
  startedAt: string;
  finishedAt: string;
  httpStatus: number | null;
  finalUrl: string | null;
  recordCount: number;
  rawCount: number;
  failureReason: string | null;
  evidence: Record<string, unknown>;
};

const csvFields = (line: string): string[] => {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { fields.push(field); field = ""; }
    else field += char;
  }
  fields.push(field);
  return fields;
};

export const adapterKeyForDomain = (domain: string): string => domain.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function loadSourceCatalog(path = process.env.SOURCE_CATALOG_PATH ?? resolve(process.cwd(), "docs/SOURCE_CATALOG.csv")): Promise<CatalogRow[]> {
  const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean);
  if (lines.shift() !== "sport,source,source_kind,catalog_status,url") throw new Error("Source catalogue header is invalid");
  return lines.map((line, index) => {
    const [sport, sourceName, sourceKind, catalogStatus, rawUrl] = csvFields(line);
    if (!sport || !sourceName || !rawUrl || !["Agregador", "Sportsbook", "Exchange"].includes(sourceKind ?? "") || !["ACTIVA", "CANDIDATA", "BLOQUEADA"].includes(catalogStatus ?? "")) throw new Error(`Invalid source catalogue row ${index + 2}`);
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { throw new Error(`Invalid URL in source catalogue row ${index + 2}: ${rawUrl}`); }
    return { sport, sourceName, sourceKind: sourceKind as SourceKind, catalogStatus: catalogStatus as CatalogStatus, url: rawUrl, domain: parsed.hostname.toLowerCase(), adapterKey: adapterKeyForDomain(parsed.hostname) };
  });
}

export const catalogMetrics = (rows: CatalogRow[]) => ({
  rows: rows.length,
  urls: new Set(rows.map((row) => row.url)).size,
  domains: new Set(rows.map((row) => row.domain)).size,
  sports: new Set(rows.map((row) => row.sport)).size
});

export class SourceRegistryRepository {
  constructor(private readonly pool: Pool) {}

  async sync(rows: CatalogRow[]): Promise<RegistryUrl[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const row of rows) {
        const sourceUrl = await client.query<{ id: number }>(`INSERT INTO source_urls(url,domain,adapter_key) VALUES($1,$2,$3)
          ON CONFLICT(url) DO UPDATE SET domain=EXCLUDED.domain,adapter_key=EXCLUDED.adapter_key,updated_at=now() RETURNING id`, [row.url,row.domain,row.adapterKey]);
        await client.query(`INSERT INTO source_registry(source_url_id,sport,source_name,source_kind,catalog_status) VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(source_url_id,sport,source_name) DO UPDATE SET source_kind=EXCLUDED.source_kind,catalog_status=EXCLUDED.catalog_status,updated_at=now()`, [sourceUrl.rows[0]!.id,row.sport,row.sourceName,row.sourceKind,row.catalogStatus]);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    const result = await this.pool.query<RegistryUrl>(`SELECT u.id,u.url,u.domain,u.adapter_key AS "adapterKey",
      array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames"
      FROM source_urls u JOIN source_registry r ON r.source_url_id=u.id GROUP BY u.id,u.url,u.domain,u.adapter_key ORDER BY u.domain,u.url`);
    return result.rows;
  }

  async startRun(total: number): Promise<number> {
    const result = await this.pool.query<{ id: number }>("INSERT INTO source_ingestion_runs(status,urls_total) VALUES('RUNNING',$1) RETURNING id", [total]);
    return result.rows[0]!.id;
  }

  async saveAttempt(runId: number, source: RegistryUrl, attempt: AttemptResult): Promise<void> {
    await this.withTransaction(async (client) => {
      const rawPayload: RawPayloadInput = sanitizeRawPayload({
        sportsbook: `registry:${source.domain}`, accountAlias: "catalog", sourceType: "registry-probe", sourceUrl: source.url,
        retrievedAt: attempt.finishedAt, providerTimestamp: null, externalEventId: null, parserVersion: "registry-probe-v1",
        rawPayload: { httpStatus: attempt.httpStatus, finalUrl: attempt.finalUrl, runtimeStatus: attempt.status, failureReason: attempt.failureReason, strategy: attempt.strategy, ...attempt.evidence },
        normalizedRecordCount: attempt.recordCount
      });
      const raw = await client.query<{ id: number }>(`INSERT INTO raw_payloads
        (sportsbook,account_alias,source_type,source_url,retrieved_at,provider_timestamp,external_event_id,raw_payload,parser_version,payload_size_bytes,normalized_record_count)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [rawPayload.sportsbook,rawPayload.accountAlias,rawPayload.sourceType,rawPayload.sourceUrl ?? null,rawPayload.retrievedAt,rawPayload.providerTimestamp ?? null,rawPayload.externalEventId ?? null,JSON.stringify(rawPayload.rawPayload),rawPayload.parserVersion,rawPayload.payloadSizeBytes ?? null,attempt.recordCount]);
      await client.query(`INSERT INTO source_url_attempts(run_id,source_url_id,started_at,finished_at,runtime_status,strategy,http_status,final_url,record_count,raw_count,raw_payload_id,failure_reason,evidence)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [runId,source.id,attempt.startedAt,attempt.finishedAt,attempt.status,attempt.strategy,attempt.httpStatus,attempt.finalUrl,attempt.recordCount,attempt.rawCount,raw.rows[0]!.id,attempt.failureReason,JSON.stringify(attempt.evidence)]);
      const success = attempt.status === "WORKING";
      await client.query(`INSERT INTO source_url_health(source_url_id,runtime_status,last_attempt,last_success,last_http_status,last_strategy,failure_reason,consecutive_failures)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(source_url_id) DO UPDATE SET runtime_status=EXCLUDED.runtime_status,last_attempt=EXCLUDED.last_attempt,
        last_success=CASE WHEN EXCLUDED.runtime_status='WORKING' THEN EXCLUDED.last_attempt ELSE source_url_health.last_success END,last_http_status=EXCLUDED.last_http_status,
        last_strategy=EXCLUDED.last_strategy,failure_reason=EXCLUDED.failure_reason,consecutive_failures=CASE WHEN EXCLUDED.runtime_status='WORKING' THEN 0 ELSE source_url_health.consecutive_failures+1 END,updated_at=now()`,
        [source.id,attempt.status,attempt.finishedAt,success ? attempt.finishedAt : null,attempt.httpStatus,attempt.strategy,attempt.failureReason,success ? 0 : 1]);
    });
  }

  async finishRun(runId: number, status: "SUCCEEDED" | "FAILED", summary: Record<string, unknown>, errorMessage?: string): Promise<void> {
    await this.pool.query("UPDATE source_ingestion_runs SET finished_at=now(),status=$2,urls_attempted=(SELECT count(*) FROM source_url_attempts WHERE run_id=$1),summary=$3,error_message=$4 WHERE id=$1", [runId,status,JSON.stringify(summary),errorMessage ?? null]);
  }

  async summary(runId: number): Promise<Record<string, number>> {
    const result = await this.pool.query<{ runtime_status: RuntimeStatus; count: number }>("SELECT runtime_status,count(*)::int count FROM source_url_attempts WHERE run_id=$1 GROUP BY runtime_status", [runId]);
    return Object.fromEntries(RUNTIME_STATUSES.map((status) => [status, result.rows.find((row) => row.runtime_status === status)?.count ?? 0]));
  }

  /** One representative URL per currently non-working domain is enough for an
   * initial browser/network profile; compatible URLs reuse the saved profile. */
  async problemSources(): Promise<RegistryUrl[]> {
    const result = await this.pool.query<RegistryUrl>(`WITH latest AS (
      SELECT DISTINCT ON (h.source_url_id) h.source_url_id,h.runtime_status
      FROM source_url_health h ORDER BY h.source_url_id,h.last_attempt DESC
    ), candidates AS (
      SELECT DISTINCT ON (u.domain) u.id,u.url,u.domain,u.adapter_key
      FROM source_urls u JOIN latest l ON l.source_url_id=u.id
      WHERE l.runtime_status <> 'WORKING' ORDER BY u.domain,u.id
    ) SELECT c.id,c.url,c.domain,c.adapter_key AS "adapterKey",
      array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames"
      FROM candidates c JOIN source_registry r ON r.source_url_id=c.id
      GROUP BY c.id,c.url,c.domain,c.adapter_key ORDER BY c.domain,c.url`);
    return result.rows;
  }

  async sourcesForDomains(domains: string[]): Promise<RegistryUrl[]> {
    const normalized=[...new Set(domains.map((domain)=>domain.toLowerCase().replace(/^www\./,"")))];
    if(!normalized.length)return [];
    const result=await this.pool.query<RegistryUrl>(`WITH candidates AS (
      SELECT DISTINCT ON (replace(u.domain,'www.','')) u.id,u.url,u.domain,u.adapter_key
      FROM source_urls u WHERE replace(u.domain,'www.','')=ANY($1::text[])
      ORDER BY replace(u.domain,'www.',''),u.id
    ) SELECT c.id,c.url,c.domain,c.adapter_key AS "adapterKey",
      array_agg(DISTINCT r.sport ORDER BY r.sport) AS sports,array_agg(DISTINCT r.source_name ORDER BY r.source_name) AS "sourceNames"
      FROM candidates c JOIN source_registry r ON r.source_url_id=c.id GROUP BY c.id,c.url,c.domain,c.adapter_key ORDER BY c.domain,c.url`,[normalized]);
    return result.rows;
  }

  async saveNetworkDiscovery(source: RegistryUrl, report: DiscoveryReport): Promise<void> {
    const profile = { status: report.status, pageUrl: report.pageUrl, loaded: report.loaded, rawSaved: report.rawSaved, normalizedRecords: report.normalizedRecords,
      candidates: report.candidates.map((candidate) => ({ ...candidate, structuralExample: candidate.structuralExample })), error: report.error ?? null };
    await this.pool.query(`INSERT INTO network_discovery_profiles(domain,source_url_id,status,profile,last_observed_at)
      VALUES($1,$2,$3,$4,now()) ON CONFLICT(domain) DO UPDATE SET source_url_id=EXCLUDED.source_url_id,status=EXCLUDED.status,profile=EXCLUDED.profile,last_observed_at=EXCLUDED.last_observed_at`, [source.domain, source.id, report.status, JSON.stringify(profile)]);
  }

  async getDomProfile(domain: string): Promise<DomProfile | null> {
    const result=await this.pool.query<{profile:unknown}>("SELECT profile FROM dom_extraction_profiles WHERE domain=$1",[domain]);
    const value=result.rows[0]?.profile;
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    const profile=(value as Record<string,unknown>).profile ?? value;
    if(!profile||typeof profile!=="object"||Array.isArray(profile))return null;
    const row=profile as Record<string,unknown>;
    return typeof row.version==="string"&&typeof row.eventSelector==="string" ? row as unknown as DomProfile : null;
  }

  async saveDomDiscovery(source: RegistryUrl, report: DomDiscoveryReport, profile: DomProfile | null): Promise<void> {
    const savedProfile=profile ?? {version:"generic-v1",eventSelector:"[data-event-id],[data-fixture-id],[data-match-id]"};
    const summary={status:report.status,pageUrl:report.pageUrl,loaded:report.loaded,rawSaved:report.rawSaved,normalizedRecords:report.normalizedRecords,scrolls:report.scrolls,profileEventCount:report.profileEventCount,eventCards:report.extraction.detectedEventCards,visibleOdds:report.extraction.visibleOdds,profile:savedProfile,error:report.error??null};
    await this.pool.query(`INSERT INTO dom_extraction_profiles(domain,source_url_id,status,profile,last_observed_at)
      VALUES($1,$2,$3,$4,now()) ON CONFLICT(domain) DO UPDATE SET source_url_id=EXCLUDED.source_url_id,status=EXCLUDED.status,profile=EXCLUDED.profile,last_observed_at=EXCLUDED.last_observed_at`,[source.domain,source.id,report.status,JSON.stringify(summary)]);
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const value = await fn(client); await client.query("COMMIT"); return value; }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
