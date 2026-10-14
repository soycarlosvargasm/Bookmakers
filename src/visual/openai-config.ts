import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

type PrivateConfig = { apiKey?: string; model?: string; enabled?: boolean };
const path = join(homedir(), "Library", "Application Support", "SportsbookCollector", "openai.json");
export async function visionConfig(): Promise<{ apiKey: string; model: string; enabled: boolean }> {
  let saved: PrivateConfig = {};
  try { saved = JSON.parse(await readFile(path, "utf8")) as PrivateConfig; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("No se pudo leer la configuración privada de visión."); }
  const apiKey = process.env.OPENAI_API_KEY?.trim() || saved.apiKey?.trim() || "";
  return { apiKey, model: process.env.OPENAI_VISION_MODEL?.trim() || saved.model || "gpt-4.1",
    enabled: process.env.OPENAI_VISION_ENABLED === "false" ? false : saved.enabled !== false };
}
export async function visionStatus() {
  const config = await visionConfig();
  return { configured: Boolean(config.apiKey), enabled: Boolean(config.apiKey) && config.enabled, model: config.model,
    usage: { ...visionUsage }, validation: "OCR anclado + cross-validation; sin corroboración: UNCONFIRMED" };
}
export async function setVisionEnabled(enabled: boolean) {
  const config = await visionConfig();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...config, enabled }), { mode: 0o600 });
  await rename(temporary, path); await chmod(path, 0o600);
  return visionStatus();
}
// No prompts, images, headers, credentials or provider response bodies in status/logs.
export const visionUsage = { requests: 0, inputTokens: 0, outputTokens: 0, acceptedQuotes: 0, rejectedQuotes: 0, lastError: "" };
