import { createHash } from "node:crypto";
import { oddsToDecimal } from "../normalization/odds.js";
import type { ProviderRecord } from "../normalization/types.js";
import type { OcrLine, OcrScreenshot } from "./ocr.js";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const normalized = (value: string) => clean(value).toLocaleLowerCase("es");
const eventPattern = /^(.{2,100}?)\s+(?:vs\.?|v\.?|versus|[-–])\s+(.{2,100})$/i;
const marketPattern = /^(?:1\s*[-–]?\s*x\s*[-–]?\s*2|resultado(?: del partido)?(?:\s*\(1x2\))?|match winner|moneyline|match result|winner|ganador(?: del partido)?)$/i;
const totalsMarket = /^(?:total(?:s|es)?(?: (?:goals|points|sets|goles|puntos))?|over.?under|más.?menos)(?:\s*\(?\d+(?:[.,]\d+)?\)?)?$/i;
const spreadMarket = /^(?:handicap|hándicap|spread)(?: europeo| asiático| asian)?$/i;
const bothMarket = /^(?:both teams to score|ambos equipos marcan|ambos marcan)$/i;
const supportedMarket = (text: string) => marketPattern.test(clean(text)) || totalsMarket.test(clean(text)) || spreadMarket.test(clean(text)) || bothMarket.test(clean(text));
const otherMarketPattern = /\b(?:over|under|total|totales|handicap|hándicap|spread|doble oportunidad|double chance|ambos equipos|both teams|correct score|marcador exacto)\b/i;
const pricePattern = /^(?:[+-]\d{3,5}|\d{1,4}[.,]\d{1,3}|\d{1,3}\/\d{1,3})$/;
const pairedPattern = /^(.{1,100}?)\s+([+-]\d{3,5}|\d{1,4}[.,]\d{1,3}|\d{1,3}\/\d{1,3})$/;
const centerY = (line: OcrLine) => line.box.y + line.box.height / 2;
const key = (value: string) => `ocr:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
export type ScreenshotQuote = { record: ProviderRecord; event: OcrLine; market: OcrLine; selection: OcrLine; price: OcrLine };

/** Supported layouts have an explicit fixture, winner-market heading and
 * labeled prices below it. Ambiguous columns and unassociated numbers are rejected.
 * OCR identifiers are explicitly namespaced; they are never provider IDs.
 */
export function extractScreenshotRecords(image: OcrScreenshot, input: { sportsbook: string; sourceUrl: string; collectedAt?: string }): ScreenshotQuote[] {
  if (image.lines.some(line => /access denied|you have been blocked|verify.*human|captcha|just a moment|checking your browser/i.test(line.text))) return [];
  const lines = image.lines.filter(line => line.confidence >= .85 && line.confidence <= 1 && clean(line.text) && Object.values(line.box).every(Number.isFinite)
    && line.box.width > 0 && line.box.height > 0 && line.box.x >= 0 && line.box.y >= 0 && line.box.y < image.height)
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const events = lines.map(line => ({ line, pair: eventPattern.exec(clean(line.text)) }))
    .filter((item): item is { line: OcrLine; pair: RegExpExecArray } => Boolean(item.pair) && !supportedMarket(clean(item.line.text)));
  const quotes: ScreenshotQuote[] = [];
  for (let index = 0; index < events.length; index++) {
    const event = events[index]!;
    // Without a verified column boundary, two side-by-side fixtures cannot be bound safely.
    if (events.some(other => other !== event && Math.abs(centerY(other.line) - centerY(event.line)) < Math.max(other.line.box.height, event.line.box.height) * 2)) continue;
    const participants = [clean(event.pair[1]!), clean(event.pair[2]!)];
    if (participants.some(name => /\d{1,2}:\d{2}|\b(?:over|under|total|handicap|spread)\b/i.test(name))) continue;
    const bottom = Math.min(events[index + 1]?.line.box.y ?? image.height, event.line.box.y + Math.max(500, event.line.box.height * 20));
    const card = lines.filter(line => line.box.y > event.line.box.y + event.line.box.height / 2 && line.box.y < bottom);
    const markets = card.filter(line => supportedMarket(clean(line.text)) || (otherMarketPattern.test(clean(line.text)) && !pairedPattern.test(clean(line.text))));
    const validSelection = (label: string) => participants.some(name => normalized(name) === normalized(label) || normalized(label).replace(/\s*\(?[+-]\d+(?:[.,]\d+)?\)?$/, "") === normalized(name)) || /^(?:1|x|2|home|away|draw|empate|local|visitante|yes|no|sí|si|over(?: \d+(?:[.,]\d+)?)?|under(?: \d+(?:[.,]\d+)?)?|más(?: \d+(?:[.,]\d+)?)?|menos(?: \d+(?:[.,]\d+)?)?)$/i.test(clean(label));
    for (const price of card) {
      const paired = pairedPattern.exec(clean(price.text));
      let selection: OcrLine | undefined, label: string, raw: string;
      if (paired && validSelection(paired[1]!)) { selection = price; label = clean(paired[1]!); raw = paired[2]!; }
      else if (pricePattern.test(clean(price.text))) {
        const labels = card.filter(line => line !== price && validSelection(line.text)
          && Math.abs(centerY(line) - centerY(price)) <= Math.max(line.box.height, price.box.height) * .55
          && line.box.x + line.box.width <= price.box.x + 3
          && price.box.x - (line.box.x + line.box.width) < image.width * .25);
        if (labels.length !== 1) continue;
        selection = labels[0]!; label = clean(selection.text); raw = clean(price.text);
      } else continue;
      const market = markets.filter(line => centerY(line) < centerY(price)).at(-1);
      if (!market || !supportedMarket(clean(market.text)) || centerY(price) - centerY(market) > Math.max(300, market.box.height * 15)) continue;
      if (/^[1x2]$/i.test(label) && !/1\s*[-–]?\s*x\s*[-–]?\s*2|resultado|match result/i.test(market.text)) continue;
      let selectionLine: string | undefined;
      if (totalsMarket.test(clean(market.text))) {
        const total = /^(over|under|más|menos)(?: (\d+(?:[.,]\d+)?))?$/i.exec(label);
        const headingLine = /(?:\s|\()(\d+(?:[.,]\d+)?)\)?$/.exec(clean(market.text));
        if (!total || !(total[2] || headingLine?.[1])) continue;
        selectionLine = (total[2] || headingLine![1]!).replace(",", "."); label = total[1]!;
      } else if (spreadMarket.test(clean(market.text))) {
        const handicap = /^(.+?)\s*\(?([+-]\d+(?:[.,]\d+)?)\)?$/.exec(label);
        if (!handicap || !participants.some(name => normalized(name) === normalized(handicap[1]))) continue;
        label = clean(handicap[1]!); selectionLine = handicap[2]!.replace(",", ".");
      } else if (bothMarket.test(clean(market.text))) {
        if (!/^(yes|no|sí|si)$/i.test(label)) continue;
      } else if (!participants.some(name => normalized(name) === normalized(label)) && !/^(1|x|2|home|away|draw|empate|local|visitante)$/i.test(label)) continue;
      const format = /^[+-]/.test(raw) ? "american" : raw.includes("/") ? "fractional" : "decimal";
      const decimal = oddsToDecimal(raw.replace(",", "."), format);
      if (decimal === null || decimal <= 1 || decimal >= 10_000) continue;
      const eventName = `${participants[0]} vs ${participants[1]}`;
      const confidence = Math.min(event.line.confidence, market.confidence, selection.confidence, price.confidence);
      const sourceEventId = key(`${input.sourceUrl}|${eventName}`), sourceMarketId = key(`${sourceEventId}|${normalized(market.text)}`);
      const record: ProviderRecord = { sportsbook: input.sportsbook, eventName, participants, market: clean(market.text), selection: label, ...(selectionLine ? { line: selectionLine } : {}),
        decimalOdds: decimal, rawOdds: raw, rawOddsFormat: format, sourceEventId, sourceMarketId, sourceSelectionId: key(`${sourceMarketId}|${normalized(label)}|${selectionLine ?? ""}`),
        sourceUrl: input.sourceUrl, collectedAt: input.collectedAt ?? new Date().toISOString(),
        qualifiers: { extraction: "screenshot-ocr", ocrEngine: "apple-vision", ocrConfidence: confidence.toFixed(3), profileVersion: "screenshot-markets-v2" } };
      quotes.push({ record, event: event.line, market, selection, price });
    }
  }
  // Conflicting OCR readings for the same selection do not become live observations.
  const grouped = new Map<string, ScreenshotQuote[]>();
  for (const quote of quotes) { const id = quote.record.sourceSelectionId!; grouped.set(id, [...(grouped.get(id) ?? []), quote]); }
  return [...grouped.values()].filter(group => new Set(group.map(quote => quote.record.decimalOdds)).size === 1).map(group => group[0]!);
}
