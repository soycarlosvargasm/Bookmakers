import type { NormalizedRecord } from "../normalization/types.js";
import type { MatchFeatures } from "./types.js";

export const normalizeLabel = (value: string | null | undefined): string => (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const tokens = (value: string | null | undefined): Set<string> => new Set(normalizeLabel(value).split(" ").filter(Boolean));
const jaccard = (a: Set<string>, b: Set<string>): number => { if (!a.size || !b.size) return 0; const intersection = [...a].filter((item) => b.has(item)).length; return intersection / new Set([...a, ...b]).size; };
const similarity = (a: string | null | undefined, b: string | null | undefined): number => {
  const left = normalizeLabel(a); const right = normalizeLabel(b); if (!left || !right) return 0; if (left === right) return 1;
  const tokenScore = jaccard(tokens(left), tokens(right)); const pairs = (value: string): Set<string> => new Set([...value].slice(0, -1).map((_, i) => value.slice(i, i + 2)));
  return Math.max(tokenScore, jaccard(pairs(left), pairs(right)));
};
const participantSimilarity = (a: NormalizedRecord, b: NormalizedRecord): { home: number; away: number; reversed: number; all: number } => {
  const home = similarity(a.homeParticipant, b.homeParticipant); const away = similarity(a.awayParticipant, b.awayParticipant);
  const reversed = (similarity(a.homeParticipant, b.awayParticipant) + similarity(a.awayParticipant, b.homeParticipant)) / 2;
  const left = (a.participants ?? [a.homeParticipant, a.awayParticipant]).filter((x): x is string => Boolean(x)); const right = (b.participants ?? [b.homeParticipant, b.awayParticipant]).filter((x): x is string => Boolean(x));
  return { home, away, reversed, all: jaccard(new Set(left.flatMap((x) => [...tokens(x)])), new Set(right.flatMap((x) => [...tokens(x)]))) };
};
const timeProximity = (a: string | null, b: string | null): number => { if (!a || !b) return 0; const delta = Math.abs(Date.parse(a) - Date.parse(b)) / 60_000; return Number.isFinite(delta) ? Math.max(0, 1 - Math.min(delta, 180) / 180) : 0; };
const lineValue = (value: string | null): number | null => { if (!value) return null; const parsed = Number(value.replace(/[^+\-0-9.]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
const lineSimilarity = (a: string | null, b: string | null): number => { const left = lineValue(a); const right = lineValue(b); if (left === null || right === null) return similarity(a, b); return Math.max(0, 1 - Math.min(Math.abs(left - right), 10) / 10); };
const exact = (a: string | null, b: string | null): number => a && b && normalizeLabel(a) === normalizeLabel(b) ? 1 : 0;
export const matchFeatures = (a: NormalizedRecord, b: NormalizedRecord): MatchFeatures => { const p = participantSimilarity(a, b); return {
  sport_exact: exact(a.sport, b.sport), competition_similarity: similarity(a.competition, b.competition), event_name_similarity: similarity(a.eventName, b.eventName), home_similarity: p.home, away_similarity: p.away, reversed_participants_similarity: p.reversed, participants_similarity: p.all, start_time_proximity: timeProximity(a.eventStartTime, b.eventStartTime), market_similarity: similarity(a.market, b.market), period_similarity: similarity(a.marketPeriod, b.marketPeriod), player_similarity: similarity(a.participantPlayer, b.participantPlayer), selection_similarity: similarity(a.selection, b.selection), line_similarity: lineSimilarity(a.line, b.line), source_ids_present: a.sourceEventId && b.sourceEventId ? 1 : 0
}; };
export const exactDeterministicMatch = (a: NormalizedRecord, b: NormalizedRecord): boolean => {
  const required = [a.sport, b.sport, a.competition, b.competition, a.homeParticipant, b.homeParticipant, a.awayParticipant, b.awayParticipant, a.eventStartTime, b.eventStartTime, a.market, b.market, a.marketPeriod, b.marketPeriod, a.selection, b.selection, a.line, b.line];
  if (required.some((value) => value === null || value === undefined)) return false;
  return normalizeLabel(a.sport) === normalizeLabel(b.sport) && normalizeLabel(a.competition) === normalizeLabel(b.competition) && normalizeLabel(a.homeParticipant) === normalizeLabel(b.homeParticipant) && normalizeLabel(a.awayParticipant) === normalizeLabel(b.awayParticipant) && Date.parse(a.eventStartTime!) === Date.parse(b.eventStartTime!) && normalizeLabel(a.market) === normalizeLabel(b.market) && normalizeLabel(a.marketPeriod) === normalizeLabel(b.marketPeriod) && normalizeLabel(a.participantPlayer) === normalizeLabel(b.participantPlayer) && normalizeLabel(a.selection) === normalizeLabel(b.selection) && lineSimilarity(a.line, b.line) === 1;
};
export const featureReasons = (features: MatchFeatures): string[] => Object.entries(features).filter(([key]) => !["source_ids_present", "sport_exact"].includes(key)).sort(([, a], [, b]) => b - a).slice(0, 4).map(([key, value]) => `${key}=${value.toFixed(3)}`);
