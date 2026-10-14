import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createServer } from "node:http";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { VisualHandler } from "../src/engine/handlers.js";
import { EngineStorage } from "../src/engine/storage.js";
import { extractSnapshotRecords, readRawSnapshot } from "../src/snapshots/reader.js";
import { extractScreenshotRecords } from "../src/visual/screenshot.js";
import type { OcrLine, OcrScreenshot } from "../src/visual/ocr.js";

const line = (text: string, y: number, x = 30, confidence = 1): OcrLine => ({ text, confidence, box: { x, y, width: 140, height: 25 } });
const fixture = (): OcrScreenshot => ({ width: 1000, height: 700, lines: [line("Alpha FC vs Beta FC", 30), line("Moneyline", 90), line("Alpha FC 1.85", 150), line("Beta FC 2.10", 210)] });
const input = { sportsbook: "local-test", sourceUrl: "https://sports.example/odds", collectedAt: "2026-10-07T00:00:00Z" };

test("OCR associates explicit event, market, selection and prices with audit regions", () => {
  const quotes = extractScreenshotRecords(fixture(), input);
  assert.deepEqual(quotes.map(q => [q.record.eventName, q.record.market, q.record.selection, q.record.decimalOdds]), [
    ["Alpha FC vs Beta FC", "Moneyline", "Alpha FC", 1.85], ["Alpha FC vs Beta FC", "Moneyline", "Beta FC", 2.1]
  ]);
  assert.ok(quotes.every(q => q.record.sourceSelectionId?.startsWith("ocr:") && q.record.qualifiers?.extraction === "screenshot-ocr"));
  assert.equal(quotes[0]?.record.sport, undefined);
});

test("OCR rejects low confidence, orphan numbers, ambiguous columns and blocked pages", () => {
  for (const image of [
    { ...fixture(), lines: fixture().lines.map(l => ({ ...l, confidence: .5 })) },
    { ...fixture(), lines: fixture().lines.filter(l => l.text !== "Moneyline") },
    { ...fixture(), lines: [...fixture().lines, line("Gamma FC vs Delta FC", 30, 600)] },
    { ...fixture(), lines: [...fixture().lines, line("Access Denied", 5)] },
    { ...fixture(), lines: [...fixture().lines, line("Verify you are human", 5, 30, .5)] },
    { ...fixture(), lines: [line("2026", 30), line("301", 100), line("2.10", 150)] }
  ]) assert.deepEqual(extractScreenshotRecords(image, input), []);
});

test("conflicting prices and a later non-winner market are rejected", () => {
  const image = fixture(); image.lines.push(line("Alpha FC 1.95", 180));
  assert.deepEqual(extractScreenshotRecords(image, input).map(q => q.record.selection), ["Beta FC"]);
  const total = fixture(); total.lines.splice(2, 0, line("Total Goals", 120));
  assert.deepEqual(extractScreenshotRecords(total, input), []);
});

test("separate aligned labels and decimal commas work; unaligned labels do not", () => {
  const image = fixture(); image.lines = [line("Alpha FC vs Beta FC", 30), line("Moneyline", 90), line("Alpha FC", 150), line("1,85", 150, 200)];
  assert.equal(extractScreenshotRecords(image, input)[0]?.record.decimalOdds, 1.85);
  image.lines[3]!.box.y = 200;
  assert.deepEqual(extractScreenshotRecords(image, input), []);
});

test("native OCR reads a controlled PNG without DOM odds and persists verifiable evidence", { skip: process.platform !== "darwin", timeout: 90_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "ocr-test-"));
  try {
    const imagePath = join(root, "controlled-fixture.png");
    await promisify(execFile)("swift", ["tests/fixtures/ocr-winner.swift", imagePath], { timeout: 30_000 });
    const screenshot = await readFile(imagePath);
    const page = { isClosed: () => false, url: () => input.sourceUrl, frames: () => [],
      locator: (selector: string) => selector === "body" ? { innerText: async () => "Canvas scoreboard" } : { count: async () => 0 },
      evaluate: async (fn: Function) => fn.toString().includes("scrollHeight") ? 500 : undefined, waitForTimeout: async () => {},
      screenshot: async () => screenshot } as unknown as Page;
    const source = { url: input.sourceUrl, type: input.sportsbook };
    const result = await new VisualHandler().run({ source, memory: null, configuration: null, page, timeoutMs: 10_000, observeMs: 0, browserMode: "isolated" });
    assert.equal(result.kind, "data");
    if (result.kind !== "data") return;
    assert.deepEqual(result.records.map(r => [r.selection, r.rawOdds]), [["Alpha FC", "1.85"], ["Beta FC", "2.10"]]);
    const rawPath = await new EngineStorage(root).saveRaw(source, "visual", result.evidence, result.records.length);
    const raw = JSON.parse(await readFile(rawPath, "utf8"));
    assert.deepEqual(await readFile(raw.evidence.screenshotPath), screenshot);
    assert.equal(raw.evidence.payload.screenshotSha256, createHash("sha256").update(screenshot).digest("hex"));
    assert.equal(raw.evidence.payload.ocrEngine, "apple-vision");
    assert.equal(raw.evidence.payload.quotes.length, 2);
    assert.equal(raw.evidence.screenshot, undefined);
    assert.equal(extractSnapshotRecords(await readRawSnapshot(rawPath)).length, 2);
    if (process.env.VISUAL_VERIFICATION_DIR) {
      await new EngineStorage(process.env.VISUAL_VERIFICATION_DIR).saveRaw(source, "visual", {
        ...result.evidence, payload: { ...(result.evidence.payload as Record<string, unknown>), verificationFixture: true, liveSportsbook: false }
      }, result.records.length);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("visual fallback follows a sports link in an inherited tab and reads canvas odds automatically", { skip: process.platform !== "darwin", timeout: 90_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "ocr-navigation-"));
  const imagePath = join(root, "controlled-fixture.png");
  await promisify(execFile)("swift", ["tests/fixtures/ocr-winner.swift", imagePath], { timeout: 30_000 });
  const image = (await readFile(imagePath)).toString("base64");
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url ?? ""); res.setHeader("content-type", "text/html");
    if (req.url === "/sports") res.end(`<html><body style="margin:0"><canvas width="1000" height="500"></canvas><script>const img=new Image();img.onload=()=>document.querySelector('canvas').getContext('2d').drawImage(img,0,0);img.src='data:image/png;base64,${image}';</script></body></html>`);
    else if (req.url === "/blocked") { res.statusCode = 403; res.end("Access Denied: Verify you are human"); }
    else res.end('<html><body><h1>Controlled navigation fixture</h1><a href="/sports">Sports</a><a href="/deposit">Deposit</a><a href="/place-bet">Place bet</a></body></html>');
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/`;
    const browserContext = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    await browserContext.addCookies([{ name: "fixture-session", value: "inherited", url }]);
    const page = await browserContext.newPage();
    const context = { source: { url, type: "local-test" }, memory: null, configuration: null, page, browserContext, timeoutMs: 10_000, observeMs: 0 };
    const result = await new VisualHandler().run(context);
    assert.equal(result.kind, "data");
    if (result.kind !== "data") return;
    assert.equal(result.records.length, 2);
    assert.equal(browserContext.pages().length, 2);
    assert.equal(context.page.url(), `${url}sports`);
    assert.equal((await context.page.context().cookies())[0]?.value, "inherited");
    assert.ok(!requests.includes("/deposit") && !requests.includes("/place-bet"));
    assert.equal((result.evidence.payload as { navigation: unknown[] }).navigation.length, 2);
    const blockedPage = await browserContext.newPage();
    const blocked = await new VisualHandler().run({ ...context, page: blockedPage, source: { url: `${url}blocked`, type: "local-test" } });
    assert.equal(blocked.kind, "challenge");
    assert.equal(blockedPage.isClosed(), false);
  } finally {
    await browser.close(); await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test('native OCR scans an entire long canvas page in tiles and saves image proof beyond the first viewport', {skip:process.platform !== 'darwin',timeout:90000}, async () => {
  const browser = await chromium.launch({headless:true}), root = await mkdtemp(join(tmpdir(),'ocr-long-page-'));
  try {
    const browserContext = await browser.newContext({viewport:{width:1100,height:700}}), page = await browserContext.newPage();
    await page.route('http://controlled-long-page.test/**',route=>route.fulfill({contentType:'text/html',body:`<body style="margin:0;height:7200px;background:white"><script>
      ['Alphaone','Alphatwo','Alphathree'].forEach((name,i)=>{
        const beta=['Betaone','Betatwo','Betathree'][i],c=document.createElement('canvas');c.width=1000;c.height=500;c.style='position:absolute;left:0;top:'+i*3000+'px';document.body.append(c);
        const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,500);ctx.fillStyle='black';ctx.font='32px Arial';
        [name+' vs '+beta,'Moneyline',name+' 1.85',beta+' 2.10'].forEach((text,j)=>ctx.fillText(text,35,65+j*80));
      });</script></body>`}));
    const source = {url:'http://controlled-long-page.test/',type:'controlled-long-ocr'};
    const result = await new VisualHandler().run({source,page,browserContext,memory:null,configuration:null,timeoutMs:5000,observeMs:1,exhaustive:true});
    assert.equal(result.kind,'data'); if(result.kind!=='data')return;
    assert.equal(result.records.length,6); assert.equal(new Set(result.records.map(r=>r.eventName)).size,3);
    const payload = result.evidence.payload as {tileCount:number}; assert.ok(payload.tileCount >= 3);
    const path = await new EngineStorage(root).saveRaw(source,'visual',result.evidence,result.records.length);
    const raw=JSON.parse(await readFile(path,'utf8'));assert.equal(raw.evidence.screenshotPaths.length,payload.tileCount);
    for(const tile of raw.evidence.screenshotPaths)assert.ok((await readFile(tile)).length>0);
  } finally {await browser.close();await rm(root,{recursive:true,force:true});}
});

test('OCR reads explicit totals, signed handicap lines and both-team selections without reusing a winner heading', () => {
  const cases = [
    ['Total Goals','Over 2.5 1.90','Under 2.5 1.95','Over','2.5'],
    ['Handicap','Alpha FC (-1.5) 1.90','Beta FC (+1.5) 1.95','Alpha FC','-1.5'],
    ['Both Teams to Score','Yes 1.90','No 1.95','Yes',undefined]
  ] as const;
  for(const [market,first,second,selection,handicap] of cases) {
    const image={...fixture(),lines:[line('Alpha FC vs Beta FC',30),line(market,90),line(first,150),line(second,210)]};
    const quotes=extractScreenshotRecords(image,input);assert.equal(quotes.length,2);assert.equal(quotes[0]?.record.selection,selection);assert.equal(quotes[0]?.record.line,handicap);
  }
  const missingLine={...fixture(),lines:[line('Alpha FC vs Beta FC',30),line('Total Goals',90),line('Over 1.90',150)]};
  assert.deepEqual(extractScreenshotRecords(missingLine,input),[]);
});
