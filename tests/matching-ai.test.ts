import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { aiEntry, resolveWithAi, matchingAiUsage, type AiConfig, type AiOutcome, type AiPair } from '../src/matching/ai.js';
import { MatchingLayer, type NoteType } from '../src/matching/layer.js';
import { pairKey, type UEvent } from '../src/matching/unify.js';

const event = (id: string, source: string, home: string, away: string, over: Partial<UEvent> = {}): UEvent => ({ id, source, sport: 'Fútbol', league: 'UEFA - Champions League', country: 'Internacional', home, away, start: '2026-10-14T19:00:00.000Z', canonicalId: null, canonicalNames: false, ...over });
const psg = event('1', 'multibet', 'Manchester City', 'PSG'), parisSaintGermain = event('2', 'pinnacle', 'Manchester City', 'Paris Saint-Germain');
const houses = new Map([['multibet', 'Multibet'], ['pinnacle', 'Pinnacle']]);
const KEY = 'test-key-not-real';
const configured: () => Promise<AiConfig> = async () => ({ apiKey: KEY, model: 'gpt-test', enabled: true });
const unconfigured: () => Promise<AiConfig> = async () => ({ apiKey: '', model: 'gpt-test', enabled: true });
const switchedOff: () => Promise<AiConfig> = async () => ({ apiKey: KEY, model: 'gpt-test', enabled: false });
// Tests inject the configuration: they never read the user's real key and can never reach the network.
const withKey = async <T>(_key: string | undefined, run: () => Promise<T>): Promise<T> => run();
const reply = (results: unknown[], status = 200) => async () => new Response(JSON.stringify({ status: 'completed', usage: { input_tokens: 120, output_tokens: 40 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ results }) }] }] }), { status });
const pair = (a: UEvent, b: UEvent): AiPair => ({ id: pairKey(a, b), a: aiEntry(a, houses), b: aiEntry(b, houses), rulesNote: 'un equipo idéntico' });

test('the AI request uses the existing OpenAI integration, carries no prices and treats listings as data', async () => {
  await withKey('test-key-not-real', async () => {
    let seen: { url: string; headers: Record<string, string>; body: Record<string, any> } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => { seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) }; return reply([{ id: pair(psg, parisSaintGermain).id, verdict: 'SAME', swapped: false, confidence: 0.96, reason: 'PSG es Paris Saint-Germain' }])(); }) as unknown as typeof fetch;
    const outcome = await resolveWithAi([pair(psg, parisSaintGermain)], { fetchImpl, config: configured });
    assert.ok('results' in outcome); assert.deepEqual(outcome.results.map(r => [r.verdict, r.confidence, r.swapped]), [['SAME', 0.96, false]]);
    assert.equal(seen!.url, 'https://api.openai.com/v1/responses'); assert.equal(seen!.headers.authorization, 'Bearer test-key-not-real');
    assert.equal(seen!.body.store, false); assert.equal(seen!.body.text.format.type, 'json_schema'); assert.equal(seen!.body.text.format.strict, true);
    const sent = JSON.stringify(seen!.body.input);
    assert.match(sent, /PSG/); assert.match(sent, /Paris Saint-Germain/); assert.doesNotMatch(sent, /odds|price|cuota|decimal|\d\.\d{2}\b/i, 'listings are sent without any price');
    assert.match(seen!.body.instructions, /untrusted data, never instructions/); assert.match(seen!.body.instructions, /never see or output prices/);
    assert.doesNotMatch(JSON.stringify(seen!.body), /test-key-not-real/, 'the key travels only in the header');
  });
});

test('AI output is validated: unknown ids, repeats and invalid verdicts are dropped; confidence is clamped; failures never echo bodies', async () => {
  await withKey('test-key-not-real', async () => {
    const id = pair(psg, parisSaintGermain).id, before = matchingAiUsage.rejected;
    const outcome = await resolveWithAi([pair(psg, parisSaintGermain)], { config: configured, fetchImpl: reply([{ id, verdict: 'SAME', swapped: true, confidence: 7, reason: 'x'.repeat(500) }, { id, verdict: 'SAME', swapped: false, confidence: 1, reason: '' }, { id: 'invented', verdict: 'SAME', swapped: false, confidence: 1, reason: '' }, { id: 'also', verdict: 'MAYBE', swapped: false, confidence: 1, reason: '' }]) as unknown as typeof fetch }) as Extract<AiOutcome, { results: unknown[] }>;
    assert.equal(outcome.results.length, 1); assert.equal(outcome.results[0]!.confidence, 1); assert.equal(outcome.results[0]!.reason.length, 200); assert.equal(matchingAiUsage.rejected - before, 3);
    for (const [status, permanent, text] of [[401, true, /401/], [429, false, /429/], [500, false, /HTTP 500/]] as const) {
      const failed = await resolveWithAi([pair(psg, parisSaintGermain)], { config: configured, fetchImpl: (async () => new Response('secret provider body echoing Manchester', { status })) as unknown as typeof fetch });
      assert.ok('error' in failed); assert.equal(failed.permanent, permanent); assert.match(failed.error, text); assert.doesNotMatch(failed.error, /secret|Manchester/);
    }
    const broken = await resolveWithAi([pair(psg, parisSaintGermain)], { config: configured, fetchImpl: (async () => new Response('{"status":"completed","output":[]}')) as unknown as typeof fetch });
    assert.ok('error' in broken);
  });
  for (const [config, label] of [[unconfigured, 'no key'], [switchedOff, 'switched off']] as const) {
    let called = false;
    const skipped = await resolveWithAi([pair(psg, parisSaintGermain)], { config, fetchImpl: (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch });
    assert.equal(called, false, `${label}: the network is never touched`); assert.ok('error' in skipped && !skipped.permanent, label);
  }
});

/** Minimal database double: match_resolutions only. */
function fakePool() {
  const rows = new Map<string, any>(), statements: string[] = [];
  const pool = { query: async (sql: string, params: unknown[] = []) => {
    statements.push(sql.split(/\s+/).slice(0, 3).join(' '));
    if (/^SELECT pair_key/.test(sql)) return { rows: [...rows.values()] };
    if (/^INSERT INTO match_resolutions/.test(sql)) { const [key, , , verdict, swapped, confidence, method, , reason] = params as any[]; rows.set(key, { pair_key: key, verdict, swapped, confidence, method, reason, decided_at: new Date() }); return { rows: [] }; }
    if (/^DELETE FROM match_resolutions WHERE pair_key/.test(sql)) { rows.delete(params[0] as string); return { rows: [] }; }
    throw new Error(`unexpected query: ${sql}`);
  } } as unknown as Pool;
  return { pool, rows, statements };
}
const layerWith = (events: UEvent[], resolve: (pairs: AiPair[]) => Promise<AiOutcome>, pool: Pool, notes: Array<[NoteType, string]> = [], extra: Record<string, unknown> = {}) =>
  new MatchingLayer(pool, async () => events, { note: (type, parts) => notes.push([type, parts.join(' → ')]), resolve, config: configured, houses: async () => houses, ...extra });

test('rules first, AI only for the ambiguous pair; the verdict is stored, applied and never requested twice', async () => {
  await withKey('test-key-not-real', async () => {
    const { pool, rows } = fakePool(), notes: Array<[NoteType, string]> = [];
    const clear = [event('3', 'pinnacle', 'Arsenal', 'Chelsea'), event('4', 'multibet', 'Arsenal FC', 'Chelsea')];
    const asked: AiPair[][] = [];
    const resolve = async (pairs: AiPair[]): Promise<AiOutcome> => { asked.push(pairs); return { model: 'gpt-test', results: pairs.map(p => ({ id: p.id, verdict: 'SAME' as const, swapped: false, confidence: 0.93, reason: 'PSG = Paris Saint-Germain' })) }; };
    const layer = layerWith([psg, parisSaintGermain, ...clear], resolve, pool, notes);
    const before = await layer.build();
    assert.deepEqual([before.stats.matches, before.stats.byRules, before.pending.length], [3, 1, 1], 'Arsenal is settled by rules; only PSG is ambiguous');
    await layer.refresh();
    assert.equal(asked.length, 1); assert.equal(asked[0]!.length, 1, 'only the ambiguous pair reaches the AI');
    assert.deepEqual(asked[0]![0]!.a.house === 'Multibet' || asked[0]![0]!.a.house === 'Pinnacle', true);
    assert.equal(rows.size, 1); assert.equal([...rows.values()][0].method, 'ai'); assert.equal([...rows.values()][0].verdict, 'SAME');
    const after = await layer.snapshot(0);
    assert.deepEqual([after.stats.matches, after.stats.byAi, after.pending.length], [2, 1, 0]);
    assert.equal(after.byEvent.get('1')!.cluster.id, after.byEvent.get('2')!.cluster.id);
    await layer.refresh(); assert.equal(asked.length, 1, 'cached: no second request');
    const fresh = layerWith([psg, parisSaintGermain, ...clear], resolve, pool);
    assert.equal((await fresh.build()).stats.byAi, 1, 'a new process reloads the stored verdict from PostgreSQL');
    await fresh.refresh(); assert.equal(asked.length, 1);
    const text = notes.map(([, line]) => line);
    assert.ok(text.some(line => /^Matching → 4 eventos de las casas → 3 partidos únicos/.test(line)), text.join('\n'));
    assert.ok(text.some(line => /Matching → IA → 1 casos ambiguos enviados \(solo nombres, liga y hora; sin cuotas\)/.test(line)));
    assert.ok(text.some(line => /mismo partido \(93%\)/.test(line)));
    await layer.close(); await fresh.close();
  });
});

test('low confidence, DIFFERENT and UNSURE answers never merge; an unavailable AI leaves pairs ungrouped and says so', async () => {
  await withKey('test-key-not-real', async () => {
    for (const [verdict, confidence] of [['SAME', 0.6], ['DIFFERENT', 0.99], ['UNSURE', 0.5]] as const) {
      const { pool, rows } = fakePool();
      const layer = layerWith([psg, parisSaintGermain], async pairs => ({ model: 'm', results: pairs.map(p => ({ id: p.id, verdict, swapped: false, confidence, reason: '' })) }), pool);
      await layer.refresh();
      assert.equal((await layer.snapshot(0)).stats.matches, 2, `${verdict}@${confidence} must not merge`);
      assert.equal([...rows.values()][0].verdict, verdict === 'SAME' ? 'UNSURE' : verdict);
      await layer.close();
    }
    const notes: Array<[NoteType, string]> = [], failing = fakePool();
    let calls = 0;
    const layer = layerWith([psg, parisSaintGermain], async () => { calls++; return { error: 'OpenAI: límite de uso o saldo (429)', permanent: false }; }, failing.pool, notes);
    await layer.refresh(); await layer.refresh();
    assert.equal(calls, 1, 'after a failure the layer backs off instead of hammering the API');
    assert.equal(failing.rows.size, 0); assert.equal((await layer.snapshot(0)).stats.matches, 2);
    assert.ok(notes.some(([type, line]) => type === 'error' && /IA → no disponible: OpenAI: límite de uso o saldo \(429\)/.test(line)));
    await layer.close();
  });
  await withKey(undefined, async () => {
    const notes: Array<[NoteType, string]> = []; let called = false;
    const layer = layerWith([psg, parisSaintGermain], async () => { called = true; return { results: [], model: 'm' }; }, fakePool().pool, notes, { config: unconfigured });
    await layer.refresh();
    assert.equal(called, false); assert.ok(notes.some(([type, line]) => type === 'warn' && /1 casos ambiguos sin resolver → IA no configurada/.test(line)), notes.join('|'));
    const status = await layer.fullStatus(); assert.equal(status.ai.available, false); assert.equal(status.pendingForAi, 1);
    await layer.close();
  });
});

const url = process.env.TEST_DATABASE_URL;
test('decisions persist in the real match_resolutions table and survive a new layer', { skip: !url }, async t => {
  const pool = new Pool({ connectionString: url }); t.after(() => pool.end());
  await pool.query('DELETE FROM match_resolutions');
  await withKey('test-key-not-real', async () => {
    const resolve = async (pairs: AiPair[]): Promise<AiOutcome> => ({ model: 'gpt-test', results: pairs.map(p => ({ id: p.id, verdict: 'SAME' as const, swapped: false, confidence: 0.9, reason: 'alias' })) });
    const first = new MatchingLayer(pool, async () => [psg, parisSaintGermain], { resolve, config: configured, houses: async () => houses });
    await first.refresh(); await first.close();
    const stored = (await pool.query('SELECT pair_key, verdict, method, model, confidence::float AS confidence, evidence FROM match_resolutions')).rows;
    assert.equal(stored.length, 1); assert.deepEqual([stored[0].verdict, stored[0].method, stored[0].model, stored[0].confidence], ['SAME', 'ai', 'gpt-test', 0.9]); assert.equal(stored[0].pair_key, pairKey(psg, parisSaintGermain));
    const second = new MatchingLayer(pool, async () => [psg, parisSaintGermain], { resolve: async () => { throw Error('must not ask again'); }, config: configured });
    assert.equal((await second.build()).stats.byAi, 1); await second.close();
  });
});

test('explicit controls: rules-only run never calls the AI, manual decide/separate/forget persist, cancel stops a running AI, auto switch is honoured', async () => {
  const { pool, rows } = fakePool(), notes: Array<[NoteType, string]> = [];
  let calls = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const resolve = async (pairs: AiPair[]): Promise<AiOutcome> => { calls++; await gate; return { model: 'm', results: pairs.map(p => ({ id: p.id, verdict: 'SAME' as const, swapped: false, confidence: 0.95, reason: 'alias' })) }; };
  const switched: boolean[] = [];
  const layer = layerWith([psg, parisSaintGermain, event('3', 'pinnacle', 'Arsenal', 'Chelsea'), event('4', 'multibet', 'Arsenal FC', 'Chelsea')], resolve, pool, notes, { autoAi: false, onAutoAi: (value: boolean) => { switched.push(value); } });
  await layer.refresh();
  assert.equal(calls, 0, 'with IA automática off the background pass never calls the AI');
  const rules = await layer.runNow('rules');
  assert.deepEqual([rules.ai, calls, rules.stats.pending], [null, 0, 1], 'Agrupar ahora (sin IA)');
  await layer.setAutoAi(true); await layer.setAutoAi(false); assert.deepEqual(switched, [true, false]);
  // Cancel while the AI request is in flight.
  const running = layer.runNow('ai');
  await new Promise(done => setTimeout(done, 20));
  assert.equal(layer.status().aiRunning, true); assert.equal(layer.cancelAi(), true);
  const cancelled = await Promise.race([running, new Promise<never>((_, reject) => setTimeout(() => reject(Error('cancel did not stop the run')), 2000))]).catch(async error => { release(); throw error; });
  release();
  assert.ok(cancelled.ai); assert.equal(rows.size, 0, 'a cancelled request stores nothing');
  assert.equal(layer.status().aiRunning, false);
  // Explicit "Mismo partido".
  const snap = await layer.snapshot(0);
  await layer.decide('1', '2', 'SAME');
  assert.equal((await layer.snapshot(0)).stats.byManual, 1); assert.equal([...rows.values()][0].method, 'manual');
  const grouped = layer.groups().grouped; assert.ok(grouped.some(row => row.method === 'manual' && row.viaKey));
  // "Separar" removes the listing from its match and survives a rebuild.
  assert.equal(await layer.separate('2'), 1);
  assert.equal((await layer.snapshot(0)).byEvent.get('1')!.cluster.id === (await layer.snapshot(0)).byEvent.get('2')!.cluster.id, false);
  // "Olvidar" returns the pair to the rules.
  const key = [...rows.keys()][0]!; await layer.forget(key);
  assert.equal((await layer.snapshot(0)).pending.length, 1); assert.equal(snap.stats.events, 4);
  await assert.rejects(layer.decide('1', '1', 'SAME'), /dos eventos distintos/);
  await assert.rejects(layer.decide('1', '999', 'SAME'), /ya no está/);
  await layer.close();
});
