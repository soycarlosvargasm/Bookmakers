import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EngineStorage } from "./storage.js";
import type { Source } from "./types.js";

const execFileAsync = promisify(execFile);
const appleString = (value: string): string => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

async function executeInOpenChromeTab(url: string, javascript: string): Promise<string> {
  const encoded = Buffer.from(javascript).toString("base64");
  const script = [
    'tell application "Google Chrome"',
    'repeat with browserWindow in windows',
    'repeat with browserTab in tabs of browserWindow',
    `if URL of browserTab starts with ${appleString(url)} then`,
    `return execute browserTab javascript ${appleString(`eval(atob("${encoded}"))`)}`,
    'end if',
    'end repeat',
    'end repeat',
    'error "Chrome tab not found"',
    'end tell',
  ].join("\n");
  const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  return stdout.trim();
}

type Resource = { url: string; initiatorType: string };
type Probe = { done: boolean; status?: number; contentType?: string | null; body?: string; error?: string };
type ObservedFeed = { url: string; status: number | null; contentType: string | null; payload: unknown; error: string | null };

async function fetchObservedFeed(tabUrl: string, url: string): Promise<ObservedFeed> {
  await executeInOpenChromeTab(tabUrl, `(() => { window.__bet9jaDiscovery = {done:false}; fetch(${JSON.stringify(url)}, {credentials:"include"}).then(async response => { window.__bet9jaDiscovery = {done:true,status:response.status,contentType:response.headers.get("content-type"),body:await response.text()}; }).catch(error => { window.__bet9jaDiscovery = {done:true,error:String(error)}; }); return "started"; })()`);
  let probe: Probe = { done: false };
  for (let attempt = 0; attempt < 50 && !probe.done; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    probe = JSON.parse(await executeInOpenChromeTab(tabUrl, 'JSON.stringify(window.__bet9jaDiscovery ? {done:window.__bet9jaDiscovery.done,status:window.__bet9jaDiscovery.status,contentType:window.__bet9jaDiscovery.contentType,error:window.__bet9jaDiscovery.error} : {done:false})')) as Probe;
  }
  if (probe.done && !probe.error) probe = JSON.parse(await executeInOpenChromeTab(tabUrl, 'JSON.stringify(window.__bet9jaDiscovery)')) as Probe;
  let payload: unknown = null;
  if (probe.body) try { payload = JSON.parse(probe.body) as unknown; } catch { payload = probe.body; }
  return { url, status: probe.status ?? null, contentType: probe.contentType ?? null, payload, error: probe.error ?? (probe.done ? null : "Response timeout") };
}

/** Reads the already-open Chrome tab. No new browser, profile, HAR or manual capture is created. */
export async function discoverOpenChromeNetwork(source: Source, storage: EngineStorage): Promise<{
  status: "DISCOVERED" | "NO_LIST_SPORTS";
  source: Source;
  pageUrl: string;
  resources: Resource[];
  listSports: ObservedFeed | null;
  prematchEvents: ObservedFeed | null;
  liveEvents: ObservedFeed | null;
  rawPath: string;
}> {
  const snapshot = JSON.parse(await executeInOpenChromeTab(source.url, `JSON.stringify({pageUrl:location.href,resources:performance.getEntriesByType("resource").filter(entry=>["fetch","xmlhttprequest"].includes(entry.initiatorType)).map(entry=>({url:entry.name,initiatorType:entry.initiatorType}))})`)) as { pageUrl: string; resources: Resource[] };
  const resources = [...new Map(snapshot.resources.map(resource => [resource.url, resource])).values()];
  const observed = resources.find(resource => /\/(?:list_sports|GetSports)(?:[/?#]|$)/i.test(resource.url));
  const prematchUrl = resources.find(resource => /\/GetEventsInDailyBundleV3(?:[/?#]|$)/i.test(resource.url))?.url;
  const liveUrl = resources.find(resource => /\/GetLiveEventsV3(?:[/?#]|$)/i.test(resource.url))?.url;
  const listSports = observed ? await fetchObservedFeed(source.url, observed.url) : null;
  const prematchEvents = prematchUrl ? await fetchObservedFeed(source.url, prematchUrl) : null;
  const liveEvents = liveUrl ? await fetchObservedFeed(source.url, liveUrl) : null;
  const rawPath = await storage.saveRaw(source, "network", {
    url: snapshot.pageUrl,
    transport: "chrome-renzo-resource-discovery",
    payload: { resources, listSports, prematchEvents, liveEvents },
    capturedAt: new Date().toISOString(),
  }, 0);
  return { status: listSports?.payload ? "DISCOVERED" : "NO_LIST_SPORTS", source, pageUrl: snapshot.pageUrl, resources, listSports, prematchEvents, liveEvents, rawPath };
}
