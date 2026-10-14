import { createHash } from 'node:crypto';

/** Deterministic matching of source events. Pure functions: the same input always yields the same clusters.
 * Rules use sport, league country, team names (aliases, abbreviations, qualifiers), kickoff time and home/away order.
 * Whatever the rules cannot settle is reported as a pending pair; nothing here touches prices. */

export const fold = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const slug = (value: string): string => fold(value).replace(/[^a-z0-9]/g, '');

export type UEvent = { id: string; source: string; sport: string | null; league: string | null; country: string | null; home: string; away: string; start: string | null; canonicalId: string | null; canonicalNames: boolean };
export type Verdict = 'SAME' | 'AMBIGUOUS' | 'DIFFERENT';
export type Comparison = { verdict: Verdict; swapped: boolean; score: number; minutes: number | null; teams: [number, number]; reasons: string[] };
export type Decision = { verdict: 'SAME' | 'DIFFERENT' | 'UNSURE'; swapped: boolean; confidence: number; method: 'deterministic' | 'ai' | 'manual'; reason?: string; decidedAt?: string };
export type AliasIndex = Map<string, string>;
export type Member = { event: UEvent; swapped: boolean; method: 'anchor' | 'canonical' | 'rules' | 'ai' | 'manual'; confidence: number };
export type Cluster = { id: string; members: Member[]; home: string; away: string; league: string | null; country: string | null; sport: string | null; start: string | null };
export type PendingPair = { key: string; a: UEvent; b: UEvent; comparison: Comparison };
export type UnifyStats = { events: number; matches: number; merged: number; byRules: number; byAi: number; byManual: number; byCanonical: number; pending: number };
export type ReviewedPair = PendingPair & { decision: Decision };
export type UnifyResult = { clusters: Cluster[]; pending: PendingPair[]; reviewed: ReviewedPair[]; stats: UnifyStats };

export const WINDOW_MINUTES = 90, SAME_MINUTES = 15;
const NOISE = new Set(['fc', 'cf', 'sc', 'ac', 'afc', 'cd', 'ud', 'sd', 'rc', 'ss', 'as', 'us', 'fk', 'sk', 'bk', 'if', 'ik', 'cs', 'ca', 'cfc', 'club', 'de', 'del', 'la', 'el', 'los', 'las', 'the', 'and', 'y', 'e', 'da', 'do', 'ec', 'se', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'rb', 'kv', 'ksv', 'sporting club']);
const QUALIFIER = /^(u\d{2}|sub\d{2}|w|women|womens|woman|femenino|femenina|fem|feminine|ii|iii|reserves|reserve|res|youth|juniors|junior|jr|academy|amateur)$/;
const SYNONYM: Record<string, string> = { utd: 'united', intl: 'international', int: 'international', atl: 'atletico', ath: 'athletic', dep: 'deportivo', munchen: 'munich', muenchen: 'munich', saint: 'st', sankt: 'st' };

type Parts = { core: string[]; qualifiers: string[] };
function parts(name: string): Parts {
  // Dotted initials such as "S.K." or "F.C." are club suffixes, not separate letters.
  const text = fold(name).replace(/\(([^)]*)\)/g, ' $1 ').replace(/\b([a-z])\.(?=[a-z]\.)/g, '$1').replace(/\b([a-z])\.(?=\s|$)/g, (_m, c, offset, whole) => /[a-z]$/.test(whole.slice(Math.max(0, offset - 1), offset)) ? c : `${c} `).replace(/[^a-z0-9\s]/g, ' ');
  const raw = text.split(/\s+/).filter(Boolean);
  const qualifiers = raw.filter(token => QUALIFIER.test(token)).sort();
  let core = raw.filter(token => !QUALIFIER.test(token) && !NOISE.has(token) && !/^(18|19)\d{2}$/.test(token)).map(token => SYNONYM[token] ?? token);
  if (core.length > 1) core = core.filter(token => !/^\d{2}$/.test(token));
  if (!core.length) core = raw.filter(token => !QUALIFIER.test(token)).map(token => SYNONYM[token] ?? token);
  return { core, qualifiers };
}
// Symmetric: "r" ~ "real", "man" ~ "manchester", "utd" is already a synonym. The shorter token must open the longer one.
const tokenMatch = (x: string, y: string): 'equal' | 'abbrev' | null => {
  if (x === y) return 'equal';
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length === 1 && long.startsWith(short)) return 'abbrev';
  if (short.length >= 3 && long.startsWith(short) && short.length / long.length >= 0.3) return 'abbrev';
  return null;
};
function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) { let previous = row[0]!; row[0] = i; for (let j = 1; j <= b.length; j++) { const current = row[j]!; row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; } }
  return row[b.length]!;
}

export type TeamSimilarity = { score: number; kind: 'alias' | 'exact' | 'abbrev' | 'subset' | 'fuzzy' | 'qualifier' | 'none' };
export function teamSimilarity(a: string, b: string, aliases?: AliasIndex): TeamSimilarity {
  const pa = parts(a), pb = parts(b);
  if (!pa.core.length || !pb.core.length) return { score: 0, kind: 'none' };
  if (aliases) { const ia = aliases.get(slug(a)), ib = aliases.get(slug(b)); if (ia && ib) return ia === ib ? { score: 1, kind: 'alias' } : { score: 0, kind: 'none' }; }
  if (pa.qualifiers.join(' ') !== pb.qualifiers.join(' ')) return { score: 0, kind: 'qualifier' };
  const [short, long] = pa.core.length <= pb.core.length ? [pa.core, pb.core] : [pb.core, pa.core];
  const free = [...long]; let allEqual = true, matched = 0;
  for (const token of short) {
    let index = free.findIndex(candidate => tokenMatch(token, candidate) === 'equal');
    if (index < 0) { index = free.findIndex(candidate => tokenMatch(token, candidate) === 'abbrev'); if (index >= 0) allEqual = false; }
    if (index < 0) break;
    free.splice(index, 1); matched++;
  }
  if (matched === short.length) {
    if (free.length === 0) return allEqual ? { score: 1, kind: 'exact' } : { score: 0.92, kind: 'abbrev' };
    if (free.length === 1) return free[0]!.length === 1 ? { score: 0, kind: 'qualifier' } : { score: 0.86, kind: 'subset' };
  }
  const x = pa.core.join(''), y = pb.core.join('');
  if (Math.min(x.length, y.length) >= 5 && 1 - levenshtein(x, y) / Math.max(x.length, y.length) >= 0.88) return { score: 0.82, kind: 'fuzzy' };
  return { score: 0, kind: 'none' };
}

const minutesBetween = (a: string | null, b: string | null): number | null => a && b ? Math.abs(Date.parse(a) - Date.parse(b)) / 60000 : null;
const realCountry = (country: string | null) => country && country !== 'Internacional' ? country : null;

export function compareEvents(a: UEvent, b: UEvent, aliases?: AliasIndex): Comparison {
  const none = (reason: string, minutes: number | null = null, teams: [number, number] = [0, 0]): Comparison => ({ verdict: 'DIFFERENT', swapped: false, score: 0, minutes, teams, reasons: [reason] });
  if (!a.sport || !b.sport || a.sport !== b.sport) return none('deporte distinto o sin identificar');
  const minutes = minutesBetween(a.start, b.start);
  if (minutes === null) return none('sin fecha: no hay base para agrupar');
  if (minutes > WINDOW_MINUTES) return none(`hora distinta (${Math.round(minutes)} min)`, minutes);
  const countryA = realCountry(a.country), countryB = realCountry(b.country);
  if (countryA && countryB && countryA !== countryB) return none(`país de la liga distinto (${countryA} / ${countryB})`, minutes);
  const direct: [number, number] = [teamSimilarity(a.home, b.home, aliases).score, teamSimilarity(a.away, b.away, aliases).score];
  const reversed: [number, number] = [teamSimilarity(a.home, b.away, aliases).score, teamSimilarity(a.away, b.home, aliases).score];
  const useReversed = Math.min(...reversed) > Math.min(...direct) || (Math.min(...reversed) === Math.min(...direct) && reversed[0] + reversed[1] > direct[0] + direct[1]);
  const teams = useReversed ? reversed : direct, weak = Math.min(...teams), strong = Math.max(...teams);
  const orientation = useReversed ? 'local/visitante invertidos' : 'mismo orden';
  const time = minutes <= 1 ? 1 : minutes <= SAME_MINUTES ? 0.9 : 0.6;
  const score = Number(((teams[0] + teams[1]) / 2 * 0.7 + time * 0.3).toFixed(3));
  if (weak >= 0.82 && minutes <= SAME_MINUTES) return { verdict: 'SAME', swapped: useReversed, score, minutes, teams, reasons: ['equipos equivalentes', `${Math.round(minutes)} min de diferencia`, orientation] };
  // The very same two sides cannot play two different matches within 90 minutes: houses simply estimate kickoff differently.
  if (weak >= 0.95) return { verdict: 'SAME', swapped: useReversed, score, minutes, teams, reasons: ['mismos equipos con la hora estimada distinta', `${Math.round(minutes)} min de diferencia`, orientation] };
  if (weak >= 0.82) return { verdict: 'AMBIGUOUS', swapped: useReversed, score, minutes, teams, reasons: ['equipos equivalentes pero la hora difiere', `${Math.round(minutes)} min de diferencia`, orientation] };
  if (strong >= 0.95 && minutes <= SAME_MINUTES) return { verdict: 'AMBIGUOUS', swapped: useReversed, score, minutes, teams, reasons: ['un equipo idéntico a la misma hora; el otro con nombre distinto', orientation] };
  return none('equipos distintos', minutes, teams);
}

export function signature(event: UEvent): string {
  return [event.sport ?? '', slug(event.home), slug(event.away), event.start ? new Date(event.start).toISOString().slice(0, 16) : '', slug(event.league ?? '')].join('|');
}
export function pairKey(a: UEvent, b: UEvent): string {
  return createHash('sha1').update([signature(a), signature(b)].sort().join('||')).digest('hex');
}

const quality = (name: string) => (/[.]/.test(name) ? -2 : 0) + (name.split(/\s+/).some(token => token.length === 1) ? -2 : 0);
/** Display name: the engine's canonical name when there is one, otherwise the most common spelling, without
 * abbreviations and without club suffixes ("Real Madrid" over "R. Madrid" and "Real Madrid CF"). */
function pickName(candidates: Array<{ name: string; canonical: boolean }>): string {
  const canonical = candidates.find(candidate => candidate.canonical); if (canonical) return canonical.name;
  const groups = new Map<string, string[]>();
  for (const { name } of candidates) { const key = parts(name).core.join(' ') || slug(name); groups.set(key, [...(groups.get(key) ?? []), name]); }
  const best = [...groups.values()].sort((x, y) => y.length - x.length || Math.max(...y.map(quality)) - Math.max(...x.map(quality)) || x[0]!.localeCompare(y[0]!))[0]!;
  return [...best].sort((x, y) => quality(y) - quality(x) || x.length - y.length || x.localeCompare(y))[0]!;
}
function pickLeague(members: Member[]): { league: string | null; country: string | null } {
  const labelled = members.map(member => ({ league: member.event.league, country: realCountry(member.event.country) ?? member.event.country, known: Boolean(member.event.country) })).filter(item => item.league);
  if (!labelled.length) return { league: null, country: null };
  const counts = new Map<string, number>(); for (const item of labelled) counts.set(item.league!, (counts.get(item.league!) ?? 0) + 1);
  const best = [...labelled].sort((x, y) => Number(y.known) - Number(x.known) || (counts.get(y.league!) ?? 0) - (counts.get(x.league!) ?? 0) || y.league!.length - x.league!.length)[0]!;
  return { league: best.league, country: best.country };
}
function finish(members: Member[]): Cluster {
  const anchor = [...members].sort((a, b) => Number(a.event.id) - Number(b.event.id) || a.event.id.localeCompare(b.event.id))[0]!;
  const home = pickName(members.map(member => ({ name: member.swapped ? member.event.away : member.event.home, canonical: member.event.canonicalNames })));
  const away = pickName(members.map(member => ({ name: member.swapped ? member.event.home : member.event.away, canonical: member.event.canonicalNames })));
  const { league, country } = pickLeague(members);
  return { id: `u${anchor.event.id}`, members, home, away, league, country, sport: anchor.event.sport, start: members.map(member => member.event.start).filter((v): v is string => Boolean(v)).sort()[0] ?? null };
}

export function unify(events: UEvent[], options: { aliases?: AliasIndex; decisions?: Map<string, Decision> } = {}): UnifyResult {
  const { aliases, decisions } = options;
  const pending = new Map<string, PendingPair>();
  const groups: Member[][] = [];
  // 1) Matches the engine already proved (canonical id) are trusted as one group.
  const canonical = new Map<string, UEvent[]>(), loose: UEvent[] = [];
  for (const event of events) { if (event.canonicalId) { const list = canonical.get(event.canonicalId) ?? []; list.push(event); canonical.set(event.canonicalId, list); } else loose.push(event); }
  let byCanonical = 0;
  for (const list of canonical.values()) {
    const [first, ...rest] = list.sort((a, b) => a.id.localeCompare(b.id));
    groups.push([{ event: first!, swapped: false, method: 'anchor', confidence: 1 }, ...rest.map((event): Member => ({ event, swapped: compareEvents(first!, event, aliases).swapped, method: 'canonical', confidence: 1 }))]);
    byCanonical += rest.length;
  }
  // 2) The rest join the best group they equal; ambiguous pairs wait for a stored verdict or the AI.
  let byRules = 0, byAi = 0, byManual = 0;
  const reviewed = new Map<string, ReviewedPair>();
  const dated = loose.filter(event => event.start).sort((a, b) => Date.parse(a.start!) - Date.parse(b.start!) || a.id.localeCompare(b.id));
  const open = groups.map(members => ({ members, anchorStart: members[0]!.event.start, sport: members[0]!.event.sport }));
  for (const event of dated) {
    let best: { target: typeof open[number]; member: Member; swapped: boolean; score: number; method: 'rules' | 'ai' | 'manual' } | null = null;
    const waiting: PendingPair[] = [];
    for (const target of open) {
      if (target.sport !== event.sport || (minutesBetween(target.anchorStart, event.start) ?? Infinity) > WINDOW_MINUTES + 120) continue;
      let ambiguous: PendingPair | null = null;
      for (const member of target.members) {
        const comparison = compareEvents(member.event, event, aliases);
        let verdict: Verdict = comparison.verdict, swapped = comparison.swapped, method: 'rules' | 'ai' | 'manual' = 'rules';
        const key = pairKey(member.event, event), decision = decisions?.get(key);
        if (decision?.method === 'manual') {
          // An explicit decision beats the rules and the AI, in both directions.
          if (decision.verdict === 'SAME') { verdict = 'SAME'; swapped = decision.swapped; method = 'manual'; } else verdict = 'DIFFERENT';
        } else if (verdict === 'AMBIGUOUS') {
          if (decision?.verdict === 'SAME') { verdict = 'SAME'; swapped = decision.swapped; method = 'ai'; }
          else if (decision) { verdict = 'DIFFERENT'; reviewed.set(key, { key, a: member.event, b: event, comparison, decision }); }
          else if (!ambiguous || comparison.score > ambiguous.comparison.score) ambiguous = { key, a: member.event, b: event, comparison };
        }
        if (verdict === 'SAME' && (!best || comparison.score > best.score || method === 'manual')) best = { target, member, swapped: member.swapped !== swapped, score: method === 'manual' ? 1 : comparison.score, method };
      }
      if (ambiguous) waiting.push(ambiguous);
    }
    if (best) { best.target.members.push({ event, swapped: best.swapped, method: best.method, confidence: best.score }); if (best.method === 'ai') byAi++; else if (best.method === 'manual') byManual++; else byRules++; }
    else {
      for (const pair of waiting) pending.set(pair.key, pair);
      const members: Member[] = [{ event, swapped: false, method: 'anchor', confidence: 1 }];
      groups.push(members); open.push({ members, anchorStart: event.start, sport: event.sport });
    }
  }
  // Events without a date cannot be grouped safely: each stays alone.
  for (const event of loose.filter(item => !item.start)) groups.push([{ event, swapped: false, method: 'anchor', confidence: 1 }]);
  const clusters = groups.map(finish).sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999') || a.id.localeCompare(b.id));
  return { clusters, pending: [...pending.values()].sort((a, b) => b.comparison.score - a.comparison.score), reviewed: [...reviewed.values()], stats: { events: events.length, matches: clusters.length, merged: events.length - clusters.length, byRules, byAi, byManual, byCanonical, pending: pending.size } };
}
