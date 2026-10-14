import test from 'node:test';
import assert from 'node:assert/strict';
import { compareEvents, pairKey, teamSimilarity, unify, type Decision, type UEvent } from '../src/matching/unify.js';

let counter = 0;
const ev = (source: string, home: string, away: string, over: Partial<UEvent> = {}): UEvent => ({ id: String(++counter), source, sport: 'Fútbol', league: 'Spain - La Liga', country: 'España', home, away, start: '2026-10-13T19:00:00.000Z', canonicalId: null, canonicalNames: false, ...over });

test('team names: aliases, abbreviations, club suffixes and qualifiers', () => {
  const sim = (a: string, b: string) => teamSimilarity(a, b);
  assert.equal(sim('Sevilla FC', 'Sevilla').kind, 'exact');
  assert.equal(sim('Real Madrid CF', 'R. Madrid').kind, 'abbrev');
  assert.equal(sim('Man City', 'Manchester City').kind, 'abbrev');
  assert.equal(sim('Man Utd', 'Manchester United').score >= 0.9, true);
  assert.equal(sim('Galatasaray S.K.', 'Galatasaray').kind, 'exact');
  assert.equal(sim('Universidad de Chile', 'U. de Chile').score >= 0.9, true);
  assert.equal(sim('Carreno Busta P.', 'Pablo Carreno Busta').score >= 0.9, true);
  assert.equal(sim('Bayern', 'Bayern München').kind, 'subset');
  assert.equal(sim('Ñublense', 'Nublense').kind, 'exact');
  // Different teams must never be equivalent.
  for (const [a, b] of [['Atlético Madrid', 'Real Madrid'], ['Real Madrid', 'Real Sociedad'], ['Milan', 'Milan U19'], ['Punjab U19 (Women)', 'Punjab U19'], ['Barcelona B', 'Barcelona'], ['Spurs', 'Tottenham Hotspur']]) assert.equal(sim(a!, b!).score, 0, `${a} / ${b}`);
  // Reviewed aliases are deterministic knowledge.
  const aliases = new Map([['spurs', '7'], ['tottenhamhotspur', '7'], ['arsenal', '8']]);
  assert.equal(teamSimilarity('Spurs', 'Tottenham Hotspur', aliases).kind, 'alias');
  assert.equal(teamSimilarity('Spurs', 'Arsenal', aliases).score, 0);
});

test('events: same match across houses, reversed home/away, time tolerance, country and sport guards', () => {
  const a = ev('pinnacle', 'Real Madrid CF', 'Sevilla');
  assert.deepEqual([compareEvents(a, ev('bet365', 'R. Madrid', 'Sevilla FC')).verdict, compareEvents(a, ev('bet365', 'R. Madrid', 'Sevilla FC')).swapped], ['SAME', false]);
  const reversed = compareEvents(a, ev('us-book', 'Sevilla', 'Real Madrid'));
  assert.deepEqual([reversed.verdict, reversed.swapped], ['SAME', true], 'local/visitante invertidos');
  assert.equal(compareEvents(a, ev('x', 'Real Madrid', 'Sevilla', { start: '2026-10-13T19:10:00.000Z' })).verdict, 'SAME', '10 min of difference is the same kickoff');
  assert.equal(compareEvents(a, ev('x', 'Real Madrid', 'Sevilla', { start: '2026-10-13T20:00:00.000Z' })).verdict, 'SAME', 'identical sides, estimated kickoff differs');
  assert.equal(compareEvents(a, ev('x', 'R. Madrid', 'Sevilla FC', { start: '2026-10-13T20:00:00.000Z' })).verdict, 'AMBIGUOUS', 'equivalent but not identical sides and a different hour');
  assert.equal(compareEvents(a, ev('x', 'Real Madrid', 'Sevilla', { start: '2026-10-14T19:00:00.000Z' })).verdict, 'DIFFERENT', 'another day is another fixture');
  assert.equal(compareEvents(a, ev('x', 'Real Madrid', 'Sevilla', { sport: 'Baloncesto' })).verdict, 'DIFFERENT');
  assert.equal(compareEvents(a, ev('x', 'Real Madrid', 'Sevilla', { start: null })).verdict, 'DIFFERENT', 'no date, no grouping');
  assert.equal(compareEvents(ev('a', 'Barcelona', 'Alaves', { country: 'España' }), ev('b', 'Barcelona', 'Alaves', { country: 'Ecuador' })).verdict, 'DIFFERENT', 'league country conflict');
  const partial = compareEvents(a, ev('x', 'Real Madrid', 'Alaves'));
  assert.equal(partial.verdict, 'AMBIGUOUS', 'one identical side at the same time: ask the AI, never merge blindly');
  assert.equal(compareEvents(a, ev('x', 'Betis', 'Alaves')).verdict, 'DIFFERENT');
});

test('clusters: the three spellings of one match become one match; unrelated matches stay apart', () => {
  const events = [ev('pinnacle', 'Real Madrid CF', 'Sevilla'), ev('bet365', 'R. Madrid', 'Sevilla FC'), ev('betway', 'Real Madrid', 'Sevilla'),
    ev('pinnacle', 'Girona', 'Betis'), ev('bet365', 'Getafe', 'Valencia'), ev('betway', 'Sevilla', 'Real Madrid', { start: '2026-10-13T19:05:00.000Z' })];
  const result = unify(events);
  const madrid = result.clusters.find(cluster => cluster.members.length > 1)!;
  assert.equal(result.clusters.length, 3); assert.equal(madrid.members.length, 4);
  assert.deepEqual([madrid.home, madrid.away], ['Real Madrid', 'Sevilla']);
  assert.deepEqual(madrid.members.filter(member => member.swapped).map(member => member.event.source), ['betway'], 'the reversed listing is mapped by side');
  assert.deepEqual(result.stats, { events: 6, matches: 3, merged: 3, byRules: 3, byAi: 0, byManual: 0, byCanonical: 0, pending: 0 });
  assert.equal(unify([ev('a', 'A', 'B', { start: null }), ev('b', 'A', 'B', { start: null })]).clusters.length, 2, 'undated events never merge');
});

test('ambiguous pairs wait for a stored verdict: SAME merges, DIFFERENT and UNSURE do not, canonical groups are trusted', () => {
  const first = ev('rushbet-co', 'PSG', 'Manchester City'), second = ev('pinnacle', 'Paris Saint-Germain', 'Manchester City');
  const waiting = unify([first, second]);
  assert.equal(waiting.clusters.length, 2); assert.equal(waiting.pending.length, 1); assert.equal(waiting.pending[0]!.key, pairKey(first, second));
  const decide = (verdict: Decision['verdict']) => new Map<string, Decision>([[pairKey(first, second), { verdict, swapped: false, confidence: 0.93, method: 'ai' }]]);
  const merged = unify([first, second], { decisions: decide('SAME') });
  assert.deepEqual([merged.clusters.length, merged.stats.byAi, merged.pending.length], [1, 1, 0]);
  assert.equal(merged.clusters[0]!.members.find(member => member.event.id === second.id)!.method, 'ai');
  for (const verdict of ['DIFFERENT', 'UNSURE'] as const) { const result = unify([first, second], { decisions: decide(verdict) }); assert.deepEqual([result.clusters.length, result.pending.length], [2, 0], verdict); }
  const trusted = unify([ev('a', 'Foo', 'Bar', { canonicalId: '9' }), ev('b', 'Completely', 'Different', { canonicalId: '9' })]);
  assert.deepEqual([trusted.clusters.length, trusted.stats.byCanonical], [1, 1]);
});

test('pair keys do not depend on event ids or order', () => {
  const a = ev('x', 'A FC', 'B'), b = ev('y', 'A', 'B');
  assert.equal(pairKey(a, b), pairKey(b, a)); assert.equal(pairKey(a, b), pairKey({ ...a, id: '999' }, { ...b, id: '1000' })); assert.equal(pairKey(a, b).length, 40);
});

test('explicit decisions beat rules and AI in both directions', () => {
  const a = ev('pinnacle', 'Girona', 'Betis'), b = ev('bet365', 'Girona FC', 'Real Betis');
  assert.equal(unify([a, b]).clusters.length, 1, 'rules merge them');
  const manual = (verdict: Decision['verdict']) => new Map<string, Decision>([[pairKey(a, b), { verdict, swapped: false, confidence: 1, method: 'manual' }]]);
  const separated = unify([a, b], { decisions: manual('DIFFERENT') });
  assert.deepEqual([separated.clusters.length, separated.stats.byManual], [2, 0], 'a manual "distintos" separates what the rules grouped');
  const c = ev('x', 'PSG', 'Lyon'), d = ev('y', 'Paris Saint-Germain', 'Lyon');
  const joined = unify([c, d], { decisions: new Map([[pairKey(c, d), { verdict: 'SAME', swapped: false, confidence: 1, method: 'manual' } as Decision]]) });
  assert.deepEqual([joined.clusters.length, joined.stats.byManual, joined.pending.length], [1, 1, 0]);
  const ai = new Map<string, Decision>([[pairKey(c, d), { verdict: 'DIFFERENT', swapped: false, confidence: 0.9, method: 'ai', reason: 'x' }]]);
  const reviewed = unify([c, d], { decisions: ai });
  assert.deepEqual([reviewed.clusters.length, reviewed.reviewed.length], [2, 1], 'AI "distintos" stays reviewable');
});
