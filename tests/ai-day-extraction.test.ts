import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { AiDayExtraction, type CaptureResult } from '../src/ui/ai-day-extraction.js';
import { DailyRecords } from '../src/ui/daily-records.js';
import { recordDocument, textDocument, domDocument, imageDocument, proposalFromRecord, verifyProposal, quoteIdentity,
  type EvidenceDocument, type EvidenceProposal } from '../src/ui/ai-evidence.js';
import type { ProviderRecord } from '../src/normalization/types.js';
import type { OcrScreenshot } from '../src/visual/ocr.js';

const DAY = '2026-10-12';
const configured = async () => ({ apiKey: 'test-key-not-real', model: 'gpt-test', enabled: true });
const record: ProviderRecord = { sportsbook: 'book', bookmaker: 'book', eventName: 'Alpha vs Beta', participants: ['Alpha', 'Beta'],
  sourceEventId: 'event-alpha-beta', market: 'Match Winner', selection: 'Alpha', rawOdds: '1.85', rawOddsFormat: 'decimal', decimalOdds: 1.85 };
const flat = textDocument(['Alpha vs Beta', 'Match Winner', ...Array.from({ length: 100 }, () => 'Other information'), 'Alpha', '1.85'].join('\n'), 'saved.txt');
const q: EvidenceProposal = { home: 'Alpha', away: 'Beta', market: 'Match Winner', selection: 'Alpha', price: '1.85',
  period: null, line: null, sport: null, competition: null, confidence: .99, blockId: 'document',
  homeId: 1, awayId: 1, marketId: 2, selectionId: 103, priceId: 104, periodId: null, lineId: null, sportId: null, competitionId: null };
const valid = (value: EvidenceProposal, doc: EvidenceDocument, audited = true) => verifyProposal(value, doc, 'capture', 'gpt-test', audited);

test('prices and citations are literal; distant fields require contextual review, not line-distance rules', () => {
  assert.ok('quote' in valid(q, flat), '100 intervening lines are not grounds for rejection');
  assert.ok('reason' in valid(q, flat, false), 'flat text requires an independent association review');
  for (const change of [{ price: '1.850' }, { price: '8.85' }, { home: 'Gamma' }, { market: 'Correct Score' },
    { priceId: 999 }, { line: '2.5', lineId: 2 }, { confidence: .5 }]) assert.ok('reason' in valid({ ...q, ...change }, flat), JSON.stringify(change));
  const doc = recordDocument([record, { ...record, eventName: 'Gamma vs Delta', participants: ['Gamma', 'Delta'] }], 'saved.json');
  const proposal = proposalFromRecord(doc.blocks[0]!, doc, .99);
  assert.ok('quote' in valid(proposal, doc, false));
  assert.ok('reason' in valid({ ...proposal, priceId: doc.blocks[1]!.fields!.price }, doc));
});

test('real DOM ancestry is preserved and a price from another container cannot be borrowed', () => {
  const leaf = (text: string, path: string) => ({ text, path, children: [] });
  const doc = domDocument({ path: 'body', children: [
    { path: 'body/event1', children: [leaf('Alpha vs Beta', 'body/event1/name'), leaf('Match Winner', 'body/event1/market'), leaf('Alpha', 'body/event1/selection'), leaf('1.85', 'body/event1/price')] },
    { path: 'body/event2', children: [leaf('Gamma vs Delta', 'body/event2/name'), leaf('9.99', 'body/event2/price')] },
  ] }, 'dom.json')!;
  assert.equal(doc.kind, 'DOM');
  assert.ok('quote' in valid({ ...q, blockId: 'body/event1', selectionId: 3, priceId: 4 }, doc));
  assert.ok('reason' in valid({ ...q, blockId: 'body/event1', selectionId: 3, price: '9.99', priceId: 6 }, doc));
});

test('dedup identity includes market, period, line and bookmaker; punctuation in prices is not discarded', () => {
  const key = quoteIdentity(q);
  assert.notEqual(key, quoteIdentity({ ...q, market: 'First Half Winner' }));
  assert.notEqual(key, quoteIdentity({ ...q, line: '2.5' }));
  assert.notEqual(key, quoteIdentity({ ...q, period: '1H' }));
  assert.notEqual(key, quoteIdentity({ ...q, price: '18.5' }));
  assert.notEqual(key, quoteIdentity({ ...q, bookmaker: 'different book' }));
});

type Stored = { capture_sha256: string; model: string; accepted: number; quotes: unknown[] };
const fakePool = (rows: Map<string, Stored>): Pool => ({
  query: async (sql: string, values: unknown[]) => {
    if (/FROM collector_captures\s+WHERE coalesce/.test(sql)) return { rows: [] };
    if (/SELECT capture_sha256 FROM ai_text_extractions/.test(sql)) return { rows: [...rows.values()].map(r => ({ capture_sha256: r.capture_sha256 })) };
    if (/SELECT capture_sha256,model,accepted,quotes/.test(sql)) return { rows: [...rows.values()] };
    if (/INSERT INTO ai_text_extractions/.test(sql)) {
      rows.set(String(values[0]), { capture_sha256: String(values[0]), model: String(values[5]), accepted: Number(values[6]), quotes: JSON.parse(String(values[8])) });
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
} as unknown as Pool);
const response = (value: unknown) => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message',
  content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }));
const save = async (root: string, n: number, payload: unknown, method = 'network', image = false) => {
  const id = `book-${1760000000000 + n}-${method}`;
  await mkdir(join(root, 'raw'), { recursive: true });
  await writeFile(join(root, 'raw', id + '.json'), JSON.stringify({ source: { type: 'book', url: 'https://sports.test/' },
    method, retrievedAt: '2026-10-12T03:00:00Z', evidence: { capturedAt: '2026-10-12T03:00:00Z', url: 'https://sports.test/',
      transport: 'real-capture', payload, ...(image ? { screenshotPath: id + '.png' } : {}) } }));
  if (image) await writeFile(join(root, 'raw', id + '.png'), 'actual-image-bytes');
};

test('records without copiedText reach the real client path, all batches are sent, and dedup happens after verification', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: Array.from({ length: 801 }, (_, i) => ({ ...record, market: `Match Winner ${i}` })) });
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  let calls = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'gpt-test'); assert.equal(body.store, false);
    const submitted = JSON.parse(body.input[0].content[0].text);
    calls++; return response({ groups: [{ blockIds: submitted.records.map((row: string[]) => row[0]), confidence: .99 }] });
  };
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured, fetchImpl });
  assert.equal((await job.eligible(DAY)).eligible.length, 1);
  await job.start(DAY); await job.idle();
  assert.equal(calls, 2); assert.equal(job.status.error, null); assert.equal(job.status.reachedModel, 1);
  assert.equal(job.status.proposed, 801); assert.equal(job.status.accepted, 801); assert.equal(job.status.duplicates, 801);
  assert.equal(job.status.newRows, 0); assert.equal(job.status.finalTotal, 801);
  assert.equal((await daily.forDay(DAY)).summary.ai, 0);
  const rows = [...store.values()][0]!.quotes as Array<{ provenance: { type: string; captureId: string; model: string; citations: unknown[] } }>;
  assert.equal(rows[0]!.provenance.type, 'TEXT'); assert.equal(rows[0]!.provenance.model, 'gpt-test'); assert.ok(rows[0]!.provenance.citations.length);
  await job.start(DAY, true); await job.idle(); assert.equal(job.status.finalTotal, 801);
});

const ocr: OcrScreenshot = { width: 100, height: 100, lines: ['Alpha vs Beta', 'Match Winner', 'Alpha', '1.85'].map((text, i) => ({
  text, confidence: .99, box: { x: 0, y: i * 20, width: 50, height: 10 },
})) };
const imageQuote = { ...q, blockId: 'image', selectionId: 3, priceId: 4 };

test('IMAGE fallback actually sends the saved image, checks OCR price and association, persists provenance and reaches exports', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: [] }, 'visual', true);
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  let calls = 0;
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)), content = body.input[0].content;
    assert.equal(content[1].type, 'input_image');
    assert.equal(content[1].image_url, 'data:image/png;base64,' + Buffer.from('actual-image-bytes').toString('base64'));
    calls++;
    return response(calls === 1 ? { quotes: [imageQuote, { ...imageQuote, price: '9.99' }] }
      : { decisions: [{ index: 0, supported: true, confidence: .99, reason: 'Same visible row and event.' }] });
  };
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured, fetchImpl, ocr: async () => ocr });
  await job.start(DAY); await job.idle();
  assert.equal(calls, 2); assert.equal(job.status.imageCaptures, 1); assert.equal(job.status.reachedModel, 1);
  assert.equal(job.status.proposed, 2); assert.equal(job.status.accepted, 1); assert.equal(job.status.rejected, 1); assert.equal(job.status.newRows, 1);
  const day = await daily.forDay(DAY), quote = day.validated[0]!;
  assert.equal(quote.rawOdds, '1.85'); assert.equal(quote.provenance?.type, 'IMAGE');
  assert.equal(quote.provenance?.confidence, .99); assert.equal(quote.provenance?.citations[0]?.box?.width, 50);
  const exported = await daily.exportDay(DAY);
  const json = JSON.parse(await readFile(exported.files.json, 'utf8'));
  assert.equal(json.validated[0].provenance.type, 'IMAGE');
  assert.equal(json.summary.validated, 1);
  assert.ok('reason' in valid({ ...imageQuote, price: '1.850' }, imageDocument(Buffer.from('image'), ocr, 'image.png')));
});

test('text with insufficient context falls back to IMAGE; genuine prices with unsupported associations stay rejected', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: [], copiedText: 'Alpha vs Beta\nMatch Winner\nAlpha\n1.85' }, 'dom', true);
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)), input = JSON.parse(body.input[0].content[0].text);
    const image = body.input[0].content.some((c: { type: string }) => c.type === 'input_image');
    if (String(input.task).startsWith('Independently')) return response({ decisions: [{ index: 0, supported: image, confidence: .99, reason: image ? 'Visible context' : 'Unclear context' }] });
    return response({ quotes: [{ ...imageQuote, blockId: image ? 'image' : 'document' }] });
  };
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured, fetchImpl, ocr: async () => ocr });
  await job.start(DAY); await job.idle();
  assert.deepEqual(job.status.captures[0]!.routes, ['TEXT', 'IMAGE']);
  assert.equal(job.status.accepted, 1); assert.equal(job.status.rejected, 1); assert.equal(job.status.reachedModel, 1);
});

test('captures without any saved evidence are counted explicitly, and provider failures do not erase prior data', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: [] }, 'dom');
  await save(root, 2, { records: [record] });
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured,
    fetchImpl: async () => new Response('private provider error', { status: 429 }) });
  await job.start(DAY, true); await job.idle();
  assert.equal(job.status.total, 2); assert.equal(job.status.done, 2); assert.equal(job.status.reachedModel, 0);
  assert.ok(job.status.captures.some(c => /No hay evidencia real/.test(c.skipped ?? '')));
  assert.match(job.status.error ?? '', /429/); assert.doesNotMatch(job.status.error ?? '', /private/);
  assert.equal(store.size, 0); assert.equal((await daily.forDay(DAY)).summary.validated, 1);
});

test('cancel aborts the real request path and cannot persist a partial extraction', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: [record] });
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; });
  const fetchImpl: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    entered(); init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured, fetchImpl });
  await job.start(DAY); await started; job.cancel(); await job.idle();
  assert.equal(job.status.cancelled, true); assert.equal(store.size, 0);
});

test('confirmed exhausted credit stops further requests and the final blocked report survives restoration', async t => {
  const root = await mkdtemp(join(tmpdir(), 'ai-evidence-')); t.after(() => rm(root, { recursive: true, force: true }));
  await save(root, 1, { records: [record] });
  await save(root, 2, { records: [{ ...record, selection: 'Beta' }] });
  const store = new Map<string, Stored>(), daily = new DailyRecords(root, fakePool(store), 0);
  let calls = 0, saved: CaptureResult[] | undefined;
  const job = new AiDayExtraction(fakePool(store), daily, { config: configured,
    fetchImpl: async () => { calls++; return new Response(JSON.stringify({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota' } }), { status: 429 }); },
    finished: async status => { saved = status.captures; },
  });
  await job.start(DAY); await job.idle();
  assert.equal(calls, 1); assert.equal(store.size, 0);
  assert.match(job.status.error ?? '', /saldo agotado/);
  assert.ok(saved?.some(c => c.skipped?.includes('pendiente de análisis')));
  const reopened = new AiDayExtraction(fakePool(store), daily, { config: configured });
  reopened.restore(job.status);
  assert.deepEqual(reopened.status, job.status);
});
