import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { VisualHandler } from '../src/engine/handlers.js';
import type { AcquisitionContext, VisualProgress } from '../src/engine/types.js';

test('exhaustive visual navigation opens 100 observed event tabs, follows recursive links and does not stop at the first quote', { timeout: 120000 }, async () => {
  const requests = new Set<string>();
  const server = createServer((req, res) => {
    const path = req.url || '/'; requests.add(path); res.setHeader('content-type', 'text/html');
    const id = Number(path.split('/').at(-1));
    const links = path === '/' ? Array.from({length: 50}, (_, i) => `<a href="/events/${i + 1}">Event ${i + 1}</a>`).join('')
      : id <= 50 ? `<a href="/events/${id + 50}">Event ${id + 50}</a><a href="/events/${id}">Current fixture</a>` : '';
    res.end(`<h1>Controlled event ${id || 0}</h1>${links}<a href="/deposit">Deposit</a><a href="/history">History</a><a href="/casino">Casino</a>`);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless: true});
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/`, browserContext = await browser.newContext();
    await browserContext.addCookies([{ name: 'test-session', value: 'inherited', url }]);
    const page = await browserContext.newPage();
    const progress: VisualProgress[] = [];
    const context: AcquisitionContext = { source: {url, type: 'controlled-navigation-test'}, memory: null, configuration: null, timeoutMs: 5000, observeMs: 1, exhaustive: true, page, browserContext, visualProgress: p => progress.push(p) };
    let read = 0, tabs = 1;
    browserContext.on('page', () => tabs++);
    const result = await new VisualHandler(async (_screenshot, ctx) => {
      read++;
      assert.equal((await ctx.page!.context().cookies())[0]?.value, 'inherited');
      const label = await ctx.page!.locator('h1').innerText();
      return [{ sportsbook: ctx.source.type, eventName: `${label} Alpha vs Beta`, market: 'Moneyline', selection: 'Alpha', rawOdds: '1.85', decimalOdds: 1.85, sourceEventId: label, sourceSelectionId: label }];
    }).run(context);
    assert.equal(result.kind, 'data');
    if (result.kind !== 'data') return;
    assert.equal(result.records.length, 101); assert.equal(read, 101); assert.equal(tabs, 101);
    assert.equal(context.visualCrawl!.visited.length, 101);
    assert.equal(progress.at(-1)?.state, 'COMPLETE'); assert.equal(progress.at(-1)?.pending, 0);
    assert.equal(browserContext.pages().length, 2, 'processed tabs are released instead of exhausting memory');
    for (let id = 1; id <= 100; id++) assert.ok(requests.has(`/events/${id}`));
    assert.ok(!requests.has('/deposit') && !requests.has('/history') && !requests.has('/casino'));
  } finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('observed market tabs and load-more controls are activated automatically', { timeout: 30000 }, async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.route('http://controlled-tabs.test/**', route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));
    await page.goto('http://controlled-tabs.test/');
    await page.setContent(`<h1>Alpha vs Beta</h1><button role="tab" onclick="document.querySelector('p').textContent='Moneyline'">Moneyline</button><button role="tab" onclick="document.querySelector('p').textContent='Total Goals'">Totals</button><button onclick="this.disabled=true;document.querySelector('p').textContent+=' expanded'">Load more</button><button onclick="throw Error('wager clicked')">Place bet</button><p>Initial</p>`);
    const seen: string[] = [];
    const result = await new VisualHandler(async (_image, context) => {
      const text = await context.page!.locator('p').innerText(); seen.push(text);
      return [{ eventName: 'Alpha vs Beta', market: text, selection: 'Alpha', decimalOdds: 1.85, rawOdds: '1.85' }];
    }).run({ source: { url: page.url(), type: 'controlled-tabs' }, page, memory: null, configuration: null, timeoutMs: 1000, observeMs: 1, exhaustive: true });
    assert.equal(result.kind, 'data');
    assert.deepEqual(seen, ['Initial', 'Moneyline', 'Total Goals', 'Total Goals expanded']);
  } finally { await browser.close(); }
});
