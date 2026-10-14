import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sourceKey } from "../engine/memory.js";
import type { Source } from "../engine/types.js";
import type { ChangeStats, OddsChange } from "./detector.js";

export type StoredChanges = {
  cycleId: string; detectedAt: string; source: Source; previousSnapshot: string | null; currentSnapshot: string;
  stats: ChangeStats | { firstRun: true }; changes: OddsChange[];
};
export class ChangesStore {
  constructor(private readonly root = ".engine", private readonly log: (line: string) => void = console.log) {}
  async save(input: StoredChanges): Promise<string | null> {
    if (!("firstRun" in input.stats) && !input.changes.length) { this.log(`no changes detected: ${input.source.type}`); return null; }
    const folder = join(this.root, "changes", input.detectedAt.slice(0, 10));
    await mkdir(folder, { recursive: true });
    // Four sources can finish in the same second. Each source/cycle needs its own file.
    const path = join(folder, `${input.detectedAt.slice(11, 19).replace(/:/g, "-")}-${sourceKey(input.source)}-${input.cycleId}.json`);
    await writeFile(path, JSON.stringify(input, null, 2) + "\n", { flag: "wx" });
    this.log(`Changes ${input.source.type}: ${"firstRun" in input.stats ? "firstRun" : `odds_changed=${input.stats.changed} new_selection=${input.stats.new} removed_selection=${input.stats.removed}`} | ${path}`);
    return path;
  }
}
