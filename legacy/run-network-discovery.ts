import { loadConfig } from "./config/index.js";
import { NetworkDiscoveryEngine, type DiscoveryReport } from "./network/discovery.js";
import { SourceRegistryRepository } from "./sources/registry.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for network discovery");
const storage = new PostgresStorage(config.databaseUrl);
const repository = new SourceRegistryRepository(storage.pool);
const concurrency = Math.max(1, Math.min(4, Number(process.env.NETWORK_DISCOVERY_CONCURRENCY ?? 2)));
const engine = new NetworkDiscoveryEngine(storage, { timeoutMs: Number(process.env.NETWORK_DISCOVERY_TIMEOUT_MS ?? 15_000), observeMs: Number(process.env.NETWORK_DISCOVERY_OBSERVE_MS ?? 2_000) });
try {
  const requestedDomains = new Set((process.env.NETWORK_DISCOVERY_DOMAINS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  const allSources = await repository.problemSources();
  const sources = requestedDomains.size ? allSources.filter((source) => requestedDomains.has(source.domain)) : allSources;
  if (requestedDomains.size && sources.length !== requestedDomains.size) throw new Error("One or more NETWORK_DISCOVERY_DOMAINS entries are not currently problematic registry domains");
  const reports: DiscoveryReport[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, async () => {
    for (;;) {
      const source = sources[next++]; if (!source) return;
      const report = await engine.discover(source);
      await repository.saveNetworkDiscovery(source, report);
      reports.push(report);
      console.log(JSON.stringify({ networkDiscovery: "domain", domain: source.domain, status: report.status, candidates: report.candidates.length, rawSaved: report.rawSaved, normalizedRecords: report.normalizedRecords }));
    }
  }));
  const statuses = Object.fromEntries(["RECOVERED", "NO_USABLE_FEED", "PAGE_UNAVAILABLE", "NEEDS_OTHER_TECHNIQUE"].map((status) => [status, reports.filter((report) => report.status === status).length]));
  console.log(JSON.stringify({ networkDiscovery: "finished", domains: reports.length, statuses, candidates: reports.reduce((sum, report) => sum + report.candidates.length, 0), rawSaved: reports.reduce((sum, report) => sum + report.rawSaved, 0), normalizedRecords: reports.reduce((sum, report) => sum + report.normalizedRecords, 0) }));
} finally { await engine.close(); await storage.close(); }
