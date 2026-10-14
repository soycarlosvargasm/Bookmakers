import { createHash } from "node:crypto";
import { oddsToDecimal, type OddsFormat } from "../normalization/odds.js";
import type { ProviderRecord } from "../normalization/types.js";

export type Box = { x: number; y: number; width: number; height: number };
export type VisualText = { text: string; box: Box };
export type VisualHeader = { label: string; box: Box; cell: Box; column: number };
export type VisualCell = { box: Box; column: number; prices: VisualText[] };
export type VisualRow = { box: Box; eventHref: string | null; teams: Array<{ name: VisualText; iconLabel: string; box: Box }>; cells: VisualCell[] };
export type VisualBoard = { pageUrl: string; viewport: { width: number; height: number }; market: string; headers: VisualHeader[]; rows: VisualRow[] };
export type VisualProfile = { version: string; marketSelectValue: string; eventStrategy: string; selectionStrategy: string; priceStrategy: string; minConfidence: number; viewportWidth: number; maxScrolls: number };
export const ACTION_PROFILE: VisualProfile = { version: "visual-action-v1", marketSelectValue: "ml", eventStrategy: "paired team icon labels inside a game row with event link", selectionStrategy: "team name and odds center share upper or lower visual row", priceStrategy: "two American prices inside a column aligned to a named header", minConfidence: 0.9, viewportWidth: 1440, maxScrolls: 4 };
export const INSPECTION_PROFILE: VisualProfile = { version: "visual-inspection-v1", marketSelectValue: "", eventStrategy: "inspect rendered match regions if access succeeds", selectionStrategy: "requires an explicit match and market", priceStrategy: "requires a visible selection and associated price", minConfidence: 0.9, viewportWidth: 1440, maxScrolls: 2 };
export function parseVisualProfile(value: unknown): VisualProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  return typeof p.version === "string" && p.version.startsWith("visual-") && (p.marketSelectValue === "ml" || p.marketSelectValue === "") && typeof p.eventStrategy === "string" && typeof p.selectionStrategy === "string" && typeof p.priceStrategy === "string" && typeof p.minConfidence === "number" && p.minConfidence >= 0.9 && p.minConfidence <= 1 && typeof p.viewportWidth === "number" && p.viewportWidth >= 1000 && p.viewportWidth <= 3000 && typeof p.maxScrolls === "number" && p.maxScrolls >= 0 && p.maxScrolls <= 10 ? p as VisualProfile : null;
}

export type VisualCandidate = { status: "ACCEPTED" | "REJECTED"; reason: string; confidence: number; evidenceKey?: string; event: string | null; market: string; sportsbook: string | null; selections: string[]; prices: string[]; row: Box; column: Box | null };
export type VisualExtraction = { records: ProviderRecord[]; candidates: VisualCandidate[]; eventRegions: number; marketRegions: number; selectionCandidates: number; oddsCandidates: number; completeMarkets: number; accepted: number; rejected: number; primaryRejection: string | null };

const centerY = (box: Box): number => box.y + box.height / 2;
const centerX = (box: Box): number => box.x + box.width / 2;
const within = (n: number, low: number, high: number, tolerance = 3): boolean => n >= low - tolerance && n <= high + tolerance;
const hash = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 24);
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function recognizeOdds(value: string): { raw: string; format: OddsFormat; decimal: number } | null {
  const raw = value.trim().replace(/\u2212/g, "-");
  const format: OddsFormat | null = /^[+-]\d{2,5}$/.test(raw) ? "american" : /^\d{1,2}\.\d{1,3}$/.test(raw) ? "decimal" : /^\d{1,3}\/\d{1,3}$/.test(raw) ? "fractional" : null;
  if (!format) return null;
  const decimal = oddsToDecimal(raw, format);
  return decimal !== null && decimal > 1 && decimal <= 1001 ? { raw, format, decimal } : null;
}

function sourceFromHeader(label: string): string | null {
  const name = label.replace(/\s+(?:NJ|NY|PA|MI|CO|AZ|VA|IL|MA)\s+logo$/i, "").replace(/\s+logo$/i, "").trim();
  if (!name || /^(open|best odds|scheduled)$/i.test(name)) return null;
  return `actionnetwork-${slug(name === "DK" ? "DraftKings" : name)}`;
}

export function extractActionBoard(board: VisualBoard, profile: VisualProfile = ACTION_PROFILE, collectedAt = new Date().toISOString()): VisualExtraction {
  const candidates: VisualCandidate[] = [];
  const records: ProviderRecord[] = [];
  const reasons = new Map<string, number>();
  let selectionCandidates = 0, oddsCandidates = 0, completeMarkets = 0;
  const reject = (reason: string, row: VisualRow, header?: VisualHeader, prices: string[] = []): void => {
    candidates.push({ status: "REJECTED", reason, confidence: 0, event: row.teams.map((t) => t.name.text).join(" vs ") || null, market: board.market, sportsbook: header ? sourceFromHeader(header.label) : null, selections: row.teams.map((t) => t.name.text), prices, row: row.box, column: header?.cell ?? null });
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  };
  for (const row of board.rows) {
    selectionCandidates += row.teams.length;
    oddsCandidates += row.cells.reduce((sum, cell) => sum + cell.prices.length, 0);
    const teams = row.teams;
    const eventUrl = row.eventHref ? new URL(row.eventHref, board.pageUrl).toString() : null;
    const eventId = eventUrl?.match(/\/(\d+)\/?(?:\?|$)/)?.[1];
    const teamValid = teams.length === 2 && teams.every((team) => team.name.text.trim().length > 1 && team.iconLabel.toLowerCase() === `${team.name.text.trim()} team icon`.toLowerCase() && within(centerY(team.name.box), row.box.y, row.box.y + row.box.height));
    if (board.market !== "Moneyline" || !teamValid || !eventId || !eventUrl || Math.abs(centerY(teams[0]!.box) - centerY(teams[1]!.box)) < 20) {
      reject(!teamValid ? "ambiguous event participants" : !eventId ? "missing event identity" : "market or row geometry unverified", row);
      continue;
    }
    for (const header of board.headers) {
      const sportsbook = sourceFromHeader(header.label);
      if (!sportsbook) continue;
      const aligned = row.cells.filter((cell) => cell.column === header.column && within(centerX(cell.box), header.cell.x, header.cell.x + header.cell.width, 2) && Math.abs(centerX(cell.box) - centerX(header.cell)) <= 3);
      if (aligned.length !== 1) { reject("missing or ambiguous sportsbook column", row, header); continue; }
      const cell = aligned[0]!;
      if (!within(centerY(cell.box), row.box.y, row.box.y + row.box.height)) { reject("price outside event region", row, header); continue; }
      if (cell.prices.length !== 2) { reject("market does not have two prices", row, header, cell.prices.map((p) => p.text)); continue; }
      const ordered = [...cell.prices].sort((a, b) => centerY(a.box) - centerY(b.box));
      const firstY = centerY(teams[0]!.name.box), secondY = centerY(teams[1]!.name.box);
      const topBand = (firstY + secondY) / 2;
      const alignedRows = centerY(ordered[0]!.box) < topBand && centerY(ordered[1]!.box) > topBand && Math.abs(centerY(ordered[0]!.box) - firstY) <= 18 && Math.abs(centerY(ordered[1]!.box) - secondY) <= 18;
      const alignedColumns = ordered.every((price) => within(centerX(price.box), cell.box.x, cell.box.x + cell.box.width) && within(centerY(price.box), cell.box.y, cell.box.y + cell.box.height));
      const odds = ordered.map((price) => recognizeOdds(price.text));
      if (!alignedRows || !alignedColumns || odds.some((price) => !price || price.format !== "american")) {
        reject(!alignedRows ? "price and participant rows do not align" : !alignedColumns ? "price outside sportsbook cell" : "invalid American odds", row, header, ordered.map((p) => p.text)); continue;
      }
      const confidence = 0.98;
      if (confidence < profile.minConfidence) { reject("confidence below threshold", row, header, ordered.map((p) => p.text)); continue; }
      const sourceMarketId = `${eventId}:moneyline`;
      const rawKey = hash(`${board.pageUrl}|${eventId}|${sportsbook}|moneyline`);
      for (let index = 0; index < 2; index++) {
        const price = odds[index]!;
        records.push({ sportsbook, sport: "NFL", competition: "NFL", eventName: `${teams[0]!.name.text} vs ${teams[1]!.name.text}`, participants: teams.map((t) => t.name.text), awayParticipant: teams[0]!.name.text, homeParticipant: teams[1]!.name.text, eventStatus: "prematch", market: "moneyline", marketPeriod: "full_event", selection: teams[index]!.name.text, selectionStatus: "open", line: null, decimalOdds: price.decimal, rawOdds: price.raw, rawOddsFormat: price.format, sourceEventId: eventId, sourceMarketId, sourceSelectionId: `${sourceMarketId}:${index}`, sourceUrl: eventUrl, collectedAt, qualifiers: { observedVia: "visual-collector", visualProfile: profile.version, visualEvidenceKey: rawKey, displayedBook: header.label, confidence: String(confidence) } });
      }
      completeMarkets++;
      candidates.push({ status: "ACCEPTED", reason: "paired team labels, event link, Moneyline selector, named column and aligned price rows", confidence, evidenceKey: rawKey, event: `${teams[0]!.name.text} vs ${teams[1]!.name.text}`, market: "moneyline", sportsbook, selections: teams.map((t) => t.name.text), prices: ordered.map((p) => p.text), row: row.box, column: cell.box });
    }
  }
  return { records, candidates, eventRegions: board.rows.length, marketRegions: board.rows.length, selectionCandidates, oddsCandidates, completeMarkets, accepted: records.length, rejected: candidates.filter((c) => c.status === "REJECTED").length, primaryRejection: [...reasons].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null };
}
