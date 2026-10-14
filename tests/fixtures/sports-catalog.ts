import type { ProviderRecord } from '../../src/normalization/types.js';
import type { SportsCatalog, EntityRef, EntityKind, Territory } from '../../src/ui/sports-organizer.js';
import { EngineStorage } from '../../src/engine/storage.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export const england:Territory={id:'territory:england',kind:'country',displayName:'Inglaterra'};
export const scotland:Territory={id:'territory:scotland',kind:'country',displayName:'Escocia'};
export const international:Territory={id:'territory:international',kind:'international',displayName:'Internacional'};
export const multinational:Territory={id:'territory:multinational:north',kind:'multinational',displayName:'Multinacional · Norte'};
export const sportsSource={type:'fixture-mx',url:'https://fixture-mx.test/sports'};
const entity=(kind:EntityKind,id:string,name:string,external:string,category?:string):EntityRef=>({id:`${kind}:${id}`,kind,displayName:name,sportId:'soccer',canonicalStatus:'verified',externalIds:[{provider:'fixture-mx',entityType:kind,id:external}]});
export const sportsCatalog:SportsCatalog={schema:1,identityVersion:'fixture-identities-1',territoryVersion:'fixture-territories-1',logoVersion:'empty',entries:[
  {entity:entity('competition','1','Liga inglesa de prueba','league-1'),territory:england,evidenceRefs:['fixture:league-1'],reviewed:true},
  {entity:entity('competition','2','Copa inglesa de prueba','cup-1'),territory:england,evidenceRefs:['fixture:cup-1'],reviewed:true},
  {entity:entity('competition','3','Liga escocesa de prueba','scot-1'),territory:scotland,evidenceRefs:['fixture:scot-1'],reviewed:true},
  {entity:entity('team','1','Águilas Football Club','team-1'),aliases:['Águilas FC'],evidenceRefs:['fixture:team-1'],reviewed:true},
  {entity:entity('team','2','Rival Football Club','team-2'),evidenceRefs:['fixture:team-2'],reviewed:true},
],events:[],logoLinks:[],logos:[]};
export const sportsRow:ProviderRecord={sportsbook:'fixture-mx',bookmaker:'Casa Uno',sport:'Soccer',competition:'Liga inglesa de prueba',eventName:'Águilas Football Club vs Rival Football Club',sourceEventId:'match-1',sourceMarketId:'total-1',market:'Total goals',marketPeriod:'regular_time',line:'2.5',selection:'Over',rawOdds:'+180',rawOddsFormat:'american',eventStartTime:'2030-11-01T12:00:00Z',collectedAt:'2026-10-12T05:00:00Z',participants:['Águilas Football Club','Rival Football Club'],sportsMetadata:{competition:{id:'league-1',name:'Liga inglesa de prueba',kind:'competition'},participants:[{id:'team-1',name:'Águilas Football Club',kind:'team'},{id:'team-2',name:'Rival Football Club',kind:'team'}],eventType:'matchup',sourceRegion:'mx',season:'2030',rules:{overtime:'excluded',statistic:'goals'}}};
export async function writeSportsCatalog(root:string,catalog:SportsCatalog=sportsCatalog){await mkdir(join(root,'collection'),{recursive:true});await writeFile(join(root,'collection','sports-catalog.json'),JSON.stringify(catalog));}
export async function saveSportsRows(root:string,rows:ProviderRecord[],capturedAt='2026-10-12T05:00:00Z',source=sportsSource){const path=await new EngineStorage(root).saveRaw(source,'dom',{url:source.url,transport:'fixture-only',capturedAt,payload:{records:rows,copiedText:'FIXTURE LOCAL · catálogo deportivo, sin capturas de apuestas reales'}},rows.length);return {path,id:path.split('/').at(-1)!.replace('.json','')};}
export async function saveSportsCatalogFixtures(root:string){await writeSportsCatalog(root);const rows:ProviderRecord[]=[sportsRow,{...sportsRow,selection:'Under',rawOdds:'-170'},
  {...sportsRow,sourceMarketId:'1x2-1',market:'1X2',selection:'Empate',line:null,rawOdds:'2.80',rawOddsFormat:'decimal'},
  {...sportsRow,sourceMarketId:'hcap-1',market:'Handicap',selection:'Rival Football Club',line:'-1.5',rawOdds:'9/5',rawOddsFormat:'fractional'},
  {...sportsRow,sourceEventId:'cup-match',sourceMarketId:'cup-total',competition:'Copa inglesa de prueba',sportsMetadata:{...sportsRow.sportsMetadata,competition:{id:'cup-1',name:'Copa inglesa de prueba',kind:'competition'}}},
  {...sportsRow,sourceEventId:'scot-match',sourceMarketId:'scot-total',competition:'Liga escocesa de prueba',sportsMetadata:{...sportsRow.sportsMetadata,competition:{id:'scot-1',name:'Liga escocesa de prueba',kind:'competition'}}},
  {...sportsRow,sourceEventId:'international',sourceMarketId:'int-total',competition:'Copa internacional de prueba',sportsMetadata:{...sportsRow.sportsMetadata,competition:{id:'int-1',name:'Copa internacional de prueba'},competitionTerritory:international}},
  {...sportsRow,sourceEventId:'multinational',sourceMarketId:'multi-total',competition:'Liga multinacional de prueba',sportsMetadata:{...sportsRow.sportsMetadata,competition:{id:'multi-1',name:'Liga multinacional de prueba'},competitionTerritory:multinational}},
  {...sportsRow,sourceEventId:'unknown',sourceMarketId:'unknown-total',competition:'Competición sin país demostrado',eventStartTime:null,sportsMetadata:{...sportsRow.sportsMetadata,competition:{id:'unknown-1',name:'Competición sin país demostrado'}}}];
  const first=await saveSportsRows(root,rows);const second=await saveSportsRows(root,[{...sportsRow,rawOdds:'+190',collectedAt:'2026-10-12T06:00:00Z'},{...sportsRow,bookmaker:'Casa Dos',rawOdds:'2.85',rawOddsFormat:'decimal',collectedAt:'2026-10-12T06:00:00Z'}],'2026-10-12T06:00:00Z');return {first,second};}
