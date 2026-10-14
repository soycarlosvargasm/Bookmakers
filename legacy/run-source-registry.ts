import { loadConfig } from "./config/index.js";
import { PostgresStorage } from "./storage/postgres.js";
import { catalogMetrics, loadSourceCatalog, SourceRegistryRepository } from "./sources/registry.js";
import { SourceIngestionEngine } from "./sources/ingestion.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for the source registry run");

const integerEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const booleanEnv = (name: string, fallback: boolean): boolean => (process.env[name] ?? String(fallback)).toLowerCase() === "true";

const rows = await loadSourceCatalog();
const metrics = catalogMetrics(rows);
const storage = new PostgresStorage(config.databaseUrl);
const repository = new SourceRegistryRepository(storage.pool);
let runId: number | undefined;
try {
  const sources = await repository.sync(rows);
  if (sources.length !== metrics.urls) throw new Error(`Registry URL count mismatch: expected ${metrics.urls}, loaded ${sources.length}`);
  runId = await repository.startRun(sources.length);
  const before = await databaseCounts(storage);
  console.log(JSON.stringify({ sourceRegistry: "started", runId, ...metrics }));
  const engine = new SourceIngestionEngine(repository, storage, {
    concurrency: integerEnv("SOURCE_REGISTRY_CONCURRENCY", 12),
    perDomainConcurrency: integerEnv("SOURCE_REGISTRY_DOMAIN_CONCURRENCY", 2),
    requestsPerMinute: integerEnv("SOURCE_REGISTRY_REQUESTS_PER_MINUTE", 30),
    timeoutMs: integerEnv("SOURCE_REGISTRY_TIMEOUT_MS", 12_000),
    browserFallback: booleanEnv("SOURCE_REGISTRY_BROWSER_FALLBACK", true),
    maxBodyBytes: integerEnv("SOURCE_REGISTRY_MAX_BODY_BYTES", 2 * 1024 * 1024)
  }, (line) => console.log(line));
  const statuses = await engine.run(runId, sources);
  const attempted = Object.values(statuses).reduce((sum, count) => sum + count, 0);
  const after = await databaseCounts(storage);
  const delta = Object.fromEntries(Object.keys(after).map((key) => [key, after[key]! - before[key]!])) as Record<string, number>;
  const summary = { ...metrics, attempted, untested: metrics.urls - attempted, statuses, databaseBefore: before, databaseAfter: after, databaseDelta: delta };
  await repository.finishRun(runId, attempted === metrics.urls ? "SUCCEEDED" : "FAILED", summary, attempted === metrics.urls ? undefined : "Not every URL was attempted");
  console.log(JSON.stringify({ sourceRegistry: "finished", runId, ...summary }));
  if (attempted !== metrics.urls) process.exitCode = 1;
} catch (cause) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (runId !== undefined) await repository.finishRun(runId, "FAILED", {}, message).catch(() => undefined);
  throw cause;
} finally { await storage.close(); }

async function databaseCounts(storage: PostgresStorage): Promise<Record<string, number>> {
  const result = await storage.pool.query(`SELECT
    (SELECT count(*)::int FROM events) events,
    (SELECT count(*)::int FROM markets) markets,
    (SELECT count(*)::int FROM selections) selections,
    (SELECT count(*)::int FROM odds_observations) observations,
    (SELECT count(*)::int FROM raw_payloads) raw_payloads`);
  return Object.fromEntries(Object.entries(result.rows[0] as Record<string, number>).map(([key, value]) => [key, Number(value)]));
}
