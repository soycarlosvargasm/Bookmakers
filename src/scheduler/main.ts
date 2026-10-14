import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSources } from "../batch.js";
import { loadSourceCatalog } from "../sources/registry.js";
import type { Source, SourceMemory } from "../engine/types.js";
import { schedule, type ScheduleOptions } from "./scheduler.js";

const activeTypes = ["bestfightodds", "fightodds", "pinnacle", "betsson"];

/** Catalogue identity plus the URLs already verified by this engine, without editing either. */
export async function loadActiveSources(dataDir = ".engine"): Promise<Source[]> {
  const catalog = catalogSources(await loadSourceCatalog());
  const verified = new Map<string, SourceMemory>();
  const folder = join(dataDir, "memory");
  for (const file of await readdir(folder)) {
    if (!file.endsWith(".json")) continue;
    const memory = JSON.parse(await readFile(join(folder, file), "utf8")) as SourceMemory;
    if (!activeTypes.includes(memory.source?.type) || !memory.lastSuccessAt) continue;
    const previous = verified.get(memory.source.type);
    if (!previous || memory.lastSuccessAt > previous.lastSuccessAt!) verified.set(memory.source.type, memory);
  }
  return activeTypes.map(type => {
    const source = verified.get(type)?.source ?? catalog.find(source => source.type === type);
    if (!source) throw new Error(`No registered or previously verified source for ${type}`);
    return { ...source };
  });
}

async function main(): Promise<void> {
  const options: Partial<ScheduleOptions> = {};
  const fields = { "--interval-minutes": "intervalMinutes", "--per-source-timeout-ms": "perSourceTimeoutMs", "--delay-ms": "delayBetweenSourcesMs" } as const;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i] as keyof typeof fields;
    if (!(name in fields) || args[i + 1] === undefined) throw new Error("Usage: npm run engine:schedule -- [--interval-minutes N] [--per-source-timeout-ms N] [--delay-ms N]");
    options[fields[name]] = Number(args[i + 1]);
  }
  await schedule({ ...options, sources: await loadActiveSources() }).completion;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
