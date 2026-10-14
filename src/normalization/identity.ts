import { createHash } from "node:crypto";
import type { NormalizedRecord } from "./types.js";

const canonical = (value: unknown): string => JSON.stringify(value, (_, item) => {
  if (item && typeof item === "object" && !Array.isArray(item)) return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
  return item;
});
const volatileQualifiers = new Set(["availableSize", "probabilityPercent", "orderbookVersion", "insertedAt", "marketStatus", "mainLine", "side",
  "extraction", "profileVersion", "ocrEngine", "ocrConfidence", "confidence", "screenshotSha256", "modelResponseId", "crossValidation", "sourceEventIdKind", "association", "eventPath", "marketPath", "selectionPath", "pricePath", "domEventKey", "competitionKind", "cardName"]);
export const stableQualifiers = (qualifiers: NormalizedRecord["qualifiers"]): Record<string, string> => Object.fromEntries(Object.entries(qualifiers ?? {}).filter(([key]) => !volatileQualifiers.has(key) && !key.startsWith("selection.")));
export const marketIdentityKey = (record: NormalizedRecord): string => canonical({
  sportsbook: record.sportsbook, event: record.sourceEventId ?? record.eventName,
  sourceMarketId: record.sourceMarketId, marketType: record.market, period: record.marketPeriod,
  participantPlayer: record.participantPlayer, qualifiers: stableQualifiers(record.qualifiers)
});
export const selectionIdentityKey = (record: NormalizedRecord): string => canonical({
  market: JSON.parse(marketIdentityKey(record)), selection: record.selection, line: record.line,
  sourceSelectionId: record.sourceSelectionId
});
export const marketIdentity = (record: NormalizedRecord): string => createHash("sha256").update(marketIdentityKey(record)).digest("hex");
export const selectionIdentity = (record: NormalizedRecord): string => createHash("sha256").update(selectionIdentityKey(record)).digest("hex");
