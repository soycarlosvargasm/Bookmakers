import { collectActionSchedule, type ScheduleWindow } from "./connectors/actionnetwork/schedule.js";
import { normalizeRecord } from "./normalization/normalize.js";
import { SupabaseManagementDiscoveryRepository } from "./storage/supabase-management.js";

const repository = await SupabaseManagementDiscoveryRepository.fromLinkedProject();
const before = await repository.visualCounts();
const days = (sport: string, length: number): ScheduleWindow[] => Array.from({ length }, (_, offset) => {
  const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
  return { sport, date };
});
const windows: ScheduleWindow[] = [
  ...days("soccer", 30), ...days("nhl", 14), ...days("mlb", 8),
  ...days("atp", 10), ...days("wta", 10), ...days("ufc", 28),
  ...days("nba", 21), ...days("wnba", 14),
  ...[4, 5, 6, 7].map((week): ScheduleWindow => ({ sport: "nfl", week })),
  ...[5, 6, 7, 8].map((week): ScheduleWindow => ({ sport: "ncaaf", week }))
];
const requested = process.env.SCHEDULE_SPORTS?.split(",").map((value) => value.trim()).filter(Boolean);
const fromDate = process.env.SCHEDULE_FROM_DATE;
const selected = windows.filter((window) => (!requested?.length || requested.includes(window.sport)) && (!fromDate || !window.date || window.date >= fromDate));
const failures: ScheduleWindow[] = [];
console.log(JSON.stringify({ actionSchedule: "before", windows: selected.length, counts: before }));
for (const window of selected) {
  try {
    const collection = await collectActionSchedule(window);
    const records = (collection.normalizedRecords ?? []).map((record) => normalizeRecord(record)).filter((record) => Boolean(record.sportsbook && record.sport && record.eventName && record.sourceEventId && record.sourceMarketId && record.sourceSelectionId && record.market && record.selection && record.sourceUrl && record.decimalOdds && Number.isFinite(record.decimalOdds) && record.decimalOdds > 1 && record.decimalOdds <= 1001 && record.eventStatus !== "closed" && (!record.eventStartTime || record.eventStatus === "live" || Date.parse(record.eventStartTime) >= Date.now() - 86_400_000)));
    if (!records.length) continue;
    const raw = collection.rawPayloads ?? [];
    if (!raw.length) throw new Error("Schedule produced priced rows without RAW");
    await repository.saveMarketCollection(raw, records);
    console.log(JSON.stringify({ window, status: "persisted", records: records.length, fixtures: new Set(records.map((record) => record.sourceEventId)).size, raw: raw.length }));
  } catch (error) { failures.push(window); console.log(JSON.stringify({ window, status: "failed", error: error instanceof Error ? error.message : String(error) })); }
}
console.log(JSON.stringify({ actionSchedule: "after", before, after: await repository.visualCounts(), failures }));
