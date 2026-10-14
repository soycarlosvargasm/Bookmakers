import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('Stop inside a verification, the header and the legacy control share one cancellation and wait for idle confirmation',async()=>{
  const elements=new Map<string,any>(),events:string[]=[],posts:string[]=[];
  let stopping=false,checks=0;
  const element=(selector:string)=>{
    if(!elements.has(selector))elements.set(selector,{
      value:'',checked:false,disabled:false,open:false,textContent:'',innerHTML:'',style:{},
      classList:{add(){},remove(){},toggle(){}},dataset:{},querySelectorAll:()=>[],addEventListener(){},append(){},focus(){},setAttribute(){},
      showModal(){this.open=true;},close(){this.open=false;},
    });return elements.get(selector);
  };
  class CustomEvent{constructor(public type:string,public init?:any){}get detail(){return this.init?.detail;}}
  const status=()=>({running:false,starting:false,stopping:stopping&&checks<2,busy:!stopping||checks<2,
    warnings:[],recordsToday:0,changesToday:0,today:'2026-10-12',timezone:'Asia/Bangkok',
    challenges:stopping?[]:[{runId:'http-one',id:'verification',source:{type:'fixture',url:'https://fixture.test'},url:'https://fixture.test',prompt:true,browserMode:'isolated'}]});
  const window:any={collectorFreshness:{countryView:(v:unknown)=>v},addEventListener(){}};
  runInNewContext(await readFile('public/ui/app.js','utf8'),{
    window,document:{querySelector:element,querySelectorAll:()=>[],createElement:()=>element('created'),addEventListener(){},dispatchEvent:(event:CustomEvent)=>{events.push(event.type);}},
    CustomEvent,AbortController,Date,Map,Set,EventSource:class{addEventListener(){}},
    setInterval:()=>0,clearTimeout,setTimeout:(callback:()=>void,delay:number)=>{const timer=setTimeout(callback,delay);if(delay>1000)timer.unref();return timer;},
    fetch:async(path:string,options?:any)=>{
      if(options?.method==='POST'){posts.push(path);stopping=true;return {ok:true,text:async()=>JSON.stringify({stopped:3})};}
      if(path==='/api/status'&&stopping)checks++;
      const value=path==='/api/status'?status():['/api/brands','/api/countries','/api/ocr/status','/api/logs'].includes(path)?[]:
        path==='/api/changes/today'?{rows:[],files:[]}:path==='/api/settings'?{intervalMinutes:15,timeoutSeconds:180,delaySeconds:0}:
        path==='/api/ocr/vision'?{configured:false,usage:{requests:0,acceptedQuotes:0,inputTokens:0,outputTokens:0}}:{languages:[]};
      return {ok:true,text:async()=>JSON.stringify(value)};
    },
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(element('#challengeDialog').open,true);
  assert.equal(element('#ocrStop').disabled,false,'an HTTP capture is stoppable even when the old OCR status is empty');
  element('#challengeStop').onclick();
  const completion=window.stopCollector();
  element('#stopScheduler').onclick();element('#ocrStop').onclick();
  assert.equal(element('#challengeDialog').open,false);
  const result=await completion;
  assert.deepEqual(posts,['/api/stop']);assert.equal(result.confirmed,true);assert.ok(checks>=2);
  // Navigation emits its own section event at start-up; only the cancellation sequence is under test here.
  assert.deepEqual(events.filter(name=>name.startsWith('collector-stop-')),['collector-stop-requested','collector-stop-finished']);
  assert.ok(events.every(name=>name.startsWith('collector-stop-')||name==='collector-section-changed'),`unexpected events: ${events.join(', ')}`);
  assert.match(element('#toast').textContent,/Captura detenida/);
  assert.equal(element('#stopScheduler').disabled,true);
  assert.equal(element('#ocrStop').disabled,true);
});
