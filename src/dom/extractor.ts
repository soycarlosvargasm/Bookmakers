import { quoteKey } from "../validation/records.js";
import { createHash } from "node:crypto";
import { oddsToDecimal, type OddsFormat } from "../normalization/odds.js";
import type { ProviderRecord } from "../normalization/types.js";

/** A bounded, privacy-minimised representation of rendered, visible DOM. */
export type DomNode = {
  tag: string;
  text: string;
  path: string;
  attrs?: Record<string, string>;
  children?: DomNode[];
};

export type DomProfile = {
  version: string;
  eventSelector: string;
  competitionSelector?: string;
  participantSelector?: string;
  marketSelector?: string;
  selectionSelector?: string;
  oddsSelector?: string;
  sourceEventIdAttribute?: string;
};

export type DomExtractionStatus = "VALID" | "PARTIAL" | "AMBIGUOUS" | "INVALID";
export type DomEvidence = { path: string; text: string; attrs: Record<string, string>; fragment: string };
export type DomCandidate = {
  status: DomExtractionStatus;
  confidence: number;
  reasons: string[];
  record?: ProviderRecord;
  evidence: DomEvidence[];
};
export type DomExtraction = { candidates: DomCandidate[]; records: ProviderRecord[]; detectedEventCards: number; visibleOdds: number };

type OddsToken = { raw: string; format: OddsFormat; decimal: number | null };
// Market headings in English and Spanish; a heading is only used when it sits inside the same rendered card.
const MARKET = /\b(match winner|money\s*line|moneyline|winner|spread|handicap|total(?:s)?|over\s*\/\s*under|team total|player props?|team props?|futures?|outright|round|period|1x2|ganador(?: del partido)?|resultado (?:final|del partido)|h[áa]ndicap|m[áa]s\s*\/\s*menos|total(?:es)?(?: de goles| de puntos)?|ambos (?:equipos )?(?:marcan|anotan)|doble oportunidad|l[ií]nea de dinero)\b/i;
const LIVE = /\b(live|in[- ]?play|started|q[1-4]|half|period)\b/i;
const CLOCK = /\b\d{1,2}:\d{2}\b/;
const EVENT = /^\s*(.{1,100}?)\s+(?:vs\.?|v\.?|@)\s+(.{1,100}?)\s*$/i;
const DECIMAL = /(?<![\d./+-])([1-9]\d{0,3}\.\d{1,3})(?![\d/])/g;
const AMERICAN = /(?<!\d)([+-](?:1\d{2,4}|[2-9]\d{2,4}))(?!\d)/g;
const FRACTIONAL = /(?<![\d/])(\d{1,3}\/\d{1,3})(?![\d/])/g;
const clean = (value: string): string => value.replace(/\s+/g, " ").trim();
const descendants = (node: DomNode): DomNode[] => [node, ...(node.children ?? []).flatMap(descendants)];
const attrs = (node: DomNode): Record<string, string> => node.attrs ?? {};
const attrValue = (node: DomNode, names: RegExp): string | null => Object.entries(attrs(node)).find(([key, value]) => names.test(key) && value)?.[1] ?? null;

export function detectOdds(text: string): OddsToken[] {
  const found: OddsToken[] = [];
  const add = (raw: string, format: OddsFormat) => {
    if (found.some((item) => item.raw === raw)) return;
    const decimal = oddsToDecimal(raw, format);
    if (decimal !== null && decimal > 1) found.push({ raw, format, decimal });
  };
  for (const item of text.matchAll(DECIMAL)) add(item[1]!, "decimal");
  for (const item of text.matchAll(AMERICAN)) add(item[1]!, "american");
  for (const item of text.matchAll(FRACTIONAL)) add(item[1]!, "fractional");
  return found;
}

// "A - B" / "A – B" is an event only with exactly one spaced dash, letters on both sides and no
// market, price, date or hierarchy words: "Soccer - Spain - La Liga" (two dashes) is never an event.
const DASH_EVENT = /^\s*([^\s].{1,79}?)\s+[-–—]\s+(.{2,80}?)\s*$/;
const DATE_WORDS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|today|tomorrow|hoy|mañana|at \d|live now|en vivo)\b/i;
const dashEventParts = (line: string): [string, string] | null => {
  if ((line.match(/\s[-–—]\s/g) ?? []).length !== 1) return null;
  const match = DASH_EVENT.exec(line);
  if (!match) return null;
  const [home, away] = [clean(match[1]!), clean(match[2]!)];
  if (![home, away].every(part => /\p{L}{2,}/u.test(part) && !/^\d/.test(part) && part.length <= 80)) return null;
  if (MARKET.test(line) || DATE_WORDS.test(line) || CLOCK.test(line) || detectOdds(line).length || /[%▲▼()]/.test(line)) return null;
  return [home, away];
};
const eventParts = (text: string): [string, string] | null => {
  for (const line of text.split(/[\n|]/).map(clean)) {
    const match = EVENT.exec(line);
    if (match && !MARKET.test(line) && !detectOdds(line).length && !/[%▲▼]/.test(line)) return [clean(match[1]!), clean(match[2]!)];
    const dashed = dashEventParts(line);
    if (dashed) return dashed;
  }
  const match = EVENT.exec(clean(text));
  if (match && !MARKET.test(text) && !detectOdds(text).length && !/[%▲▼]/.test(text)) return [clean(match[1]!), clean(match[2]!)];
  // Browser innerText often flattens a card into one line.  A recognised
  // market heading is a safe boundary for the second participant in that form.
  const flattened = clean(text).match(new RegExp(String.raw`^(.{2,100}?)\s+(?:vs\.?|v\.?|@)\s+(.{2,100}?)(?=\s+${MARKET.source.slice(2)})`, "i"));
  return flattened ? [clean(flattened[1]!), clean(flattened[2]!)] : null;
};

const marketName = (nodes: DomNode[]): string | null => {
  for (const node of nodes) {
    const match = clean(node.text).match(MARKET);
    if (match) return clean(match[0]!);
  }
  return null;
};
// Labels are short rendered texts without prices. Only the deepest node of a nested label counts once.
const isEventLabel = (node: DomNode): boolean => { const text = clean(node.text); return text.length > 0 && text.length <= 120 && !detectOdds(text).length && !MARKET.test(text) && Boolean(eventParts(text)); };
const isMarketLabel = (node: DomNode): boolean => { const text = clean(node.text); return text.length > 0 && text.length < 80 && MARKET.test(text) && !detectOdds(text).length && !eventParts(text); };
const deepest = (nodes: DomNode[]): DomNode[] => nodes.filter(node => !nodes.some(other => other !== node && other.path.startsWith(`${node.path}/`)));
const eventLabels = (node: DomNode): DomNode[] => deepest(descendants(node).filter(isEventLabel));
const marketLabels = (nodes: DomNode[]): DomNode[] => deepest(nodes.filter(isMarketLabel));
const eventNames = (node: DomNode): Set<string> => new Set(eventLabels(node).map(label => eventParts(clean(label.text))!.join(" vs ")));
const parentPath = (path: string): string => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
const EXCLUDED_TAGS = new Set(["body", "html", "main", "nav", "footer", "header"]);

const fragment = (node: DomNode): string => `<${node.tag}${Object.entries(attrs(node)).slice(0, 8).map(([key, value]) => ` ${key}="${value.slice(0, 120)}"`).join("")}>${clean(node.text).slice(0, 1_000)}</${node.tag}>`;
const evidence = (...nodes: DomNode[]): DomEvidence[] => [...new Map(nodes.map((node) => [node.path, { path: node.path, text: clean(node.text).slice(0, 2_000), attrs: attrs(node), fragment: fragment(node) }])).values()];

const sourceEventId = (node: DomNode, sourceUrl: string, eventName: string): string => {
  const explicit = descendants(node).map((item) => attrValue(item, /^(data-)?(?:event|fixture|match|game)(?:-|_)?id$/i)).find((value): value is string => Boolean(value));
  // A DOM key is explicitly namespaced and only used when the source does not
  // expose an event id; it is deterministic evidence, not a claimed provider id.
  return explicit ? `source:${explicit}` : `dom:${createHash("sha256").update(`${sourceUrl}|${eventName}|${node.path}`).digest("hex").slice(0, 24)}`;
};

const selectionText = (node: DomNode, odds: OddsToken, participants: [string, string]): string | null => {
  const explicit = node.attrs?.["data-selection-name"] || node.attrs?.["data-outcome-name"];
  if (explicit && explicit.length <= 100 && !detectOdds(explicit).length && !/[%▲▼]/.test(explicit)) return clean(explicit);
  if (detectOdds(node.text).length !== 1) return null;
  const withoutOdds = clean(node.text.replaceAll(odds.raw, " "));
  if (detectOdds(withoutOdds).length || /[%▲▼]/.test(withoutOdds)) return null;
  const lines = withoutOdds.split(/[\n|]/).map(clean).filter(Boolean);
  const participant = lines.find((line) => participants.includes(line));
  if (participant) return participant;
  const semantic = lines.find((line) => /^(over|under|draw|yes|no|home|away)$/i.test(line));
  if (semantic) return semantic;
  const useful = lines.find((line) => !MARKET.test(line) && !CLOCK.test(line) && line.length <= 100 && /[a-z]/i.test(line));
  return useful ?? null;
};

const closestSelection = (event: DomNode, oddsNode: DomNode): DomNode => {
  const candidates = descendants(event).filter((node) => node.path && (node.path === oddsNode.path || oddsNode.path.startsWith(`${node.path}/`)) && clean(node.text).length <= 300 && detectOdds(node.text).length > 0);
  return candidates.filter(n => n.attrs?.["data-selection-name"] || n.attrs?.["data-outcome-name"] || /[a-z]/i.test(n.text)).sort((a, b) => b.path.length - a.path.length)[0] ?? oddsNode;
};

/** A card is the smallest rendered container that joins one event label with prices. Climbing past a
 * container that already mixes several events stops the search, so a price never borrows a neighbour's event. */
const candidateCards = (root: DomNode): DomNode[] => {
  const all = descendants(root);
  const byPath = new Map(all.map(node => [node.path, node]));
  const names = new Map<DomNode, Set<string>>();
  const namesOf = (node: DomNode) => { let value = names.get(node); if (!value) { value = eventNames(node); names.set(node, value); } return value; };
  const labelled: DomNode[] = [];
  for (const label of eventLabels(root)) {
    let path = parentPath(label.path);
    while (path) {
      const node = byPath.get(path); path = parentPath(path);
      if (!node) continue;
      if (EXCLUDED_TAGS.has(node.tag) || namesOf(node).size !== 1 || clean(node.text).length >= 4_000) break;
      if (detectOdds(clean(node.text)).length && !/parlay-mode-container/.test(node.attrs?.id || "")) { labelled.push(node); break; }
    }
  }
  // Flattened cards keep their one-line "A vs B Market…" form when no separate label node exists.
  const flattened = all.filter((node) => {
    const text = clean(node.text);
    return !EXCLUDED_TAGS.has(node.tag) && !/parlay-mode-container/.test(node.attrs?.id || "") && !eventLabels(node).length && Boolean(eventParts(text)) && detectOdds(text).length > 0 && text.length < 2_000;
  });
  const cards = [...labelled, ...flattened.filter((node) => !flattened.some((other) => other !== node && other.path.startsWith(`${node.path}/`) && eventParts(clean(other.text)) !== null))];
  return [...new Map(cards.map(card => [card.path, card])).values()].filter(card => !cards.some(other => other !== card && card.path.startsWith(`${other.path}/`)));
};

/**
 * Generic extraction is intentionally conservative: an odds token only becomes
 * a record when it shares a card with a parsed fixture, market and selection.
 */
export function extractRenderedDom(root: DomNode, input: { sportsbook: string; sourceUrl: string; collectedAt?: string; defaultSport?: string | null; profile?: DomProfile | null }): DomExtraction {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const cards = candidateCards(root);
  const allOdds = detectOdds(root.text).length;
  const candidates: DomCandidate[] = [];
  if (!cards.length && allOdds) candidates.push({status:"PARTIAL",confidence:0,reasons:["Precios visibles sin límites demostrables de enfrentamiento y mercado"],evidence:evidence(root)});
  for (const card of cards.slice(0, 250)) {
    const text = clean(card.text);
    const labels = eventLabels(card), names = new Set(labels.map(label => eventParts(clean(label.text))!.join(" vs ")));
    const participants = names.size === 1 ? eventParts(clean(labels[0]!.text)) : labels.length === 0 ? eventParts(text) : null;
    if (!participants) { candidates.push({status:"AMBIGUOUS",confidence:0,reasons:["No hay un único encabezado local de enfrentamiento"],evidence:evidence(card)}); continue; }
    const nodes = descendants(card);
    const market = marketName(marketLabels(nodes));
    const priceText = (n:DomNode) => n.attrs?.["data-odds"] || n.text;
    const oddsNodes = nodes.filter((node) => detectOdds(priceText(node)).length > 0 && !(node.children ?? []).some((child) => detectOdds(priceText(child)).length > 0));
    if (!market) {
      candidates.push({ status: "PARTIAL", confidence: .45, reasons: ["fixture and odds found, but no market label"], evidence: evidence(card, ...oddsNodes.slice(0, 4)) });
      continue;
    }
    for (const oddsNode of oddsNodes) for (const odds of detectOdds(priceText(oddsNode))) {
      const marketBounds = nodes.filter(n => n !== card && oddsNode.path.startsWith(`${n.path}/`) && marketLabels(descendants(n)).length === 1).sort((a,b)=>b.path.length-a.path.length);
      const marketNode = marketBounds[0];
      const localMarket = marketNode && marketName(marketLabels(descendants(marketNode)));
      const selectionNode = closestSelection(card, oddsNode);
      const selection = selectionText(selectionNode, odds, participants);
      const ev = evidence(card, ...(marketNode ? [marketNode] : []), selectionNode, oddsNode);
      if (!selection || !localMarket || selectionNode === card || (detectOdds(selectionNode.text).length !== 1 && !(selectionNode.attrs?.["data-selection-name"] && oddsNode.attrs?.["data-odds"]))) {
        candidates.push({ status: "AMBIGUOUS", confidence: .55, reasons: ["odds is inside fixture and market, selection text is ambiguous"], evidence: ev });
        continue;
      }
      const eventName = `${participants[0]} vs ${participants[1]}`;
      const id = sourceEventId(card, input.sourceUrl, eventName);
      const explicitId = id.startsWith("source:");
      const confidence = .72 + (explicitId ? .08 : 0) + (selection === participants[0] || selection === participants[1] ? .05 : 0);
      candidates.push({ status: "VALID", confidence: Math.min(.95, confidence), reasons: ["fixture, market, selection and odds share a rendered card", explicitId ? "source event id attribute" : "deterministic DOM event key"], evidence: ev,
        record: { sportsbook: input.sportsbook, sport: input.defaultSport ?? null, competition: null, eventName, participants: [...participants], homeParticipant: participants[0], awayParticipant: participants[1], eventStartTime: null, eventStatus: LIVE.test(text) ? "live" : "prematch", phase: null, liveClock: CLOCK.exec(text)?.[0] ?? null, market: localMarket, marketPeriod: marketNode?.attrs?.["data-period"] ?? null, selection, selectionStatus: null, line: marketNode?.attrs?.["data-line"] ?? null, decimalOdds: odds.decimal, rawOdds: odds.raw, rawOddsFormat: odds.format, sourceEventId: explicitId ? id : null, sourceMarketId: null, sourceSelectionId: null, sourceUrl: input.sourceUrl, providerTimestamp: null, collectedAt, participantPlayer: null, qualifiers: { extraction: "rendered-dom", confidence: String(Math.min(.95, confidence)), profileVersion: "generic-v2", association: "local-market-selection-price", domEventKey: explicitId ? "" : id, eventPath: card.path, marketPath: marketNode!.path, selectionPath: selectionNode.path, pricePath: oddsNode.path } } });
    }
  }
  const valid = candidates.filter((candidate): candidate is DomCandidate & { record: ProviderRecord } => candidate.status === "VALID" && Boolean(candidate.record));
  const records = [...new Map(valid.map((candidate) => {
    const record = candidate.record;
    return [quoteKey(record) + "|" + record.rawOdds, record] as const;
  })).values()];
  return { candidates, records, detectedEventCards: cards.length, visibleOdds: allOdds };
}
