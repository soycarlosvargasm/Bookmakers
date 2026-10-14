import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import type { Pool } from 'pg';
import { andTruth, canonicalJSON, emptyCatalog, filterObservation, projectObservation, resolveEntity, resolveTerritory, semanticHash, type SportsCatalog } from '../src/ui/sports-organizer.js';
import { savedEvidence } from '../src/ui/saved-evidence.js';
import { readSportsCatalog, SportsLogoCatalog } from '../src/ui/sports-catalog.js';
import { registerWorkbenchRoutes, validateFilters } from '../src/ui/workbench.js';
import { defaultSettings, UiActions } from '../src/ui/actions.js';
import { england, scotland, sportsRow, sportsSource, sportsCatalog, saveSportsRows, saveSportsCatalogFixtures, writeSportsCatalog } from './fixtures/sports-catalog.js';
import type { ProviderRecord } from '../src/normalization/types.js';
const now=Date.parse('2026-10-12T07:00:00Z');
const ref={id:'fixture',file:'fixture.json',row:0,images:[],hasText:true,capturedAt:'2026-10-12T05:00:00Z'};
const project=(row:ProviderRecord=sportsRow,catalog=sportsCatalog,evidence=ref)=>projectObservation(row,evidence,sportsSource,{status:'VALID',reason:'fixture'},catalog,[]);
async function rootFixture(t:test.TestContext){const root=await mkdtemp(join(tmpdir(),'sports-organizer-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('territory provenance is independent of access region, includes sporting nations, and records conflicts',()=>{
  const o=project();assert.equal(o.competitionTerritory.value?.id,england.id);assert.equal(o.sourceRegion.value,'mx');assert.equal(o.participants[0]?.country.value,null);
  assert.equal(resolveTerritory(scotland,sportsCatalog.entries[0],ref.id).status,'conflict');
  const unknown=project({...sportsRow,sportsMetadata:{sourceRegion:'global'}},emptyCatalog);assert.equal(unknown.competitionTerritory.status,'unknown');assert.equal(unknown.sourceRegion.value,'global');
  const withBrands=projectObservation({...sportsRow,sportsMetadata:{}},ref,sportsSource,{status:'VALID',reason:''},emptyCatalog,[{id:sportsSource.type,name:'fixture',sport:'all',regions:[{code:'mx',name:'México',url:sportsSource.url,vpn:null,verified:true}]}]);assert.equal(withBrands.sourceRegion.value,'mx');assert.equal(withBrands.competitionTerritory.value,null);
  assert.equal(projectObservation(sportsRow,ref,sportsSource,{status:'VALID',reason:''},emptyCatalog,[{id:sportsSource.type,name:'fixture',sport:'all',regions:['mx','co'].map(code=>({code,name:code,url:sportsSource.url,vpn:null,verified:true}))}]).sourceRegion.status,'verified');
});

test('typed provider IDs, homonyms, categories and Unicode preserve identity; conflicting crosswalks stay unresolved',()=>{
  const context={local:'fixture',territory:england};
  const c=resolveEntity({name:'Liga inglesa de prueba',id:'league-1',kind:'competition'},'soccer','fixture-mx',context,sportsCatalog);
  const p=resolveEntity({name:'Águilas Football Club',id:'team-1',kind:'team'},'soccer','fixture-mx',context,sportsCatalog);assert.notEqual(c.entity.id,p.entity.id);
  const female=resolveEntity({name:'Águilas Football Club femenino',id:'team-1',kind:'team',category:'women'},'soccer','fixture-mx',context,sportsCatalog);assert.notEqual(female.entity.id,p.entity.id);assert.equal(female.entity.canonicalStatus,'source-scoped');
  for(const category of ['u21','u23','reserves','men'])assert.notEqual(resolveEntity({name:'Águilas',id:'team-1',kind:'team',category},'soccer','fixture-mx',context,sportsCatalog).entity.id,p.entity.id);
  const aliasCatalog={...sportsCatalog,entries:sportsCatalog.entries.map(e=>e.entity.kind==='team'?{...e,territory:england}:e)};
  assert.equal(resolveEntity({name:'Aguilas FC',kind:'team'},'soccer','fixture-mx',context,aliasCatalog).entity.id,'team:1');
  assert.notEqual(resolveEntity({name:'Aguilas FC',kind:'team'},'soccer','fixture-mx',{local:'other'},emptyCatalog).entity.id,resolveEntity({name:'Aguilas FC',kind:'team'},'soccer','fixture-mx',{local:'fixture'},emptyCatalog).entity.id);
  const duplicate={...sportsCatalog,entries:[...sportsCatalog.entries,{...sportsCatalog.entries[3]!,entity:{...sportsCatalog.entries[3]!.entity,id:'team:999'}}]};assert.equal(resolveEntity({name:'Águilas',id:'team-1',kind:'team'},'soccer','fixture-mx',context,duplicate).resolution.status,'ambiguous');
});

test('event identity uses provider edition, never rivals plus date; orientation and rescheduling retain one event',()=>{
  const o=project();assert.equal(project({...sportsRow,eventStartTime:'2030-11-02T12:00:00Z',participants:[...sportsRow.participants!].reverse()}).eventId,o.eventId);
  assert.notEqual(project({...sportsRow,sourceEventId:'match-2'}).eventId,o.eventId);
  const missing={...sportsRow,sourceEventId:null,eventStartTime:null,qualifiers:{association:'local-market-selection-price'}};
  assert.notEqual(project(missing,sportsCatalog,{...ref,id:'a'}).eventId,project(missing,sportsCatalog,{...ref,id:'b'}).eventId);
  const future=project({...sportsRow,eventName:'Campeón temporada 2030',participants:null,sportsMetadata:{...sportsRow.sportsMetadata,participants:[],eventType:'future'}});assert.equal(future.eventType,'future');assert.equal(future.participants.length,0);
  const catalog={...sportsCatalog,events:[{provider:'fixture-mx',id:'match-1',canonicalId:'event:reviewed-1',edition:'2030-match-1',reviewed:true as const,evidenceRefs:['fixture']}]};assert.equal(project(sportsRow,catalog).eventId,'event:reviewed-1');
});

test('semantic keys preserve periods, selection and market lines, rules and original odds',()=>{
  const o=project();for(const [rawOdds,rawOddsFormat] of [['-170','american'],['+180','american'],['2.80','decimal'],['9/5','fractional']]){const p=project({...sportsRow,rawOdds,rawOddsFormat});assert.equal(p.marketId,o.marketId);assert.equal(p.selectionId,o.selectionId);assert.equal(p.offerId,o.offerId);assert.equal(p.row.rawOdds,rawOdds);}
  assert.notEqual(project({...sportsRow,marketPeriod:null}).marketId,o.marketId);assert.notEqual(project({...sportsRow,marketPeriod:'full_event'}).marketId,o.marketId);
  assert.notEqual(project({...sportsRow,line:'3.5'}).marketId,o.marketId);
  assert.notEqual(project({...sportsRow,sportsMetadata:{...sportsRow.sportsMetadata,rules:{overtime:'included'}}}).marketId,o.marketId);
  assert.notEqual(project({...sportsRow,market:'1X2'}).marketId,project({...sportsRow,market:'Winner (2-way)'}).marketId);
  assert.notEqual(project({...sportsRow,selection:'Under'}).selectionId,o.selectionId);assert.notEqual(project({...sportsRow,bookmaker:'Casa Dos'}).offerId,o.offerId);
  assert.equal(canonicalJSON({b:2,a:1}),canonicalJSON({a:1,b:2}));assert.notEqual(semanticHash(['a|b','c']),semanticHash(['a','b|c']));
  assert.notEqual(project({...sportsRow,bookmaker:null},sportsCatalog,{...ref,id:'a'}).offerId,project({...sportsRow,bookmaker:null},sportsCatalog,{...ref,id:'b'}).offerId);
});

test('trivalent AND excludes known contradictions and team filter includes all event markets',()=>{
  assert.equal(andTruth(['TRUE','UNKNOWN']),'UNKNOWN');assert.equal(andTruth(['FALSE','UNKNOWN']),'FALSE');
  const unknown=project({...sportsRow,eventStartTime:null});assert.equal(filterObservation(unknown,{from:'2030-01-01'},now).truth,'UNKNOWN');assert.equal(filterObservation(unknown,{from:'2030-01-01',territory:[scotland.id]},now).truth,'FALSE');
  for(const selection of ['Over','Empate','Rival Football Club'])assert.equal(filterObservation(project({...sportsRow,selection}),{participantId:['team:1']},now).truth,'TRUE');
  assert.equal(filterObservation(project(),{participantId:['team:missing','team:1']},now).truth,'TRUE');
  const noCountry=project({...sportsRow,sportsMetadata:{}},emptyCatalog);assert.equal(filterObservation(noCountry,{territory:[england.id]},now).truth,'UNKNOWN');assert.equal(filterObservation(noCountry,{territory:['territory:unknown']},now).truth,'TRUE');
});

test('dependent facets, distinct counts, multiple offers and observation ordering retain every RAW reference',async t=>{
  const root=await rootFixture(t),f=await saveSportsCatalogFixtures(root),original=await readFile(f.first.path);const index=savedEvidence(root);
  const result=await index.organize({territory:[england.id],competitionId:['competition:1'],participantId:['team:1']},{},now);
  assert.equal(result.events.length,1);assert.equal(result.counts.markets,3);assert.equal(result.counts.selections,4);assert.equal(result.counts.offers,5);assert.equal(result.counts.observations,6);assert.equal(result.counts.evidenceFiles,2);
  assert.ok(result.events[0]!.markets.some(m=>m.options.some(o=>o.label==='Empate')));assert.ok(result.events[0]!.markets.some(m=>m.options.some(o=>o.label.includes('Rival'))));
  assert.ok(result.entityFacets.competitionId.some(v=>v.id==='competition:2'),'own-dimension exclusion permits switching league to cup');
  assert.ok(result.entityFacets.territory.some(v=>v.id===england.id));assert.ok(!result.events.some(e=>e.competition?.displayName.includes('escocesa')));
  const total=result.cards.find(c=>c.market==='Total goals')!;assert.equal(total.options.find(o=>o.price==='+190')?.latest,true);assert.equal(total.options.find(o=>o.price==='+180')?.latest,false);assert.equal(total.options.find(o=>o.price==='2.85')?.bookmaker,'Casa Dos');
  const all=await index.organize({},{});assert.equal(all.entityFacets.territory.length,5);assert.ok(all.pending.some(p=>p.status==='PARTIAL'));
  const noDate=await index.organize({eventId:[all.events.find(e=>e.competition?.displayName.includes('sin país'))!.id],from:'2030-01-01'},{});assert.equal(noDate.cards.length,0);assert.ok(noDate.pending.some(p=>p.status==='FILTER_UNKNOWN'));
  const falseMixed=await index.organize({territory:[scotland.id],competitionId:['competition:1']},{});assert.equal(falseMixed.cards.length,0);
  const changed=await index.organize({territory:[scotland.id],competitionId:['competition:1'],sourceRegion:['mx']},{reconcileFrom:'territory'},now);assert.ok(changed.removedFilters.some(r=>r.id==='competition:1'));assert.deepEqual(changed.appliedFilters.sourceRegion,['mx']);assert.equal(changed.events.length,1);
  assert.deepEqual(await readFile(f.first.path),original);
});

test('unknown observation time and contradictory schedule are shown without inventing current price',async t=>{
  const root=await rootFixture(t);await writeSportsCatalog(root);
  await saveSportsRows(root,[sportsRow,{...sportsRow,rawOdds:'+190',collectedAt:undefined,eventStartTime:'2030-12-01T12:00:00Z'}]);
  const result=await savedEvidence(root).organize({},{});assert.ok(result.cards.every(c=>c.options.every(o=>o.temporalUncertainty&&!o.latest)));assert.equal(result.events[0]!.start,null);assert.equal(result.events[0]!.scheduleHistory.length,2);
});

test('catalog revisions invalidate territory projection; malformed or absent snapshot keeps local evidence usable',async t=>{
  const root=await rootFixture(t);await writeSportsCatalog(root);await saveSportsRows(root,[sportsRow]);const index=savedEvidence(root);
  assert.equal((await index.organize({},{})).events[0]!.territory.value?.id,england.id);
  await writeSportsCatalog(root,{...sportsCatalog,territoryVersion:'fixture-2',entries:sportsCatalog.entries.map(e=>e.entity.id==='competition:1'?{...e,territory:scotland}:e)});assert.equal((await index.organize({},{})).events[0]!.territory.value?.id,scotland.id);
  await writeFile(join(root,'collection','sports-catalog.json'),'bad');assert.ok((await index.organize({},{})).warnings.length);assert.equal((await readSportsCatalog(root)).catalog.entries.length,0);
  await rm(join(root,'collection','sports-catalog.json'));assert.equal((await index.organize({},{})).events.length,1);
});

test('logo linkage uses typed reviewed IDs, exact hashes, available raster files and controlled resources',async t=>{
  const root=await rootFixture(t),assets=join(root,'logos','assets');await mkdir(assets,{recursive:true});const buffer=await readFile('tests/fixtures/workbench-evidence.png'),sha=createHash('sha256').update(buffer).digest('hex');await writeFile(join(assets,'fixture.png'),buffer);
  const team=sportsCatalog.entries[3]!.entity,competition=sportsCatalog.entries[0]!.entity;
  const catalog:SportsCatalog={...sportsCatalog,logoLinks:[{entityId:team.id,kind:'team',betfluxId:'1',evidenceRefs:['fixture-review'],reviewed:true}],logos:[{betflux_entity_id:'1',entity_type:'team',sha256:sha,canonical_path:'fixture.png',media_type:'image/png'}]};
  const logos=new SportsLogoCatalog(assets);let result=await logos.attach([team,competition],catalog);assert.equal(result[team.id]!.status,'available');assert.equal(result[competition.id]!.status,'missing');assert.deepEqual(logos.resource(sha)?.buffer,buffer);
  result=await logos.attach([team],{...catalog,logoLinks:[...catalog.logoLinks,{...catalog.logoLinks[0]!,betfluxId:'second'}]});assert.equal(result[team.id]!.status,'conflict');
  result=await logos.attach([team],{...catalog,logos:catalog.logos.map(a=>({...a,canonical_path:'broken.png'}))});assert.equal(result[team.id]!.status,'broken');
  await symlink(join(root,'outside.png'),join(assets,'symlink.png'));await writeFile(join(root,'outside.png'),buffer);
  for(const canonical_path of ['../outside.png','symlink.png'])assert.equal((await logos.attach([team],{...catalog,logos:catalog.logos.map(a=>({...a,canonical_path}))}))[team.id]!.status,'broken');
  assert.equal((await logos.attach([team],{...catalog,logos:catalog.logos.map(a=>({...a,media_type:'image/svg+xml'}))}))[team.id]!.status,'broken');
  const unavailable={query:async()=>{throw Error('PostgreSQL unavailable');}} as unknown as Pool;assert.equal((await new SportsLogoCatalog(assets,unavailable).attach([team],catalog))[team.id]!.status,'available');
});

test('API validates IDs, exposes grouped events and keeps offline organization independent of PostgreSQL',async t=>{
  const root=await rootFixture(t);await saveSportsCatalogFixtures(root);let queries=0;const pool={query:async()=>{queries++;throw Error('DB offline');}} as unknown as Pool;
  const app=Fastify(),actions=new UiActions(()=>{},()=>{},root);t.after(async()=>{await app.close();await actions.close();});registerWorkbenchRoutes(app,pool,actions,root,()=>defaultSettings);
  assert.throws(()=>validateFilters({participantId:'team:1'}));assert.throws(()=>validateFilters({territory:[12]}));assert.deepEqual(validateFilters({participantId:['team:1','team:1']}).participantId,['team:1']);
  const res=await app.inject({method:'POST',url:'/api/workbench/organize',payload:{filters:{territory:[england.id],competitionId:['competition:1'],participantId:['team:1']}}});assert.equal(res.statusCode,200);const data=res.json();assert.equal(data.eventTotal,1);assert.equal(data.counts.observations,6);assert.equal(queries,0);assert.equal(data.logos['team:1'].status,'missing');
  assert.equal((await app.inject('/api/workbench/logos/'+ 'a'.repeat(64))).statusCode,404);
});

test('the current matchup view keeps demonstrated futures and races in accessible out-of-scope evidence',async t=>{
  const root=await rootFixture(t);await writeSportsCatalog(root);
  await saveSportsRows(root,['future','race'].map((eventType,i)=>({...sportsRow,sourceEventId:`scope-${i}`,sportsMetadata:{...sportsRow.sportsMetadata,eventType:eventType as 'future'|'race'}})));
  const result=await savedEvidence(root).organize({},{});assert.equal(result.events.length,0);assert.equal(result.pending.length,2);assert.ok(result.pending.every(p=>p.status==='OUT_OF_SCOPE'&&p.evidence.row!==undefined));
});
