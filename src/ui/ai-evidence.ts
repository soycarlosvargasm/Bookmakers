import { createHash } from 'node:crypto';
import { detectOdds } from '../dom/extractor.js';
import { fold } from '../matching/unify.js';
import type { ProviderRecord } from '../normalization/types.js';
import type { OcrScreenshot } from '../visual/ocr.js';
import { oddsToDecimal, type OddsFormat } from '../normalization/odds.js';

export const EVIDENCE_VERSION = 'evidence-fallback-v2';
export type EvidenceKind = 'TEXT' | 'DOM' | 'IMAGE';
export type Atom = { id: number; text: string; path: string; box?: { x: number; y: number; width: number; height: number }; confidence?: number };
export type Block = { id: string; atomIds: number[]; parent: string | null; kind: 'record' | 'container' | 'document'; fields?: {
  home: number; away: number; market: number; selection: number; price: number; period: number | null; line: number | null;
  sport: number | null; competition: number | null; bookmaker: string | null; eventStart: string | null;
  homeName: string; awayName: string; priceFormat: OddsFormat | null;
} };
export type EvidenceDocument = { kind: EvidenceKind; ref: string; sha256: string; atoms: Atom[]; blocks: Block[]; image?: Buffer };
export type EvidenceProposal = {
  home: string; away: string; market: string; selection: string; price: string; period: string | null; line: string | null;
  sport: string | null; competition: string | null; confidence: number; blockId: string;
  homeId: number; awayId: number; marketId: number; selectionId: number; priceId: number;
  periodId: number | null; lineId: number | null; sportId: number | null; competitionId: number | null;
};
export type Provenance = { type: EvidenceKind; captureId: string; evidence: string; sha256: string; blockId: string;
  confidence: number; model: string; version: string; citations: Atom[]; association: 'container' | 'model-reviewed-context' };
export type VerifiedQuote = EvidenceProposal & { format: 'decimal' | 'american' | 'fractional'; decimal: number;
  bookmaker: string | null; eventStart: string | null; provenance: Provenance };

const literal = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
export const hasLiteral = (haystack: string, needle: string) => {
  const n = literal(needle);
  if (!n) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'u').test(literal(haystack));
};
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const stringValue = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
export function recordSides(r: ProviderRecord): [string, string] | null {
  const sides = Array.isArray(r.participants) ? r.participants : [];
  const home = stringValue(r.homeParticipant) ?? stringValue(sides[0]), away = stringValue(r.awayParticipant) ?? stringValue(sides[1]);
  if (home && away) return [home, away];
  const heading = typeof r.eventName === 'string' ? /^(.+?)\s+(?:vs\.?|v\.?|[-–—])\s+(.+)$/i.exec(r.eventName.trim()) : null;
  return heading ? [heading[1]!.trim(), heading[2]!.trim()] : null;
}

/** Every field keeps a pointer to the original saved record, including its original price. */
export function recordDocument(records: ProviderRecord[], ref: string): EvidenceDocument {
  const atoms: Atom[] = [], blocks: Block[] = [];
  records.forEach((r, index) => {
    const sides = recordSides(r);
    const home = sides?.[0], away = sides?.[1];
    if (!home || !away || !stringValue(r.market) || !stringValue(r.selection) || !stringValue(r.rawOdds)) return;
    const start = atoms.length;
    const add = (field: string, value: unknown): number | null => {
      const text = value == null ? null : String(value).trim();
      if (!text) return null;
      const id = atoms.length + 1; atoms.push({ id, text, path: `/evidence/payload/records/${index}/${field}` }); return id;
    };
    const h = stringValue(r.homeParticipant) ? add('homeParticipant', home)! : Array.isArray(r.participants) && r.participants[0] ? add('participants/0', home)! : add('eventName', r.eventName)!;
    const a = stringValue(r.awayParticipant) ? add('awayParticipant', away)! : Array.isArray(r.participants) && r.participants[1] ? add('participants/1', away)! : h;
    const market = add('market', r.market)!, selection = add('selection', r.selection)!, price = add('rawOdds', r.rawOdds)!;
    const fields: NonNullable<Block['fields']> = { home: h, away: a, market, selection, price, period: add('marketPeriod', r.marketPeriod), line: add('line', r.line),
      sport: add('sport', r.sport), competition: add('competition', r.competition), bookmaker: stringValue(r.bookmaker), eventStart: stringValue(r.eventStartTime),
      homeName: home, awayName: away, priceFormat: r.rawOddsFormat === 'decimal' || r.rawOddsFormat === 'american' || r.rawOddsFormat === 'fractional' ? r.rawOddsFormat : null };
    blocks.push({ id: `record:${index}`, parent: null, kind: 'record', atomIds: atoms.slice(start).map(a => a.id), fields });
  });
  return { kind: 'TEXT', ref, sha256: digest(JSON.stringify(records)), atoms, blocks };
}

export function textDocument(text: string, ref: string): EvidenceDocument {
  const atoms = text.split(/\r?\n/).map((text, index) => ({ id: index + 1, text: text.trim(), path: `/lines/${index + 1}` })).filter(a => a.text);
  return { kind: 'TEXT', ref, sha256: digest(text), atoms, blocks: [{ id: 'document', kind: 'document', parent: null, atomIds: atoms.map(a => a.id) }] };
}

/** Only real stored DOM nodes create containers; extracted records are never presented as a DOM. */
export function domDocument(root: unknown, ref: string): EvidenceDocument | null {
  const atoms: Atom[] = [], blocks: Block[] = [];
  const walk = (value: unknown, parent: string | null, path: string): number[] => {
    if (!value || typeof value !== 'object') return [];
    const node = value as { text?: unknown; path?: unknown; children?: unknown; attrs?: unknown };
    const id = typeof node.path === 'string' ? node.path : path;
    const children = Array.isArray(node.children) ? node.children : [];
    const ids = children.flatMap((child, i) => walk(child, id, `${path}/children/${i}`));
    if (!ids.length && typeof node.text === 'string' && node.text.trim()) {
      const atomId = atoms.length + 1; atoms.push({ id: atomId, text: node.text.trim(), path: id }); ids.push(atomId);
    }
    if (ids.length) blocks.push({ id, parent, kind: 'container', atomIds: ids });
    return ids;
  };
  walk(root, null, '/dom');
  return atoms.length ? { kind: 'DOM', ref, sha256: digest(JSON.stringify(root)), atoms, blocks } : null;
}

export function imageDocument(image: Buffer, ocr: OcrScreenshot, ref: string): EvidenceDocument {
  const atoms = ocr.lines.map((line, index) => ({ id: index + 1, text: line.text, path: `/ocr/${index}`, box: line.box, confidence: line.confidence }));
  return { kind: 'IMAGE', ref, sha256: digest(image), image, atoms, blocks: [{ id: 'image', kind: 'document', parent: null, atomIds: atoms.map(a => a.id) }] };
}

export function proposalFromRecord(block: Block, doc: EvidenceDocument, confidence: number): EvidenceProposal {
  const f = block.fields!;
  const byId = new Map(doc.atoms.map(a => [a.id, a.text]));
  const get = (id: number | null) => id === null ? null : byId.get(id) ?? null;
  return { home: f.homeName, away: f.awayName, market: get(f.market)!, selection: get(f.selection)!, price: get(f.price)!,
    period: get(f.period), line: get(f.line), sport: get(f.sport), competition: get(f.competition), confidence, blockId: block.id,
    homeId: f.home, awayId: f.away, marketId: f.market, selectionId: f.selection, priceId: f.price,
    periodId: f.period, lineId: f.line, sportId: f.sport, competitionId: f.competition };
}

/** References must come from the submitted document and container. Prices are compared exactly, never inferred. */
export function verifyProposal(q: EvidenceProposal, doc: EvidenceDocument, captureId: string, model: string, audited: boolean):
  { quote: VerifiedQuote } | { reason: string } {
  if (!q || !Number.isFinite(q.confidence) || q.confidence < .9 || q.confidence > 1) return { reason: 'Confianza insuficiente.' };
  const block = doc.blocks.find(b => b.id === q.blockId);
  if (!block) return { reason: 'Contenedor no presente en la evidencia enviada.' };
  const byId = new Map(doc.atoms.map(a => [a.id, a]));
  const fields: Array<[string | null, number | null]> = [[q.home, q.homeId], [q.away, q.awayId], [q.market, q.marketId], [q.selection, q.selectionId],
    [q.price, q.priceId], [q.line, q.lineId], [q.period, q.periodId], [q.sport, q.sportId], [q.competition, q.competitionId]];
  for (const [value, id] of fields) {
    if (value === null && id === null) continue;
    const atom = id === null ? undefined : byId.get(id);
    if (typeof value !== 'string' || !value.trim() || !atom || !block.atomIds.includes(atom.id) || !hasLiteral(atom.text, value))
      return { reason: 'Campo o cita no demostrado en el contenedor.' };
    if (doc.kind === 'IMAGE' && (atom.confidence ?? 0) < .8) return { reason: 'OCR insuficiente para verificar el campo visible.' };
  }
  if (literal(q.home) === literal(q.away)) return { reason: 'Participantes indistinguibles.' };
  const priceAtom = byId.get(q.priceId)!;
  const declared = block.fields?.priceFormat;
  const decimal = declared && priceAtom.text === q.price ? oddsToDecimal(q.price, declared) : null;
  const token = declared && decimal !== null ? { raw: q.price, format: declared, decimal } : detectOdds(priceAtom.text).find(t => t.raw === q.price);
  if (!token || token.decimal == null || token.decimal <= 1) return { reason: 'Precio exacto no presente en la evidencia.' };
  if (block.kind === 'record') {
    const f = block.fields!;
    if (q.homeId !== f.home || q.awayId !== f.away || q.marketId !== f.market || q.selectionId !== f.selection || q.priceId !== f.price ||
      q.lineId !== f.line || q.periodId !== f.period) return { reason: 'Asociación cruza campos de registros distintos.' };
  } else if (!audited) return { reason: 'Asociación contextual no confirmada por la revisión de evidencia.' };
  const citations = [...new Set(fields.map(([, id]) => id).filter((id): id is number => id !== null))].map(id => byId.get(id)!);
  return { quote: { ...q, format: token.format, decimal: token.decimal, bookmaker: block.fields?.bookmaker ?? null,
    eventStart: block.fields?.eventStart ?? null, provenance: { type: doc.kind, captureId, evidence: doc.ref, sha256: doc.sha256,
      blockId: block.id, confidence: q.confidence, model, version: EVIDENCE_VERSION, citations,
      association: block.kind === 'record' ? 'container' : 'model-reviewed-context' } } };
}

/** Market, period, line and bookmaker are part of identity: equal prices alone are not duplicates. */
export const quoteIdentity = (q: { home: string; away: string; market: string; selection: string; line: string | null; period: string | null;
  price: string; bookmaker?: string | null; eventStart?: string | null }) =>
  JSON.stringify([q.home, q.away, q.market, q.period ?? '', q.line ?? '', q.selection, q.price, q.bookmaker ?? ''].map(fold));

export function recordIdentity(r: ProviderRecord): string | null {
  const sides = recordSides(r), home = sides?.[0], away = sides?.[1];
  if (!home || !away || !r.market || !r.selection || !r.rawOdds) return null;
  return quoteIdentity({ home, away, market: String(r.market), selection: String(r.selection), price: String(r.rawOdds),
    period: stringValue(r.marketPeriod), line: r.line == null ? null : String(r.line), bookmaker: stringValue(r.bookmaker), eventStart: stringValue(r.eventStartTime) });
}
