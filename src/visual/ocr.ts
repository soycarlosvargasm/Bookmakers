import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export type OcrLine = { text: string; confidence: number; box: { x: number; y: number; width: number; height: number } };
export type OcrScreenshot = { width: number; height: number; lines: OcrLine[] };
const exec = promisify(execFile);
const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = moduleRoot.endsWith("/dist") ? dirname(moduleRoot) : moduleRoot;
let backend: Promise<string> | undefined;

export async function ensureOcrBackend(): Promise<string> {
  if (process.platform !== "darwin") throw new Error("Screenshot OCR requires macOS Vision on this installation.");
  backend ??= (async () => {
    const source = join(root, "src/visual/native-ocr.swift");
    const digest = createHash("sha256").update(await readFile(source)).digest("hex").slice(0, 20);
    const directory = join(homedir(), "Library", "Application Support", "SportsbookCollector", "ocr");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const binary = join(directory, `vision-${digest}`);
    if (!(await stat(binary).catch(() => null))) {
      const temporary = `${binary}.${process.pid}.tmp`;
      try { await exec("swiftc", [source, "-o", temporary], { timeout: 60_000 }); await rename(temporary, binary); }
      finally { await rm(temporary, { force: true }); }
    }
    return binary;
  })().catch(error => { backend = undefined; throw error; });
  return backend;
}

/** Local OCR only: no screenshot, account data or API key is sent to a service. */
export async function recognizeScreenshot(screenshot: Buffer, signal?: AbortSignal): Promise<OcrScreenshot> {
  signal?.throwIfAborted();
  const binary = await ensureOcrBackend();
  signal?.throwIfAborted();
  const folder = await mkdtemp(join(tmpdir(), "sportsbook-screenshot-"));
  try {
    const path = join(folder, "page.png");
    await writeFile(path, screenshot, { mode: 0o600 });
    const { stdout } = await exec(binary, [path], { timeout: 20_000, signal, maxBuffer: 4 * 1024 * 1024 });
    const result = JSON.parse(stdout) as OcrScreenshot;
    if (!Number.isFinite(result.width) || result.width <= 0 || !Number.isFinite(result.height) || result.height <= 0 || !Array.isArray(result.lines))
      throw new Error("OCR returned an invalid screenshot result.");
    return result;
  } finally { await rm(folder, { recursive: true, force: true }); }
}
