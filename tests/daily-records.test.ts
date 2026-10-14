import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { DailyRecords, dayBounds, projectSnapshot, todayInZone, COLLECTOR_TIMEZONE } from '../src/ui/daily-records.js';
import { createUiServer } from '../src/ui/server.js';

const DAY = '2026-10-12';
const valid = (selection: string, rawOdds: string, extra: Record<string, unknown> = {}) => ({ sportsbook: 'fixture-book', sport: 'Football', competition: 'Liga Prueba', eventName: 'Alpha vs Beta', participants: ['Alpha', 'Beta'], eventStartTime: '2026-10-13T12:00:00.000Z', market: 'Match Winner', selection, rawOdds, rawOddsFormat: 'decimal', decimalOdds: Number(rawOdds), sourceEventId: 'source:1', sourceUrl: 'https://fixture.test/sports', qualifiers: { extraction: 'network' }, sportsMetadata: { competitionTerritory: { id: 'es', kind: 'country', displayName: 'España' } }, ...extra });
const snapshot = (capturedAt: string, payload: Record<string, unknown>, options: { transport?: string; method?: string; type?: string } = {}) => ({
  source: { type: options.type ?? 'fixture-book', url: 'https://fixture.test/sports' }, method: options.method ?? 'network', retrievedAt: capturedAt, recordCount: Array.isArray(payload.records) ? payload.records.length : 0,
  evidence: { url: 'https://fixture.test/sports/football', transport: options.transport ?? 'fetch', capturedAt, payload }
});
const write = async (root: string, name: string, value: unknown) => { const path = join(root, 'raw', name); await writeFile(path, JSON.stringify(value)); return createHash('sha256').update(await readFile(path)).digest('hex'); };

test('day bounds and today follow Asia/Bangkok, not the machine timezone', () => {
  assert.deepEqual(dayBounds(DAY), { from: '2026-10-11T17:00:00.000Z', to: '2026-10-12T17:00:00.000Z' });
  assert.equal(todayInZone(Date.parse('2026-10-12T16:59:59Z')), DAY);
  assert.equal(todayInZone(Date.parse('2026-10-12T17:00:00Z')), '2026-10-13');
  assert.throws(() => dayBounds('12/10/2026'), /AAAA-MM-DD/);
  assert.equal(COLLECTOR_TIMEZONE, 'Asia/Bangkok');
});

test('a capture projects validated rows with original odds and keeps ambiguous rows or plain text as pending with a concrete reason', () => {
  const parsed = projectSnapshot(snapshot('2026-10-12T03:00:00.000Z', { records: [valid('Alpha', '1.85'), valid('Beta', '2.10'), { eventName: 'Alpha vs Beta', market: 'Match Winner', selection: '+150 Alpha', rawOdds: '1.5', qualifiers: { extraction: 'network' } }] }), 'a'.repeat(64), 'cap-1', 'local');
  assert.equal(parsed.validated.length, 2); assert.equal(parsed.pending.length, 1);
  assert.equal(parsed.validated[0]!.rawOdds, '1.85'); assert.equal(parsed.validated[0]!.competitionCountry, 'España'); assert.equal(parsed.validated[0]!.captureDay, DAY);
  assert.match(parsed.pending[0]!.reason, /precios de otras columnas/);
  const textOnly = projectSnapshot(snapshot('2026-10-12T03:00:00.000Z', { records: [], copiedText: 'Alpha vs Beta\n1.85 2.10', scrollMode: 'manual' }, { transport: 'manual-visible-text', method: 'dom' }), 'b'.repeat(64), 'cap-2', 'local');
  assert.equal(textOnly.validated.length, 0); assert.equal(textOnly.pending.length, 1); assert.equal(textOnly.pending[0]!.kind, 'text'); assert.match(textOnly.pending[0]!.reason, /pendiente de interpretación/);
  assert.equal(projectSnapshot(snapshot('2026-10-12T03:00:00.000Z', { records: [valid('Alpha', '1.85')] }, { transport: 'local-fixture' }), 'c'.repeat(64), 'cap-3', 'local').fixture, true);
});

test('day records unite RAW files and the PostgreSQL archive without duplicates, exclude fixtures and export CSV/JSON with identical scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'daily-records-')); await mkdir(join(root, 'raw'), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  const shaToday = await write(root, 'fixture-book-1760000000001-network.json', snapshot('2026-10-12T03:00:00.000Z', { records: [valid('Alpha', '1.85'), valid('Beta', '2.10')] }));
  // 2026-10-12 UTC evening is already 2026-10-13 in Bangkok: it must not count as today.
  await write(root, 'fixture-book-1760000000002-network.json', snapshot('2026-10-12T18:30:00.000Z', { records: [valid('Alpha', '1.90')] }));
  await write(root, 'fixture-book-1760000000003-network.json', snapshot('2026-10-12T04:00:00.000Z', { records: [valid('Alpha', '1.95')], verificationFixture: true }));
  await write(root, 'fixture-book-1760000000004-dom.json', snapshot('2026-10-12T05:00:00.000Z', { records: [], copiedText: 'Alpha vs Beta 1.85', scrollMode: 'manual' }, { transport: 'manual-visible-text', method: 'dom' }));
  await writeFile(join(root, 'raw', 'fixture-book-2026-10-12T05-00-00-000Z-failure.json'), '{}');
  const archived = snapshot('2026-10-12T06:00:00.000Z', { records: [valid('Beta', '2.30')] }, { type: 'archive-book' });
  const archivedSha = createHash('sha256').update(JSON.stringify(archived)).digest('hex');
  const queries: string[] = [];
  const pool = { query: async (sql: string, values: unknown[]) => {
    queries.push(sql);
    if (/FROM collector_captures\s+WHERE coalesce/.test(sql)) { assert.deepEqual(values, ['2026-10-11T17:00:00.000Z', '2026-10-12T17:00:00.000Z']); return { rows: [{ sha256: shaToday, file_name: 'fixture-book-1760000000001-network.json', captured_at: new Date('2026-10-12T03:00:00.000Z'), retrieved_at: null }, { sha256: archivedSha, file_name: 'archive-book-1760000000005-network.json', captured_at: new Date('2026-10-12T06:00:00.000Z'), retrieved_at: null }] }; }
    if (/sha256 = ANY/.test(sql)) { assert.deepEqual(values, [[archivedSha]]); return { rows: [{ sha256: archivedSha, file_name: 'archive-book-1760000000005-network.json', snapshot: archived }] }; }
    throw new Error(`unexpected query ${sql}`);
  } } as unknown as Pool;
  const daily = new DailyRecords(root, pool, 0);
  const day = await daily.forDay(DAY);
  assert.equal(day.summary.captures, 3, 'today RAW + text-only RAW + archive-only capture; fixture, failure and next-day files excluded');
  assert.equal(day.summary.validated, 3); assert.equal(day.summary.pending, 1); assert.equal(day.summary.pendingCaptures, 1);
  assert.deepEqual(day.summary.origins, { local: 1, archive: 1, both: 1 });
  assert.deepEqual(Object.keys(day.summary.sources).sort(), ['archive-book', 'fixture-book']);
  assert.equal(new Set(day.captures.map(c => c.sha256)).size, 3, 'one capture per SHA256');
  assert.deepEqual(day.validated.map(r => r.rawOdds), ['1.85', '2.10', '2.30']);
  assert.equal(day.pending[0]!.kind, 'text');
  assert.equal((await daily.forDay('2026-10-13')).summary.validated, 1, 'the UTC-evening capture belongs to the next Bangkok day');
  const summary = await daily.summary(DAY); assert.equal(summary.validated, day.summary.validated, 'counter and export share one scope');
  const exported = await daily.exportDay(DAY, new Date('2026-10-12T10:00:00Z'));
  const csv = (await readFile(exported.files.validatedCsv, 'utf8')).trim().split('\r\n');
  assert.equal(csv.length, 4); assert.match(csv[0]!, /^fuente,casa,url_fuente,url_pagina,pais_competicion,.*cuota_original,formato_original/);
  assert.match(csv[1]!, /fixture-book,.*España,Football,Liga Prueba,Alpha vs Beta,Alpha \| Beta,2026-10-13T12:00:00.000Z,Match Winner,,,Alpha,1.85,decimal,1.85,VALID/);
  assert.equal((await readFile(exported.files.pendingCsv, 'utf8')).trim().split('\r\n').length, 2);
  const json = JSON.parse(await readFile(exported.files.json, 'utf8'));
  assert.equal(json.validated.length, 3); assert.equal(json.pending.length, 1); assert.equal(json.summary.day, DAY);
  const again = await daily.exportDay(DAY, new Date('2026-10-12T10:00:01Z')); assert.notEqual(again.files.json, exported.files.json, 'exports are never overwritten');
  // The archive going away degrades to disk-only data instead of failing or hiding the counter.
  (pool as unknown as { query: unknown }).query = async () => { throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }); };
  const offline = await new DailyRecords(root, pool, 0).forDay(DAY);
  assert.equal(offline.summary.archiveAvailable, false); assert.match(offline.summary.archiveError!, /ECONNREFUSED/); assert.equal(offline.summary.validated, 2); assert.equal(offline.summary.captures, 2);
});

test('records routes expose the day, paginate rows without losing totals, and the status counter reads the same persisted scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'daily-routes-')); await mkdir(join(root, 'raw'), { recursive: true });
  const server = await createUiServer({ dataDir: root, databaseUrl: 'postgres://nobody@127.0.0.1:1/isolated' });
  t.after(async () => { await server.close(); await rm(root, { recursive: true, force: true }); });
  const today = todayInZone(), at = new Date(`${today}T09:30:00+07:00`).toISOString();
  await write(root, 'fixture-book-1760000000010-network.json', snapshot(at, { records: Array.from({ length: 7 }, (_, i) => valid(`Option ${i}`, String(1.5 + i / 10))) }));
  await write(root, 'fixture-book-1760000000011-network.json', snapshot(at, { records: [valid('Alpha', '1.85')], verificationFixture: true }));
  const status = (await server.app.inject('/api/status')).json();
  assert.equal(status.recordsToday, 7); assert.equal(status.pendingToday, 0); assert.equal(status.capturesToday, 1); assert.equal(status.today, today); assert.equal(status.timezone, 'Asia/Bangkok');
  const page = (await server.app.inject(`/api/records/day?date=${today}&offset=5&limit=5`)).json();
  assert.equal(page.validated.length, 2); assert.equal(page.validatedTotal, 7); assert.equal(page.summary.validated, 7);
  assert.equal((await server.app.inject(`/api/records/day?date=${today}&format=csv`)).body.trim().split('\r\n').length, 8);
  assert.equal((await server.app.inject('/api/records/day?date=bad')).statusCode, 400);
  const exported = (await server.app.inject({ method: 'POST', url: '/api/records/export', payload: { date: today } })).json();
  assert.ok(exported.files.json.startsWith(join(root, 'exports', today))); assert.equal(exported.summary.validated, 7);
  assert.equal((await server.app.inject({ method: 'POST', url: '/api/records/reveal', payload: { path: '/etc/passwd' } })).statusCode, 400);
  const empty = (await server.app.inject('/api/records/day?date=2020-01-01')).json();
  assert.equal(empty.summary.captures, 0); assert.deepEqual(empty.validated, []);
});
