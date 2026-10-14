import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AcquisitionContext, AcquisitionMethod, Evidence, Source } from "./types.js";
import { CollectionStore } from "./collection.js";
import { SourceMemoryStore, sourceKey } from "./memory.js";

let lastCaptureTimestamp = 0;
const privateKey = /password|passwd|secret|token|cookie|authorization|api.?key|email|phone|address|balance|wallet|account|session|customer|username|user_id|ip_address/i;
const redact = (value: unknown, depth = 0, key = ""): unknown => {
  if (depth > 20) return "[OMITTED: depth]";
  if (Array.isArray(value)) return value.slice(0, key === "records" ? value.length : 2_000).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([name]) => !privateKey.test(name)).map(([name, item]) => [name, redact(item, depth + 1, name)]));
  return typeof value === "string" ? value.slice(0, 20_000) : value;
};
const atomicJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, path);
};

export class EngineStorage {
  readonly memory: SourceMemoryStore;
  private readonly pendingWrites = new Set<Promise<string>>();
  async flush() { await Promise.allSettled([...this.pendingWrites]); }
  constructor(readonly root = ".engine") { this.memory = new SourceMemoryStore(root); }

  readMemory(source: Source) { return this.memory.read(source); }

  saveRaw(source: Source, method: AcquisitionMethod, evidence: Evidence, recordCount: number): Promise<string> {
    const task = this.saveRawWrite(source, method, evidence, recordCount); this.pendingWrites.add(task);
    void task.finally(() => this.pendingWrites.delete(task)).catch(() => undefined);
    return task;
  }
  private async saveRawWrite(source: Source, method: AcquisitionMethod, evidence: Evidence, recordCount: number): Promise<string> {
    const path = join(this.root, "raw", `${sourceKey(source)}-${lastCaptureTimestamp = Math.max(Date.now(), lastCaptureTimestamp + 1)}-${method}.json`);
    const { screenshot, screenshots, ...metadata } = evidence;
    const copiedText = (evidence.payload as { copiedText?: unknown } | null)?.copiedText;
    const textPath = typeof copiedText === 'string' && copiedText.trim() ? path.replace(/\.json$/, '.txt') : undefined;
    if (textPath) { await mkdir(dirname(textPath), { recursive: true }); await writeFile(textPath, copiedText as string, { mode: 0o600 }); }
    const screenshotPath = screenshot ? path.replace(/\.json$/, ".png") : undefined;
    if (screenshotPath) {
      await mkdir(dirname(screenshotPath), { recursive: true });
      await writeFile(screenshotPath, screenshot!, { mode: 0o600 });
    }
    const screenshotPaths: string[] = [];
    for (const [index, tile] of (screenshots ?? []).entries()) {
      const tilePath = path.replace(/\.json$/, `-tile-${index + 1}.png`);
      await mkdir(dirname(tilePath), { recursive: true });
      await writeFile(tilePath, tile, { mode: 0o600 }); screenshotPaths.push(tilePath);
    }
    await atomicJson(path, { source, method, retrievedAt: new Date().toISOString(), recordCount,
      evidence: { ...metadata, ...(textPath ? { textPath } : {}), ...(screenshotPath ? { screenshotPath } : {}), ...(screenshotPaths.length ? { screenshotPaths } : {}), payload: redact(evidence.payload) } });
    await new CollectionStore(this.root).saveReceipt(path, source, method, { ...metadata, screenshotPath, screenshotPaths }, recordCount);
    return path;
  }

  async saveFailure(context: AcquisitionContext, attempts: Array<{ method: AcquisitionMethod; reason: string }>): Promise<string> {
    const folder = join(this.root, "raw", `${sourceKey(context.source)}-${new Date().toISOString().replace(/[:.]/g, "-")}-failure`);
    await mkdir(folder, { recursive: true });
    const page = context.page && !context.page.isClosed() ? context.page : null;
    const unavailable: Record<string, string> = {};
    let finalUrl: string | null = null;
    let title: string | null = null;
    if (page) {
      try { finalUrl = page.url(); } catch (error) { unavailable.finalUrl = String(error); }
      try { title = await page.title(); } catch (error) { unavailable.title = String(error); }
      try { await writeFile(join(folder, "page.html"), await page.content(), { mode: 0o600 }); }
      catch (error) { unavailable["page.html"] = `page.content() failed: ${String(error)}`; await writeFile(join(folder, "page.html"), "null", { mode: 0o600 }); }
      try { await writeFile(join(folder, "page.png"), await page.screenshot({ fullPage: true }), { mode: 0o600 }); }
      catch (error) { unavailable["page.png"] = `Full-page screenshot failed: ${String(error)}`; await writeFile(join(folder, "page.png"), "null", { mode: 0o600 }); }
    } else {
      const reason = context.page ? "Browser page was closed before failure capture" : "Browser page was never opened";
      unavailable["page.html"] = reason;
      unavailable["page.png"] = reason;
      unavailable.finalUrl = reason;
      unavailable.title = reason;
      await writeFile(join(folder, "page.html"), "null", { mode: 0o600 });
      await writeFile(join(folder, "page.png"), "null", { mode: 0o600 });
    }
    const captures = context.networkCaptures ?? [];
    if (!captures.length) unavailable["network.json"] = context.networkCaptures
      ? "NetworkHandler captured no XHR/fetch/GraphQL/SSE/WebSocket/config payloads"
      : "NetworkHandler did not run or did not initialize capture";
    await writeFile(join(folder, "network.json"), JSON.stringify(captures, null, 2), { mode: 0o600 });
    if (context.accessibilityTree === undefined) unavailable["accessibility.json"] = "Accessibility.getFullAXTree did not return a tree";
    await writeFile(join(folder, "accessibility.json"), JSON.stringify(context.accessibilityTree ?? null, null, 2), { mode: 0o600 });
    await writeFile(join(folder, "context.json"), JSON.stringify({
      source: context.source,
      lastHandler: attempts.at(-1)?.method ?? null,
      attempts,
      finalUrl,
      title,
      unavailable
    }, null, 2), { mode: 0o600 });
    return folder;
  }
}
