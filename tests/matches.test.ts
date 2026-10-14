import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { buildCards, countryOfLabel, loadAliasIndex, loadCurrentEvents, marketLabel, optionOf, readFacets, readMatches, validateMatchFilters, type MatchRow, type Placed } from '../src/ui/matches.js';
import { MatchingLayer } from '../src/matching/layer.js';
import { saveRecordBatch } from '../src/storage/batch.js';
import { normalizeRecord } from '../src/normalization/normalize.js';

test('filters validate market, day and paging; the default market is 1X2', () => {
  assert.equal(validateMatchFilters({}).market, '1x2');
  assert.equal(validateMatchFilters({ market: 'name:team total' }).market, 'name:team total');
  assert.throws(() => validateMatchFilters({ market: 'odds-api' }), /mercado válido/);
  assert.throws(() => validateMatchFilters({ day: '13/10/2026' }), /AAAA-MM-DD/);
  assert.deepEqual([validateMatchFilters({ limit: '9999', offset: '-3' }).limit, validateMatchFilters({ limit: '9999', offset: '-3' }).offset], [100, 0]);
});

test('country comes only from the source competition label; nothing is guessed', () => {
  const cases: Array<[string | null, string]> = [['Spain - La Liga', 'España'], ['España La Liga', 'España'], ['Inglaterra Premier League', 'Inglaterra'], ['EEUU MLS', 'Estados Unidos'], ['Mexico Liga MX', 'México'],
    ['Soccer Paraguay - Copa', 'Paraguay'], ['Argentina. Primera Division', 'Argentina'], ['UEFA - Champions League', 'Internacional'], ['Liga MX', 'Sin país en la fuente'], ['Nations League', 'Sin país en la fuente'], ['Niger', 'Sin país en la fuente'], [null, 'Sin país en la fuente']];
  for (const [label, country] of cases) assert.equal(countryOfLabel(label), country, String(label));
});

test('market labels: unified names for the main markets, the source name for the rest', () => {
  assert.equal(marketLabel('1x2'), '1X2 / Ganador'); assert.equal(marketLabel('totals'), 'Total · Más / Menos');
  assert.equal(marketLabel('name:team total', 'Team Total', '0'), 'Team Total'); assert.equal(marketLabel('name:spread|p1', 'Spread', '1'), 'Spread · periodo 1');
});

const ctx = (over = {}) => ({ memberHome: 'Real Madrid CF', memberAway: 'Sevilla', swapped: false, home: 'Real Madrid', away: 'Sevilla', line: null, ...over });
test('options are labelled with the unified names, whatever each house calls the teams and in whatever order', () => {
  assert.equal(optionOf('1x2', 'Real Madrid CF', ctx()).label, 'Real Madrid'); assert.equal(optionOf('1x2', '1', ctx()).label, 'Real Madrid');
  assert.equal(optionOf('1x2', 'R. Madrid', ctx({ memberHome: 'R. Madrid' })).label, 'Real Madrid');
  assert.equal(optionOf('1x2', 'Draw', ctx()).label, 'Empate'); assert.equal(optionOf('1x2', 'x', ctx()).rank, 1);
  // A house listing Sevilla first: its "1" is the unified away side.
  const reversed = ctx({ memberHome: 'Sevilla', memberAway: 'Real Madrid', swapped: true });
  assert.equal(optionOf('1x2', '1', reversed).label, 'Sevilla'); assert.equal(optionOf('1x2', 'Real Madrid', reversed).label, 'Real Madrid'); assert.equal(optionOf('1x2', '2', reversed).label, 'Real Madrid');
  assert.deepEqual([optionOf('totals', 'Over 2.5', ctx()).label, optionOf('totals', 'Más de 2.5', ctx()).label, optionOf('totals', 'Under', ctx({ line: '2.5' })).line], ['Más de', 'Más de', '2.5']);
  assert.deepEqual([optionOf('btts', 'Yes', ctx()).label, optionOf('btts', 'No Goal', ctx()).label], ['Sí', 'No']);
  assert.equal(optionOf('handicap', 'Real Madrid CF', ctx({ line: '-1.5' })).label, 'Real Madrid -1.5');
});

const row = (event: string, source: string, selection: string, price: string, over: Partial<MatchRow> = {}): MatchRow => ({ event_id: event, source, market_type: '1X2', market_period: null, selection_id: `${event}-${selection}`, selection_name: selection, line: null, book: source, decimal_odds: price, raw_odds: price, raw_odds_format: 'decimal', observed_at: '2026-10-12T05:00:00Z', last_seen_at: '2026-10-12T05:00:00Z', ...over });
const cluster = { id: 'u1', sport: 'Fútbol', league: 'Spain - La Liga', country: 'España', home: 'Real Madrid', away: 'Sevilla', start: '2026-10-13T19:00:00.000Z' };
const place = (members: Record<string, Placed>) => (id: string) => members[id];

test('one match, three houses: each house is a row, prices untouched, columns in reading order', () => {
  const placed = { a: { cluster, swapped: false, memberHome: 'Real Madrid CF', memberAway: 'Sevilla' }, b: { cluster, swapped: false, memberHome: 'R. Madrid', memberAway: 'Sevilla FC' }, c: { cluster, swapped: true, memberHome: 'Sevilla', memberAway: 'Real Madrid' } };
  const cards = buildCards([
    row('a', 'pinnacle', 'Real Madrid CF', '1.42'), row('a', 'pinnacle', 'Draw', '5.20'), row('a', 'pinnacle', 'Sevilla', '7.50'),
    row('b', 'bet365', '1', '1.45'), row('b', 'bet365', 'X', '5.00'), row('b', 'bet365', '2', '7.20'),
    row('c', 'betway', 'Sevilla', '7.80'), row('c', 'betway', 'Draw', '5.30'), row('c', 'betway', 'Real Madrid', '1.40'),
  ], '1x2', place(placed), new Map([['pinnacle', 'Pinnacle'], ['bet365', 'Bet365'], ['betway', 'Betway']]));
  assert.equal(cards.length, 1);
  const [card] = cards, [block] = card!.lines;
  assert.deepEqual([card!.event, card!.league, card!.country, card!.market.label, card!.bookmakers], ['Real Madrid vs Sevilla', 'Spain - La Liga', 'España', '1X2 / Ganador', 3]);
  assert.deepEqual(block!.columns, ['Real Madrid', 'Empate', 'Sevilla']);
  assert.deepEqual(block!.rows.map(r => [r.bookmaker, ...block!.columns.map(c => r.cells[c]!.price)]), [['Bet365', '1.45', '5.00', '7.20'], ['Betway', '1.40', '5.30', '7.80'], ['Pinnacle', '1.42', '5.20', '7.50']]);
  assert.equal(block!.rows[0]!.cells['Real Madrid']!.decimal, 1.45);
});

test('original prices and formats are kept; the latest observation of the same option wins; unusable prices are dropped', () => {
  const placed = { a: { cluster, swapped: false, memberHome: 'Real Madrid', memberAway: 'Sevilla' } };
  const [card] = buildCards([
    row('a', 'pinnacle', 'Real Madrid', '-150', { decimal_odds: '1.6667', raw_odds_format: 'american' }),
    row('a', 'pinnacle', 'Real Madrid', '1.70', { decimal_odds: '1.70', observed_at: '2026-10-12T04:00:00Z', selection_id: 'old' }),
    row('a', 'pinnacle', 'Sevilla', '1.00', { decimal_odds: '1.00' }), row('a', 'pinnacle', 'Draw', '', { raw_odds: null, decimal_odds: null }),
  ], '1x2', place(placed));
  assert.deepEqual(Object.keys(card!.lines[0]!.rows[0]!.cells), ['Real Madrid']);
  assert.deepEqual([card!.lines[0]!.rows[0]!.cells['Real Madrid']!.price, card!.lines[0]!.rows[0]!.cells['Real Madrid']!.format], ['-150', 'american']);
});

test('totals and handicap show their lines; a reversed house maps the handicap to the right side', () => {
  const placed = { a: { cluster, swapped: false, memberHome: 'Real Madrid', memberAway: 'Sevilla' }, c: { cluster, swapped: true, memberHome: 'Sevilla', memberAway: 'Real Madrid' } };
  const [totals] = buildCards([row('a', 'pinnacle', 'Over', '1.90', { market_type: 'Total', line: '2.5' }), row('a', 'pinnacle', 'Under', '1.95', { market_type: 'Total', line: '2.5' }), row('a', 'pinnacle', 'Over', '1.40', { market_type: 'Total', line: '1.5' }), row('a', 'pinnacle', 'Under', '2.90', { market_type: 'Total', line: '1.5' })], 'totals', place(placed));
  assert.deepEqual(totals!.lines.map(l => [l.heading, l.columns]), [['Línea 1.5', ['Más de', 'Menos de']], ['Línea 2.5', ['Más de', 'Menos de']]]);
  const [handicap] = buildCards([row('a', 'pinnacle', 'Real Madrid', '1.95', { market_type: 'Spread', line: '-1.5' }), row('a', 'pinnacle', 'Sevilla', '1.90', { market_type: 'Spread', line: '1.5' }),
    row('c', 'betway', 'Sevilla', '1.88', { market_type: 'Handicap', line: '1.5' }), row('c', 'betway', 'Real Madrid', '1.97', { market_type: 'Handicap', line: '-1.5' })], 'handicap', place(placed));
  assert.equal(handicap!.lines.length, 1); assert.equal(handicap!.lines[0]!.heading, 'Hándicap Real Madrid -1.5');
  assert.deepEqual(handicap!.lines[0]!.columns, ['Real Madrid -1.5', 'Sevilla +1.5']); assert.equal(handicap!.lines[0]!.rows.length, 2);
});

const url = process.env.TEST_DATABASE_URL;
test('end to end on PostgreSQL: the same match from three houses with three spellings is one card with three rows', { skip: !url }, async t => {
  const pool = new Pool({ connectionString: url }); t.after(() => pool.end());
  const at = new Date().toISOString(), start = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const rec = (sportsbook: string, competition: string, home: string, away: string, market: string, period: string | null, selection: string, odds: number) => normalizeRecord({ sportsbook, sport: 'Soccer', competition, eventName: `${home} - ${away}`, participants: [home, away], homeParticipant: home, awayParticipant: away, eventStartTime: start, eventStatus: 'prematch',
    market, marketPeriod: period, selection, decimalOdds: odds, rawOdds: String(odds), rawOddsFormat: 'decimal', sourceEventId: `e2e-${sportsbook}`, sourceUrl: `https://${sportsbook}.test/m`, collectedAt: at }, at);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await saveRecordBatch(client, [
      ...[['Real Madrid CF', 1.42], ['Draw', 5.2], ['Sevilla', 7.5]].map(([s, o]) => rec('e2e-pinnacle', 'Spain - La Liga', 'Real Madrid CF', 'Sevilla', 'Moneyline', '0', s as string, o as number)),
      ...[['1', 1.45], ['X', 5.0], ['2', 7.2]].map(([s, o]) => rec('e2e-bet365', 'España La Liga', 'R. Madrid', 'Sevilla FC', '1X2', null, s as string, o as number)),
      ...[['Sevilla', 7.8], ['Draw', 5.3], ['Real Madrid', 1.4]].map(([s, o]) => rec('e2e-betway', 'LaLiga', 'Sevilla', 'Real Madrid', 'Resultado Final', 'FULL_TIME', s as string, o as number)),
      ...[['Over', 1.9, '2.5'], ['Under', 1.95, '2.5']].map(([s, o, l]) => ({ ...rec('e2e-pinnacle', 'Spain - La Liga', 'Real Madrid CF', 'Sevilla', 'Total', '0', s as string, o as number), line: l as string })),
    ]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }

  const layer = new MatchingLayer(pool, loadCurrentEvents, { aliases: () => loadAliasIndex(pool), config: async () => ({ apiKey: '', model: 'none', enabled: false }) });
  t.after(() => layer.close());
  const result = await readMatches(pool, layer, validateMatchFilters({ search: 'Real Madrid' }));
  assert.equal(result.total, 1, 'three listings, one match');
  const [card] = result.cards, block = card!.lines[0]!;
  assert.deepEqual([card!.event, card!.country, card!.sport, card!.market.label, card!.bookmakers], ['Real Madrid vs Sevilla', 'España', 'Fútbol', '1X2 / Ganador', 3]);
  assert.deepEqual(block.columns, ['Real Madrid', 'Empate', 'Sevilla']);
  const prices = Object.fromEntries(block.rows.map(r => [r.source, block.columns.map(c => r.cells[c]?.price)]));
  assert.deepEqual(prices, { 'e2e-bet365': ['1.45', '5', '7.2'], 'e2e-betway': ['1.4', '5.3', '7.8'], 'e2e-pinnacle': ['1.42', '5.2', '7.5'] });

  const totals = await readMatches(pool, layer, validateMatchFilters({ search: 'Real Madrid', market: 'totals' }));
  assert.deepEqual(totals.cards[0]!.lines.map(l => [l.heading, l.columns, l.rows.length]), [['Línea 2.5', ['Más de', 'Menos de'], 1]]);
  assert.equal((await readMatches(pool, layer, validateMatchFilters({ search: 'Real Madrid', bookmaker: 'e2e-betway' }))).cards[0]!.lines[0]!.rows.length, 1, 'filtering by house keeps only that row');
  assert.equal((await readMatches(pool, layer, validateMatchFilters({ search: 'R. Madrid' }))).total, 1, 'any spelling finds the match');
  assert.equal((await readMatches(pool, layer, validateMatchFilters({ search: 'Real Madrid', country: 'España' }))).total, 1);
  assert.equal((await readMatches(pool, layer, validateMatchFilters({ search: 'Real Madrid', country: 'Italia' }))).total, 0);

  const facets = await readFacets(pool, layer, validateMatchFilters({ search: 'Real Madrid' }));
  assert.deepEqual(facets.sports.map(f => f.value), ['Fútbol']); assert.ok(facets.countries.some(f => f.value === 'España'));
  assert.deepEqual(facets.bookmakers.map(f => f.value).sort(), ['e2e-bet365', 'e2e-betway', 'e2e-pinnacle']);
  assert.deepEqual(facets.markets.filter(m => m.group).map(m => m.value), ['1x2', 'totals']); assert.ok(facets.matches.some(m => m.label === 'Real Madrid vs Sevilla'));
});
