import { normalizeRecord } from "../normalization/normalize.js";
import type { ProviderRecord } from "../normalization/types.js";
import { extractGenericSportsRecords } from "../network/discovery.js";
import { AccessibilityHandler, DomHandler } from "./handlers.js";
import type { AcquisitionContext, AcquisitionMethod } from "./types.js";

export type LayerObservation = { method: AcquisitionMethod; records: ProviderRecord[] };
export type QuoteValidation = { index: number; status: "CONFIRMED" | "CONFLICT" | "UNCONFIRMED"; matchingLayers: AcquisitionMethod[]; conflictingLayers: AcquisitionMethod[] };
export type CrossValidationReport = { version: "cross-layer-v1"; checkedAt: string; observations: Array<{ method: AcquisitionMethod; records: number }>; confirmed: number; conflicting: number; unconfirmed: number; quotes: QuoteValidation[]; unavailable: string[] };
const clean = (text: string | null | undefined) => (text ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const marketKey = (text: string | null | undefined) => {
  const label = clean(text);
  if (/^(moneyline|match winner|winner|ganador(?: del partido)?)$/.test(label)) return "winner";
  if (/^(1[- ]?x[- ]?2|match result|resultado(?: del partido)?(?: \(1x2\))?)$/.test(label)) return "1x2";
  return label;
};

// Exact semantic labels are required. Provider IDs or approximate team names
// alone cannot establish that two independently read prices mean the same bet.
function quoteKey(record: ProviderRecord): string | null {
  const row = normalizeRecord(record);
  const participants = row.participants?.length === 2 ? row.participants.map(clean).sort() : null;
  const event = participants?.join(" vs ") || clean(row.eventName);
  let selection = clean(row.selection);
  if (/^(draw|tie|x|empate)$/.test(selection)) selection = "draw";
  if (!event || !row.market || !selection) return null;
  return JSON.stringify([clean(row.sportsbook), clean(row.bookmaker).replace(/[^\p{L}\p{N}]/gu, ""), event, row.eventStartTime ?? "", marketKey(row.market), clean(row.marketPeriod), selection, row.line ?? "", clean(row.participantPlayer)]);
}

export function compareAcquisitionLayers(primary: LayerObservation, observations: LayerObservation[]): CrossValidationReport {
  const indices = observations.filter(layer => layer.method !== primary.method).map(layer => {
    const quotes = new Map<string, number[]>();
    for (const record of layer.records) {
      const key = quoteKey(record), price = normalizeRecord(record).decimalOdds;
      if (key && price !== null && Number.isFinite(price) && price > 1) quotes.set(key, [...(quotes.get(key) ?? []), price]);
    }
    return { method: layer.method, quotes };
  });
  const quotes: QuoteValidation[] = primary.records.map((record, index) => {
    const key = quoteKey(record), price = normalizeRecord(record).decimalOdds;
    const matchingLayers: AcquisitionMethod[] = [], conflictingLayers: AcquisitionMethod[] = [];
    if (key && price !== null && Number.isFinite(price)) for (const layer of indices) {
      const prices = layer.quotes.get(key);
      if (!prices?.length) continue;
      // One agreeing price does not hide a contradictory price in the same layer.
      if (prices.some(value => Math.abs(value - price) > 1e-6)) conflictingLayers.push(layer.method);
      else matchingLayers.push(layer.method);
    }
    return { index, status: conflictingLayers.length ? "CONFLICT" : matchingLayers.length ? "CONFIRMED" : "UNCONFIRMED", matchingLayers, conflictingLayers };
  });
  return { version: "cross-layer-v1", checkedAt: new Date().toISOString(), observations: observations.map(layer => ({ method: layer.method, records: layer.records.length })),
    confirmed: quotes.filter(q => q.status === "CONFIRMED").length, conflicting: quotes.filter(q => q.status === "CONFLICT").length,
    unconfirmed: quotes.filter(q => q.status === "UNCONFIRMED").length, quotes, unavailable: [] };
}

/** Capa 6 reuses the existing rendered-DOM and accessibility readers in the
 * active browser. It never opens a browser or invokes OCR for corroboration. */
export async function crossValidateAcquisition(context: AcquisitionContext, primary: LayerObservation): Promise<CrossValidationReport> {
  const observations: LayerObservation[] = [];
  const unavailable: string[] = [];
  if (primary.method !== "network" && context.networkCaptures?.length) {
    const records = context.networkCaptures.flatMap(capture => {
      try { return extractGenericSportsRecords(JSON.parse(capture.body), context.source.type, capture.url); }
      catch { return []; }
    });
    if (records.length) observations.push({ method: "network", records });
    else unavailable.push("network: retained captures contain no complete generic quotes");
  }
  if (!context.page || context.page.isClosed() || !context.browserContext) unavailable.push("No active Chromium context for independent page readings");
  else {
    for (const reader of [new DomHandler(), new AccessibilityHandler()]) {
      if (reader.method === primary.method) continue;
      context.signal?.throwIfAborted();
      const probe: AcquisitionContext = { ...context, skipReveal: true, configuration: reader.method === "dom" && context.memory?.extractionProfile?.domProfile
        ? { profile: context.memory.extractionProfile.domProfile } : null };
      try {
        const result = await reader.run(probe);
        if (result.kind === "data") observations.push({ method: reader.method, records: result.records });
        else unavailable.push(`${reader.method}: ${result.reason}`);
      } catch (error) {
        context.signal?.throwIfAborted();
        unavailable.push(`${reader.method}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return { ...compareAcquisitionLayers(primary, observations), unavailable };
}
