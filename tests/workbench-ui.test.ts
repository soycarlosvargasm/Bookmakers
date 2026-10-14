import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Exercise the actual controller without opening the administrator in a browser.
test('organize clears changed/failed results and ignores both stale successes and stale errors', async () => {
  const elements = new Map<string, any>(), listeners = new Map<string, () => void>();
  let form: Record<string,string> = {sport:'Soccer',market:'all'};
  const element = (selector:string) => {
    if (!elements.has(selector)) elements.set(selector,{value:'all',checked:true,disabled:false,innerHTML:'',textContent:'',click(){},addEventListener(name:string,fn:()=>void){listeners.set(`${selector}:${name}`,fn);}});
    return elements.get(selector);
  };
  const calls: Array<{resolve:(value:unknown)=>void;reject:(error:Error)=>void}> = [];
  runInNewContext(await readFile('public/ui/workbench.js','utf8'),{
    document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(name:string,fn:()=>void)=>listeners.set(name,fn)},
    window:{captureReview:()=>({source:{type:'saved',url:'https://saved.test/'},captureIds:['capture-one']})},
    FormData:class { *[Symbol.iterator](){yield* Object.entries(form);} },
    fetch:(path:string)=>path==='/api/status'||path==='/api/ocr/status'?Promise.resolve({ok:true,json:async()=>path==='/api/ocr/status'?[]:{}}):new Promise((resolve,reject)=>calls.push({resolve,reject})),
    setInterval:()=>0,Date,Set,FormDataEvent:class {},
  });
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const submit=()=>element('#workbenchFilters').onsubmit({preventDefault(){}});
  const result={cards:[],pending:[],total:0,pendingTotal:0,captureTotal:1};
  const succeed=(index:number)=>calls[index]!.resolve({ok:true,json:async()=>result});
  submit();succeed(0);await flush();assert.match(element('#workbenchMatches').innerHTML,/No hay partidos/);
  form={...form,sport:'Tennis'};listeners.get('#workbenchFilters:input')!();assert.equal(element('#workbenchMatches').innerHTML,'');assert.equal(element('#workbenchNext').disabled,true);
  submit();submit();calls[1]!.reject(Error('stale failure'));await flush();assert.match(element('#workbenchStatus').textContent,/Organizando/);
  succeed(2);await flush();assert.match(element('#workbenchStatus').textContent,/0 mercados/);
  submit();listeners.get('capture-review-changed')!();succeed(3);await flush();assert.equal(element('#workbenchMatches').innerHTML,'');assert.match(element('#workbenchStatus').textContent,/Selección modificada/);
  submit();calls[4]!.reject(Error('consulta fallida'));await flush();assert.equal(element('#workbenchMatches').innerHTML,'');assert.equal(element('#workbenchPending').innerHTML,'');assert.equal(element('#workbenchStatus').textContent,'consulta fallida');assert.equal(element('#workbenchPrev').disabled,true);
});

test('the visible Stop button cancels directly even when the legacy hidden control is disabled',async()=>{
  const elements=new Map<string,any>();let busy=true;const calls:Array<{path:string;body:any}>=[];
  const element=(selector:string)=>{
    if(!elements.has(selector))elements.set(selector,{value:selector==='#collectionScrollMode'?'auto':selector==='#collectionReadMode'?'text':'',checked:true,disabled:selector==='#ocrStop',innerHTML:'',textContent:'',addEventListener(){},click(){throw Error('Do not delegate Stop to a hidden button');}});
    return elements.get(selector);
  };
  const sandbox:any={document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},window:{collectorControls:{target:()=>({type:'fixture',url:element('#ocrUrl').value})}},FormData:class{},setInterval:()=>0,Date,Set,AbortController,setTimeout,clearTimeout,
    fetch:async(path:string,options:any)=>{
      if(options?.method==='POST'){calls.push({path,body:JSON.parse(options.body)});if(path==='/api/stop')busy=false;}
      return {ok:true,json:async()=>path==='/api/status'?{busy}:path==='/api/ocr/status'?busy?[{runId:'manual-one',manualReading:{ready:true,savedViews:0}}]:[]:path==='/api/stop'?{stopped:1}:path==='/api/workbench/extract'?{runId:'manual-one'}:{saved:true,savedViews:1}};
    }};
  runInNewContext(await readFile('public/ui/workbench.js','utf8'),sandbox);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(element('#ocrStop').disabled,true);assert.equal(element('#workbenchStop').disabled,false);
  await element('#workbenchStop').onclick();assert.equal(calls[0]?.path,'/api/stop');assert.equal(element('#workbenchStop').disabled,true);assert.match(element('#workbenchRunning').textContent,/Sin recorrido/);
  element('#collectionScrollMode').value='manual';element('#collectionScrollMode').onchange();assert.equal(element('#workbenchManualControls').hidden,false);assert.equal(element('#collectionReadMode').disabled,true);
  element('#ocrMode').value='url';element('#ocrUrl').value='https://manual-fixture.test/sports';await sandbox.window.startWorkbenchExtraction();
  assert.deepEqual(calls[1],{path:'/api/workbench/extract',body:{textOnly:true,scrollMode:'manual',url:'https://manual-fixture.test/sports'}});
});

test('the primary extraction button respects page, country and exact URL instead of collecting the whole catalog',async()=>{
  const elements=new Map<string,any>(),calls:Array<{path:string;body:any}>=[];
  const element=(selector:string)=>{
    if(!elements.has(selector))elements.set(selector,{value:selector==='#collectionScrollMode'?'auto':selector==='#collectionReadMode'?'text':'',checked:true,disabled:false,innerHTML:'',textContent:'',addEventListener(){}});
    return elements.get(selector);
  };
  const selection={scope:'site',textOnly:true,urls:[],maxVisionCalls:20};
  const window:any={collectorControls:{target:()=>element('#ocrMode').value==='url'?{url:element('#ocrUrl').value,type:'custom-saved.test'}:{url:'https://selected-source.test/sports',type:'selected-source'},forRun:()=>selection}};
  runInNewContext(await readFile('public/ui/workbench.js','utf8'),{window,document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},FormData:class{},setInterval:()=>0,Date,Set,
    fetch:async(path:string,options:any)=>{if(options?.method==='POST')calls.push({path,body:JSON.parse(options.body)});return {ok:true,json:async()=>path==='/api/ocr/status'?[]:{}};}});
  element('#ocrMode').value='source';await window.startWorkbenchExtraction();
  assert.equal(calls[0]?.path,'/api/ocr/explore');assert.equal(calls[0]?.body.url,'https://selected-source.test/sports');assert.equal(calls[0]?.body.type,'selected-source');assert.equal(calls[0]?.body.collection.maxVisionCalls,0);
  element('#ocrMode').value='country';element('#ocrCountry').value='mx';await window.startWorkbenchExtraction();
  assert.equal(calls[1]?.path,'/api/ocr/explore-country');assert.equal(calls[1]?.body.country,'mx');
  element('#ocrMode').value='url';element('#ocrUrl').value='https://saved.test/one-page';await window.startWorkbenchExtraction();
  assert.equal(calls[2]?.path,'/api/ocr/explore-url');assert.equal(calls[2]?.body.url,'https://saved.test/one-page');assert.equal(calls[2]?.body.collection.scope,'url');
  element('#collectionScrollMode').value='manual';element('#ocrMode').value='country';await window.startWorkbenchExtraction();
  assert.equal(calls.length,3);assert.match(element('#workbenchExtractStatus').textContent,/Para scroll manual/);
});

test('matchup cards show original option payouts by house and keep unrelated metadata out of the visible catalog',async()=>{
  const elements=new Map<string,any>();const element=(selector:string)=>{if(!elements.has(selector))elements.set(selector,{value:'all',checked:true,disabled:false,innerHTML:'',textContent:'',click(){},addEventListener(){}});return elements.get(selector);};
  const evidence={id:'fixture',file:'fixture.json',row:0,images:[],hasText:true,capturedAt:'2026-10-12T05:00:00Z'};
  const market={id:'market',market:'1X2',period:'regular_time',line:null,variant:'lineup: NOT_VISIBLE_LINEUP; injuries: NOT_VISIBLE_INJURIES; stats: NOT_VISIBLE_STATS',options:['Real Madrid','Empate','Barcelona'].map((label,i)=>({label,price:['+180','2.80','9/5'][i],format:['american','decimal','fractional'][i],offerId:'offer-'+i,bookmaker:'Casa Uno',source:'fixture',latest:true,temporalUncertainty:false,variant:'selection.news: NOT_VISIBLE_NEWS',evidence:[evidence]}))};
  const result={cards:[],events:[{id:'event',event:'Real Madrid vs. Barcelona',sport:'Soccer',territory:{value:{displayName:'España'}},competition:null,participants:[],organization:null,card:null,season:null,start:null,eventType:'matchup',scheduleHistory:[],missing:[],conflicts:[],markets:[market]}],total:1,eventTotal:1,pending:[],pendingTotal:0,captureTotal:1};
  runInNewContext(await readFile('public/ui/workbench.js','utf8'),{document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},window:{captureReview:()=>({})},FormData:class{*[Symbol.iterator](){yield ['market','all'];}},setInterval:()=>0,Date,Set,fetch:async(path:string)=>({ok:true,json:async()=>path==='/api/workbench/organize'?result:path==='/api/ocr/status'?[]:{}})});
  element('#workbenchFilters').onsubmit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));const markup=element('#workbenchMatches').innerHTML;
  for(const expected of ['Real Madrid vs. Barcelona','Real Madrid','Empate','Barcelona','+180','2.80','9/5','Casa Uno','data-collection-capture="fixture"'])assert.ok(markup.includes(expected));
  assert.doesNotMatch(markup,/NOT_VISIBLE_/);
});
