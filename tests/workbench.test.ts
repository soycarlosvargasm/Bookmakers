import { savedEvidence } from '../src/ui/saved-evidence.js';
import { saveEvidenceFixtures, evidenceSource } from './fixtures/workbench-evidence.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import type { Pool } from 'pg';
import { organizeQuotes, registerWorkbenchRoutes, validateFilters, type QuoteRow } from '../src/ui/workbench.js';
import { UiActions, defaultSettings } from '../src/ui/actions.js';
import { chromium } from 'playwright';
import { copyVisibleSportsText, waitForSportsContent } from '../src/visual/readiness.js';
import { CollectionRuntime, CollectionStore, validateCollection } from '../src/engine/collection.js';
import { EngineStorage } from '../src/engine/storage.js';
import { VisualHandler } from '../src/engine/handlers.js';
import type { CollectionOptions } from '../src/engine/collection.js';
import type { UiSettings } from '../src/ui/actions.js';
import type { Source } from '../src/engine/types.js';
import type { AcquisitionContext } from '../src/engine/types.js';

const now=Date.parse('2026-10-10T06:00:00Z');
const row=(values:Partial<QuoteRow>={}):QuoteRow=>({event_id:'1',market_id:'10',selection_id:'100',sport:'Soccer',competition:'Serie A Italiana',event_name:'Juventus vs AC Milan',home_participant:'Juventus',away_participant:'AC Milan',participants:['Juventus','AC Milan'],event_start_time:'2030-10-10T18:00:00Z',event_status:'prematch',source:'book-a',bookmaker:null,market_type:'1X2',market_period:'full_event',selection_name:'Juventus',line:null,decimal_odds:1.6667,raw_odds:'-150',raw_odds_format:'american',captured_at:'2026-10-10T05:59:00Z',observation_id:'1000',source_url:'https://book-a.example/event',cross_validation:'CONFIRMED',...values});
const complete=[row(),row({selection_id:'101',selection_name:'AC Milan',decimal_odds:2.9,raw_odds:'+190'}),row({selection_id:'102',selection_name:'Draw',decimal_odds:3.5,raw_odds:'+250'})];

test('final match cards preserve both teams, draw, native prices and bookmaker separation',()=>{
  const cards=organizeQuotes([...complete,...complete.map(r=>({...r,selection_id:'b'+r.selection_id,bookmaker:'Book B',raw_odds:'2.00',decimal_odds:2,raw_odds_format:'decimal'}))],{market:'winner'},now);
  assert.equal(cards.length,2);assert.ok(cards.every(c=>c.complete));
  assert.deepEqual(new Set(cards.find(c=>c.bookmaker==='book-a')!.options.map(o=>o.price)),new Set(['-150','+190','+250']));
  assert.ok(cards.find(c=>c.bookmaker==='Book B')!.options.every(o=>o.price==='2.00'));assert.equal(cards[0]!.league,'Serie A Italiana');
  const missing=organizeQuotes(complete.slice(0,2),{market:'winner'},now)[0]!;assert.equal(missing.complete,false);assert.match(missing.needs.join(','),/empate/);
});

test('ordering keeps latest observations, marks stale quotes, excludes closed/conflicting prices and validates Bangkok dates',()=>{
  const cards=organizeQuotes([...complete,row({captured_at:'2026-10-10T01:00:00Z',raw_odds:'-100',decimal_odds:2})],{},now);
  assert.equal(cards[0]!.options.find(o=>o.label==='Juventus')?.price,'-150');assert.equal(cards[0]!.fresh,true);
  assert.equal(organizeQuotes(complete.map(r=>({...r,event_status:'finished'})),{},now).length,0);
  assert.equal(organizeQuotes(complete.map(r=>({...r,cross_validation:'CONFLICT'})),{},now).length,0);
  assert.equal(organizeQuotes(complete,{freshOnly:true},now+3600000).length,0);
  assert.equal(organizeQuotes(complete.map(r=>({...r,event_start_time:'2030-10-09T18:00:00Z'})),{from:'2030-10-10',to:'2030-10-10'},now).length,1);
  assert.throws(()=>validateFilters({from:'2026-02-30'}));assert.throws(()=>validateFilters({freshOnly:'true'}));
});

test('organize never queries PostgreSQL; existing extraction and final draft actions remain independent',async t=>{
  const root=await mkdtemp(join(tmpdir(),'workbench-')),app=Fastify(),actions=new UiActions(()=>{},()=>{},root);
  const queries:Array<{sql:string;values:unknown[]}>=[];
  const pool={async query(sql:string,values:unknown[]){queries.push({sql,values});return {rows:complete};}} as unknown as Pool;
  let queued=0;t.mock.method(actions,'runCountry',(sources:Source[],_force:boolean,_settings:UiSettings,exhaustive:boolean,options:CollectionOptions)=>{queued=sources.length;assert.equal(exhaustive,true);assert.equal(options?.scope,'site');assert.equal(options?.markets.length,0);return {started:queued,runIds:[]};});
  registerWorkbenchRoutes(app,pool,actions,root,()=>defaultSettings);
  try{
    assert.equal((await app.inject({method:'POST',url:'/api/workbench/extract'})).statusCode,202);assert.ok(queued>30);
    assert.equal((await app.inject({method:'POST',url:'/api/workbench/extract',payload:{textOnly:'yes'}})).statusCode,400);
    t.mock.method(actions,'runCountry',(_sources:Source[],force:boolean,_settings:UiSettings,exhaustive:boolean,options:CollectionOptions)=>{assert.equal(force,false);assert.equal(exhaustive,true);assert.equal(options.textOnly,true);assert.equal(options.maxVisionCalls,0);return {started:1,runIds:[]};});
    assert.equal((await app.inject({method:'POST',url:'/api/workbench/extract',payload:{textOnly:true}})).statusCode,202);
    const filtered=await app.inject({method:'POST',url:'/api/workbench/organize',payload:{filters:{search:"Juventus' OR 1=1 --",market:'winner'}}});assert.equal(filtered.statusCode,200);
    assert.equal(queries.length,0);assert.equal(filtered.json().total,0);
    assert.equal((await app.inject({method:'POST',url:'/api/workbench/final',payload:{ids:[]}})).statusCode,400);
    const saved=await app.inject({method:'POST',url:'/api/workbench/final',payload:{filters:{market:'winner'}}});assert.equal(saved.statusCode,200);
    const draft=saved.json();assert.equal(draft.cards.length,1);assert.equal(draft.cards[0].options.length,3);
    assert.equal(JSON.parse(await readFile(join(root,'bets',draft.id+'.json'),'utf8')).id,draft.id);
    assert.equal((await app.inject('/api/workbench/final')).json().id,draft.id);
    t.mock.method(pool,'query',async()=>({rows:complete.slice(0,2)}));assert.equal((await app.inject({method:'POST',url:'/api/workbench/final'})).statusCode,422);
  }finally{await app.close();await actions.close();await rm(root,{recursive:true,force:true});}
});

test('text-only collection scrolls beyond the viewport, persists copied text and never takes screenshots', {timeout:30000}, async()=>{
  const root=await mkdtemp(join(tmpdir(),'text-scroll-')),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:900,height:500}});
  const source={type:'fixture',url:'https://fixture.test/sports'};
  const runtime=new CollectionRuntime(new CollectionStore(root),source,validateCollection({textOnly:true,scope:'url',resume:false,maxVisionCalls:0}), 'copy-test');
  const saved:string[]=[];
  const context={source,page,browserContext:page.context(),collection:runtime,memory:null,configuration:null,timeoutMs:1800,observeMs:0,exhaustive:true} as AcquisitionContext;
  try{
    await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<main><section style="height:900px"><h2>Serie A Italiana</h2><p>Juventus vs AC Milan</p><p>Juventus -150</p><p>AC Milan +190</p></section><section style="height:450px"><h2>Contenido del final</h2><p>Texto deportivo al final que requiere desplazarse y copiar esta sección.</p></section></main>'}));
    await page.goto(source.url);assert.doesNotMatch((await copyVisibleSportsText(page)).text,/Contenido del final/);
    let shots=0;page.screenshot=async()=>{shots++;throw Error('Screenshots forbidden in text mode');};
    context.savePageCapture=async(method,result)=>{const path=await new EngineStorage(root).saveRaw(source,method,result.evidence,result.records.length);saved.push(path);return {records:result.records,rawPath:path};};
    await runtime.initialize(context);await new VisualHandler().run(context);
    assert.equal(shots,0);assert.equal(context.visualCrawl?.ocrCaptures,0);assert.equal(context.vision?.calls||0,0);assert.ok(saved.length>0);
    const texts=await Promise.all(saved.map(path=>readFile(path.replace(/\.json$/,'.txt'),'utf8')));assert.match(texts.join('\n'),/Contenido del final/);assert.match(texts.join('\n'),/-150/);
    for(const path of saved){const raw=JSON.parse(await readFile(path,'utf8'));assert.equal(raw.evidence.screenshotPath,undefined);}
  }finally{await browser.close();await rm(root,{recursive:true,force:true});}
});

test('copy waits for delayed prices, excludes form fields and writes text without screenshots',async()=>{
  const browser=await chromium.launch({headless:true}),page=await browser.newPage();const root=await mkdtemp(join(tmpdir(),'copy-evidence-'));
  const context={source:{type:'fixture',url:'https://fixture.test/'},memory:null,configuration:null,timeoutMs:2500,observeMs:0} as AcquisitionContext;
  try{
    await page.setContent('<form><input value="private credential"></form><main id="main"><div class="skeleton">Juventus vs AC Milan</div></main><script>setTimeout(()=>document.getElementById("main").innerHTML="<h2>Juventus vs AC Milan</h2><p>Juventus -150</p><p>AC Milan +190</p>",400)</script>');
    const copied=await waitForSportsContent(page,context);assert.equal(copied.ready,true);assert.match(copied.text,/-150/);assert.doesNotMatch(copied.text,/private credential/);
    const path=await new EngineStorage(root).saveRaw(context.source,'dom',{url:context.source.url,transport:'dom',capturedAt:new Date().toISOString(),payload:{records:[],copiedText:copied.text}},0);
    assert.equal(await readFile(path.replace(/\.json$/,'.txt'),'utf8'),copied.text);
    const raw=JSON.parse(await readFile(path,'utf8'));assert.ok(raw.evidence.textPath);assert.equal(raw.evidence.screenshotPath,undefined);
    await page.setContent('<main><div class="skeleton">Loading odds…</div></main>');let shots=0;const screenshot=page.screenshot.bind(page);page.screenshot=async(...args)=>{shots++;return screenshot(...args);};
    context.page=page;context.source.url='about:blank';context.timeoutMs=450;
    const result=await new VisualHandler().run(context);assert.equal(result.kind,'miss');assert.equal(shots,0);assert.equal(context.vision?.calls||0,0);
    await page.setContent('<canvas width="600" height="300"></canvas><script>const c=document.querySelector("canvas").getContext("2d");c.fillStyle="black";c.fillRect(0,0,600,300)</script>');
    const blank=await waitForSportsContent(page,context,450);assert.equal(blank.canvas,false);assert.equal(blank.ready,false);
  }finally{await browser.close();await rm(root,{recursive:true,force:true});}
});


test('saved evidence preserves native prices and scopes unproven markets and unknown houses to each evidence file', async t => {
  const root=await mkdtemp(join(tmpdir(),'saved-evidence-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const fixture=await saveEvidenceFixtures(root), index=savedEvidence(root);
  const result=await index.organize({}, {source:evidenceSource}, now);
  assert.equal(result.cards.length,7); // two events; four distinct total variants; another book
  const card=result.cards.find(c=>c.event==='Alpha vs Beta'&&c.line==='2.5'&&c.period==='full_event'&&!c.variant&&c.evidence.some(e=>e.id===fixture.multi))!;
  assert.ok(card);assert.deepEqual(card.options.map(o=>o.price).sort(),['+190','-150'].sort());
  const duplicate=card.options.find(o=>o.price==='+190')!;
  assert.deepEqual(duplicate.evidence.map(e=>e.id),[fixture.multi],'without market ID or house identity, captures cannot prove the same offer');
  assert.ok(result.cards.some(c=>c.options.some(o=>o.price==='+200')));
  assert.ok(result.cards.flatMap(c=>c.options).flatMap(o=>o.evidence).some(e=>e.id===fixture.text));
  assert.ok(duplicate.evidence.every(e=>e.capturedAt==='2020-10-10T05:00:00.000Z'));
  assert.ok(duplicate.evidence.every(e=>e.observedAt==='2026-10-10T05:59:00.000Z'));
  assert.ok(result.cards.some(c=>c.options.some(o=>o.price==='3/2'&&o.format==='fractional')));
  assert.ok(result.pending.some(p=>p.evidence.id===fixture.pending));
  assert.ok(result.pending.some(p=>p.evidence.id===fixture.unknown));
  const again=await index.organize({}, {source:evidenceSource},now+120000);
  assert.equal(again,result,'pagination reuses the organized view while files and filters are unchanged');
  const original=await readFile(fixture.paths[0]!, 'utf8');
  const fresh=await index.organize({freshOnly:true},{source:evidenceSource},now);
  assert.equal(fresh.cards.length,0,'a later observation/load never makes an old screenshot fresh');
  assert.ok(!fresh.pending.some(p=>p.evidence.id===fixture.pending),'known stale capture contradicts the freshness filter, even if unparsed');
  assert.equal(await readFile(fixture.paths[0]!, 'utf8'),original);
});

test('saved evidence filters each row/group together, separates event and capture dates, and invalidates the incremental index', async t => {
  const root=await mkdtemp(join(tmpdir(),'saved-filters-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const fixture=await saveEvidenceFixtures(root),index=savedEvidence(root);
  const mixed=await index.organize({sport:'Soccer',league:'Copa distinta'},{ids:[fixture.multi]},now);
  assert.equal(mixed.cards.length,0);assert.equal(mixed.captures.length,0);
  const tennis=await index.organize({sport:'Tennis',league:'Copa distinta',search:'Gamma',market:'winner',from:'2030-10-11',to:'2030-10-11',captureFrom:'2020-10-10',captureTo:'2020-10-10'},{ids:[fixture.multi]},now);
  assert.equal(tennis.cards.length,1);assert.equal(tennis.captures[0]!.id,fixture.multi);
  const unknown=await index.organize({from:'2030-01-01'},{ids:[fixture.unknown]},now);
  assert.equal(unknown.cards.length,0);assert.equal(unknown.pending.length,1);
  const unknownCapture=await index.organize({captureFrom:'2020-01-01'},{ids:[fixture.unknown]},now);
  assert.equal(unknownCapture.pending.length,1);
  assert.equal((await index.organize({}, {ids:[]},now)).cards.length,0);
  const raw=JSON.parse(await readFile(fixture.paths[1]!, 'utf8'));raw.evidence.payload.records[0].rawOdds='+333';
  await writeFile(fixture.paths[1]!,JSON.stringify(raw));
  const changed=await index.organize({}, {ids:[fixture.text]},now);
  assert.ok(changed.cards.some(c=>c.options.some(o=>o.price==='+333')));
  assert.throws(()=>validateFilters({captureFrom:'2026-02-30'}));
});
