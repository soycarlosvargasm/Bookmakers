import { oddsToDecimal } from "../../normalization/odds.js";
import type { ProviderRecord, RawPayloadInput } from "../../normalization/types.js";

type JsonObject = Record<string, unknown>;
type MarketEntry = { market: JsonObject; group: string | null };

const asObject = (value: unknown): JsonObject | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string | null => {
  if (typeof value === "string" || typeof value === "number") {
    const result = String(value).trim();
    return result || null;
  }
  return null;
};
const first = (object: JsonObject, keys: readonly string[]): unknown => {
  for (const key of keys) if (object[key] !== undefined && object[key] !== null) return object[key];
  return undefined;
};
const firstText = (object: JsonObject, keys: readonly string[]): string | null => text(first(object, keys));
const nestedText = (value: unknown, keys: readonly string[]): string | null => {
  const object = asObject(value);
  return object ? firstText(object, keys) : text(value);
};

const id = (object: JsonObject, keys: readonly string[]): string | null => firstText(object, keys);

const toIso = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 10_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }
  return null;
};

const normalizedStatus = (value: string | null, live: unknown): string | null => {
  const status = value?.trim().toLowerCase() ?? null;
  if (status && /suspend|lock|unavailable/.test(status)) return "suspended";
  if (status && /close|settle|complete|final/.test(status)) return "closed";
  if (status && /resume/.test(status)) return "resumed";
  if (status && /live|in.?play|started/.test(status)) return "live";
  if (status && /pre|open|scheduled|upcoming/.test(status)) return "prematch";
  return live === true ? "live" : live === false ? "prematch" : null;
};

const scoreValues = (event: JsonObject): string[] | null => {
  const values = asArray(first(event, ["score", "scores", "liveScore", "live_score"])).map(text).filter((item): item is string => item !== null);
  return values.length ? values : null;
};

const findEventObjects = (value: unknown, result: JsonObject[] = []): JsonObject[] => {
  const object = asObject(value);
  if (object) {
    const hasMarkets = ["markets", "marketGroups", "market_groups", "offers", "betOffers", "bettingMarkets"].some((key) => Array.isArray(object[key]));
    const eventId = id(object, ["eventId", "event_id", "eventID", "eventKey", "fixtureId", "gameId"]);
    const eventName = firstText(object, ["eventName", "event_name", "eventDescription", "description", "name", "title"]);
    if (hasMarkets && (eventId || eventName)) result.push(object);
    for (const child of Object.values(object)) findEventObjects(child, result);
  } else if (Array.isArray(value)) {
    for (const child of value) findEventObjects(child, result);
  }
  return result;
};

const marketEntries = (value: unknown, group: string | null = null, result: MarketEntry[] = []): MarketEntry[] => {
  const object = asObject(value);
  if (!object) return result;
  const selectionKeys = ["selections", "outcomes", "runners", "selectionsList", "options", "bets"];
  if (selectionKeys.some((key) => Array.isArray(object[key]))) result.push({ market: object, group });
  for (const key of ["markets", "marketGroups", "market_groups", "offers", "betOffers", "bettingMarkets"]) {
    for (const child of asArray(object[key])) {
      const childObject = asObject(child);
      const nextGroup = key.toLowerCase().includes("group") ? firstText(childObject ?? {}, ["description", "name", "title"]) ?? group : group;
      marketEntries(child, nextGroup, result);
    }
  }
  return result;
};

const selectionObjects = (market: JsonObject): JsonObject[] => {
  for (const key of ["selections", "outcomes", "runners", "selectionsList", "options", "bets"]) {
    const selections = asArray(market[key]).map(asObject).filter((item): item is JsonObject => item !== null);
    if (selections.length) return selections;
  }
  return [];
};

const participants = (event: JsonObject): { all: string[] | null; home: string | null; away: string | null } => {
  const source = first(event, ["participants", "competitors", "teams"]);
  const names = asArray(source).map((item) => nestedText(item, ["name", "teamName", "participantName", "description"])).filter((item): item is string => item !== null);
  const home = nestedText(first(event, ["home", "homeTeam", "homeParticipant"]), ["name", "teamName", "participantName", "description"]) ?? firstText(event, ["homeName", "homeTeamName"]);
  const away = nestedText(first(event, ["away", "awayTeam", "awayParticipant"]), ["name", "teamName", "participantName", "description"]) ?? firstText(event, ["awayName", "awayTeamName"]);
  const all = names.length ? names : home || away ? [home, away].filter((item): item is string => item !== null) : null;
  return { all, home, away };
};

const odds = (selection: JsonObject): { decimal: number | null; raw: string | null; format: "decimal" | "american" | "fractional" | null } => {
  const candidates: JsonObject[] = [selection];
  for (const key of ["odds", "price", "prices", "quote"]) {
    const value = selection[key];
    const object = asObject(value);
    if (object) candidates.push(object);
    for (const item of asArray(value)) {
      const itemObject = asObject(item);
      if (itemObject) candidates.push(itemObject);
    }
  }
  for (const candidate of candidates) {
    const decimalValue = first(candidate, ["decimalOdds", "decimal_odds", "decimal", "oddsDecimal"]);
    if (decimalValue !== undefined) {
      const decimal = Number(decimalValue);
      if (Number.isFinite(decimal) && decimal >= 1) return { decimal, raw: text(decimalValue), format: "decimal" };
    }
    const americanValue = first(candidate, ["americanOdds", "american_odds", "american", "oddsAmerican"]);
    if (americanValue !== undefined) return { decimal: oddsToDecimal(americanValue as string | number, "american"), raw: text(americanValue), format: "american" };
    const fractionalValue = first(candidate, ["fractionalOdds", "fractional_odds", "fractional"]);
    if (fractionalValue !== undefined) return { decimal: oddsToDecimal(fractionalValue as string | number, "fractional"), raw: text(fractionalValue), format: "fractional" };
  }
  return { decimal: null, raw: null, format: null };
};

const qualifiers = (market: JsonObject, selection: JsonObject): Record<string, string> | null => {
  const result: Record<string, string> = {};
  const explicit = asObject(first(market, ["qualifiers", "qualifier"]));
  if (explicit) for (const [key, value] of Object.entries(explicit)) { const item = text(value); if (item !== null) result[key] = item; }
  for (const [key, value] of Object.entries(market)) {
    if (!["marketKey", "market_key", "marketTypeId", "market_type_id", "displayGroup", "periodId"].includes(key)) continue;
    const item = text(value); if (item !== null) result[key] = item;
  }
  const selectionQualifier = asObject(first(selection, ["qualifiers", "qualifier"]));
  if (selectionQualifier) for (const [key, value] of Object.entries(selectionQualifier)) { const item = text(value); if (item !== null) result[`selection.${key}`] = item; }
  return Object.keys(result).length ? result : null;
};

const payloadValue = (payload: RawPayloadInput): unknown => {
  const raw = asObject(payload.rawPayload);
  const candidate = raw && typeof raw.body === "string" ? raw.body : raw && typeof raw.frame === "string" ? raw.frame : payload.rawPayload;
  if (typeof candidate !== "string") return candidate;
  try { return JSON.parse(candidate) as unknown; } catch { return null; }
};

const eventRecord = (event: JsonObject, market: JsonObject, group: string | null, selection: JsonObject, sourceUrl: string | null, collectedAt: string): ProviderRecord | null => {
  const sourceEventId = id(event, ["eventId", "event_id", "eventID", "eventKey", "fixtureId", "gameId"]) ?? (market === event ? id(event, ["id"]) : null);
  const sourceMarketId = id(market, ["marketId", "market_id", "marketID", "marketKey", "id"]);
  const sourceSelectionId = id(selection, ["selectionId", "selection_id", "selectionID", "outcomeId", "outcome_id", "runnerId", "id"]);
  const marketName = nestedText(first(market, ["marketType", "market_type", "marketName", "market_name"]), ["name", "description", "label", "title"]) ?? firstText(market, ["description", "name", "title", "type"]);
  const selectionName = nestedText(first(selection, ["selection", "selectionName", "selection_name", "outcome", "outcomeName", "runnerName"]), ["name", "description", "label", "title"]) ?? firstText(selection, ["label", "name", "description", "title"]);
  if (!sourceEventId || !marketName || !selectionName) return null;
  const sides = participants(event);
  const live = first(event, ["live", "isLive", "inPlay", "in_play"]);
  const explicitStatus = firstText(event, ["eventStatus", "event_status", "status", "state"])
    ?? (first(event, ["suspended", "isSuspended", "locked"]) === true ? "suspended" : null);
  const eventStatus = normalizedStatus(explicitStatus, live);
  const phase = firstText(event, ["phase", "period", "eventPhase"]);
  const price = odds(selection);
  return {
    sportsbook: "betonline", sport: nestedText(first(event, ["sport", "sportName"]), ["name", "description", "label"]) ?? firstText(event, ["sport", "sportName"]),
    competition: nestedText(first(event, ["competition", "league", "tournament"]), ["name", "description", "label"]) ?? firstText(event, ["competitionName", "leagueName"]),
    eventName: firstText(event, ["eventName", "event_name", "eventDescription", "description", "name", "title"]),
    participants: sides.all, homeParticipant: sides.home, awayParticipant: sides.away,
    eventStartTime: toIso(first(event, ["eventStartTime", "event_start_time", "startTime", "start_time", "startDate", "scheduledStart", "commenceTime"])),
    eventStatus, phase: phase ?? (live === true ? "live" : live === false ? "prematch" : null),
    liveScore: scoreValues(event), liveClock: firstText(event, ["liveClock", "live_clock", "clock", "timeRemaining"]),
    market: marketName, marketPeriod: nestedText(first(market, ["period", "marketPeriod", "market_period"]), ["name", "description", "label", "title"]) ?? firstText(market, ["periodName"]) ?? group,
    selection: selectionName, selectionStatus: normalizedStatus(firstText(selection, ["selectionStatus", "selection_status", "status", "state"]) ?? (first(selection, ["suspended", "isSuspended", "locked"]) === true ? "suspended" : null), undefined), line: firstText(selection, ["line", "handicap", "points", "total", "point", "spread"]),
    decimalOdds: price.decimal, rawOdds: price.raw, rawOddsFormat: price.format,
    sourceEventId, sourceMarketId, sourceSelectionId, sourceUrl,
    providerTimestamp: toIso(first(event, ["providerTimestamp", "provider_timestamp", "updatedAt", "updated_at", "lastUpdated", "last_updated", "timestamp"])),
    collectedAt, participantPlayer: firstText(selection, ["player", "playerName", "participantPlayer", "participant_player"]), qualifiers: qualifiers(market, selection)
  };
};

export const parseBetOnlinePayloads = (payloads: RawPayloadInput[], collectedAt = new Date().toISOString()): ProviderRecord[] => {
  const records: ProviderRecord[] = [];
  for (const payload of payloads) {
    const value = payloadValue(payload);
    if (value === null) continue;
    const events = findEventObjects(value);
    for (const event of events) for (const entry of marketEntries(event)) for (const selection of selectionObjects(entry.market)) {
      const record = eventRecord(event, entry.market, entry.group, selection, payload.sourceUrl ?? null, collectedAt);
      if (record) records.push(record);
    }
  }
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = JSON.stringify([record.sourceEventId, record.sourceMarketId, record.sourceSelectionId, record.line, record.participantPlayer, record.qualifiers]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
