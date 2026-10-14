import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StoredChanges } from "./store.js";

export async function showChanges(date: string, root = ".engine", log: (line: string) => void = console.log): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Date must be YYYY-MM-DD");
  const folder = join(root, "changes", date);
  const files = await readdir(folder).catch(error => { if (error.code === "ENOENT") return [] as string[]; throw error; });
  const events = new Map<string, number>(), markets = new Map<string, number>();
  let count = 0;
  for (const file of files.sort()) if (file.endsWith(".json")) {
    const data = JSON.parse(await readFile(join(folder, file), "utf8")) as StoredChanges;
    for (const change of data.changes) {
      count++;
      const event = change.eventName ?? "null", market = change.market ?? "null";
      events.set(event, (events.get(event) ?? 0) + 1); markets.set(market, (markets.get(market) ?? 0) + 1);
    }
  }
  log(`Changes ${date}: ${count}`);
  for (const [label, values, limit] of [["Top 10 events", events, 10], ["Top 5 markets", markets, 5]] as const) {
    log(label);
    for (const [name, total] of [...values].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)) log(`${total} | ${name}`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  await (args.length === 2 && args[0] === "--date" ? showChanges(args[1]!) : Promise.reject(new Error("Usage: npm run changes:show -- --date YYYY-MM-DD")))
    .catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
