import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createUiServer} from '../src/ui/server.js';
import {loadBrands} from '../src/ui/brands.js';
import {HttpHandler,NetworkHandler,VisualHandler} from '../src/engine/handlers.js';
import type {AcquisitionContext,HandlerResult} from '../src/engine/types.js';

test('explicit OCR commands retain structured acquisition first, report progress, cancel, and preserve network attribution', async t=>{
  const root=await mkdtemp(join(tmpdir(),'ui-exploration-test-'));
  let entered!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve);
  let hold=true;
  t.mock.method(HttpHandler.prototype,'run',async ():Promise<HandlerResult>=>({kind:'miss',reason:'controlled fixture'}));
  t.mock.method(NetworkHandler.prototype,'run',async (ctx:AcquisitionContext):Promise<HandlerResult>=>({kind:'data',records:[{sportsbook:ctx.source.type,eventName:'Controlled Alpha vs Beta',sourceEventId:'controlled-one',market:'Moneyline',selection:'Alpha',sourceSelectionId:'alpha',rawOdds:'1.85',decimalOdds:1.85}],evidence:{url:ctx.source.url,transport:'controlled-network',capturedAt:new Date().toISOString(),payload:{verificationFixture:true,liveSportsbook:false}}}));
  t.mock.method(VisualHandler.prototype,'run',async (ctx:AcquisitionContext):Promise<HandlerResult>=>{
    assert.equal(ctx.exhaustive,true);assert.equal(ctx.browserMode,'isolated');assert.equal(ctx.visualSeed?.method,'network');
    ctx.visualProgress?.({visited:1,pending:100,tabsOpened:1,records:1,ocrCaptures:0,url:ctx.source.url,state:'RUNNING'});entered();
    if(hold)await held;
    return {kind:'data',records:ctx.visualSeed!.records,acquisitionMethod:'network',evidence:{url:ctx.source.url,transport:'controlled-exploration',capturedAt:new Date().toISOString(),payload:{verificationFixture:true,liveSportsbook:false}}};
  });
  const server=await createUiServer({dataDir:root});
  try {
    const catalog=await loadBrands(),brand=catalog.find(b=>b.id!=='bestfightodds')!,source={type:brand.id,url:brand.regions[0]!.url};
    assert.equal((await server.app.inject({method:'POST',url:'/api/ocr/explore',payload:{type:source.type,url:'https://outside-catalog.example'}})).statusCode,400);
    const start=await server.app.inject({method:'POST',url:'/api/ocr/explore',payload:source});assert.equal(start.statusCode,202);await started;
    const status=await server.app.inject({url:'/api/ocr/status'});assert.equal(status.json()[0].exhaustive,true);assert.equal(status.json()[0].visualProgress.pending,100);assert.equal(status.json()[0].visualProgress.ocrCaptures,0);
    assert.equal((await server.app.inject({method:'POST',url:'/api/ocr/stop',payload:{}})).statusCode,202);
    release();
    const finished = async (id: string) => {
      for (let i=0;i<200;i++) { const run=server.actions.runs.get(id)!; if(run.finishedAt)return run;await new Promise(resolve=>setTimeout(resolve,5)); }
      throw Error('Exploration did not finish');
    };
    await finished(start.json().runId);hold=false;
    assert.equal((await server.app.inject({url:`/api/run/${start.json().runId}`})).json().state,'FAILED');
    assert.equal((await server.app.inject({method:'POST',url:'/api/ocr/stop',payload:{}})).statusCode,202);
    const second=await server.app.inject({method:'POST',url:'/api/ocr/explore',payload:source});assert.equal(second.statusCode,202);
    const complete=await finished(second.json().runId);assert.equal(complete.state,'SUCCEEDED');assert.equal(complete.method,'network');assert.equal(complete.records,1);
  }finally{release();await server.close();await rm(root,{recursive:true,force:true});}
});

test('current collection refuses known past or closed events and falls through to browser acquisition',async()=>{
  const {AcquisitionOrchestrator}=await import('../src/engine/orchestrator.js');
  const calls:string[]=[];
  const handlers=['http','network','dom','accessibility','visual'].map(method=>({method:method as import('../src/engine/types.js').AcquisitionMethod,async run(ctx:AcquisitionContext):Promise<HandlerResult>{
    calls.push(method);
    if(method==='http')return {kind:'data',records:[{eventName:'Past Alpha vs Beta',eventStartTime:'2020-01-01T00:00:00Z',market:'Moneyline',selection:'Alpha',decimalOdds:1.85},{eventName:'Closed Alpha vs Beta',eventStatus:'closed',market:'Moneyline',selection:'Alpha',decimalOdds:1.85}],evidence:{url:ctx.source.url,transport:'controlled-old',capturedAt:new Date().toISOString(),payload:{}}};
    if(method==='network')return {kind:'data',records:[{eventName:'Live Alpha vs Beta',eventStatus:'live',eventStartTime:'2020-01-01T00:00:00Z',market:'Moneyline',selection:'Alpha',decimalOdds:1.85}],evidence:{url:ctx.source.url,transport:'controlled-live',capturedAt:new Date().toISOString(),payload:{}}};
    return {kind:'miss',reason:'controlled fixture'};
  }}));
  const result=await new AcquisitionOrchestrator({handlers,currentOnly:true,persist:false,consoleNotifier:false}).run({type:'controlled-current-filter',url:'http://controlled-filter.test/'});
  assert.equal(result.status,'SUCCEEDED');if(result.status!=='SUCCEEDED')return;
  assert.equal(result.method,'network');assert.deepEqual(calls,['http','network']);assert.equal(result.records[0]?.eventStatus,'live');
});
