import { createHash } from 'node:crypto';
import { stableQualifiers } from '../normalization/identity.js';
import type { ProviderRecord } from '../normalization/types.js';
import type { RecordAssessment } from '../validation/records.js';
import type { Brand } from './brands.js';
import type { Filters } from './workbench.js';
import type { EvidenceRef } from './saved-evidence.js';
import { marketFamily } from '../engine/collection.js';

const dayFormatter=new Intl.DateTimeFormat('en',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
const days=new Map<string,string>();
export function organizerDay(date:string,_timezone='Asia/Bangkok'):string {
  const prior=days.get(date);if(prior!==undefined)return prior;
  const parsed=new Date(date);if(!Number.isFinite(parsed.getTime()))return '';
  const parts=dayFormatter.formatToParts(parsed),value=['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');
  if(days.size>=20000)days.clear();days.set(date,value);return value;
}
const dayInZone=organizerDay;
export const IDENTITY_VERSION = 'saved-sports-v1';
export type Resolution<T> = { value: T | null; status: 'verified'|'unknown'|'ambiguous'|'conflict'; basis: 'provider-id'|'structured-field'|'reviewed-crosswalk'|null; evidenceRefs: string[] };
export type EntityKind = 'competition'|'team'|'national_team'|'athlete'|'card'|'organization';
export type EntityRef = { id: string; kind: EntityKind; displayName: string; sportId: string|null; externalIds: Array<{provider:string;entityType:string;id:string}>; canonicalStatus:'verified'|'source-scoped'|'unresolved' };
export type Territory = { id:string; kind:'country'|'international'|'multinational'; displayName:string };
export type EntityInput = { id?:string; provider?:string; kind?:EntityKind; name:string; category?:string; country?:Territory; role?:string };
export type SportsMetadata = {
  competition?:EntityInput; competitionTerritory?:Territory; season?:string; participants?:EntityInput[];
  organization?:EntityInput; card?:EntityInput; eventType?:'matchup'|'race'|'future'|'other';
  eventEditionId?:string; marketTypeId?:string; marketLine?:string|null; subjectId?:string;
  rules?:Record<string,string>; outcomeId?:string; sourceRegion?:string; confirmedAt?:string;
};
export type CatalogEntry = { entity:EntityRef; aliases?:string[]; category?:string; competitionId?:string; territory?:Territory; participantCountry?:Territory; evidenceRefs:string[]; reviewed:true };
export type EventCrosswalk = { provider:string; id:string; canonicalId:string; edition:string; evidenceRefs:string[]; reviewed:true };
export type LogoLink = { entityId:string; kind:EntityKind; betfluxId:string; evidenceRefs:string[]; reviewed:true };
export type LogoAsset = { betflux_entity_id:string; entity_type:string; sha256:string; canonical_path:string; media_type:string };
export type SportsCatalog = { schema:1; identityVersion:string; territoryVersion:string; logoVersion:string; entries:CatalogEntry[]; events:EventCrosswalk[]; logoLinks:LogoLink[]; logos:LogoAsset[] };
export const emptyCatalog:SportsCatalog = {schema:1,identityVersion:'empty',territoryVersion:'empty',logoVersion:'empty',entries:[],events:[],logoLinks:[],logos:[]};
export const canonicalJSON = (value:unknown):string => JSON.stringify(value, (_key,item) => item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))) : item);
export const semanticHash = (value:unknown):string => createHash('sha256').update(canonicalJSON({version:IDENTITY_VERSION,value})).digest('hex');
// Unicode search only. No generic-token removal; categories remain identity dimensions.
export const searchText = (s:string) => s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
export const validDate = (s:unknown):string|null => typeof s==='string' && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null;
const unknown = <T>(status:Resolution<T>['status']='unknown',refs:string[]=[]):Resolution<T> => ({value:null,status,basis:null,evidenceRefs:refs});
const verified = <T>(value:T,basis:Resolution<T>['basis'],refs:string[]):Resolution<T> => ({value,status:'verified',basis,evidenceRefs:refs});
const validTerritory = (t:Territory|undefined):t is Territory => Boolean(t && typeof t.id==='string' && t.id && typeof t.displayName==='string' && ['country','international','multinational'].includes(t.kind));
const entityKinds:EntityKind[]=['competition','team','national_team','athlete','card','organization'];
const typed = (e:EntityRef) => entityKinds.includes(e.kind) && typeof e.id==='string' && e.id.startsWith(`${e.kind}:`) && typeof e.displayName==='string' && e.canonicalStatus==='verified';

export function resolveEntity(input:EntityInput, sport:string|null, provider:string, context:{competitionId?:string;territory?:Territory;local:string}, catalog:SportsCatalog):{entity:EntityRef;resolution:Resolution<string>;entry?:CatalogEntry} {
  const kind=input.kind||'competition', namespace=input.provider||provider;
  const entries=catalog.entries.filter(e=>e.reviewed===true && e.evidenceRefs?.length && typed(e.entity) && e.entity.kind===kind && e.entity.sportId===sport && (e.category||'')===(input.category||''));
  let candidates:CatalogEntry[]=[];
  if(input.id) candidates=entries.filter(e=>e.entity.externalIds.some(x=>x.provider===namespace && x.entityType===kind && x.id===input.id));
  else if(context.competitionId || context.territory) candidates=entries.filter(e=>(!e.competitionId || e.competitionId===context.competitionId) && (!context.territory || e.territory?.id===context.territory.id) && [e.entity.displayName,...e.aliases||[]].some(n=>searchText(n)===searchText(input.name)));
  const unique=new Map(candidates.map(e=>[e.entity.id,e]));
  if(unique.size===1){const entry=[...unique.values()][0]!;return {entity:entry.entity,resolution:verified(entry.entity.id,'reviewed-crosswalk',entry.evidenceRefs),entry};}
  const entity:EntityRef={id:`${kind}:${input.id?'source':'local'}:${semanticHash([namespace,kind,input.id||context.local,sport,input.category||null])}`,kind,displayName:input.name,sportId:sport,externalIds:input.id?[{provider:namespace,entityType:kind,id:input.id}]:[],canonicalStatus:input.id?'source-scoped':'unresolved'};
  return {entity,resolution:unique.size>1?unknown('ambiguous',candidates.flatMap(e=>e.evidenceRefs)):input.id?verified(entity.id,'provider-id',[context.local]):unknown()};
}
export function resolveTerritory(structured:Territory|undefined, entry:CatalogEntry|undefined, ref:string):Resolution<Territory> {
  const reviewed=entry?.territory;
  if(validTerritory(structured) && validTerritory(reviewed) && (structured.id!==reviewed.id || structured.kind!==reviewed.kind)) return unknown('conflict',[ref,...entry!.evidenceRefs]);
  if(validTerritory(structured)) return verified(structured,'structured-field',[ref]);
  if(validTerritory(reviewed)) return verified(reviewed,'reviewed-crosswalk',entry!.evidenceRefs);
  return unknown();
}
const sourceRegionCache=new WeakMap<Brand[],Map<string,Resolution<string>>>();
export function resolveSourceRegion(source:{type:string;url:string},brands:Brand[],explicit?:string):Resolution<string> {
  let cache=sourceRegionCache.get(brands);if(!cache){cache=new Map();sourceRegionCache.set(brands,cache);}
  const key=canonicalJSON([source,explicit||null]);const prior=cache.get(key);if(prior)return prior;
  const result=resolveSourceRegionUncached(source,brands,explicit);cache.set(key,result);return result;
}
function resolveSourceRegionUncached(source:{type:string;url:string}, brands:Brand[], explicit?:string):Resolution<string> {
  let target:URL;try{target=new URL(source.url);}catch{return unknown();}
  const options=new Set(brands.filter(b=>b.id===source.type).flatMap(b=>b.regions.filter(r=>{try{const u=new URL(r.url);return u.origin===target.origin && (u.pathname==='/' || target.pathname===u.pathname || target.pathname.startsWith(u.pathname.replace(/\/$/,'')+'/'));}catch{return false;}}).map(r=>r.code)));
  if(explicit && options.size && !options.has(explicit))return unknown('conflict',[source.url]);
  if(explicit)return verified(explicit,'structured-field',[source.url]);
  return options.size===1?verified([...options][0]!,'structured-field',[source.url]):unknown(options.size>1?'ambiguous':'unknown');
}
export type Observation = {
  id:string;eventId:string;marketId:string;selectionId:string;offerId:string;row:ProviderRecord;evidence:EvidenceRef;source:{type:string;url:string};sourceRegion:Resolution<string>;
  sportId:string|null;competition:EntityRef|null;competitionTerritory:Resolution<Territory>;season:string|null;organization:EntityRef|null;card:EntityRef|null;
  participants:Array<{entity:EntityRef;role:string|null;country:Resolution<Territory>;aliases:string[]}>;eventType:string;start:string|null;observedAt:string|null;confirmedAt:string|null;
  assessment:RecordAssessment;missing:string[];conflicts:string[];bookmaker:string|null;rules:Record<string,string>;aliases:string[];
};
export function projectObservation(row:ProviderRecord,evidence:EvidenceRef,source:{type:string;url:string},assessment:RecordAssessment,catalog:SportsCatalog,brands:Brand[]):Observation {
  const meta=row.sportsMetadata||{}, q=row.qualifiers||{}, local=`${evidence.id}:${evidence.row}`, provider=row.sportsbook||source.type, sportId=row.sport?searchText(row.sport):null;
  const competitionInput=meta.competition || (row.competition?{name:row.competition,id:q.leagueId||q.competitionId,kind:q.competitionKind==='card'?'card' as const:'competition' as const}:null);
  const crossed=catalog.events.filter(e=>e.reviewed===true && e.evidenceRefs?.length && e.provider===provider && e.id===row.sourceEventId && e.edition && e.canonicalId.startsWith('event:'));
  const eventIds=new Set(crossed.map(e=>e.canonicalId));
  const validProviderEvent=Boolean(row.sourceEventId && !/^(?:source:)?(?:body|main|container|content|parlay-mode-container)$/i.test(row.sourceEventId) && !/dom|interface|container/i.test(q.sourceEventIdKind||''));
  const eventId=eventIds.size===1?[...eventIds][0]!:eventIds.size>1?`event:local:${semanticHash(local)}`:validProviderEvent?`event:source:${semanticHash([provider,row.sourceEventId,meta.eventEditionId||null])}`:`event:local:${semanticHash([evidence.id,q.domEventKey||row.sourceEventId||local])}`;
  const comp=competitionInput?resolveEntity(competitionInput,sportId,provider,{local:`${eventId}:competition:${competitionInput.name}`},catalog):null;
  const territory=resolveTerritory(meta.competitionTerritory,comp?.entry,local);
  const context={local,competitionId:comp?.entity.id,territory:territory.value||undefined};
  const individual=/mma|boxing|tennis|golf|athletics|racing|cycling/i.test(row.sport||'');
  const names=row.participants?.length?row.participants:[row.homeParticipant,row.awayParticipant].filter((n):n is string=>Boolean(n));
  const inputs:EntityInput[]=meta.participants || names.map(name=>({name,kind:individual?'athlete' as const:'team' as const,role:row.homeParticipant===name?'home':row.awayParticipant===name?'away':undefined}));
  const participants=inputs.map(input=>{const r=resolveEntity(input,sportId,provider,{...context,local:`${eventId}:participant:${searchText(input.name)}`},catalog);return {entity:r.entity,role:input.role||null,country:resolveTerritory(input.country,r.entry?.participantCountry?{...r.entry,territory:r.entry.participantCountry}:undefined,local),aliases:r.entry?.aliases||[]};});
  const organization=meta.organization?resolveEntity({...meta.organization,kind:'organization'},sportId,provider,{local},catalog).entity:null;
  const card=meta.card?resolveEntity({...meta.card,kind:'card'},sportId,provider,{local},catalog).entity:comp?.entity.kind==='card'?comp.entity:null;
  const book=row.bookmaker||q.displayedBook||null;
  const period=row.marketPeriod && !/^unknown$/i.test(row.marketPeriod)?row.marketPeriod:null;
  const metadataKeys=new Set(['displayedBook','displayedBookId','displayedEventId','externalId','marketId','marketLineId','competitorId','outcome','payloadOrigin','browserProfile','sourceLabel','startTimeNote','sourceMarketIdKind','sourceSelectionIdKind','leagueId','competitionId','sportId','matchupEndpoint','providerMarketKey','providerMarketType','marketVersion']);
  const rules={...Object.fromEntries(Object.entries(stableQualifiers(q)).filter(([k])=>!metadataKeys.has(k))),...meta.rules};
  const marketLine=meta.marketLine!==undefined?meta.marketLine:/total/i.test(row.market||'')?row.line??null:null;
  // Unknown scope/rules cannot demonstrate cross-source equivalence. Retain a local market namespace.
  const marketLocal=[provider,row.sourceMarketId||[evidence.id,q.marketPath||row.market,marketLine],!period?evidence.id:null];
  const marketId=semanticHash({eventId,type:meta.marketTypeId||row.market||null,period,phase:row.phase||null,subject:meta.subjectId||row.participantPlayer||null,line:marketLine,rules,local:marketLocal});
  const selectionId=semanticHash({marketId,outcome:meta.outcomeId||row.selection||null,line:row.line??null,variants:Object.fromEntries(Object.entries(q).filter(([k])=>k.startsWith('selection.')))});
  const offerId=semanticHash({selectionId,book:book?[provider,q.displayedBookId||book]:['unknown',evidence.id]});
  const id=semanticHash({offerId,source,file:evidence.file,row:evidence.row,fragment:evidence.domPath||null});
  const missing=[!sportId&&'deporte',!comp&&'competición',territory.status!=='verified'&&`territorio (${territory.status})`,!validDate(row.eventStartTime)&&'fecha del evento',!book&&'casa',!period&&'período'].filter((x):x is string=>Boolean(x));
  return {id,eventId,marketId,selectionId,offerId,row,evidence,source,sourceRegion:resolveSourceRegion(source,brands,meta.sourceRegion),sportId,competition:comp?.entity||null,competitionTerritory:territory,season:meta.season||null,organization,card,participants,eventType:meta.eventType||'other',start:validDate(row.eventStartTime),observedAt:validDate(row.collectedAt),confirmedAt:validDate(meta.confirmedAt),assessment,missing,conflicts:[territory.status==='conflict'&&'Territorios contradictorios',comp?.resolution.status==='ambiguous'&&'Competición ambigua',eventIds.size>1&&'Correspondencias de evento contradictorias'].filter((x):x is string=>Boolean(x)),bookmaker:book,rules,aliases:comp?.entry?.aliases||[]};
}
const regionNames=new Intl.DisplayNames(['es'],{type:'region'});
export const catalogDimensions=['territory','sportId','competitionId','participantId','eventId','organizationId','cardId','sourceRegion'] as const;
export type CatalogDimension=typeof catalogDimensions[number];
export type FacetOption={id:string;label:string;count:number;kind?:string;status?:string;aliases?:string[]};
export function dimensionValues(o:Observation,d:CatalogDimension):Array<{id:string;label:string;kind?:string;status?:string;aliases?:string[]}> {
  switch(d){
    case 'territory':return o.competitionTerritory.value?[{id:o.competitionTerritory.value.id,label:o.competitionTerritory.value.displayName,kind:o.competitionTerritory.value.kind}]:[{id:'territory:unknown',label:'País desconocido / sin resolver',status:o.competitionTerritory.status}];
    case 'sportId':return o.sportId?[{id:o.sportId,label:o.row.sport!}]:[];
    case 'competitionId':return o.competition?[{id:o.competition.id,label:`${o.competition.displayName}${o.season?` · ${o.season}`:''}`,kind:o.competition.kind,status:o.competition.canonicalStatus,aliases:o.aliases}]:[];
    case 'participantId':return o.participants.map(p=>({id:p.entity.id,label:p.entity.displayName,kind:p.entity.kind,status:p.entity.canonicalStatus,aliases:p.aliases}));
    case 'eventId':return [{id:o.eventId,label:`${o.row.eventName||'Ámbito sin nombre'} · ${o.start?dayInZone(o.start,'Asia/Bangkok'):'Fecha desconocida'}`}];
    case 'organizationId':return o.organization?[{id:o.organization.id,label:o.organization.displayName}]:[];
    case 'cardId':return o.card?[{id:o.card.id,label:o.card.displayName}]:[];
    case 'sourceRegion':return o.sourceRegion.value?[{id:o.sourceRegion.value,label:o.sourceRegion.value==='global'?'Global · región de acceso':regionNames.of(o.sourceRegion.value.toUpperCase())||o.sourceRegion.value}]:[];
  }
}
export type Truth='TRUE'|'FALSE'|'UNKNOWN';
export const andTruth=(values:Truth[]):Truth=>values.includes('FALSE')?'FALSE':values.includes('UNKNOWN')?'UNKNOWN':'TRUE';
export function filterObservation(o:Observation,f:Filters,now:number,except?:string):{truth:Truth;unknown:string[]} {
  const checks:Array<{d:string;t:Truth}>=[];
  const add=(d:string,t:Truth)=>{if(d!==except)checks.push({d,t});};
  for(const d of catalogDimensions){const wanted=f[d];if(!wanted?.length)continue;const values=dimensionValues(o,d);
    add(d,!values.length?'UNKNOWN':d==='territory' && !o.competitionTerritory.value && !wanted.includes('territory:unknown')?'UNKNOWN':d==='sourceRegion' && o.sourceRegion.status!=='verified'?'UNKNOWN':values.some(v=>wanted.includes(v.id))?'TRUE':'FALSE');
  }
  for(const [d,value] of Object.entries({sport:o.row.sport,league:o.row.competition,search:o.row.eventName,source:o.source.type,bookmaker:o.bookmaker,marketName:o.row.market})){
    const wanted=f[d as keyof Filters];if(typeof wanted==='string' && wanted)add(d,!value?'UNKNOWN':searchText(value).includes(searchText(wanted)) || d==='league' && o.aliases.some(a=>searchText(a).includes(searchText(wanted)))?'TRUE':'FALSE');
  }
  if(f.market && f.market!=='all')add('market',o.row.market?marketFamily(o.row.market)===f.market?'TRUE':'FALSE':'UNKNOWN');
  for(const [d,date,from,to] of [['eventDate',o.start,f.from,f.to],['captureDate',o.evidence.capturedAt,f.captureFrom,f.captureTo]] as const){
    if(from||to){const day=date && dayInZone(date,'Asia/Bangkok');add(d,!day?'UNKNOWN':from && day<from || to && day>to?'FALSE':'TRUE');}
  }
  if(f.includePast===false)add('includePast',/^(closed|finished|ended|final|cancelled|canceled|settled)$/i.test(o.row.eventStatus||'')?'FALSE':!o.start?'UNKNOWN':Date.parse(o.start)<now && !/^(live|inplay|inprogress|in-play|in_play)$/i.test(o.row.eventStatus||'')?'FALSE':'TRUE');
  if(f.freshOnly)add('freshOnly',!o.evidence.capturedAt?'UNKNOWN':now-Date.parse(o.evidence.capturedAt)>900000?'FALSE':'TRUE');
  return {truth:andTruth(checks.map(c=>c.t)),unknown:checks.filter(c=>c.t==='UNKNOWN').map(c=>c.d)};
}
export function deriveFacets(observations:Observation[],filters:Filters,now:number):Record<CatalogDimension,FacetOption[]> {
  return Object.fromEntries(catalogDimensions.map(d=>{
    const options=new Map<string,FacetOption & {events:Set<string>}>();
    for(const o of observations){if(!['VALID','PARTIAL'].includes(o.assessment.status) || filterObservation(o,filters,now,d).truth!=='TRUE')continue;
      for(const v of dimensionValues(o,d)){const option=options.get(v.id)||{...v,count:0,events:new Set<string>()};option.events.add(o.eventId);options.set(v.id,option);}
    }
    return [d,[...options.values()].map(({events,...v})=>({...v,count:events.size})).sort((a,b)=>a.label.localeCompare(b.label,'es')||a.id.localeCompare(b.id))];
  })) as Record<CatalogDimension,FacetOption[]>;
}
