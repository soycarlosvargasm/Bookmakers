import { oddsToDecimal } from "../../normalization/odds.js";
import type { ProviderRecord } from "../../normalization/types.js";
import type { BovadaCouponItem, BovadaEvent, BovadaMarket, BovadaOutcome } from "./types.js";

const iso = (milliseconds: number | undefined): string | null => milliseconds && Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
const text = (value: string | undefined): string | null => value === undefined ? null : value.trim() || null;

const competitionName = (item: BovadaCouponItem): string | null => {
  const path = item.path?.find((entry) => ["LEAGUE", "COMPETITION", "TOURNAMENT"].includes(entry.type ?? ""));
  return text(path?.description);
};

const eventState = (event: BovadaEvent): string => event.live === true ? "live" : event.status === "U" ? "prematch" : event.status === "S" ? "suspended" : "unknown";
const participants = (event: BovadaEvent): string[] => (event.competitors ?? []).map((competitor) => competitor.name).filter((name): name is string => Boolean(name));

const recordFor = (item: BovadaCouponItem, event: BovadaEvent, groupDescription: string | undefined, market: BovadaMarket, outcome: BovadaOutcome, sourceUrl: string, collectedAt: string): ProviderRecord => {
  const rawOdds = outcome.price?.american ?? outcome.price?.fractional ?? outcome.price?.decimal;
  const rawOddsFormat = outcome.price?.american !== undefined ? "american" : outcome.price?.fractional !== undefined ? "fractional" : outcome.price?.decimal !== undefined ? "decimal" : null;
  const decimalOdds = outcome.price?.decimal !== undefined ? Number(outcome.price.decimal) : rawOdds && rawOddsFormat ? oddsToDecimal(rawOdds, rawOddsFormat) : null;
  const competitorNames = participants(event);
  const home = event.competitors?.find((competitor) => competitor.home === true)?.name;
  const away = event.competitors?.find((competitor) => competitor.home === false)?.name;
  return {
    sportsbook: "bovada", sport: text(event.sport), competition: competitionName(item), eventName: text(event.description),
    participants: competitorNames.length ? competitorNames : null, homeParticipant: text(home), awayParticipant: text(away),
    eventStartTime: iso(event.startTime), eventStatus: eventState(event), phase: null,
    market: text(market.description), marketPeriod: text(market.period?.description), selection: text(outcome.description),
    line: text(outcome.price?.handicap), decimalOdds: decimalOdds !== null && Number.isFinite(decimalOdds) && decimalOdds >= 1 ? decimalOdds : null,
    rawOdds: text(rawOdds), rawOddsFormat, sourceEventId: text(event.id), sourceMarketId: text(market.id), sourceSelectionId: text(outcome.id),
    sourceUrl: sourceUrl, providerTimestamp: iso(event.lastModified), participantPlayer: null,
    qualifiers: { marketKey: market.key ?? "", marketTypeId: market.marketTypeId ?? "", displayGroup: groupDescription ?? "" }
  };
};

export const parseCoupon = (items: BovadaCouponItem[], baseUrl: string, collectedAt: string): ProviderRecord[] => items.flatMap((item) => (item.events ?? []).flatMap((event) =>
  (event.displayGroups ?? []).flatMap((group) => (group.markets ?? []).flatMap((market) => (market.outcomes ?? []).map((outcome) => recordFor(item, event, group.description, market, outcome, event.link ? new URL(event.link, baseUrl).toString() : baseUrl, collectedAt)))))
);
