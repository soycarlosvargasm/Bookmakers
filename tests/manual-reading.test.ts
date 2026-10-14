import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,type BrowserContext} from 'playwright';
import {ManualReading} from '../src/ui/manual-reading.js';
import {EngineStorage} from '../src/engine/storage.js';
import {scanScrollRegions} from '../src/visual/exploration.js';
import {revealLazyContent} from '../src/dom/browser.js';
import {captureVisibleDom} from '../src/dom/browser.js';
import {selectedManualView} from '../src/ui/manual-controls.js';
import {UiActions,defaultSettings} from '../src/ui/actions.js';
import {createUiServer} from '../src/ui/server.js';
import type {AcquisitionContext} from '../src/engine/types.js';

const source={type:'manual-fixture',url:'https://manual-fixture.test/sports'};
const html='<main><section style="height:1000px"><h2>Alpha vs Beta</h2><p>Alpha -150</p><p>Beta +190</p></section><section style="height:1000px"><h2>Gamma vs Delta</h2><p>Gamma 3/2</p><p>Delta 2.50</p></section></main>';
const waitFor=async(test:()=>boolean)=>{const start=Date.now();while(!test()){if(Date.now()-start>2500)throw Error('Timed out');await new Promise(resolve=>setTimeout(resolve,10));}};

test('manual reading moves only when the user scrolls, saves visible text, and stops without losing saved RAW',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-text-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:900,height:500}});
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  const controller=new AbortController(),session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},async()=>context);
  const running=session.run().catch(error=>error);await waitFor(()=>session.ready);
  const page=context.pages()[0]!;let shots=0;page.screenshot=async()=>{shots++;throw Error('No screenshot in manual text mode');};
  assert.equal(await page.evaluate(()=>scrollY),0);assert.deepEqual(await readdir(join(root,'raw')).catch(()=>[]),[]);
  const first=await session.read();assert.equal(first.saved,true);assert.equal(await page.evaluate(()=>scrollY),0);
  const raw=JSON.parse(await readFile(join(root,'raw',`${first.captureId}.json`),'utf8'));assert.match(raw.evidence.payload.copiedText,/Alpha/);assert.doesNotMatch(raw.evidence.payload.copiedText,/Gamma/);assert.equal(raw.evidence.payload.scrollMode,'manual');assert.equal(raw.evidence.screenshotPath,undefined);
  assert.equal((await session.read()).saved,false);
  // This is the user's explicit displacement, not collector code.
  await page.evaluate(()=>window.scrollTo(0,750));const second=await session.read();assert.equal(second.savedViews,2);assert.equal(await page.evaluate(()=>scrollY),750);
  assert.match(await readFile(join(root,'raw',`${second.captureId}.txt`),'utf8'),/Gamma/);
  assert.doesNotMatch(await readFile(join(root,'raw',`${second.captureId}.txt`),'utf8'),/Alpha/,'offscreen text in a partly visible container is excluded');
  controller.abort(Error('Detenido por el usuario'));await running;assert.equal(session.ready,false);assert.equal(context.pages().length,0);
  await assert.rejects(session.read(),/Detenido/);assert.equal(shots,0);assert.equal((await readdir(join(root,'raw'))).filter(f=>f.endsWith('.json')).length,2);
});

test('Stop cancels manual opening promptly and closes a late browser without starting navigation',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-opening-'));t.after(()=>rm(root,{recursive:true,force:true}));
  let release!:(c:BrowserContext)=>void,closed=0,newPages=0;
  const opening=new Promise<BrowserContext>(resolve=>{release=resolve;});
  const controller=new AbortController(),session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},()=>opening);
  const running=session.run();controller.abort(Error('Detenido'));await assert.rejects(running,/Detenido/);
  release({browser:()=>null,close:async()=>{closed++;},newPage:async()=>{newPages++;throw Error('Must not navigate');}} as unknown as BrowserContext);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(closed,1);assert.equal(newPages,0);
});

test('Stop waits for a text save already started and reports its completed view',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-writing-')),browser=await chromium.launch({headless:true}),context=await browser.newContext();
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  const storage=new EngineStorage(root),save=storage.saveRaw.bind(storage);
  let release!:()=>void,started=false;
  const held=new Promise<void>(resolve=>{release=resolve;});
  t.mock.method(storage,'saveRaw',async(...args:Parameters<EngineStorage['saveRaw']>)=>{started=true;await held;return save(...args);});
  const controller=new AbortController(),session=new ManualReading(source,controller.signal,storage,()=>{},async()=>context);
  let finished=false;const running=session.run().catch(()=>{}).finally(()=>{finished=true;});
  await waitFor(()=>session.ready);const reading=session.read();await waitFor(()=>started);
  controller.abort(Error('Detenido'));await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);
  release();assert.equal((await reading).saved,true);await running;assert.equal(session.savedViews,1);
  assert.equal((await readdir(join(root,'raw'))).filter(f=>f.endsWith('.json')).length,1);
});

test('automatic scroll does not perform its next movement or reset after cancellation',async t=>{
  const browser=await chromium.launch({headless:true}),page=await browser.newPage();t.after(()=>browser.close());await page.setContent(html);
  const controller=new AbortController();let moved=0;
  const evaluate=page.evaluate.bind(page);page.evaluate=(async(...args:any[])=>{moved++;return (evaluate as any)(...args);}) as typeof page.evaluate;
  const context={signal:controller.signal,source,memory:null,configuration:null,timeoutMs:1000,observeMs:0} as AcquisitionContext;
  let afterCapture=0;
  await assert.rejects(scanScrollRegions(page,context,async()=>{controller.abort(Error('Detenido'));afterCapture=moved;}),/Detenido/);
  assert.equal(moved,afterCapture,'no next movement after the capture callback aborts');
  moved=0;await assert.rejects(revealLazyContent(page,{signal:controller.signal}),/Detenido/);assert.equal(moved,0);
});

test('manual reading participates in the same stop/status lifecycle and API validates the mode',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-api-')),server=await createUiServer({dataDir:root});
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  t.mock.method(ManualReading.prototype,'run',async function(this:ManualReading){await held;});
  t.mock.method(ManualReading.prototype,'read',async()=>({saved:true,savedViews:1}));
  t.after(async()=>{release();await server.close();await rm(root,{recursive:true,force:true});});
  const begin=await server.app.inject({method:'POST',url:'/api/workbench/extract',payload:{textOnly:true,scrollMode:'manual',url:source.url}});assert.equal(begin.statusCode,202);
  const runId=begin.json().runId;assert.ok(runId);assert.equal((await server.app.inject('/api/status')).json().busy,true);
  assert.equal((await server.app.inject('/api/ocr/status')).json()[0].runId,runId);
  const saved=await server.app.inject({method:'POST',url:'/api/workbench/manual/read',payload:{runId}});assert.equal(saved.json().saved,true);
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/extract',payload:{scrollMode:'invalid'}})).statusCode,400);
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/extract',payload:{textOnly:false,scrollMode:'manual',url:source.url}})).statusCode,400);
  const stopped=await server.app.inject({method:'POST',url:'/api/stop'});assert.equal(stopped.statusCode,202);assert.equal(stopped.json().stopped,1);
  release();await waitFor(()=>Boolean(server.actions.runs.get(runId)?.finishedAt));assert.equal((await server.app.inject('/api/status')).json().busy,false);
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/manual/read',payload:{runId}})).statusCode,409);
});

const cardsHtml='<main><article style="height:600px"><h3>Alpha vs Beta</h3><section><h4>Moneyline</h4><button>Alpha -150</button><button>Beta +190</button></section></article><article style="height:600px"><h3>Gamma vs Delta</h3><section><h4>Moneyline</h4><button>Gamma 1.65</button><button>Delta 2.30</button></section></article><p style="height:400px">Noticias del club</p></main>';
/** Mimics RenzoChromePage: string expressions, cached URL, collector-owned close. */
const renzoLike=(page:import('playwright').Page,closed:{count:number})=>({
  url:()=>page.url(),isClosed:()=>page.isClosed(),
  evaluate:(expression:any,argument?:any)=>typeof expression==='string'?page.evaluate(expression):page.evaluate(expression,argument),
  goto:(url:string,options?:any)=>page.goto(url,options),close:async()=>{closed.count++;await page.close();}
}) as unknown as import('../src/ui/manual-reading.js').ManualPage;

test('manual reading on a Renzo-like page extracts only the cards inside the viewport, keeps unparsed views pending, and closes just the collector tab',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-renzo-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:900,height:500}});
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:cardsHtml}));
  await context.route('https://sub.manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<main><article><h3>Sub vs Page</h3><section><h4>Winner</h4><button>Sub 1.10</button></section></article></main>'}));
  await context.route('https://other.test/**',route=>route.fulfill({contentType:'text/html',body:'<main><article><h3>Other vs Site</h3><section><h4>Winner</h4><button>Other 1.50</button></section></article></main>'}));
  const page=await context.newPage(),closed={count:0};
  const controller=new AbortController(),session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},async()=>renzoLike(page,closed),{allowedHosts:['https://www.manual-fixture.test/other-region']});
  const running=session.run().catch(error=>error);await waitFor(()=>session.ready);
  assert.equal(session.browser,'test');assert.deepEqual(session.allowedHosts,['manual-fixture.test']);assert.equal(session.status.url,source.url);
  const first=await session.read();
  assert.equal(first.saved,true);assert.equal(first.records,2,'only the visible card is extracted');assert.equal(first.pendingViews,0);
  const raw=JSON.parse(await readFile(join(root,'raw',`${first.captureId}.json`),'utf8'));
  assert.deepEqual(raw.evidence.payload.records.map((r:any)=>[r.eventName,r.market,r.selection,r.rawOdds,r.rawOddsFormat]),[['Alpha vs Beta','Moneyline','Alpha','-150','american'],['Alpha vs Beta','Moneyline','Beta','+190','american']]);
  assert.equal(raw.recordCount,2);assert.equal(raw.evidence.transport,'manual-visible-text');assert.equal(raw.evidence.payload.viewportOnly,true);assert.doesNotMatch(raw.evidence.payload.copiedText,/Gamma/);
  assert.equal(await page.evaluate(()=>scrollY),0,'the collector never scrolls');
  // The user scrolls to the second card.
  await page.evaluate(()=>window.scrollTo(0,620));const second=await session.read();
  assert.equal(second.records,2);assert.equal(second.totalRecords,4);assert.equal(second.savedViews,2);
  const secondRaw=JSON.parse(await readFile(join(root,'raw',`${second.captureId}.json`),'utf8'));
  assert.deepEqual(secondRaw.evidence.payload.records.map((r:any)=>r.selection),['Gamma','Delta']);
  // A view without a demonstrable card stays pending with a concrete reason.
  await page.evaluate(()=>window.scrollTo(0,1300));const third=await session.read();
  assert.equal(third.saved,true);assert.equal(third.records,0);assert.equal(third.pendingViews,1);assert.match(third.reason!,/Sin cuotas extraídas/);
  assert.match(JSON.parse(await readFile(join(root,'raw',`${third.captureId}.json`),'utf8')).evidence.payload.pendingReason,/pendiente de interpretación/);
  // Legitimate redirects inside the same source are admitted; other sites are refused explicitly.
  await page.goto('https://sub.manual-fixture.test/live');const sub=await session.read();assert.equal(sub.records,1);
  await page.goto('https://other.test/sports');await assert.rejects(session.read(),/Destinos admitidos: manual-fixture.test/);
  await waitFor(()=>session.status.url==='https://other.test/sports');
  controller.abort(Error('Detenido por el usuario'));await running;
  assert.equal(closed.count,1,'only the collector tab is closed');assert.equal(session.ready,false);
  assert.equal((await readdir(join(root,'raw'))).filter(f=>f.endsWith('.json')).length,4);
});

test('a failed Chrome Renzo connection is reported as the real cause and never replaced by a test browser',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-renzo-fail-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const controller=new AbortController();
  const session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},async()=>{throw new Error('No se pudo conectar Chrome Renzo: Abre el Chrome personal con Renzo.');});
  await assert.rejects(session.run(),/Chrome Renzo/);assert.equal(session.opened,false);assert.equal(session.ready,false);
  assert.deepEqual(await readdir(join(root,'raw')).catch(()=>[]),[]);
});

test('the run only succeeds with extracted odds; text-only sessions finish as pending',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-run-state-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:900,height:500}});
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  t.mock.method(ManualReading.prototype as any,'openPage',async function(this:any){return renzoLike(await context.newPage(),{count:0});});
  const actions=new UiActions(()=>{},()=>{},root);
  const info=actions.startManualReading(source,['manual-fixture.test']);
  await waitFor(()=>Boolean(info.manualReading?.ready));assert.equal(info.browserMode,'renzo');
  const read=await actions.readManualText(info.runId);assert.equal(read.saved,true);assert.equal(read.records,0);
  await actions.stopRuns();await waitFor(()=>Boolean(info.finishedAt));
  assert.equal(info.state,'SKIPPED');assert.match(info.reason!,/0 cuotas extraídas: pendiente de interpretación/);assert.equal(info.manualReading?.savedViews,1);assert.equal(info.records,0);
});

test('Terminar sesión manual ends the session cleanly, keeps what was saved and closes only the collector tab',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-finish-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:900,height:500}});
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body:cardsHtml}));
  const page=await context.newPage(),closed={count:0};
  const controller=new AbortController(),session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},async()=>renzoLike(page,closed));
  const running=session.run();await waitFor(()=>session.ready);
  const read=await session.read();assert.equal(read.records,2);
  const started=Date.now();session.finish();
  await running;
  assert.ok(Date.now()-started<1500,'finishing does not wait for the polling interval');
  assert.equal(session.finished,true);assert.equal(session.ready,false);assert.equal(closed.count,1);assert.equal(controller.signal.aborted,false,'finishing is not a stop');
  assert.equal((await readdir(join(root,'raw'))).filter(f=>f.endsWith('.json')).length,1);
});

test('the finish endpoint exists and rejects when no manual session is active',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-finish-api-')),server=await createUiServer({dataDir:root});
  t.after(async()=>{await server.close();await rm(root,{recursive:true,force:true});});
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/manual/finish',payload:{}})).statusCode,400);
  assert.equal((await server.app.inject({method:'POST',url:'/api/workbench/manual/finish',payload:{runId:'none'}})).statusCode,409);
});

test('the floating controls pause, select real content, resume, confirm a durable save and finish the actual manual session',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-controls-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1000,height:500}});
  t.after(async()=>{await browser.close();await rm(root,{recursive:true,force:true});});
  const card=(home:string,away:string)=>`<article style="width:300px;flex:none"><h3>${home} vs ${away}</h3><section><h4>Moneyline</h4><button>${home} 1.65</button><button>${away} 2.30</button></section></article>`;
  const body=`<main><div style="height:700px;display:flex;gap:80px">${card('Alpha','Beta')}${card('Outside','Excluded')}</div><div style="height:700px;display:flex;gap:80px">${card('Gamma','Delta')}${card('OutsideTwo','ExcludedTwo')}</div></main>`;
  await context.route('https://manual-fixture.test/**',route=>route.fulfill({contentType:'text/html',body}));
  const page=await context.newPage(),closed={count:0},controller=new AbortController();
  const session=new ManualReading(source,controller.signal,new EngineStorage(root),()=>{},async()=>renzoLike(page,closed));
  const running=session.run();
  t.after(async()=>{controller.abort();await running.catch(()=>{});});
  await waitFor(()=>session.ready);
  const toolbar=page.getByRole('toolbar',{name:'Scroll Manual'});
  await toolbar.waitFor();
  assert.equal(await toolbar.getByRole('button').count(),4);
  await toolbar.getByRole('button',{name:'Ⅱ PAUSAR'}).click();
  await waitFor(()=>!session.captureActive);
  await page.locator('sportsbook-manual-control').evaluate(host=>host.remove());
  await toolbar.waitFor({timeout:2500});
  assert.equal(session.captureActive,false,'restoring a removed toolbar preserves the actual paused state');
  await page.goto(source.url+'?navigation=1');
  await toolbar.waitFor({timeout:2500});
  await toolbar.getByRole('button',{name:'▶ ACTIVAR'}).waitFor();
  await toolbar.getByRole('button',{name:'▣ SELECCIONAR'}).click();
  await page.mouse.move(5,5);await page.mouse.down();await page.mouse.move(315,450);await page.mouse.up();
  await waitFor(()=>Boolean(session.selection));
  assert.equal(session.savedViews,0);
  await toolbar.getByRole('button',{name:'▶ ACTIVAR'}).click();
  await waitFor(()=>session.savedViews===1);
  assert.equal(session.records,2);assert.equal(session.newRecords,2);
  assert.equal(session.status.lastCapture?.records,2);
  assert.match(session.status.lastCapture?.textPreview??'',/Alpha/);
  await toolbar.getByRole('button',{name:'Ⅱ PAUSAR'}).click();await waitFor(()=>!session.captureActive);
  await page.evaluate(()=>scrollTo(0,700));
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.equal(session.savedViews,1,'scrolling while paused cannot create captures');
  await toolbar.getByRole('button',{name:'▶ ACTIVAR'}).click();
  await waitFor(()=>session.savedViews===2);
  assert.equal(session.records,4);assert.equal(session.newRecords,4);
  const files=(await readdir(join(root,'raw'))).filter(file=>file.endsWith('.json'));
  for(const file of files){
    const raw=JSON.parse(await readFile(join(root,'raw',file),'utf8'));
    assert.doesNotMatch(raw.evidence.payload.copiedText,/Outside|Excluded|CAPTURANDO|GUARDAR/);
    assert.equal(raw.evidence.payload.selectionRegion.width,310);
    assert.equal(raw.evidence.payload.records.length,2);
    assert.ok(raw.evidence.payload.records.every((record:{eventName:string})=>!/Outside|Excluded/.test(record.eventName)));
  }
  await toolbar.getByRole('button',{name:'💾 GUARDAR'}).click();
  await waitFor(()=>Boolean(session.status.lastSavedAt));
  await toolbar.getByRole('button',{name:'GUARDADO ✓'}).waitFor();
  assert.equal(session.savedViews,2,'saving does not duplicate the already captured view');
  assert.equal(session.newRecords,4);
  assert.equal(await page.evaluate(()=>scrollY),700,'no control performs automatic scroll');
  // Dragging pins the bar; normal website clicks remain available outside it.
  const grip=toolbar.locator('.info'),box=(await grip.boundingBox())!;
  await page.mouse.move(box.x+10,box.y+5);await page.mouse.down();await page.mouse.move(800,460);await page.mouse.up();
  const pinned=(await toolbar.boundingBox())!;
  await page.mouse.move(50,250);await new Promise(resolve=>setTimeout(resolve,50));
  assert.deepEqual(await toolbar.boundingBox(),pinned);
  await page.locator('article').nth(2).getByRole('button',{name:'Gamma 1.65'}).click();
  await grip.dblclick();await page.mouse.move(850,30);await new Promise(resolve=>setTimeout(resolve,50));
  assert.notDeepEqual(await toolbar.boundingBox(),pinned,'double-click restores following the cursor');
  await toolbar.getByRole('button',{name:'✕ TERMINAR'}).click();
  await running;
  assert.equal(session.finished,true);assert.equal(page.isClosed(),true);assert.equal(closed.count,1);
  assert.equal((await readdir(join(root,'raw'))).filter(file=>file.endsWith('.json')).length,2);
});

test('selection cannot copy text outside the zone or turn a partially clipped price into a different price',async t=>{
  const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:900,height:500}});
  t.after(()=>browser.close());
  await page.setContent('<main><article><h3>Alpha vs Beta</h3><section><h4>Moneyline</h4><span id="offer">Alpha 1.42</span></section></article><p style="margin-left:500px">Outside 9.99</p></main>');
  const cutoff=await page.evaluate(()=>{
    const text=document.querySelector('#offer')!.firstChild!,value=text.textContent!,range=document.createRange();
    const start=value.indexOf('1.42');range.setStart(text,start);range.setEnd(text,start+3);
    return range.getBoundingClientRect().right;
  });
  const snapshot=await captureVisibleDom(page,{viewportOnly:true,maxDepth:30});
  const scoped=await selectedManualView(page,snapshot,{x:0,y:0,width:cutoff,height:400});
  assert.match(scoped.text,/Alpha/);
  assert.doesNotMatch(scoped.text,/1\.4|Outside|9\.99/);
  assert.doesNotMatch(JSON.stringify(scoped.tree),/1\.4|Outside|9\.99/);
});

test('manual BestFightOdds uses the existing table profile, retains real book-column context and never reads offscreen prices',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-bfo-')),browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:900,height:500}});
  const controller=new AbortController();
  t.after(async()=>{controller.abort();await browser.close();await rm(root,{recursive:true,force:true});});
  const html='<div class="table-div"><h2>UFC Test Odds</h2><table class="odds-table"><thead style="position:absolute;top:-1000px"><tr><th data-b="1"><a>Betway</a></th><th data-b="2"><a>Pinnacle</a></th></tr></thead><tbody><tr><th><a data-mu="42">Alpha</a></th><td data-li="[1,1,42]">-150</td><td data-li="[2,1,42]">-160</td></tr><tr><th><a data-mu="42">Beta</a></th><td data-li="[1,2,42]">+190</td><td data-li="[2,2,42]">+180</td></tr><tr style="transform:translateY(800px)"><th><a data-mu="77">Outside</a></th><td data-li="[1,1,77]">-999</td></tr><tr style="transform:translateY(800px)"><th><a data-mu="77">Excluded</a></th><td data-li="[1,2,77]">+888</td></tr></tbody></table></div>';
  await context.route('https://www.bestfightodds.com/**',route=>route.fulfill({contentType:'text/html',body:html}));
  const session=new ManualReading({type:'bestfightodds',url:'https://www.bestfightodds.com/'},controller.signal,new EngineStorage(root),()=>{},async()=>context);
  const running=session.run();t.after(()=>running.catch(()=>{}));await waitFor(()=>session.ready);
  const first=await session.read();assert.equal(first.records,4);
  let raw=JSON.parse(await readFile(join(root,'raw',`${first.captureId}.json`),'utf8'));
  assert.deepEqual(raw.evidence.payload.records.map((row:{rawOdds:string})=>row.rawOdds).sort(),['+180','+190','-150','-160'].sort());
  assert.ok(raw.evidence.payload.records.every((row:{qualifiers:{profileVersion:string}})=>row.qualifiers.profileVersion==='bestfightodds-dom-v3'));
  assert.doesNotMatch(JSON.stringify(raw.evidence.payload.dom),/-999|\+888/);
  const page=context.pages()[0]!;
  const right=await page.locator('td').first().evaluate(element=>element.getBoundingClientRect().right);
  session.selection={x:0,y:0,width:right,height:500};
  const second=await session.read();assert.equal(second.records,2);
  raw=JSON.parse(await readFile(join(root,'raw',`${second.captureId}.json`),'utf8'));
  assert.ok(raw.evidence.payload.records.every((row:{bookmaker:string})=>row.bookmaker==='betway'));
  assert.doesNotMatch(JSON.stringify(raw.evidence.payload.dom),/-160|\+180|-999|\+888/);
  session.finish();await running;
});
