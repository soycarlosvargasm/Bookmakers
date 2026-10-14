import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { loadBrands } from './brands.js';
import { COLLECTOR_TIMEZONE, DAY_PATTERN } from './daily-records.js';
import { dayInZone } from '../engine/collection.js';
import { fold, slug, teamSimilarity, type AliasIndex, type UEvent } from '../matching/unify.js';
import type { MatchingLayer } from '../matching/layer.js';

/** Matches = filter and compare what the collector already extracted. The matching layer (rules first, AI only for
 * ambiguous pairs) has already grouped the same real match from every house; here each match becomes one card, each
 * market line one table and each bookmaker one row with its original prices. Read-only over PostgreSQL. */

export { fold, slug };
const ACCENTS_FROM = 'áàâãäåéèêëíìîïóòôõöøúùûüñçšžčłß';
const ACCENTS_TO = 'aaaaaaeeeeiiiioooooouuuuncszcls';
if (ACCENTS_FROM.length !== ACCENTS_TO.length) throw new Error('Accent tables must have the same length');
const sqlFold = (expression: string) => `translate(lower(coalesce(${expression},'')),'${ACCENTS_FROM}','${ACCENTS_TO}')`;
const sqlWords = (expression: string) => `regexp_replace(${sqlFold(expression)},'\\s+',' ','g')`;

// ---------------------------------------------------------------------------------------------
// Country: only what the source's own competition label demonstrates ("Spain - La Liga", "Mexico Liga MX").
// ---------------------------------------------------------------------------------------------
export const COUNTRY_NONE = 'Sin país en la fuente';
export const COUNTRY_INTERNATIONAL = 'Internacional';
const COUNTRY_TABLE: Array<[string, string[]]> = [
  ['España', ['spain', 'espana']], ['Inglaterra', ['england', 'inglaterra']], ['Italia', ['italy', 'italia']], ['Alemania', ['germany', 'alemania']], ['Francia', ['france', 'francia']],
  ['Portugal', ['portugal']], ['Países Bajos', ['netherlands', 'paises bajos', 'holanda', 'holland']], ['Bélgica', ['belgium', 'belgica']], ['Escocia', ['scotland', 'escocia']], ['Gales', ['wales', 'gales']],
  ['Irlanda del Norte', ['northern ireland', 'irlanda del norte']], ['Irlanda', ['ireland', 'republic of ireland', 'irlanda']], ['Turquía', ['turkey', 'turquia']], ['Grecia', ['greece', 'grecia']],
  ['Rusia', ['russia', 'rusia']], ['Ucrania', ['ukraine', 'ucrania']], ['Polonia', ['poland', 'polonia']], ['República Checa', ['czech republic', 'czechia', 'republica checa', 'chequia']],
  ['Austria', ['austria']], ['Suiza', ['switzerland', 'suiza']], ['Suecia', ['sweden', 'suecia']], ['Noruega', ['norway', 'noruega']], ['Dinamarca', ['denmark', 'dinamarca']], ['Finlandia', ['finland', 'finlandia']],
  ['Rumanía', ['romania', 'rumania']], ['Serbia', ['serbia']], ['Croacia', ['croatia', 'croacia']], ['Hungría', ['hungary', 'hungria']], ['Bulgaria', ['bulgaria']], ['Eslovaquia', ['slovakia', 'eslovaquia']],
  ['Eslovenia', ['slovenia', 'eslovenia']], ['Islandia', ['iceland', 'islandia']], ['Chipre', ['cyprus', 'chipre']], ['Israel', ['israel']], ['Bosnia y Herzegovina', ['bosnia', 'bosnia and herzegovina', 'bosnia y herzegovina']],
  ['Brasil', ['brazil', 'brasil']], ['Argentina', ['argentina']], ['México', ['mexico']], ['Estados Unidos', ['usa', 'us', 'united states', 'united states of america', 'eeuu', 'ee.uu.', 'ee uu', 'estados unidos']],
  ['Canadá', ['canada']], ['Colombia', ['colombia']], ['Chile', ['chile']], ['Perú', ['peru']], ['Uruguay', ['uruguay']], ['Paraguay', ['paraguay']], ['Ecuador', ['ecuador']], ['Bolivia', ['bolivia']],
  ['Venezuela', ['venezuela']], ['Costa Rica', ['costa rica']], ['Honduras', ['honduras']], ['Guatemala', ['guatemala']], ['Panamá', ['panama']], ['El Salvador', ['el salvador']],
  ['Japón', ['japan', 'japon']], ['China', ['china']], ['Corea del Sur', ['south korea', 'korea republic', 'corea del sur', 'korea']], ['Australia', ['australia']], ['India', ['india']],
  ['Arabia Saudita', ['saudi arabia', 'arabia saudita', 'saudi']], ['Egipto', ['egypt', 'egipto']], ['Marruecos', ['morocco', 'marruecos']], ['Nigeria', ['nigeria']], ['Kenia', ['kenya', 'kenia']],
  ['Sudáfrica', ['south africa', 'sudafrica']], ['Ghana', ['ghana']], ['Argelia', ['algeria', 'argelia']], ['Túnez', ['tunisia', 'tunez']], ['Catar', ['qatar', 'catar']], ['Irán', ['iran']],
  ['Emiratos Árabes Unidos', ['united arab emirates', 'uae', 'emiratos arabes unidos']], ['Indonesia', ['indonesia']], ['Tailandia', ['thailand', 'tailandia']], ['Vietnam', ['vietnam']]
];
const INTERNATIONAL = ['uefa', 'conmebol', 'concacaf', 'caf', 'afc', 'ofc', 'fifa', 'international', 'internacional', 'world', 'mundial'];
const COUNTRY_ALIASES: Array<[string, string]> = [...COUNTRY_TABLE.flatMap(([name, aliases]) => aliases.map(alias => [alias, name] as [string, string])), ...INTERNATIONAL.map(alias => [alias, COUNTRY_INTERNATIONAL] as [string, string])]
  .sort((a, b) => b[0].length - a[0].length);
export function countryOfLabel(label: string | null | undefined): string {
  if (!label) return COUNTRY_NONE;
  const text = fold(label).replace(/^(soccer|football|futbol|futebol)\s+(?=\S)/, '');
  for (const [alias, country] of COUNTRY_ALIASES) {
    if (text === alias) return country;
    if (text.startsWith(alias) && /[\s\-–:.,/]/.test(text[alias.length]!)) return country;
  }
  return COUNTRY_NONE;
}

// ---------------------------------------------------------------------------------------------
// Markets: the same market has different names per house ("Moneyline", "Resultado Final", "Cuotas del partido").
// Only exact, reviewed names are unified; anything else keeps its own name. Unnamed provider codes are excluded.
// ---------------------------------------------------------------------------------------------
export const MARKET_GROUPS = [
  { key: '1x2', label: '1X2 / Ganador', pattern: '^(1x2|1-x-2|1 x 2|match winner|match result|match odds|full time result|resultado final|resultado del partido|cuotas del partido|ganador del partido|vencedor do encontro|moneyline|money line|winner|ganador)( \\((tiempo regular|tiempo reglamentario|regular time|full time|90 minutos)\\))?( - (tiempo reglamentario|tiempo regular|regular time))?$' },
  { key: 'totals', label: 'Total · Más / Menos', pattern: '^(total|totals|totales|over/?under|over under|total (goals|goles|de goles|points|puntos|de puntos|games|juegos|runs)|goles totales|puntos totales|mas ?/ ?menos( de goles)?)$' },
  { key: 'handicap', label: 'Hándicap', pattern: '^(spread|handicap|asian handicap|handicap asiatico|handicap de goles|puck line|run line)$' },
  { key: 'btts', label: 'Ambos equipos marcan', pattern: '^(both teams to score|ambos equipos marcan|ambos marcan|ambos equipos anotan|btts|gol ?/ ?no gol|goal ?/ ?no goal)$' }
] as const;
export const GROUP_KEYS: string[] = MARKET_GROUPS.map(group => group.key);
const MAIN_PERIOD_SQL = `lower(coalesce(m.market_period,'')) IN ('','0','full_time','regular_time','full_event')`;
const MARKET_NAME_SQL = sqlWords('m.market_type');
export const MARKET_KEY_SQL = `(CASE WHEN ${MARKET_NAME_SQL} ~ '^type_[0-9]+$' THEN 'unnamed'
  ${MARKET_GROUPS.map(group => `WHEN ${MAIN_PERIOD_SQL} AND ${MARKET_NAME_SQL} ~ '${group.pattern}' THEN '${group.key}'`).join('\n  ')}
  ELSE 'name:' || ${MARKET_NAME_SQL} || (CASE WHEN ${MAIN_PERIOD_SQL} THEN '' ELSE '|p' || coalesce(m.market_period,'') END) END)`;
export const marketLabel = (key: string, sample?: string | null, period?: string | null): string => {
  const group = MARKET_GROUPS.find(item => item.key === key);
  if (group) return group.label;
  const main = ['', '0', 'full_time', 'regular_time', 'full_event'].includes((period ?? '').toLowerCase());
  return `${sample || key.replace(/^name:/, '')}${main ? '' : ` · periodo ${period}`}`;
};

// ---------------------------------------------------------------------------------------------
// Sport label: one name per sport. "Football" is only unified where the house's own taxonomy is known.
// ---------------------------------------------------------------------------------------------
const FOOTBALL_IS_SOCCER = ['rushbet-co', 'rushbet', 'kto', 'betplay', '1xbet', 'melbet', 'betwinner', '22bet', 'codere', 'betsson', 'betway', 'winpot', 'playdoit', 'multibet', 'palmsbet', 'brasildasorte'];
const SPORT_KEY = `regexp_replace(${sqlFold('e.sport')},'[_\\s]+',' ','g')`;
const SPORT_SQL = `(CASE WHEN ${SPORT_KEY} IN ('soccer','futbol','futebol') THEN 'Fútbol'
  WHEN ${SPORT_KEY} = 'football' AND b.key IN (${FOOTBALL_IS_SOCCER.map(source => `'${source}'`).join(',')}) THEN 'Fútbol'
  WHEN ${SPORT_KEY} IN ('american football','americanfootball') OR (${SPORT_KEY} = 'football' AND b.key = 'pinnacle') THEN 'Fútbol americano'
  WHEN ${SPORT_KEY} IN ('tennis','tenis') THEN 'Tenis' WHEN ${SPORT_KEY} IN ('table tennis','tenis de mesa') THEN 'Tenis de mesa'
  WHEN ${SPORT_KEY} IN ('basketball','baloncesto','basquetbol','basquete') THEN 'Baloncesto' WHEN ${SPORT_KEY} IN ('baseball','beisbol') THEN 'Béisbol'
  WHEN ${SPORT_KEY} IN ('ice hockey','hockey sobre hielo') THEN 'Hockey sobre hielo' WHEN ${SPORT_KEY} IN ('volleyball','voleibol','volei') THEN 'Voleibol'
  WHEN ${SPORT_KEY} IN ('darts','dardos') THEN 'Dardos' WHEN ${SPORT_KEY} IN ('cricket','criquet') THEN 'Críquet' WHEN ${SPORT_KEY} IN ('handball','balonmano') THEN 'Balonmano'
  WHEN ${SPORT_KEY} IN ('boxing','boxeo') THEN 'Boxeo' WHEN ${SPORT_KEY} IN ('esports','e sports') THEN 'Esports'
  ELSE nullif(initcap(${SPORT_KEY}),'') END)`;

// ---------------------------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------------------------
export type MatchFilters = { sport?: string; country?: string; league?: string; day?: string; search?: string; bookmaker?: string; market: string; offset: number; limit: number };
export function validateMatchFilters(query: Record<string, unknown>): MatchFilters {
  const text = (key: string, max = 200) => { const value = query[key]; if (value === undefined || value === '') return undefined; if (typeof value !== 'string' || value.length > max) throw Object.assign(new Error(`Filtro ${key} inválido.`), { statusCode: 400 }); return value.trim() || undefined; };
  const day = text('day', 10);
  if (day && !DAY_PATTERN.test(day)) throw Object.assign(new Error('Indica la fecha como AAAA-MM-DD.'), { statusCode: 400 });
  const market = text('market', 160) ?? '1x2';
  if (!(GROUP_KEYS.includes(market) || /^name:.+/.test(market))) throw Object.assign(new Error('Selecciona un mercado válido.'), { statusCode: 400 });
  return { sport: text('sport'), country: text('country'), league: text('league'), day, search: text('search'), bookmaker: text('bookmaker'), market,
    offset: Math.max(0, Math.floor(Number(query.offset) || 0)), limit: Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 30))) };
}

// A displayed book that is really a column header (HOME / DRAW / AWAY) is a mis-association: use the source instead.
const bookSql = (source: string) => `(CASE WHEN lower(coalesce(nullif(s.latest_qualifiers->>'displayedBook',''), nullif(m.qualifiers->>'displayedBook',''), '')) IN ('','home','draw','away','1','x','2','local','visitante','empate') THEN ${source}
  ELSE coalesce(nullif(s.latest_qualifiers->>'displayedBook',''), m.qualifiers->>'displayedBook') END)`;
const BOOK_SQL = bookSql('b.key');
const USABLE_SQL = `(s.canonical_selection_id IS NULL OR s.canonical_selection_id = s.id) AND s.last_seen_at IS NOT NULL AND lower(coalesce(s.selection_status,'')) NOT IN ('closed','suspended','settled','unavailable')`;
const EVENTS_SQL = `SELECT e.id::text AS id, b.key AS source, ${SPORT_SQL} AS sport, coalesce(cc.display_name, e.competition) AS league, e.event_start_time AS start, em.canonical_event_id::text AS canonical_id,
    coalesce(hp.display_name, nullif(btrim(e.home_participant),''), pr.h) AS home, coalesce(ap.display_name, nullif(btrim(e.away_participant),''), pr.a) AS away, (hp.display_name IS NOT NULL AND ap.display_name IS NOT NULL) AS canonical_names
  FROM events e JOIN sportsbooks b ON b.id = e.sportsbook_id
  LEFT JOIN event_matches em ON em.event_id = e.id AND em.status = 'MATCHED' AND em.canonical_event_id IS NOT NULL
  LEFT JOIN canonical_events ce ON ce.id = em.canonical_event_id
  LEFT JOIN canonical_competitions cc ON cc.id = ce.canonical_competition_id
  LEFT JOIN canonical_participants hp ON hp.id = ce.home_participant_id
  LEFT JOIN canonical_participants ap ON ap.id = ce.away_participant_id
  CROSS JOIN LATERAL (SELECT CASE WHEN x.m[2] = '@' THEN x.m[3] ELSE x.m[1] END AS h, CASE WHEN x.m[2] = '@' THEN x.m[1] ELSE x.m[3] END AS a
    FROM (SELECT regexp_match(e.event_name, '^\\s*(.{1,80}?)\\s+(vs\\.?|v|-|–|@)\\s+(.{1,80}?)\\s*$', 'i') AS m) x) pr
  WHERE lower(coalesce(e.event_status,'')) !~ '^(closed|finished|ended|final|cancelled|canceled|settled)$'
    AND (e.event_start_time IS NULL OR e.event_start_time >= now() OR (lower(coalesce(e.event_status,'')) ~ '^(live|inplay|inprogress|in-play|in_play)$' AND e.event_start_time >= now() - interval '8 hours'))
    AND NOT (${sqlWords('e.event_name')} ~ '\\m(winner|champion|campeon|outright)\\M')
    AND NOT (e.competition IS NOT NULL AND position(lower(e.competition) in lower(e.event_name)) = 1)
    AND NOT (e.event_name ~* '\\((bookings|corners|games|sets|cards|shots)\\)')
    AND coalesce(hp.display_name, nullif(btrim(e.home_participant),''), pr.h) IS NOT NULL AND coalesce(ap.display_name, nullif(btrim(e.away_participant),''), pr.a) IS NOT NULL`;

/** Current source events, normalised for the matching layer. */
export async function loadCurrentEvents(pool: Pool): Promise<UEvent[]> {
  const rows = (await pool.query<{ id: string; source: string; sport: string | null; league: string | null; start: Date | null; canonical_id: string | null; home: string; away: string; canonical_names: boolean }>(EVENTS_SQL)).rows;
  return rows.map(row => { const country = countryOfLabel(row.league); return { id: row.id, source: row.source, sport: row.sport, league: row.league, country: country === COUNTRY_NONE ? null : country, home: row.home, away: row.away, start: row.start ? row.start.toISOString() : null, canonicalId: row.canonical_id, canonicalNames: row.canonical_names }; });
}
/** Team aliases already reviewed in the database (participant_aliases) are deterministic knowledge for the rules. */
export async function loadAliasIndex(pool: Pool): Promise<AliasIndex> {
  const rows = (await pool.query<{ alias_name: string; id: string }>('SELECT alias_name, canonical_participant_id::text AS id FROM participant_aliases')).rows;
  return new Map(rows.map(row => [slug(row.alias_name), row.id]));
}

type Omit = 'sport' | 'country' | 'league' | 'search' | 'bookmaker' | 'market';

// ---------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------
export type MatchRow = { event_id: string; source: string; market_type: string | null; market_period: string | null; selection_id: string; selection_name: string | null; line: string | null; book: string;
  decimal_odds: string | number | null; raw_odds: string | null; raw_odds_format: string | null; observed_at: Date | string; last_seen_at: Date | string | null };
export type Cell = { price: string; decimal: number | null; format: string | null; observedAt: string };
export type BookRow = { bookmaker: string; source: string; cells: Record<string, Cell> };
export type LineBlock = { line: string | null; heading: string | null; columns: string[]; rows: BookRow[] };
export type MatchCard = { id: string; sport: string; country: string; league: string; event: string; home: string; away: string; start: string | null; market: { key: string; label: string }; lines: LineBlock[]; bookmakers: number };
export type ClusterInfo = { id: string; sport: string | null; league: string | null; country: string; home: string; away: string; start: string | null };
export type Placed = { cluster: ClusterInfo; swapped: boolean; memberHome: string; memberAway: string };

const iso = (value: Date | string | null | undefined): string | null => value ? new Date(value).toISOString() : null;
const cleanLine = (value: string | null | undefined): string | null => { if (value == null || String(value).trim() === '') return null; const number = Number(String(value).replace(',', '.')); return Number.isFinite(number) ? String(number) : String(value).trim(); };
const signed = (line: string) => { const number = Number(line); return Number.isFinite(number) ? (number > 0 ? `+${number}` : String(number)) : line; };
const trailingLine = (name: string): string | null => /([+-]?\d+(?:[.,]\d+)?)\s*$/.exec(name)?.[1]?.replace(',', '.') ?? null;

export type OptionContext = { memberHome: string; memberAway: string; swapped: boolean; home: string; away: string; line: string | null };
/** One column per option, labelled with the match's unified names. A source that lists the teams in the opposite order
 * is mapped by side, so "R. Madrid" in one house and "Real Madrid CF" in another end up in the same column. */
export function optionOf(group: string, rawName: string, ctx: OptionContext): { label: string; rank: number; line: string | null; side: 'home' | 'away' | null } {
  const name = rawName.trim(), key = fold(name), bare = name.replace(/\s*[+-]?\d+(?:[.,]\d+)?\s*$/, '');
  const ownHome = teamSimilarity(bare, ctx.memberHome).score, ownAway = teamSimilarity(bare, ctx.memberAway).score;
  const own: 'home' | 'away' | null = ['1', 'home', 'local'].includes(key) ? 'home' : ['2', 'away', 'visitante'].includes(key) ? 'away' : ownHome >= 0.82 && ownHome >= ownAway ? 'home' : ownAway >= 0.82 ? 'away' : null;
  const side = own ? (ctx.swapped ? (own === 'home' ? 'away' : 'home') : own) : null;
  const line = cleanLine(ctx.line) ?? (group === 'totals' || group === 'handicap' ? cleanLine(trailingLine(name)) : null);
  if (group === 'totals') {
    if (/^(over|mas|more)\b/.test(key)) return { label: 'Más de', rank: 0, line, side: null };
    if (/^(under|menos|less)\b/.test(key)) return { label: 'Menos de', rank: 1, line, side: null };
  }
  if (group === 'btts') {
    if (/^(yes|si|gol|goal)$/.test(key)) return { label: 'Sí', rank: 0, line: null, side: null };
    if (/^(no|no goal|sin gol)$/.test(key)) return { label: 'No', rank: 1, line: null, side: null };
  }
  if (group === 'handicap' && side && line) return { label: `${side === 'home' ? ctx.home : ctx.away} ${signed(line)}`, rank: side === 'home' ? 0 : 2, line, side };
  if (side === 'home') return { label: ctx.home, rank: 0, line, side };
  if (['x', 'draw', 'tie', 'empate'].includes(key)) return { label: 'Empate', rank: 1, line, side: null };
  if (side === 'away') return { label: ctx.away, rank: 2, line, side };
  return { label: name || 'Opción', rank: 3, line, side: null };
}

type TimedRow = BookRow & { time: Record<string, number> };
export function buildCards(rows: MatchRow[], marketKey: string, place: (eventId: string) => Placed | undefined, names: Map<string, string> = new Map()): MatchCard[] {
  type Block = { line: string | null; columns: Map<string, number>; books: Map<string, TimedRow> };
  const cards = new Map<string, { card: MatchCard; blocks: Map<string, Block> }>();
  const group = GROUP_KEYS.includes(marketKey) ? marketKey : 'other';
  for (const row of rows) {
    const placed = place(row.event_id); if (!placed) continue;
    const decimal = row.decimal_odds == null ? null : Number(row.decimal_odds);
    const price = row.raw_odds?.trim() || (decimal && decimal > 1 ? String(decimal) : '');
    if (!price || (decimal !== null && (!Number.isFinite(decimal) || decimal <= 1))) continue;
    const cluster = placed.cluster;
    let pending = cards.get(cluster.id);
    if (!pending) {
      pending = { card: { id: cluster.id, sport: cluster.sport || 'Deporte sin identificar', country: cluster.country, league: cluster.league || 'Liga sin identificar', event: `${cluster.home} vs ${cluster.away}`, home: cluster.home, away: cluster.away, start: cluster.start,
        market: { key: marketKey, label: marketLabel(marketKey, row.market_type, row.market_period) }, lines: [], bookmakers: 0 }, blocks: new Map() };
      cards.set(cluster.id, pending);
    }
    const option = optionOf(group, row.selection_name ?? '', { memberHome: placed.memberHome, memberAway: placed.memberAway, swapped: placed.swapped, home: cluster.home, away: cluster.away, line: row.line });
    // A handicap line is read from the home side; totals and other markets use their own line.
    const lineKey = group === 'handicap' ? (option.line ? (option.side === 'away' ? String(-Number(option.line)) : option.line) : '') : group === '1x2' || group === 'btts' ? '' : option.line ?? '';
    let block = pending.blocks.get(lineKey);
    if (!block) { block = { line: lineKey || null, columns: new Map(), books: new Map() }; pending.blocks.set(lineKey, block); }
    if (!block.columns.has(option.label)) block.columns.set(option.label, option.rank);
    const bookName = row.book !== row.source ? row.book.charAt(0).toUpperCase() + row.book.slice(1) : names.get(row.source) ?? row.source;
    const bookKey = `${row.source}|${row.book}`;
    let book = block.books.get(bookKey);
    if (!book) { book = { bookmaker: bookName, source: row.source, cells: {}, time: {} }; block.books.set(bookKey, book); }
    // The latest observation of the same option wins; an older duplicate never replaces it.
    const observedAt = iso(row.observed_at)!, time = Date.parse(observedAt);
    if (!(option.label in book.time) || time >= book.time[option.label]!) { book.time[option.label] = time; book.cells[option.label] = { price, decimal, format: row.raw_odds_format, observedAt }; }
  }
  const result: MatchCard[] = [];
  for (const { card, blocks } of cards.values()) {
    card.lines = [...blocks.values()].map((block): LineBlock => ({ line: block.line, heading: block.line ? (group === 'handicap' ? `Hándicap ${card.home} ${signed(block.line)}` : `Línea ${block.line}`) : null,
      columns: [...block.columns].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'es')).map(([label]) => label),
      rows: [...block.books.values()].map(({ time: _time, ...rest }) => rest).sort((a, b) => a.bookmaker.localeCompare(b.bookmaker, 'es')) }))
      .sort((a, b) => Number(a.line ?? 0) - Number(b.line ?? 0));
    card.bookmakers = new Set(card.lines.flatMap(line => line.rows.map(row => row.bookmaker))).size;
    if (card.lines.length) result.push(card);
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Scope: every current match (already grouped by the matching layer) with its markets and houses, filtered in memory.
// ---------------------------------------------------------------------------------------------
type KeyInfo = { sample: string | null; period: string | null; books: Set<string> };
type GidInfo = { gid: string; sport: string | null; league: string | null; country: string; home: string; away: string; start: string | null; day: string | null; names: string; eventIds: string[]; keys: Map<string, KeyInfo> };
type Scope = { infos: Map<string, GidInfo>; places: Map<string, Placed> };
const SCOPE_TTL_MS = 10_000;
const scopes = new WeakMap<MatchingLayer, { at: number; builtAt: number; value: Promise<Scope> }>();
async function loadScope(pool: Pool, layer: MatchingLayer): Promise<Scope> {
  const snap = await layer.snapshot();
  const cached = scopes.get(layer);
  if (cached && cached.builtAt === snap.builtAt && Date.now() - cached.at < SCOPE_TTL_MS) return cached.value;
  const value = (async (): Promise<Scope> => {
    const infos = new Map<string, GidInfo>(), places = new Map<string, Placed>();
    for (const cluster of snap.clusters) {
      const info: ClusterInfo = { id: cluster.id, sport: cluster.sport, league: cluster.league, country: cluster.country ?? COUNTRY_NONE, home: cluster.home, away: cluster.away, start: cluster.start };
      const start = cluster.start;
      infos.set(cluster.id, { gid: cluster.id, sport: cluster.sport, league: cluster.league, country: info.country, home: cluster.home, away: cluster.away, start, day: start ? dayInZone(start, COLLECTOR_TIMEZONE) : null,
        names: fold(cluster.members.map(member => `${member.event.home} ${member.event.away}`).concat(`${cluster.home} ${cluster.away}`).join(' ')), eventIds: cluster.members.map(member => member.event.id), keys: new Map() });
      for (const member of cluster.members) places.set(member.event.id, { cluster: info, swapped: member.swapped, memberHome: member.event.home, memberAway: member.event.away });
    }
    const ids = [...places.keys()];
    if (ids.length) {
      const rows = (await pool.query<{ event_id: string; key: string; sample: string | null; period: string | null; books: string[] }>(
        `SELECT m.event_id::text AS event_id, n.key, min(m.market_type) AS sample, min(m.market_period) AS period, array_agg(DISTINCT b.key || '|' || ${BOOK_SQL}) AS books
         FROM markets m JOIN events e ON e.id = m.event_id JOIN sportsbooks b ON b.id = e.sportsbook_id JOIN selections s ON s.market_id = m.id
         CROSS JOIN LATERAL (SELECT ${MARKET_KEY_SQL} AS key) n
         WHERE m.event_id = ANY($1::bigint[]) AND ${USABLE_SQL} AND n.key <> 'unnamed' GROUP BY m.event_id, n.key`, [ids])).rows;
      for (const row of rows) {
        const info = infos.get(places.get(row.event_id)!.cluster.id)!, key = info.keys.get(row.key) ?? { sample: row.sample, period: row.period, books: new Set<string>() };
        row.books.forEach(book => key.books.add(book)); info.keys.set(row.key, key);
      }
    }
    return { infos, places };
  })();
  scopes.set(layer, { at: Date.now(), builtAt: snap.builtAt, value });
  value.catch(() => scopes.delete(layer));
  return value;
}
const bookOf = (entry: string) => { const at = entry.indexOf('|'); return { source: entry.slice(0, at), book: entry.slice(at + 1) }; };
const hasBook = (keyInfo: KeyInfo, book: string) => [...keyInfo.books].some(entry => bookOf(entry).book === book);
function passes(info: GidInfo, f: MatchFilters, omit: Omit[] = []): boolean {
  const use = (name: Omit) => !omit.includes(name);
  if (use('sport') && f.sport && info.sport !== f.sport) return false;
  if (use('country') && f.country && info.country !== f.country) return false;
  if (use('league') && f.league && info.league !== f.league) return false;
  if (f.day && info.day !== f.day) return false;
  if (use('search') && f.search && !info.names.includes(fold(f.search))) return false;
  if (use('market')) { const key = info.keys.get(f.market); if (!key || (use('bookmaker') && f.bookmaker && !hasBook(key, f.bookmaker))) return false; }
  else if (use('bookmaker') && f.bookmaker && ![...info.keys.values()].some(key => hasBook(key, f.bookmaker!))) return false;
  return true;
}

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------
async function brandNames(): Promise<Map<string, string>> { return new Map((await loadBrands().catch(() => [])).map(brand => [brand.id, brand.name])); }
const bookLabel = (book: string, source: string, names: Map<string, string>) => book !== source ? book.charAt(0).toUpperCase() + book.slice(1) : names.get(source) ?? source;

export async function readMatches(pool: Pool, layer: MatchingLayer, filters: MatchFilters): Promise<{ cards: MatchCard[]; total: number; offset: number; limit: number; market: { key: string; label: string } }> {
  const scope = await loadScope(pool, layer);
  const matching = [...scope.infos.values()].filter(info => passes(info, filters)).sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999') || (a.league ?? '').localeCompare(b.league ?? '', 'es') || a.gid.localeCompare(b.gid));
  const sample = matching[0]?.keys.get(filters.market);
  const market = { key: filters.market, label: marketLabel(filters.market, sample?.sample ?? filters.market.replace(/^name:/, '').replace(/\|p.*$/, ''), sample?.period) };
  const page = matching.slice(filters.offset, filters.offset + filters.limit);
  if (!page.length) return { cards: [], total: matching.length, offset: filters.offset, limit: filters.limit, market };
  const rows = await pool.query<MatchRow>(
    `SELECT m.event_id::text AS event_id, b.key AS source, m.market_type, m.market_period, s.id::text AS selection_id, s.selection_name, s.line, ${BOOK_SQL} AS book, o.decimal_odds, o.raw_odds, o.raw_odds_format, o.observed_at, s.last_seen_at
     FROM markets m JOIN events e ON e.id = m.event_id JOIN sportsbooks b ON b.id = e.sportsbook_id JOIN selections s ON s.market_id = m.id
     JOIN LATERAL (SELECT * FROM odds_observations WHERE selection_id = s.id ORDER BY observed_at DESC, id DESC LIMIT 1) o ON true
     LEFT JOIN odds_observation_flags f ON f.observation_id = o.id
     CROSS JOIN LATERAL (SELECT ${MARKET_KEY_SQL} AS key) n
     WHERE m.event_id = ANY($1::bigint[]) AND n.key = $2 AND ($3::text IS NULL OR ${BOOK_SQL} = $3) AND ${USABLE_SQL} AND f.observation_id IS NULL
       AND lower(coalesce(s.latest_qualifiers->>'crossValidation','')) NOT IN ('conflict','rejected')`,
    [page.flatMap(info => info.eventIds), filters.market, filters.bookmaker ?? null]);
  const cards = buildCards(rows.rows, filters.market, eventId => scope.places.get(eventId), await brandNames());
  const order = new Map(page.map((info, index) => [info.gid, index]));
  cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { cards, total: matching.length, offset: filters.offset, limit: filters.limit, market };
}

export type FacetOption = { value: string; label: string; count: number };
export async function readFacets(pool: Pool, layer: MatchingLayer, filters: MatchFilters): Promise<{ sports: FacetOption[]; countries: FacetOption[]; leagues: FacetOption[]; bookmakers: FacetOption[]; markets: Array<FacetOption & { group: boolean }>; matches: Array<{ label: string; start: string | null }>; today: string }> {
  const scope = [...(await loadScope(pool, layer)).infos.values()], names = await brandNames();
  const tally = (infos: GidInfo[], pick: (info: GidInfo) => string | null) => { const counts = new Map<string, number>(); for (const info of infos) { const value = pick(info); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); } return counts; };
  const options = (counts: Map<string, number>, label: (value: string) => string = value => value): FacetOption[] => [...counts].map(([value, count]) => ({ value, label: label(value), count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
  const sports = options(tally(scope.filter(info => passes(info, filters, ['sport', 'country', 'league'])), info => info.sport));
  const countries = options(tally(scope.filter(info => passes(info, filters, ['country', 'league'])), info => info.country)).sort((a, b) => Number(a.value === COUNTRY_NONE) - Number(b.value === COUNTRY_NONE) || b.count - a.count || a.label.localeCompare(b.label, 'es'));
  const leagues = options(tally(scope.filter(info => passes(info, filters, ['league'])), info => info.league));
  const bookCounts = new Map<string, FacetOption>();
  for (const info of scope.filter(item => passes(item, filters, ['bookmaker']))) {
    for (const entry of info.keys.get(filters.market)?.books ?? []) { const { source, book } = bookOf(entry); const option = bookCounts.get(book) ?? { value: book, label: bookLabel(book, source, names), count: 0 }; option.count++; bookCounts.set(book, option); }
  }
  const marketCounts = new Map<string, { count: number; sample: string | null; period: string | null }>();
  for (const info of scope.filter(item => passes(item, filters, ['market']))) {
    for (const [key, keyInfo] of info.keys) {
      if (filters.bookmaker && !hasBook(keyInfo, filters.bookmaker)) continue;
      const entry = marketCounts.get(key) ?? { count: 0, sample: keyInfo.sample, period: keyInfo.period }; entry.count++; marketCounts.set(key, entry);
    }
  }
  const markets = [...marketCounts].map(([value, entry]) => ({ value, label: marketLabel(value, entry.sample, entry.period), count: entry.count, group: GROUP_KEYS.includes(value) }))
    .sort((a, b) => Number(b.group) - Number(a.group) || (a.group ? GROUP_KEYS.indexOf(a.value) - GROUP_KEYS.indexOf(b.value) : b.count - a.count || a.label.localeCompare(b.label, 'es'))).slice(0, 140);
  const matches = scope.filter(info => passes(info, filters, ['search'])).sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999')).slice(0, 200).map(info => ({ label: `${info.home} vs ${info.away}`, start: info.start }));
  return { sports, countries, leagues, bookmakers: [...bookCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es')), markets, matches, today: dayInZone(Date.now(), COLLECTOR_TIMEZONE) };
}

export function registerMatchesRoutes(app: FastifyInstance, pool: Pool, layer: MatchingLayer): void {
  app.get<{ Querystring: Record<string, string> }>('/api/matches', async request => readMatches(pool, layer, validateMatchFilters(request.query ?? {})));
  app.get<{ Querystring: Record<string, string> }>('/api/matches/facets', async request => readFacets(pool, layer, validateMatchFilters({ ...request.query, offset: '0', limit: '1' })));
}
