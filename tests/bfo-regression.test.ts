import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { extractBestFightOddsDom } from '../src/profiles/bestfightodds.js';
import { captureVisibleDom } from '../src/dom/browser.js';
import { extractRenderedDom, type DomNode } from '../src/dom/extractor.js';
import { discoverVisualLinks } from '../src/visual/browser.js';
import { navigationUrl, navigationDecision } from '../src/visual/navigation-policy.js';
import { assessRecord, usableRecord, quoteKey } from '../src/validation/records.js';
import { extractSnapshotRecords } from '../src/snapshots/reader.js';
import { persistRecords } from '../src/snapshots/loader.js';
import { normalizeRecord } from '../src/normalization/normalize.js';
import { SavedEvidenceIndex } from '../src/ui/saved-evidence.js';
import { CollectionStore, CollectionRuntime, validateCollection } from '../src/engine/collection.js';
import { VisualHandler, DomHandler } from '../src/engine/handlers.js';
import type { AcquisitionContext } from '../src/engine/types.js';
import type { Pool } from 'pg';
const source={type:'bestfightodds',url:'https://www.bestfightodds.com/'};
const historical = async()=>JSON.parse(await readFile('tests/fixtures/bfo-historical-invalid.json','utf8'));
const html = ()=>readFile('tests/fixtures/bfo-associations.html','utf8');
const temp = async(t:import('node:test').TestContext)=>{const root=await mkdtemp(join(tmpdir(),'bfo-regression-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'raw'));return root;};

test('actual 2284-character RAW stays byte-identical, pending, and cannot reach persistence',async t=>{
 const fixture=await historical(), bytes=await readFile(fixture.evidence.payload.originalFile);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.evidence.payload.originalSha256);
 assert.equal(fixture.evidence.payload.records[0].eventName.length,2284);
 assert.equal(assessRecord(fixture.evidence.payload.records[0]).status,'AMBIGUOUS');
 assert.equal(extractSnapshotRecords(fixture).length,0);
 let connects=0;const pool={connect(){connects++;throw Error('Must not persist');}} as unknown as Pool;
 assert.equal(await persistRecords(pool,[normalizeRecord(fixture.evidence.payload.records[0])],'fixture','fixture.json',source.type),false);assert.equal(connects,0);
 const root=await temp(t);await writeFile(join(root,'raw','original.json'),bytes);
 const index=new SavedEvidenceIndex(root),result=await index.organize({},{});
 assert.equal(result.cards.length,0);assert.ok(result.pending.some(p=>p.evidence.id==='original'));assert.ok(result.captures.some(p=>p.id==='original'&&p.hasText));
 assert.deepEqual(await readFile(join(root,'raw','original.json')),bytes);
 assert.deepEqual(await readFile(fixture.evidence.payload.originalFile),bytes);
 const classification=JSON.parse(await readFile(join(root,'collection','classification','original.json'),'utf8'));assert.equal(classification.version,'sports-association-v3');
});

test('BFO preserves book columns, distinct matchups for the same fighter, explicit dates, unknown dates, and future events',async()=>{
 const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();await page.setContent(await html());
 const tree=await captureVisibleDom(page,{rootSelector:'div.table-div',maxDepth:16});const rows=extractBestFightOddsDom(tree,{sportsbook:source.type,sourceUrl:source.url});
 assert.equal(rows.length,10);assert.equal(rows.find(r=>r.sourceEventId==='45001'&&r.selection==='Alex Pereira'&&r.bookmaker==='fanduel')?.rawOdds,'+122');
 assert.equal(rows.find(r=>r.sourceEventId==='45001'&&r.selection==='Alex Pereira'&&r.bookmaker==='betmgm')?.rawOdds,'+130');
 assert.ok(rows.filter(r=>r.sourceEventId==='45001').every(r=>r.eventStartTime==='2030-10-11T18:00:00.000Z'));
 assert.ok(rows.filter(r=>r.sourceEventId==='46001').every(r=>r.eventStartTime===null&&usableRecord(r)));
 assert.equal(new Set(rows.filter(r=>r.selection==='Alex Pereira').map(quoteKey)).size,3);
 const generic=extractRenderedDom(await captureVisibleDom(page),{sportsbook:source.type,sourceUrl:source.url});assert.equal(generic.records.length,0);
 }finally{await browser.close();}
});

test('link discovery and restored old queue reject news, contact, help, legal paths; URL identity preserves views',async t=>{
 const root=await temp(t),browser=await chromium.launch({headless:true});try{const page=await browser.newPage();await page.route('https://www.bestfightodds.com/**',r=>r.fulfill({contentType:'text/html',body:''}));await page.goto(source.url);await page.setContent(await html());
 const links=await discoverVisualLinks(page);assert.equal(links.length,2);assert.ok(links.every(u=>u.includes('/events/')));assert.equal(links.filter(u=>u.includes('ufc-332-100')).length,1);
 assert.notEqual(navigationUrl(source.url+'#totals'),navigationUrl(source.url+'#moneyline'));assert.notEqual(navigationUrl(source.url+'?view=1'),navigationUrl(source.url+'?view=2'));assert.equal(navigationUrl(source.url+'#'),source.url);
 for(const path of ['/news/ufc-332-picks-odds-predictions','/news/a-vs-b','/blog/odds','/contact','/help','/terms','/privacy'])assert.equal(navigationDecision(new URL(path,source.url).href,source.url).allowed,false);
 const store=new CollectionStore(root),options=validateCollection({excludePast:false}),bad=source.url+'news/a-vs-b',good=source.url+'events/future-events-197';
 await store.saveCheckpoint({source,options,state:'RUNNING',updatedAt:new Date().toISOString(),views:[],crawl:{pending:[bad,good],visited:[],rawPaths:[]}} as any);
 const runtime=new CollectionRuntime(store,source,options,'new'),context={source,memory:null,configuration:null,timeoutMs:2000,observeMs:0} as AcquisitionContext;await runtime.initialize(context);assert.deepEqual(context.visualCrawl?.pending,[good]);assert.ok(runtime.views.some(v=>v.url===bad&&v.status==='SKIPPED'));
 }finally{await browser.close();}
});

test('scroll and DomHandler use BFO without saved profile; buttons, popup and SPA cannot open articles', {timeout:30000},async t=>{
 const root=await temp(t),requests:string[]=[],body=await html();const server=createServer((req,res)=>{requests.push(req.url||'');res.setHeader('content-type','text/html');res.end(body.replace(/<a href="\/events[^<]+<\/a>/g,''));});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
 const address=server.address() as {port:number}, local={type:'bestfightodds',url:`http://127.0.0.1:${address.port}/`},browser=await chromium.launch({headless:true});try{const browserContext=await browser.newContext(),page=await browserContext.newPage();const runtime=new CollectionRuntime(new CollectionStore(root),local,validateCollection({textOnly:true,maxVisionCalls:0,excludePast:false},local),'local');
 const captured:any[]=[];const context:AcquisitionContext={source:local,memory:null,configuration:null,page,browserContext,timeoutMs:2000,observeMs:1,collection:runtime,savePageCapture:async(_m,r)=>{captured.push(r);return {records:r.records,rawPath:''};}};
 const probe=await new DomHandler().run({...context,skipReveal:true});assert.equal(probe.kind,'data');if(probe.kind==='data')assert.equal(probe.records.length,10);
 const result=await new VisualHandler().run(context);assert.equal(result.kind,'data');if(result.kind==='data'){assert.equal(result.records.length,10);assert.ok(result.records.every(r=>r.qualifiers?.profileVersion==='bestfightodds-dom-v3'));}
 assert.ok(captured.length);assert.ok(!requests.some(p=>p.startsWith('/news/')));assert.ok(runtime.views.some(v=>v.url.includes('/news/')));
 }finally{await browser.close();}
});

test('mixed text-only files keep valid and pending groups, metadata and same-row filters separate',async t=>{
 const root=await temp(t),bad=(await historical()).evidence.payload.records[0];const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();await page.setContent(await html());const rows=extractBestFightOddsDom(await captureVisibleDom(page,{rootSelector:'div.table-div'}),{sportsbook:source.type,sourceUrl:source.url,collectedAt:'2026-10-11T05:00:00Z'});
 const raw={source,recordCount:rows.length+1,method:'dom',evidence:{url:source.url,capturedAt:'2020-10-10T05:00:00Z',payload:{records:[...rows,bad],copiedText:'Alpha vs Beta +122'}}};await writeFile(join(root,'raw','mixed.json'),JSON.stringify(raw));const index=new SavedEvidenceIndex(root);const result=await index.organize({},{});
 assert.equal(result.cards.length,5);assert.equal(result.overlapTotal,1);assert.equal(result.captures.length,1);assert.ok(result.facets.bookmaker?.includes('fanduel'));assert.ok(result.pending.some(p=>p.status==='AMBIGUOUS'));assert.ok(result.pending.some(p=>p.status==='PARTIAL'));
 assert.ok(result.cards.every(c=>c.bookmaker!=='bestfightodds'));assert.ok(result.cards.flatMap(c=>c.options.flatMap(o=>o.evidence)).every(e=>e.capturedAt==='2020-10-10T05:00:00.000Z'&&e.observedAt==='2026-10-11T05:00:00.000Z'&&e.images.length===0));
 assert.equal((await index.organize({league:'Future Events',from:'2030-10-11'},{})).cards.length,0);assert.equal((await index.organize({sport:'tennis',league:'UFC 332'},{})).cards.length,0);
 const filtered=await index.organize({league:'UFC 332',bookmaker:'fanduel',from:'2030-10-11',captureFrom:'2020-10-10',captureTo:'2020-10-10'},{});assert.equal(filtered.cards.length,2);
 }finally{await browser.close();}
});
