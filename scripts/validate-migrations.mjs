import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../migrations/", import.meta.url);
const entries = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
if (entries.length === 0) throw new Error("No SQL migrations found");
for (const name of entries) {
  const sql = await readFile(new URL(name, directory), "utf8");
  if (!/^\s*(CREATE|ALTER|DROP)\s+/m.test(sql)) throw new Error(`Migration has no schema statement: ${name}`);
  console.log(`validated ${name}`);
}
console.log(`validated ${entries.length} migration(s)`);
