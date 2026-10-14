import assert from "node:assert/strict";
import { test } from "node:test";
import { detectOdds, extractRenderedDom, type DomNode } from "../src/dom/extractor.js";
import { sanitizeRawPayload } from "../src/collectors/raw-policy.js";

const node=(tag:string,text:string,path:string,children:DomNode[]=[],attrs:Record<string,string>={}):DomNode=>({tag,text,path,children,attrs});
const fixture=():DomNode=>node("body","Tigers vs Lions Match Winner Tigers 1.85 Lions +150", "body",[
  node("section","Tigers vs Lions Match Winner Tigers 1.85 Lions +150","body/section:1",[
    node("h2","Tigers vs Lions","body/section:1/h2:1",[],{"data-event-id":"evt-9"}),
    node("div","Match Winner Tigers 1.85 Lions +150","body/section:1/div:2",[
      node("h3","Match Winner","body/section:1/div:2/h3:1"),
      node("button","Tigers 1.85","body/section:1/div:2/button:2"),
      node("button","Lions +150","body/section:1/div:2/button:3")
    ])
  ])
]);

test("recognises decimal, American and fractional odds without treating scores as prices",()=>{
  assert.deepEqual(detectOdds("1.85 +150 5/2 2:10 -1.5").map((item)=>item.raw),["1.85","+150","5/2"]);
});

test("reconstructs rendered event card and nested market with dynamic classes absent",()=>{
  const result=extractRenderedDom(fixture(),{sportsbook:"dom:test",sourceUrl:"https://example.test/odds",defaultSport:"football"});
  assert.equal(result.detectedEventCards,1);
  assert.equal(result.records.length,2);
  assert.equal(result.records[0]?.eventName,"Tigers vs Lions");
  assert.equal(result.records[0]?.market,"Match Winner");
  assert.equal(result.records[0]?.sourceEventId,"source:evt-9");
  assert.deepEqual(result.records.map((record)=>record.rawOdds),["1.85","+150"]);
});

test("retains ambiguity and refuses an unassociated price",()=>{
  const root=node("body","Tigers vs Lions 1.85", "body",[node("div","Tigers vs Lions 1.85","body/div:1")]);
  const result=extractRenderedDom(root,{sportsbook:"dom:test",sourceUrl:"https://example.test/odds"});
  assert.equal(result.records.length,0);
  assert.ok(result.candidates.some((candidate)=>candidate.status==="PARTIAL" || candidate.status==="AMBIGUOUS"));
});

test("deduplicates repeated virtualized cards and preserves bounded DOM RAW evidence",()=>{
  const root=fixture(); root.children!.push(structuredClone(root.children![0]!)); root.children![1]!.path="body/section:2";
  const result=extractRenderedDom(root,{sportsbook:"dom:test",sourceUrl:"https://example.test/odds"});
  assert.equal(result.records.length,2);
  const raw=sanitizeRawPayload({sportsbook:"dom:example.test",accountAlias:"rendered-dom",sourceType:"dom-extraction",sourceUrl:"https://example.test/odds?secret=no",parserVersion:"test",rawPayload:{status:"DOM_RECOVERED",sourceUrl:"https://example.test/odds",candidates:[{status:"VALID",confidence:.8,reasons:["complete"],evidence:[{path:"body/div",text:"Tigers 1.85",attrs:{"data-event-id":"evt"},fragment:"<div>Tigers 1.85</div>"}],record:{eventName:"Tigers vs Lions",market:"Moneyline",selection:"Tigers",odds:"1.85"}}]}});
  assert.equal((raw.rawPayload as {capturePolicy:string}).capturePolicy,"dom-evidence-v1");
  assert.equal(raw.sourceUrl,"https://example.test/odds");
});

test("missing fields and malformed DOM remain non-fatal",()=>{
  const result=extractRenderedDom({tag:"body",text:"",path:"body",children:[{tag:"div",text:"Over 2.5 5/2",path:"body/div:1"}]},{sportsbook:"dom:test",sourceUrl:"https://example.test/odds"});
  assert.equal(result.records.length,0);
  assert.equal(result.detectedEventCards,0);
});

test('local market boundaries keep periods and lines apart and reject multi-column selections',()=>{
 const root=fixture(),card=root.children![0]!;
 const market=card.children![1]!;market.attrs={'data-period':'full_event','data-line':'2.5'};
 const second=structuredClone(market);second.path='body/section:1/div:3';second.attrs={'data-period':'first_half','data-line':'3.5'};
 const repath=(n:DomNode)=>{n.path=n.path.replace('div:2','div:3');for(const c of n.children||[])repath(c);};for(const c of second.children||[])repath(c);
 card.children!.push(second);
 const found=extractRenderedDom(root,{sportsbook:'local',sourceUrl:'https://example.test/events/a'}).records;
 assert.equal(found.length,4);assert.deepEqual(new Set(found.map(r=>`${r.marketPeriod}|${r.line}`)),new Set(['full_event|2.5','first_half|3.5']));
 market.children![1]!.text='Tigers +130 +122 +110';
 assert.ok(!extractRenderedDom(root,{sportsbook:'local',sourceUrl:'https://example.test/events/a'}).records.some(r=>r.selection?.includes('+')));
 assert.ok(found.every(r=>r.qualifiers?.association==='local-market-selection-price'));
});
