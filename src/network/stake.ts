import type { ProviderRecord } from "../normalization/types.js";

export const STAKE_NETWORK_PROFILE_VERSION = "stake-graphql-v1";
export const STAKE_ENDPOINT = "https://stake.mx/_api/graphql";
type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const rows = (value: unknown): Obj[] => Array.isArray(value) ? value.map(obj) : [];
const str = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
export type StakeCapture = { url: string; payload: unknown };

export function isStakeFeedUrl(value: string): boolean {
  try { const url = new URL(value); return url.origin === "https://stake.mx" && url.pathname === "/_api/graphql"; }
  catch { return false; }
}

/** Only current homepage selection prices; never historical highroller bet prices. */
export function extractStakeRecords(captures: StakeCapture[], collectedAt = new Date().toISOString()): ProviderRecord[] {
  const found = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    if (!isStakeFeedUrl(capture.url)) continue;
    const data = obj(obj(capture.payload).data);
    const selections = rows(data.sportHomepageTrendingTopSgms).flatMap(group => rows(group.outcomes));
    for (const group of rows(data.sportHomepageTrendingMatches)) {
      const fixture = obj(group.fixture);
      for (const section of rows(fixture.groups)) for (const template of rows(section.templates)) {
        for (const market of rows(template.markets)) for (const outcome of rows(market.outcomes)) {
          selections.push({ outcome: { ...outcome, market: { ...market, fixture } } });
        }
      }
    }
    for (const pick of rows(data.sportHomepageTrendingTopPicks)) {
      const market = obj(obj(pick.outcome).market);
      for (const outcome of rows(market.outcomes)) selections.push({ outcome: { ...outcome, market } });
    }
      for (const row of selections) {
        const outcome = obj(row.outcome), market = obj(outcome.market), fixture = obj(market.fixture);
        const selectionId = str(outcome.id), marketId = str(market.id), eventId = str(fixture.id);
        const selection = str(outcome.name), marketName = str(market.name), eventName = str(fixture.name);
        if (!selectionId || !marketId || !eventId || !selection || !marketName || !eventName || outcome.active !== true || market.status !== "active") continue;
        const decimalOdds = outcome.odds;
        if (typeof decimalOdds !== "number" || !Number.isFinite(decimalOdds) || decimalOdds <= 1) continue;
        const details = obj(fixture.data), tournament = obj(fixture.tournament);
        const participants = rows(details.competitors).map(competitor => str(competitor.name)).filter((name): name is string => name !== null);
        const teams = rows(details.teams);
        const record: ProviderRecord = {
          sportsbook: "stake", bookmaker: "stake", sport: str(obj(obj(tournament.category).sport).name),
          competition: str(tournament.name), eventName, participants: participants.length ? participants : null,
          homeParticipant: str(teams.find(team => team.qualifier === "home")?.name),
          awayParticipant: str(teams.find(team => team.qualifier === "away")?.name),
          eventStartTime: str(details.startTime), eventStatus: str(fixture.status), market: marketName,
          marketPeriod: null, selection, selectionStatus: "active", line: null,
          rawOdds: String(decimalOdds), rawOddsFormat: "decimal", decimalOdds,
          sourceEventId: eventId, sourceMarketId: marketId, sourceSelectionId: selectionId,
          sourceUrl: capture.url, providerTimestamp: null, collectedAt, participantPlayer: null,
          qualifiers: { extraction: "network", profileVersion: STAKE_NETWORK_PROFILE_VERSION }
        };
        found.set(JSON.stringify([eventId, marketId, selectionId]), record);
      }
  }
  return [...found.values()];
}
