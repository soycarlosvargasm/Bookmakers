import { detectOdds, type DomNode, type DomProfile } from "../dom/extractor.js";
import type { ExtractionProfile } from "../engine/types.js";
import type { ProviderRecord } from "../normalization/types.js";

export const BESTFIGHTODDS_DOM_PROFILE: DomProfile = {
  version: "bestfightodds-dom-v3",
  eventSelector: "table.odds-table:not(.odds-table-responsive-header) tr:has([data-mu])"
};

export const BESTFIGHTODDS_EXTRACTION_PROFILE: ExtractionProfile = {
  version: "bestfightodds-extraction-v3",
  domProfile: BESTFIGHTODDS_DOM_PROFILE
};

const clean = (value: string): string => value.replace(/\s+/g, " ").trim();
const bookmakerName = (value: string): string => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
const descendants = (node: DomNode): DomNode[] => [node, ...(node.children ?? []).flatMap(descendants)];
const attr = (node: DomNode, name: string): string | undefined => node.attrs?.[name];

import { quoteKey } from "../validation/records.js";

type Quote = { bookId: string; book: string; bookmaker: string; outcome: string; raw: string; decimal: number };
type FighterRow = { name: string; quotes: Quote[]; path: string };

/** BFO places each fighter in a separate table row. data-mu joins the pair;
 * td[data-li="[book,outcome,matchup]"] binds a moneyline price to that row. */
export function extractBestFightOddsDom(root: DomNode, input: { sportsbook: string; sourceUrl: string; collectedAt?: string }): ProviderRecord[] {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const records: ProviderRecord[] = [];
  const parents = new Map<DomNode,DomNode>();
  const visit = (n:DomNode) => { for (const child of n.children || []) {parents.set(child,n); visit(child);} }; visit(root);
  const all = descendants(root);
  for (const table of all.filter(node => node.tag === "table" && !/odds-table-responsive-header/.test(attr(node,"class") || ""))) {
    const ancestors:DomNode[] = []; let ancestor:DomNode|undefined = table;
    while (ancestor) {ancestors.push(ancestor);ancestor=parents.get(ancestor);}
    const block = ancestors.find(n => descendants(n).filter(t => t.tag === "table" && !/responsive-header/.test(attr(t,"class") || "")).length === 1 && descendants(n).some(h => /^h[1-3]$/.test(h.tag))) || table;
    const heading = descendants(block).find(node => /^h[1-3]$/.test(node.tag));
    const competition = clean(heading?.text ?? "").replace(/\s+odds$/i, "") || null;
    // Only an explicit time with timezone can establish the event instant. News dates / capture dates are never used.
    const dateText = descendants(block).flatMap(n => [attr(n,"datetime"),attr(n,"data-event-start"),attr(n,"data-start-time")]).find(v => v && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(v) && Number.isFinite(Date.parse(v)));
    const start = dateText ? new Date(dateText).toISOString() : null;
    const books = new Map(descendants(table).filter((node) => node.tag === "th" && attr(node, "data-b"))
      .map((node) => [attr(node, "data-b")!, clean((node.children ?? []).find((child) => child.tag === "a")?.text ?? node.text)] as const));
    const groups = new Map<string, Map<string, FighterRow>>();
    for (const row of descendants(table).filter((node) => node.tag === "tr")) {
      const id = descendants(row).map((node) => attr(node, "data-mu")).find((value) => value && /^\d+$/.test(value));
      if (!id) continue;
      const heading = (row.children ?? []).find((node) => node.tag === "th");
      const name = clean((heading?.children ?? []).filter((node) => node.tag === "a").at(-1)?.text ?? heading?.text ?? "").replace(/^\d{4,6}\s*/, "");
      if (!name || name.length > 100 || /[%▲▼]|[+-]\d{3}/.test(name)) continue;
      const quotes: Quote[] = [];
      for (const cell of (row.children ?? []).filter((node) => node.tag === "td")) {
        const match = /^\[(\d+),([12]),(\d+)\]$/.exec(attr(cell, "data-li") ?? "");
        if (!match || match[3] !== id) continue;
        const book = books.get(match[1]!);
        if (!book) continue;
        const tokens = detectOdds(cell.text);
        const odds = tokens.length === 1 ? tokens.find((item) => item.format === "american" && item.decimal !== null) : undefined;
        if (odds) quotes.push({ bookId: match[1]!, book, bookmaker: bookmakerName(book), outcome: match[2]!, raw: odds.raw, decimal: odds.decimal! });
      }
      const group = groups.get(id) ?? new Map<string, FighterRow>();
      group.set(name, { name, quotes, path: row.path });
      groups.set(id, group);
    }
    for (const [id, group] of groups) {
      const fighters = [...group.values()];
      if (fighters.length !== 2 || fighters.some(f => new Set(f.quotes.map(q => q.outcome)).size > 1) || (fighters[0]?.quotes[0] && fighters[1]?.quotes[0] && fighters[0].quotes[0].outcome === fighters[1].quotes[0].outcome)) continue;
      const participants = fighters.map((fighter) => fighter.name);
      const eventName = `${participants[0]} vs ${participants[1]}`;
      for (const fighter of fighters) for (const quote of fighter.quotes) {
        const marketId = `${id}:moneyline:${quote.bookId}`;
        records.push({
          sportsbook: input.sportsbook,
          bookmaker: quote.bookmaker,
          sport: "mma",
          competition,
          eventName,
          participants,
          // Pair order is display order, not demonstrated home / away roles.
          awayParticipant: null,
          homeParticipant: null,
          eventStartTime: start,
          eventStatus: null,
          market: "Moneyline",
          marketPeriod: "fight",
          selection: fighter.name,
          selectionStatus: null,
          line: null,
          decimalOdds: quote.decimal,
          rawOdds: quote.raw,
          rawOddsFormat: "american",
          sourceEventId: id,
          sourceMarketId: marketId,
          sourceSelectionId: `${marketId}:${quote.outcome}`,
          sourceUrl: input.sourceUrl,
          providerTimestamp: null,
          collectedAt,
          participantPlayer: null,
          qualifiers: { extraction: "rendered-dom", profileVersion: BESTFIGHTODDS_DOM_PROFILE.version, displayedBook: quote.book, displayedBookId: quote.bookId, association: "data-mu-data-li-data-b", eventPath: table.path, selectionPath: fighter.path, competitionKind: "card", cardName: competition || "" }
        });
      }
    }
  }
  return [...new Map(records.map((record) => [quoteKey(record) + "|" + record.rawOdds, record])).values()];
}

/** Keep unsupported or incomplete table groups visible alongside usable rows. */
export function bestFightOddsPending(root: DomNode, records: ProviderRecord[]): Array<{id:string;path:string;reason:string}> {
  const groups = new Map<string,{id:string;path:string;reason:string}>();
  const known = new Set(records.map(r=>r.sourceEventId));
  for (const row of descendants(root).filter(n=>n.tag==='tr')) {
    const id = descendants(row).map(n=>attr(n,'data-mu')).find(Boolean);
    const cells = descendants(row).filter(n=>n.tag==='td' && attr(n,'data-li') && detectOdds(n.text).length);
    if (!cells.length && !id) continue;
    const bad = cells.some(cell => {const match=/^\[(\d+),([12]),(\d+)\]$/.exec(attr(cell,'data-li')||'');return !match || detectOdds(cell.text).length!==1 || !records.some(r=>r.sourceEventId===match[3]&&r.qualifiers?.displayedBookId===match[1]&&r.sourceSelectionId?.endsWith(`:${match[2]}`));});
    if (!id || !known.has(id) || bad) {
      const key=id || row.path;
      groups.set(key,{id:key,path:row.path,reason:'Tabla BestFightOdds pendiente: pareja data-mu, celda data-li o cabecera de casa incompleta / no compatible.'});
    }
  }
  return [...groups.values()];
}
