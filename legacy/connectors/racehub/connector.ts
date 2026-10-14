import { HttpRequestError, RequestGovernor, requestGovernorFor, retryAfterMs } from "../../scheduler/requests.js";
import type { HealthStatus } from "../../health/types.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";
import type { ConnectorCollection, ConnectorContext, SportsbookConnector } from "../types.js";

type Price = { bookmaker?: string; winOdds?: number | null; placeOdds?: number | null; lastUpdated?: string | null };
type Runner = { id?: string; tabNo?: number; name?: string; scratched?: boolean; odds?: Price[] };
type Race = { raceId?: string; raceNumber?: number; raceName?: string; startTime?: string; status?: string; runners?: Runner[] };
type Meeting = { id?: string; name?: string; track?: string; state?: string; country?: string; raceType?: string };
type Initial = { date?: string; meetingId?: string; raceNumber?: number; meetings?: Meeting[]; race?: Race };

export class RaceHubConnector implements SportsbookConnector {
  readonly id = "racehub-next-flight";
  readonly context: ConnectorContext = { sportsbook: "racehub", accountAlias: "public" };
  private readonly requests: RequestGovernor;
  constructor(private readonly sourceUrl = "https://racehub.com.au/odds", private readonly timeoutMs = 30_000, requests?: RequestGovernor) { this.requests = requests ?? requestGovernorFor("racehub"); }
  async initialize(): Promise<void> {}
  async login(): Promise<void> {}
  async restoreSession(): Promise<void> {}
  async logout(): Promise<void> {}
  async shutdown(): Promise<void> {}
  async validateSession(): Promise<boolean> { return Boolean((await this.fetchInitial()).race?.runners); }
  async health(): Promise<{ status: HealthStatus; message?: string }> {
    try { const data = await this.fetchInitial(); return { status: "HEALTHY", message: `${data.race?.runners?.length ?? 0} runners in current race` }; }
    catch (cause) { return { status: "UNHEALTHY", message: cause instanceof Error ? cause.message : String(cause) }; }
  }
  collectEvents(): Promise<ConnectorCollection> { return this.collect(); }
  collectPrematch(): Promise<ConnectorCollection> { return this.collect(); }
  async collectLive(): Promise<ConnectorCollection> { return { rawPayloads: [], normalizedRecords: [] }; }

  private async collect(): Promise<ConnectorCollection> {
    const initial = await this.fetchInitial();
    const race = initial.race;
    if (!race) return { rawPayloads: [], normalizedRecords: [] };
    const collectedAt = new Date().toISOString();
    const meeting = initial.meetings?.find((item) => item.id === initial.meetingId);
    const records = recordsFor(race, meeting, this.sourceUrl, collectedAt);
    const rawPayload: RawPayloadInput = { sportsbook: "racehub", accountAlias: "public", sourceType: "next-flight-json", sourceUrl: this.sourceUrl, retrievedAt: collectedAt, providerTimestamp: null, externalEventId: race.raceId ?? null, parserVersion: "racehub-next-flight-v1", rawPayload: { date: initial.date, meeting, race }, normalizedRecordCount: records.length };
    return { rawPayloads: [rawPayload], normalizedRecords: records };
  }

  private async fetchInitial(): Promise<Initial> {
    const body = await this.requests.run(async () => {
      const response = await fetch(this.sourceUrl, { headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; SportsMarketDataEngine/0.1)" }, signal: AbortSignal.timeout(this.timeoutMs) });
      const text = await response.text();
      if (!response.ok) throw new HttpRequestError(`RaceHub HTTP ${response.status}`, response.status, retryAfterMs(response.headers.get("retry-after")));
      return text;
    });
    for (const value of flightValues(body)) {
      const found = findInitial(value);
      if (found) return found;
    }
    throw new Error("RaceHub Next.js flight data did not contain an odds race");
  }
}

export function flightValues(html: string): unknown[] {
  const stream = [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].flatMap((match) => {
    try { const value = JSON.parse(match[1]!) as unknown[]; return typeof value[1] === "string" ? [value[1]] : []; } catch { return []; }
  }).join("");
  const values: unknown[] = [];
  for (const line of stream.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    try { values.push(JSON.parse(line.slice(colon + 1))); } catch { /* Text records and split chunks are not JSON records. */ }
  }
  return values;
}

function findInitial(value: unknown): Initial | null {
  if (!value || typeof value !== "object") return null;
  if (!Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const initial = object.initial as Initial | undefined;
    if (initial?.race?.runners) return initial;
  }
  for (const child of Object.values(value)) { const found = findInitial(child); if (found) return found; }
  return null;
}

const slug = (value: string | undefined): string => (value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const eventStatus = (status?: string): string => /open/i.test(status ?? "") ? "prematch" : /running/i.test(status ?? "") ? "live" : /final|closed|abandoned/i.test(status ?? "") ? "closed" : "unknown";
const recordsFor = (race: Race, meeting: Meeting | undefined, sourceUrl: string, collectedAt: string): ProviderRecord[] => (race.runners ?? []).flatMap((runner) => (runner.odds ?? []).flatMap((price) => {
  if (!race.raceId || !runner.name || !price.bookmaker) return [];
  const displayedBook = price.bookmaker;
  return (["win", "place"] as const).flatMap((market) => {
    const odds = market === "win" ? price.winOdds : price.placeOdds;
    if (typeof odds !== "number" || !Number.isFinite(odds) || odds <= 1) return [];
    return [{ sportsbook: `racehub-${slug(price.bookmaker)}`, sport: meeting?.raceType ?? "Racing", competition: meeting?.track ?? meeting?.name ?? null,
      eventName: `${meeting?.track ?? meeting?.name ?? "Race"} R${race.raceNumber ?? "?"}${race.raceName ? `: ${race.raceName}` : ""}`,
      participants: (race.runners ?? []).map((item) => item.name).filter((name): name is string => Boolean(name)), eventStartTime: race.startTime ?? null,
      eventStatus: eventStatus(race.status), market, marketPeriod: "race", selection: runner.name, selectionStatus: runner.scratched ? "scratched" : "open", line: null,
      decimalOdds: odds, rawOdds: String(odds), rawOddsFormat: "decimal", sourceEventId: race.raceId, sourceMarketId: `${race.raceId}:${market}`,
      sourceSelectionId: `${race.raceId}:${market}:${runner.id ?? runner.tabNo ?? runner.name}:${price.bookmaker}`, sourceUrl, providerTimestamp: price.lastUpdated ?? null, collectedAt,
      qualifiers: { observedVia: "racehub-next-flight", displayedBook, raceNumber: String(race.raceNumber ?? ""), runnerNumber: String(runner.tabNo ?? "") } }];
  });
}));
