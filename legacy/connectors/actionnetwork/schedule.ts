import { extractActionSchedule } from "./embedded-odds.js";
import type { ConnectorCollection } from "../types.js";
import { setTimeout as delay } from "node:timers/promises";

const BOOK_IDS = "15,30,49,68,69,71,75,79,123,2988,4727";
export type ScheduleWindow = { sport: string; date?: string; week?: number; seasonType?: "reg" | "post" | "pre" };

/** Reads the same dated/weekly JSON board requested by Action Network's public odds UI. */
export async function collectActionSchedule(window: ScheduleWindow): Promise<ConnectorCollection> {
  const url = new URL(`/web/v2/scoreboard/${window.sport}`, "https://api.actionnetwork.com");
  url.searchParams.set("bookIds", BOOK_IDS);
  url.searchParams.set("periods", "event");
  if (window.date) url.searchParams.set("date", window.date);
  if (window.week !== undefined) { url.searchParams.set("seasonType", window.seasonType ?? "reg"); url.searchParams.set("week", String(window.week)); }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < 2) { await delay((attempt + 1) * 1_500); continue; }
        throw new Error(`Action Network schedule HTTP ${response.status} for ${window.sport}`);
      }
      const payload = await response.json() as unknown;
      return extractActionSchedule(payload, window.sport, url.toString());
    } catch (error) {
      if (attempt === 2 || (error instanceof Error && /HTTP 4\d\d/.test(error.message))) throw error;
      await delay((attempt + 1) * 1_500);
    }
  }
  throw new Error(`Action Network schedule unavailable for ${window.sport}`);
}
