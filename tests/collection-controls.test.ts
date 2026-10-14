import { saveEvidenceFixtures, evidenceSource } from './fixtures/workbench-evidence.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {CollectionStore,CollectionRuntime,validateCollection,dayInZone,marketFamily} from '../src/engine/collection.js';
import {EngineStorage} from '../src/engine/storage.js';
import {AcquisitionOrchestrator} from '../src/engine/orchestrator.js';
import {VisualHandler,NetworkHandler} from '../src/engine/handlers.js';
import {createUiServer} from '../src/ui/server.js';
import {chooseVisualNavigation} from '../src/visual/openai-vision.js';
import {crawlBetfair} from '../src/engine/betfair-crawler.js';
import type {AcquisitionContext,Handler} from '../src/engine/types.js';

const source={type:'controlled',url:'https://controlled.test/football'};
const row={sportsbook:'controlled',sport:'football',competition:'India Division 3',eventName:'Alpha vs Beta',market:'Match Odds',selection:'Alpha',decimalOdds:1.85,eventStartTime:'2026-10-11T13:00:00Z'};
const ctx=(collection:CollectionRuntime):AcquisitionContext=>({collection,source:collection.source,memory:null,configuration:null,timeoutMs:3000,observeMs:0});
async function temporary(t: import('node:test').TestContext) {const root=await mkdtemp(join(tmpdir(),'collection-controls-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('scope validation handles query sections, date/timezone and refuses mixed-origin selection',()=>{
  assert.throws(()=>validateCollection({urls:['https://other.test/foo']},source));
  assert.throws(()=>validateCollection({from:'2026-02-30'}));assert.throws(()=>validateCollection({maxVisionCalls:-1}));
  assert.throws(()=>validateCollection({from:'2026-10-10',to:'2026-10-09'}));
  assert.equal(dayInZone('2026-10-09T18:00:00Z','Asia/Bangkok'),'2026-10-10');
  const exact=new CollectionRuntime(new CollectionStore(),source,validateCollection({scope:'url'},source),'run');
  assert.equal(exact.allowedUrl(source.url+'#'),true);assert.equal(exact.allowedUrl(source.url+'#totals'),false);assert.equal(exact.allowedUrl(source.url+'/event'),false);
  const section=new CollectionRuntime(new CollectionStore(),source,validateCollection({scope:'section',sectionUrl:source.url+'?sport=1'},source),'run');
  assert.equal(section.allowedUrl(source.url+'/league?sport=1'),true);assert.equal(section.allowedUrl(source.url+'/league?sport=2'),false);
  assert.equal(section.allowedUrl(source.url+'ish?sport=1'),false);
  assert.equal(marketFamily('Match Odds'),marketFamily('1X2'));assert.equal(marketFamily('Goals'),marketFamily('Over/Under'));
});

test('temporary skips survive a new store and apply only to the claimed run, expiry and reactivation',async t=>{
  const root=await temporary(t),store=new CollectionStore(root);
  const once=await store.addRule(source,{kind:'league',value:'India Division 3',duration:'run'});
  const permanent=await store.addRule(source,{kind:'market',value:'Totals',duration:'forever'});
  const first=new CollectionRuntime(store,source,validateCollection({excludePast:false}),'first');await first.initialize(ctx(first));
  assert.equal(first.accepts(row),false);assert.equal(first.allowedControl('India Division 3'),false);
  const second=new CollectionRuntime(new CollectionStore(root),source,validateCollection({excludePast:false}),'second');await second.initialize(ctx(second));
  assert.equal(second.accepts(row),true);assert.equal(second.allowedControl('Totals'),false);
  await store.removeRule(permanent.id);await second.refreshRules();assert.equal(second.allowedControl('Totals'),true);
  assert.equal((await store.rules()).find(r=>r.id===once.id)?.runId,'first');
  assert.throws(()=>validateCollection({to:'yesterday'}));
});

test('source-wide skip prevents every acquisition call',async t=>{
  const root=await temporary(t),store=new CollectionStore(root);await store.addRule(source,{kind:'source',value:'',duration:'forever'});
  const collection=new CollectionRuntime(store,source,validateCollection({}),'skip-all');let calls=0;
  const handlers=['http','network','dom','accessibility','visual'].map(method=>({method,async run(){calls++;return {kind:'miss',reason:'must not run'};}})) as Handler[];
  const result=await new AcquisitionOrchestrator({collection,handlers,storage:new EngineStorage(root)}).run(source);
  assert.equal(result.status,'SKIPPED');assert.equal(calls,0);
});

test('resume keeps pending navigation, refreshes stale completed views and never restores old prices',async t=>{
  const root=await temporary(t),store=new CollectionStore(root),options=validateCollection({refreshMinutes:1});
  const original=new CollectionRuntime(store,source,options,'first'),context=ctx(original);await original.initialize(context);
  context.visualCrawl={visited:[source.url+'/old'],pending:[source.url+'/pending'],records:[row],rawPaths:['old.json'],visits:[],tabsOpened:1,ocrCaptures:0};
  original.setView(source.url+'/active');await original.checkpoint(context,'PARTIAL','Stopped');
  const resumed=new CollectionRuntime(new CollectionStore(root),source,{...options,maxPages:500,budgetMinutes:60},'second'),next=ctx(resumed);await resumed.initialize(next);
  assert.equal(resumed.resumePending,true);assert.deepEqual(next.visualCrawl?.records,[]);
  assert.deepEqual(new Set(next.visualCrawl?.pending),new Set([source.url+'/old',source.url+'/pending',source.url+'/active']));
  assert.equal(store.checkpointId(source,options),store.checkpointId(source,{...options,maxPages:500}));
  await resumed.checkpoint(next,'PARTIAL','Stopped');await resumed.checkpoint(next);
  assert.equal((await store.checkpoint(source,options))?.state,'PARTIAL','late progress must not undo Stop');
});

test('date filters preserve live events and archive only complete, explicitly terminal views',async t=>{
  const root=await temporary(t),store=new CollectionStore(root),options=validateCollection({excludePast:true});
  const runtime=new CollectionRuntime(store,source,options,'first'),context=ctx(runtime);await runtime.initialize(context);
  assert.equal(runtime.accepts({...row,eventStartTime:'2020-01-01T00:00:00Z',eventStatus:'live'}),true);
  assert.equal(runtime.accepts({...row,eventStartTime:'2020-01-01T00:00:00Z'}),false);
  const event=source.url+'/alpha/e-1';runtime.setView(event);runtime.observeRows(event,[{...row,eventStartTime:'2020-01-01T00:00:00Z',eventStatus:'finished'}]);
  await runtime.view(context,event,'',false);assert.equal((await store.coverage(source))[0]?.archived,false);
  await runtime.view(context,event,'',true);
  const next=new CollectionRuntime(new CollectionStore(root),source,options,'second');await next.initialize(ctx(next));assert.equal(next.allowedUrl(event),false);
  const upcoming=new CollectionRuntime(store,source,validateCollection({from:'2026-10-10',excludePast:false}),'date');
  assert.equal(upcoming.accepts({...row,eventStartTime:null}),false);assert.equal(upcoming.accepts({...row,eventStartTime:'2026-10-09T18:00:00Z'}),true);
});

test('exact URL and selected market constrain actual browser navigation and accepted records',async t=>{
  const root=await temporary(t),store=new CollectionStore(root),options=validateCollection({scope:'url',markets:['totals'],excludePast:false});
  const collection=new CollectionRuntime(store,source,options,'exact'),context=ctx(collection);await collection.initialize(context);
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();context.page=page;
  const visited:string[]=[];await page.route('https://controlled.test/**',route=>{visited.push(route.request().url());return route.fulfill({contentType:'text/html',body:`<a href="/football/other">Other league</a><div role="tablist"><button role="tab" aria-selected="true">Match Odds</button><button role="tab" onclick="this.setAttribute('aria-selected','true');document.querySelector('h1').textContent='Totals'">Totals</button></div><h1>Match Odds</h1>`});});
  await page.goto(source.url);context.savePageCapture=async(_method,result)=>({records:result.records.filter(r=>collection.accepts(r)),rawPath:''});
  const result=await new VisualHandler(async(_,c)=>[{...row,sourceUrl:page.url(),market:await c.page!.locator('h1').innerText()}]).run(context);
  assert.equal(result.kind,'data');if(result.kind==='data')assert.deepEqual(result.records.map(r=>r.market),['Totals']);
  assert.deepEqual(visited,[source.url]);assert.ok(collection.views.some(v=>v.reason==='Fuera de la URL exacta'));
});

test('scoped source adapter observes the selected page without invoking its source-wide feed',async t=>{
  const root=await temporary(t),selected={type:'onexbet',url:'https://controlled.test/football/event'},collection=new CollectionRuntime(new CollectionStore(root),selected,validateCollection({scope:'url'},selected),'scoped');
  const context=ctx(collection);await collection.initialize(context);const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();context.page=page;
  await page.route('https://controlled.test/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Event only</h1>'}));
  let fetches=0;t.mock.method(globalThis,'fetch',async()=>{fetches++;throw Error('Source-wide feed must not run');});
  const result=await new NetworkHandler().run(context);assert.equal(result.kind,'miss');assert.equal(fetches,0);assert.equal(page.url(),selected.url);
});

test('UI API persists profiles, reports RAW/images and enforces native-only access',async t=>{
  const root=await temporary(t),server=await createUiServer({dataDir:root,nativeToken:'test-native-token'});t.after(()=>server.close());
  assert.equal((await server.app.inject({url:'/'})).statusCode,403);assert.equal((await server.app.inject({url:'/api/collection/state'})).statusCode,403);
  const headers={'x-collector-app':'test-native-token'};
  const native=await server.app.inject({url:'/',headers});assert.equal(native.statusCode,200);assert.match(String(native.headers['set-cookie']),/HttpOnly/);assert.match(native.body,/Control del scroll/);assert.match(native.body,/data-nav-view="extraer"/);assert.match(native.body,/data-nav-view="evidencias"/);
  assert.equal((await server.app.inject({url:'/api/health'})).statusCode,200);
  const saved=await server.app.inject({method:'POST',url:'/api/collection/profile',headers,payload:{source,options:{scope:'url',maxVisionCalls:0}}});assert.equal(saved.statusCode,200);
  const profile=await server.app.inject({url:'/api/collection/profile?'+new URLSearchParams(source),headers});assert.equal(profile.json().saved,true);assert.equal(profile.json().options.scope,'url');
  const raw=await new EngineStorage(root).saveRaw(source,'visual',{url:source.url,transport:'controlled',capturedAt:new Date().toISOString(),screenshot:Buffer.from('png-fixture'),payload:{records:[row]}},1);
  const id=raw.split('/').at(-1)!.replace('.json','');const state=(await server.app.inject({url:'/api/collection/state',headers})).json();assert.equal(state.captures[0].records,1);assert.equal(state.captures[0].groups[0].league,row.competition);assert.equal(state.sources.length,1);
  const capture=(await server.app.inject({url:'/api/collection/capture/'+id,headers})).json();assert.equal(capture.rows[0].decimalOdds,1.85);
  assert.equal((await server.app.inject({url:`/api/collection/capture/${id}/image/${id}.png`,headers})).statusCode,200);
  assert.equal((await server.app.inject({url:`/api/collection/capture/${id}/image/private.png`,headers})).statusCode,404);
  await server.actions.collection.ingestion(raw);assert.equal((await server.actions.collection.receipt(id))?.ingestion,'LOADED');
  const skip=await server.app.inject({method:'POST',url:'/api/collection/skip',headers,payload:{source,rule:{kind:'league',value:'India Division 3',duration:'forever'}}});assert.equal(skip.statusCode,200);
  const plan=(await server.app.inject({method:'POST',url:'/api/collection/plan',headers,payload:{source,options:{scope:'url'}}})).json();assert.equal(plan.rules,1);
  assert.equal((await server.app.inject({method:'POST',url:'/api/collection/reactivate',headers,payload:{id:skip.json().id}})).statusCode,200);
});


test('page budget leaves the next target durably pending instead of losing it',async t=>{
  const root=await temporary(t),collection=new CollectionRuntime(new CollectionStore(root),source,validateCollection({maxPages:1,excludePast:false}),'budget');
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();
  const requested:string[]=[];await page.route('https://controlled.test/**',route=>{requested.push(route.request().url());return route.fulfill({contentType:'text/html',body:'<a href="/football/pending">Next event</a><h1>Alpha vs Beta</h1>'});});await page.goto(source.url);
  const visual=new VisualHandler(async()=>[row]);
  const handlers=['http','network','dom','accessibility','visual'].map(method=>({method,async run(context:AcquisitionContext){context.page=page;return method==='visual'?visual.run(context):{kind:'miss',reason:'controlled'};}})) as Handler[];
  const outcome=await new AcquisitionOrchestrator({collection,handlers,storage:new EngineStorage(root),exhaustive:true,consoleNotifier:false}).run(source);
  assert.equal(outcome.status,'FAILED');const checkpoint=await collection.store.checkpoint(source,collection.options);
  assert.equal(checkpoint?.state,'PARTIAL');assert.ok(checkpoint?.crawl?.pending.includes(source.url+'/pending'));
  assert.deepEqual(requested,[source.url]);assert.ok(checkpoint?.crawl?.rawPaths.length);
});

test('zero AI budget prevents all external vision calls',async t=>{
  const root=await temporary(t),collection=new CollectionRuntime(new CollectionStore(root),source,validateCollection({maxVisionCalls:0}),'no-ai'),context=ctx(collection);
  let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('Must not call OpenAI');});
  const result=await chooseVisualNavigation(Buffer.from('controlled-image'),[{id:'tab',key:'totals',label:'Totals',role:'tab',href:null,x:0,y:0,width:100,height:30}],context);
  assert.equal(result.target,null);assert.equal(requests,0);assert.match(context.vision?.disabledReason||'',/Presupuesto/);
});

test('Betfair applies market choices while retaining league discovery and exact-URL boundaries',async t=>{
  const root=await temporary(t),base='https://www.betfair.com/betting/football/ac-1',selected={type:'betfair',url:base};
  const collection=new CollectionRuntime(new CollectionStore(root),selected,validateCollection({tabs:['Goals'],excludePast:false},selected),'bf-scoped'),context=ctx(collection);await collection.initialize(context);
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();context.page=page;context.browserMode='renzo';
  const requested:string[]=[];await page.route('https://www.betfair.com/**',route=>{
    const url=route.request().url();requested.push(url);const body=url.endsWith('ac-1')?'<a href="/betting/football/india/c-9">India Division 3</a>':url.endsWith('c-9')?'<a href="/betting/football/alpha/e-1">Alpha v Beta</a>':`<div role="tablist"><button role="tab" onclick="document.querySelector('section').setAttribute('data-market-name','Match Odds')">Match Odds</button><button role="tab" onclick="document.querySelector('section').setAttribute('data-market-name','Goals')">Goals</button></div><article data-event-id="1" data-event-name="Alpha v Beta" data-competition-name="India Division 3"><section data-market-id="1" data-market-name="Match Odds"><button data-selection-id="a" data-selection-name="Alpha"><span class="odds">2.15</span></button><button data-selection-id="b" data-selection-name="Beta"><span class="odds">3.25</span></button></section></article>`;
    return route.fulfill({contentType:'text/html',body});
  });await page.goto(base);
  context.savePageCapture=async(_method,result)=>({records:result.records.filter(r=>collection.accepts(r)),rawPath:''});
  const result=await crawlBetfair(page,context);assert.equal(result.kind,'data');if(result.kind==='data')assert.deepEqual(new Set(result.records.map(r=>r.market)),new Set(['Goals']));
  assert.ok(requested.some(url=>url.endsWith('c-9')));assert.ok(requested.some(url=>url.endsWith('e-1')));
});


test('browser error screens stop before OCR or a paid vision request',async t=>{
  const root=await temporary(t),collection=new CollectionRuntime(new CollectionStore(root),source,validateCollection({}),'failed-page'),context=ctx(collection);
  context.page={isClosed:()=>false,url:()=>"chrome-error://chromewebdata/"} as AcquisitionContext['page'];
  let captures=0;const result=await new VisualHandler(async()=>{captures++;return [row];}).run(context);
  assert.equal(result.kind,'miss');assert.equal(captures,0);
});


test('a complete fresh run is skipped without requests and refreshing or explicit restart allows new prices',async t=>{
  const root=await temporary(t),store=new CollectionStore(root),options=validateCollection({});
  const prior=new CollectionRuntime(store,source,options,'prior'),previous=ctx(prior);await prior.initialize(previous);await prior.checkpoint(previous,'COMPLETE');
  let calls=0;const handlers=['http','network','dom','accessibility','visual'].map(method=>({method,async run(){calls++;return {kind:'miss',reason:'controlled'};}})) as Handler[];
  const cached=new CollectionRuntime(store,source,options,'cached');const result=await new AcquisitionOrchestrator({collection:cached,handlers,storage:new EngineStorage(root)}).run(source);
  assert.equal(result.status,'SKIPPED');assert.equal(calls,0);
  const restarted=new CollectionRuntime(store,source,{...options,resume:false},'restart');await restarted.initialize(ctx(restarted));assert.equal(restarted.freshRun,false);
  const checkpoint=(await store.checkpoint(source,options))!;checkpoint.updatedAt='2020-01-01T00:00:00Z';await store.saveCheckpoint(checkpoint);
  const expired=new CollectionRuntime(store,source,options,'expired');await expired.initialize(ctx(expired));assert.equal(expired.freshRun,false);
});


test('native-only organize and gallery share saved files, selection and access to image/text evidence',async t=>{
  const root=await temporary(t),fixture=await saveEvidenceFixtures(root),server=await createUiServer({dataDir:root,nativeToken:'test-native-token'});t.after(()=>server.close());
  const headers={'x-collector-app':'test-native-token'};
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/organize',payload:{}})).statusCode,403);
  const result=(await server.app.inject({method:'POST',url:'/api/workbench/organize',headers,payload:{source:evidenceSource,captureIds:[fixture.multi],filters:{}}})).json();
  assert.equal(result.total,2);assert.equal(result.captureTotal,1);assert.ok(result.cards.every((c:any)=>c.evidence.every((e:any)=>e.id===fixture.multi)));
  const state=(await server.app.inject({url:'/api/collection/state?'+new URLSearchParams(evidenceSource),headers})).json();assert.equal(state.total,4);
  const image=await server.app.inject({url:`/api/collection/capture/${fixture.multi}/image/${fixture.multi}.png`,headers});assert.equal(image.statusCode,200);assert.equal(image.headers['content-type'],'image/png');
  const text=(await server.app.inject({url:`/api/collection/capture/${fixture.text}`,headers})).json();assert.equal(text.images.length,0);assert.match(text.copiedText,/Texto guardado/);
  const pending=(await server.app.inject({url:`/api/collection/capture/${fixture.pending}`,headers})).json();assert.equal(pending.rows.length,0);assert.ok(pending.images.length);assert.ok(pending.copiedText);
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/organize',headers,payload:{captureIds:['../private']}})).statusCode,400);
});

test('saved view paginates markets and pending files independently and exposes unreadable RAW for review',async t=>{
  const root=await temporary(t),server=await createUiServer({dataDir:root});t.after(()=>server.close());
  const {mkdir,writeFile}=await import('node:fs/promises');
  await new EngineStorage(root).saveRaw(source,'dom',{url:source.url,transport:'fixture',capturedAt:'2020-01-01T00:00:00Z',payload:{records:Array.from({length:65},(_,i)=>({...row,eventName:`Event ${i}`,sourceEventId:String(i),rawOdds:'1.85'}))}},65);
  await mkdir(join(root,'raw'),{recursive:true});
  await Promise.all(Array.from({length:35},(_,i)=>writeFile(join(root,'raw',`unclassified-${i}.json`),'unclassified local RAW')));
  const first=(await server.app.inject({method:'POST',url:'/api/workbench/organize',payload:{}})).json();
  const next=(await server.app.inject({method:'POST',url:'/api/workbench/organize',payload:{offset:50,pendingOffset:90}})).json();
  assert.equal(first.total,65);assert.equal(first.cards.length,50);assert.equal(first.counts.interpretationPending,35);assert.equal(first.pendingTotal,100);assert.equal(first.pending.length,30);assert.equal(next.cards.length,15);assert.equal(next.pending.length,10);
  assert.ok(next.cards.every((c:any)=>!first.cards.some((f:any)=>f.id===c.id)));
  const unreadable=(await server.app.inject('/api/collection/capture/unclassified-0')).json();assert.equal(unreadable.rawContent,'unclassified local RAW');assert.equal(unreadable.rows.length,0);
});
