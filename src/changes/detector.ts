import type { ProviderRecord } from "../normalization/types.js";

export type ChangeStats = { compared: number; changed: number; new: number; removed: number; unchanged: number };
type Identity = {
  source: string; sourceEventId: string; sourceMarketId: string; sourceSelectionId: string;
  eventName: string | null; market: string | null; selection: string | null; bookmaker: string | null;
  previousOdds: string | null; currentOdds: string | null; previousDecimal: number | null; currentDecimal: number | null;
};
export type OddsChange = Identity & ({ kind: "odds_changed"; direction: "up" | "down"; magnitude: number } | { kind: "new_selection" | "removed_selection" });

function index(records: ProviderRecord[]): Map<string, ProviderRecord> {
  const result = new Map<string, ProviderRecord>();
  for (const record of records) {
    const fields = [record.sportsbook, record.sourceEventId, record.sourceMarketId, record.sourceSelectionId];
    if (fields.some(value => typeof value !== "string" || !value.trim())) throw new Error("Snapshot record lacks source or stable event/market/selection IDs");
    const key = JSON.stringify(fields);
    const previous = result.get(key);
    if (previous && (previous.decimalOdds !== record.decimalOdds || previous.rawOdds !== record.rawOdds)) throw new Error(`Conflicting duplicate selection key: ${key}`);
    result.set(key, record);
  }
  return result;
}
const decimal = (record?: ProviderRecord): number | null => typeof record?.decimalOdds === "number" && Number.isFinite(record.decimalOdds) ? record.decimalOdds : null;
function identity(previous: ProviderRecord | undefined, current: ProviderRecord | undefined): Identity {
  const record = current ?? previous!;
  return { source: record.sportsbook!, sourceEventId: record.sourceEventId!, sourceMarketId: record.sourceMarketId!, sourceSelectionId: record.sourceSelectionId!,
    eventName: record.eventName ?? null, market: record.market ?? null, selection: record.selection ?? null, bookmaker: record.bookmaker ?? null,
    previousOdds: previous?.rawOdds ?? null, currentOdds: current?.rawOdds ?? null, previousDecimal: decimal(previous), currentDecimal: decimal(current) };
}

export function detectChanges(previousRecords: ProviderRecord[], currentRecords: ProviderRecord[]): { changes: OddsChange[]; stats: ChangeStats } {
  const previous = index(previousRecords), current = index(currentRecords);
  const changes: OddsChange[] = [];
  const stats: ChangeStats = { compared: 0, changed: 0, new: 0, removed: 0, unchanged: 0 };
  for (const [key, record] of current) {
    const old = previous.get(key);
    if (!old) { changes.push({ kind: "new_selection", ...identity(undefined, record) }); stats.new++; continue; }
    stats.compared++;
    const before = decimal(old), after = decimal(record);
    if (before === null || after === null) throw new Error(`Cannot compare non-finite or missing decimalOdds for ${key}`);
    // Compare the threshold endpoint directly: 2.01 must qualify against 2,
    // despite binary subtraction yielding 0.009999999999999787. Magnitude stays unrounded.
    if (after !== before && (after >= before + 0.01 || before >= after + 0.01)) {
      changes.push({ kind: "odds_changed", ...identity(old, record), direction: after > before ? "up" : "down", magnitude: Math.abs(after - before) });
      stats.changed++;
    } else stats.unchanged++;
  }
  for (const [key, record] of previous) if (!current.has(key)) { changes.push({ kind: "removed_selection", ...identity(record, undefined) }); stats.removed++; }
  return { changes, stats };
}
