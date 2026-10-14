import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AcquisitionOrchestrator } from "./orchestrator.js";
import { EngineStorage } from "./storage.js";
import { discoverOpenChromeNetwork } from "./chrome-discovery.js";
import type { AcquisitionOutcome, Source } from "./types.js";

const USAGE = "Usage: npm run engine -- <url> <type> [--data-dir <path>] [--force-browser] [--renzo-discovery]";
function argumentsFrom(argv: string[]): { source: Source; dataDir: string; forceBrowser: boolean; renzoDiscovery: boolean } {
  const [url, type, ...rest] = argv;
  if (!url || !type) throw new Error(USAGE);
  let dataDir = ".engine";
  let forceBrowser = false;
  let renzoDiscovery = false;
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] === "--force-browser") { forceBrowser = true; continue; }
    if (rest[index] === "--renzo-discovery") { renzoDiscovery = true; continue; }
    if (rest[index] !== "--data-dir" || !rest[index + 1] || rest[index + 1]!.startsWith("--")) throw new Error(USAGE);
    dataDir = rest[++index]!;
  }
  return { source: { url, type }, dataDir, forceBrowser, renzoDiscovery };
}

export async function runEngine(source: Source, dataDir = ".engine", options: { forceBrowser?: boolean } = {}): Promise<AcquisitionOutcome> {
  const storage = new EngineStorage(dataDir);
  const remembered = await storage.readMemory(source);
  console.error(`[MEMORY] preferred=${remembered?.method ?? "none"} session=${remembered?.session.status ?? "NONE"}`);
  const engine = new AcquisitionOrchestrator({
    storage,
    forceBrowser: options.forceBrowser,
    onStage: (event) => console.error(`[${event.method}] ${event.status}${event.reason ? `: ${event.reason}` : ""}`)
  });
  let outcome = await engine.run(source);
  while (outcome.status === "PAUSED") {
    const paused = outcome;
    if (paused.event.method === "http") {
      const reason = /HTTP 403/.test(paused.event.reason) ? "HTTP 403" : paused.event.reason;
      console.error(`[PAUSED] ${reason} desde Node fetch. Para resolver, corre el motor con navegador forzado: npm run engine -- ${source.url} ${source.type} --force-browser`);
      return paused;
    } else console.error("[PAUSED] Resolve the challenge in the visible browser. Acquisition will continue automatically.");
    const cancel = () => { void paused.close(); };
    process.once("SIGINT", cancel);
    try { outcome = await paused.completion; }
    finally { process.off("SIGINT", cancel); }
  }
  return outcome;
}

async function main(): Promise<void> {
  try {
    const { source, dataDir, forceBrowser, renzoDiscovery } = argumentsFrom(process.argv.slice(2));
    if (renzoDiscovery) {
      const report = await discoverOpenChromeNetwork(source, new EngineStorage(dataDir));
      const payload = report.listSports?.payload;
      const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
      const data = body?.D && typeof body.D === "object" && !Array.isArray(body.D) ? body.D as Record<string, unknown> : null;
      const sports = data?.PAL && typeof data.PAL === "object" && !Array.isArray(data.PAL) ? data.PAL as Record<string, unknown> : null;
      console.log(JSON.stringify({
        status: report.status, source: report.source, pageUrl: report.pageUrl,
        resources: report.resources.filter(resource => /\/desktop\/feapi\/|\/sportsbook\/reco\//.test(resource.url)),
        listSports: report.listSports && { url: report.listSports.url, status: report.listSports.status,
          contentType: report.listSports.contentType, error: report.listSports.error,
          topLevelKeys: body ? Object.keys(body) : [], dataKeys: data ? Object.keys(data) : [],
          sportCount: sports ? Object.keys(sports).length : 0,
          firstSports: sports ? Object.entries(sports).slice(0, 5).map(([id, value]) => {
            const sport = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
            return { id, name: sport.S_DESC, eventCount: sport.NUM, keys: Object.keys(sport) };
          }) : [] },
        prematchEvents: report.prematchEvents && { url: report.prematchEvents.url, status: report.prematchEvents.status,
          contentType: report.prematchEvents.contentType, error: report.prematchEvents.error,
          topLevelKeys: report.prematchEvents.payload && typeof report.prematchEvents.payload === "object" ? Object.keys(report.prematchEvents.payload) : [] },
        liveEvents: report.liveEvents && { url: report.liveEvents.url, status: report.liveEvents.status,
          contentType: report.liveEvents.contentType, error: report.liveEvents.error,
          topLevelKeys: report.liveEvents.payload && typeof report.liveEvents.payload === "object" ? Object.keys(report.liveEvents.payload) : [] },
        rawPath: report.rawPath,
      }, null, 2));
      if (report.status !== "DISCOVERED") process.exitCode = 1;
      return;
    }
    const outcome = await runEngine(source, dataDir, { forceBrowser });
    console.log(JSON.stringify(outcome.status === "PAUSED" ? { status: outcome.status, source: outcome.source, method: outcome.event.method, reason: outcome.event.reason } : outcome, null, 2));
    if (outcome.status !== "SUCCEEDED") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
