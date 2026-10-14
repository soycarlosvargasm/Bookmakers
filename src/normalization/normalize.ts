import { oddsToDecimal, type OddsFormat } from "./odds.js";
import type { NormalizedRecord, ProviderRecord } from "./types.js";

const nullable = <T>(value: T | undefined): T | null => value === undefined ? null : value;

export const normalizeRecord = (input: ProviderRecord, now = new Date().toISOString()): NormalizedRecord => {
  const rawOdds = nullable(input.rawOdds);
  const rawOddsFormat = nullable(input.rawOddsFormat) as OddsFormat | null;
  const decimalOdds = input.decimalOdds ?? (rawOdds !== null && rawOddsFormat !== null ? oddsToDecimal(rawOdds, rawOddsFormat) : null);
  return {
    sportsbook: nullable(input.sportsbook), ...(input.bookmaker !== undefined ? { bookmaker: nullable(input.bookmaker) } : {}), sport: nullable(input.sport), competition: nullable(input.competition),
    eventName: nullable(input.eventName), participants: nullable(input.participants),
    homeParticipant: nullable(input.homeParticipant), awayParticipant: nullable(input.awayParticipant),
    eventStartTime: nullable(input.eventStartTime), eventStatus: nullable(input.eventStatus), phase: nullable(input.phase),
    liveScore: nullable(input.liveScore), liveClock: nullable(input.liveClock),
    market: nullable(input.market), marketPeriod: nullable(input.marketPeriod), selection: nullable(input.selection), selectionStatus: nullable(input.selectionStatus),
    line: nullable(input.line), decimalOdds, rawOdds, rawOddsFormat,
    sourceEventId: nullable(input.sourceEventId), sourceMarketId: nullable(input.sourceMarketId), sourceSelectionId: nullable(input.sourceSelectionId),
    sourceUrl: nullable(input.sourceUrl), providerTimestamp: nullable(input.providerTimestamp),
    collectedAt: input.collectedAt ?? now, participantPlayer: nullable(input.participantPlayer), qualifiers: nullable(input.qualifiers)
  };
};
