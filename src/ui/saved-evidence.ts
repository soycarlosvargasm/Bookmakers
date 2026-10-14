import { mkdir, readFile, readdir, stat, writeFile, rename } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { type Receipt } from '../engine/collection.js';
import type { ProviderRecord } from '../normalization/types.js';
import { assessRecord, VALIDATION_VERSION } from '../validation/records.js';
import { BESTFIGHTODDS_DOM_PROFILE } from '../profiles/bestfightodds.js';
import type { RecordAssessment } from '../validation/records.js';
import type { Filters } from './workbench.js';

import { organizerDay as dayInZone, catalogDimensions, deriveFacets, dimensionValues, filterObservation, IDENTITY_VERSION, projectObservation, validDate, type Observation, type EntityRef, type SportsCatalog, type CatalogDimension, type FacetOption } from './sports-organizer.js';
import { readSportsCatalog } from './sports-catalog.js';
import { loadBrands } from './brands.js';
const date = validDate;
export type EvidenceRef = { id: string; file: string; capturedAt: string | null; images: string[]; hasText: boolean; row?: number; observedAt?: string | null; confirmedAt?:string|null; domPath?: string };
type SavedFile = { receipt: Receipt; rows: ProviderRecord[]; assessments: RecordAssessment[]; pendingGroups?: Array<{id:string;path:string;reason:string}>; ref: EvidenceRef; reason?: string };
export type EvidenceCard = { id:string; eventId:string; sport:string; league:string; competitionKind?:string; event:string; start:string|null; source:string; bookmaker:string; market:string; period:string|null; line:string|null; variant:string; options:Array<{label:string;price:string;format:string|null;variant:string;selectionId:string;offerId:string;bookmaker:string;source:string;sourceUrl:string;sourceRegion:string|null;evidence:EvidenceRef[];latest:boolean;temporalUncertainty:boolean}>; evidence:EvidenceRef[] };
export type EventCard = {id:string;sport:string;competition:EntityRef|null;territory:Observation['competitionTerritory'];participants:Observation['participants'];organization:EntityRef|null;card:EntityRef|null;season:string|null;event:string;eventType:string;start:string|null;scheduleHistory:Array<{start:string|null;evidence:EvidenceRef}>;markets:EvidenceCard[];missing:string[];conflicts:string[]};
export type OrganizerResult = { cards:EvidenceCard[]; events:EventCard[]; pending:Array<{evidence:EvidenceRef;source:string;reason:string;status?:string;rows?:number[];groupKey?:string;unknownFilters?:string[]}>; captures:EvidenceRef[]; facets:Record<string,string[]>; entityFacets:Record<CatalogDimension,FacetOption[]>; overlapTotal:number;pendingFileTotal:number;counts:{events:number;markets:number;selections:number;offers:number;observations:number;evidenceFiles:number;pendingGroups:number;filterPending:number;interpretationPending:number};catalog:SportsCatalog;warnings:string[];versions:Record<string,string>;removedFilters:Array<{dimension:string;id:string;label:string}>;appliedFilters:Filters };

/** Read-only, incremental view of RAW + receipt metadata. No DB, parser, OCR or AI calls. */
export class SavedEvidenceIndex {
  private files = new Map<string, { fingerprint: string; value: SavedFile | null }>();
  private active?: Promise<SavedFile[]>;
  private revision = 0;
  private projected = new Map<string,{key:string;observations:Observation[]}>();
  private results = new Map<string, { at: number; revision: number; value: OrganizerResult }>();
  constructor(readonly root: string) {}
  async all(): Promise<SavedFile[]> { return this.active ??= this.scan().finally(() => { this.active = undefined; }); }
  private async scan(): Promise<SavedFile[]> {
    const rawDir = join(this.root, 'raw'), receiptDir = join(this.root, 'collection', 'receipts');
    const names: string[] = await readdir(rawDir).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
    const ids = names.filter(name => /^[a-zA-Z0-9_-]+\.json$/.test(name)).map(name => basename(name, '.json')).sort();
    const alive = new Set(ids);
    for (const id of this.files.keys()) if (!alive.has(id)) { this.files.delete(id); this.projected.delete(id); this.revision++; }
    // Bounded concurrency avoids thousands of simultaneous file reads on first use.
    for (let offset = 0; offset < ids.length; offset += 24) await Promise.all(ids.slice(offset, offset + 24).map(async id => {
      const rawPath = join(rawDir, `${id}.json`), receiptPath = join(receiptDir, `${id}.json`);
      const [rawStat, receiptStat] = await Promise.all([stat(rawPath), stat(receiptPath).catch(error => { if (error.code === 'ENOENT') return null; throw error; })]);
      const fingerprint = `${VALIDATION_VERSION}:${BESTFIGHTODDS_DOM_PROFILE.version}:${IDENTITY_VERSION}:${rawStat.mtimeMs}:${rawStat.size}:${receiptStat?.mtimeMs}:${receiptStat?.size}`;
      if (this.files.get(id)?.fingerprint === fingerprint) return;
      let value: SavedFile | null = null;
      try {
        const raw = JSON.parse(await readFile(rawPath, 'utf8'));
        const payload = raw.evidence?.payload;
        if (payload?.verificationFixture === true || payload?.liveSportsbook === false) {
          this.files.set(id, { fingerprint, value }); this.revision++; return;
        }
        const saved: Receipt | null = receiptStat ? JSON.parse(await readFile(receiptPath, 'utf8')) : null;
        const rows: ProviderRecord[] = Array.isArray(payload?.records) ? payload.records.filter((r: unknown) => r && typeof r === 'object' && !Array.isArray(r)) : [];
        const capturedAt = date(raw.evidence?.capturedAt); // Never substitute ingestion / last_seen / retrievedAt.
        const images: string[] = [...new Set<string>([raw.evidence?.screenshotPath, ...(raw.evidence?.screenshotPaths ?? [])].filter((p: unknown) => typeof p === 'string').map((p: string) => basename(p)))];
        const receipt: Receipt = { id, source: raw.source?.type && raw.source?.url ? raw.source : saved?.source ?? { type: 'Fuente sin identificar', url: '' }, url: raw.evidence?.url || raw.source?.url || '', capturedAt: capturedAt || '', method: raw.method || 'unknown', records: raw.recordCount ?? rows.length, summary: Boolean(payload?.pageRawPaths?.length), groups: saved?.groups ?? [], images, ingestion: saved?.ingestion ?? 'UNKNOWN', error: saved?.error };
        const ref = { id, file: `${id}.json`, capturedAt, images, hasText: Boolean(raw.evidence?.textPath || payload?.copiedText) };
        value = { receipt, rows, assessments: rows.map(row => assessRecord(row,receipt.url)), pendingGroups:[...(Array.isArray(payload?.pendingGroups) ? payload.pendingGroups : []), ...(Array.isArray(payload?.rejectedRecords) && payload.rejectedRecords.length ? [{id:"rejected",path:"",reason:`${payload.rejectedRecords.length} registros rechazados por asociación insuficiente o conflicto; conservados en el RAW original.`}] : [])], ref, ...(!rows.length ? { reason: payload?.pendingReason || (receipt.summary ? 'Resumen del recorrido; revisar los archivos originales de cada página.' : 'Pendiente de interpretación: no hay registros clasificados. Esto no indica que la imagen esté vacía.') } : {}) };
        if (raw.recordCount > rows.length) value.reason = 'Datos parciales: el archivo contiene información todavía sin clasificar.';
      } catch (error) {
        // Even unreadable/unclassified files remain reviewable; never infer an empty image.
        const saved: Receipt | null = receiptStat ? await readFile(receiptPath, 'utf8').then(text => JSON.parse(text)).catch(() => null) : null;
        const receipt: Receipt = saved ?? { id, source: {type:'Fuente sin identificar',url:''}, url:'', capturedAt:'', method:'unknown', records:0, summary:false, groups:[], images:names.filter(name => name === `${id}.png` || name.startsWith(`${id}-tile-`) && name.endsWith('.png')), ingestion:'UNKNOWN' };
        value = { receipt, rows: [], assessments: [], ref: { id, file: `${id}.json`, capturedAt: date(receipt.capturedAt), images: receipt.images, hasText: names.includes(`${id}.txt`) }, reason: 'No se pudo leer el archivo guardado.' };
      }
      // Auxiliary classification is versioned, replaceable and never changes RAW/text/images.
      if (value) {
        const folder = join(this.root,'collection','classification'); await mkdir(folder,{recursive:true});
        const target = join(folder,`${id}.json`), temporary = `${target}.tmp`;
        await writeFile(temporary,JSON.stringify({version:VALIDATION_VERSION,identity:IDENTITY_VERSION,parser:BESTFIGHTODDS_DOM_PROFILE.version,fingerprint,rows:value.assessments,reason:value.reason}));
        await rename(temporary,target);
      }
      this.files.set(id, { fingerprint, value }); this.revision++;
    }));
    return [...this.files.values()].flatMap(f => f.value ? [f.value] : []);
  }
  async receipt(id: string) { return (await this.all()).find(f => f.receipt.id === id)?.receipt; }
  async organize(filters: Filters, selection: { source?: { type: string; url: string }; ids?: string[]; reconcileFrom?:CatalogDimension }, now = Date.now()): Promise<OrganizerResult> {
    const [files, snapshot, brands] = await Promise.all([this.all(),readSportsCatalog(this.root),loadBrands()]);
    const cacheKey=JSON.stringify([filters,selection,snapshot.fingerprint]),prior=this.results.get(cacheKey);
    if(prior && prior.revision===this.revision && (!(filters.freshOnly || filters.includePast===false) || now-prior.at<60000))return prior.value;
    const selected=selection.ids?new Set(selection.ids):null;
    const scoped=files.filter(f=>(!selected || selected.has(f.ref.id)) && (!selection.source || f.receipt.source.type===selection.source.type && f.receipt.source.url===selection.source.url));
    const projectionVersion=JSON.stringify([snapshot.fingerprint,brands,IDENTITY_VERSION]);
    const observations=scoped.flatMap(f=>{
      const key=JSON.stringify([this.files.get(f.ref.id)?.fingerprint,projectionVersion]),prior=this.projected.get(f.ref.id);
      if(prior?.key===key)return prior.observations;
      const observations=f.rows.map((row,i)=>projectObservation(row,{...f.ref,row:i,observedAt:date(row.collectedAt),domPath:row.qualifiers?.selectionPath},f.receipt.source,f.assessments[i]!,snapshot.catalog,brands));
      this.projected.set(f.ref.id,{key,observations});return observations;
    });
    const appliedFilters={...filters},removedFilters:OrganizerResult['removedFilters']=[];
    const descendants:Partial<Record<CatalogDimension,CatalogDimension[]>>={territory:['competitionId','cardId','participantId','eventId'],sportId:['competitionId','organizationId','cardId','participantId','eventId'],competitionId:['participantId','eventId'],organizationId:['cardId','participantId','eventId'],cardId:['participantId','eventId'],participantId:['eventId']};
    const children=selection.reconcileFrom?descendants[selection.reconcileFrom]||[]:[];
    const base={...appliedFilters};for(const d of children)delete base[d];
    for(const d of children){if(!appliedFilters[d]?.length)continue;const compatible=deriveFacets(observations,base,now)[d];
      appliedFilters[d]=appliedFilters[d]!.filter(id=>{if(compatible.some(v=>v.id===id))return true;const label=observations.flatMap(o=>dimensionValues(o,d)).find(v=>v.id===id)?.label||id;removedFilters.push({dimension:d,id,label});return false;});
      base[d]=appliedFilters[d];
    }
    const pending:OrganizerResult['pending']=[],pendingGroups=new Map<string,OrganizerResult['pending'][number]>(),matches:Observation[]=[],validFiles=new Set<string>(),pendingFiles=new Set<string>(),captureMap=new Map<string,EvidenceRef>();
    const addPending=(o:Observation|undefined,ref:EvidenceRef,source:string,reason:string,status:string,unknownFilters?:string[])=>{
      const groupKey=JSON.stringify([ref.id,status,reason,o?.eventId,o?.marketId]),existing=pendingGroups.get(groupKey);
      if(existing){if(ref.row!==undefined)existing.rows!.push(ref.row);}else {const group={evidence:ref,source,reason,status,rows:ref.row!==undefined?[ref.row]:[],groupKey,unknownFilters};pending.push(group);pendingGroups.set(groupKey,group);}
      pendingFiles.add(ref.id);captureMap.set(ref.id,ref);
    };
    for(const o of observations){const match=filterObservation(o,appliedFilters,now);if(match.truth==='FALSE')continue;
      if(['AMBIGUOUS','UNRELATED'].includes(o.assessment.status)){addPending(o,o.evidence,o.source.type,o.assessment.reason,o.assessment.status,match.unknown);continue;}
      if(match.truth==='UNKNOWN'){addPending(o,o.evidence,o.source.type,`Pendiente de filtro: no se puede comprobar ${match.unknown.join(', ')}. ${o.missing.join(', ')}${o.conflicts.length?'. '+o.conflicts.join(', '):''}`,'FILTER_UNKNOWN',match.unknown);continue;}
      if(['future','race'].includes(o.eventType)){addPending(o,o.evidence,o.source.type,'Ámbito fuera de esta vista de enfrentamientos; consultar la evidencia original.','OUT_OF_SCOPE');continue;}
      matches.push(o);validFiles.add(o.evidence.id);captureMap.set(o.evidence.id,o.evidence);
      if(o.missing.length || o.conflicts.length)addPending(o,o.evidence,o.source.type,`Metadatos sin resolver: ${o.missing.join(', ')}${o.conflicts.length?'. '+o.conflicts.join(', '):''}. La cuota conserva su asociación.`,'PARTIAL');
    }
    for(const f of scoped){
      const pseudo=projectObservation({},f.ref,f.receipt.source,{status:'AMBIGUOUS',reason:''},snapshot.catalog,brands);
      if(filterObservation(pseudo,appliedFilters,now).truth==='FALSE')continue;
      for(const group of f.pendingGroups||[])addPending(undefined,f.ref,f.receipt.source.type,group.reason,'UNPARSED');
      if(f.reason)addPending(undefined,f.ref,f.receipt.source.type,f.reason,'UNPARSED');
    }
    const cards=new Map<string,EvidenceCard>(),events=new Map<string,EventCard>(),offers=new Map<string,Observation[]>();
    for(const o of matches){const {row}=o;const id=o.marketId;let card=cards.get(id);
      if(!card){card={id,eventId:o.eventId,sport:row.sport||'Deporte sin identificar',league:o.competition?.displayName||'Competición por confirmar',competitionKind:o.competition?.kind,event:row.eventName||'Ámbito por confirmar',start:o.start,source:o.source.type,bookmaker:o.bookmaker||'Casa sin identificar',market:row.market!,period:row.marketPeriod||null,line:row.sportsMetadata?.marketLine!==undefined?row.sportsMetadata.marketLine:row.line??null,variant:Object.entries(o.rules).map(([k,v])=>`${k}: ${v}`).join(' · '),options:[],evidence:[]};cards.set(id,card);}
      const price=typeof row.rawOdds==='string'&&row.rawOdds.trim()?row.rawOdds:String(row.decimalOdds);
      const variant=Object.entries(row.qualifiers||{}).filter(([k])=>k.startsWith('selection.')).map(([k,v])=>`${k}: ${v}`).join(' · ');
      let option=card.options.find(v=>v.offerId===o.offerId && v.price===price && v.format===(row.rawOddsFormat||null) && v.variant===variant);
      if(!option){option={label:row.selection!+(row.line!=null&&!row.selection!.includes(String(row.line))?` ${row.line}`:''),price,format:row.rawOddsFormat||null,variant,selectionId:o.selectionId,offerId:o.offerId,bookmaker:o.bookmaker||'Casa sin identificar',source:o.source.type,sourceUrl:row.sourceUrl||o.source.url,sourceRegion:o.sourceRegion.value,evidence:[],latest:false,temporalUncertainty:false};card.options.push(option);}
      option.evidence.push({...o.evidence,confirmedAt:o.confirmedAt});if(!card.evidence.some(e=>e.id===o.evidence.id))card.evidence.push(o.evidence);
      const list=offers.get(o.offerId)||[];list.push(o);offers.set(o.offerId,list);
      let event=events.get(o.eventId);if(!event){event={id:o.eventId,sport:card.sport,competition:o.competition,territory:o.competitionTerritory,participants:o.participants,organization:o.organization,card:o.card,season:o.season,event:card.event,eventType:o.eventType,start:o.start,scheduleHistory:[],markets:[],missing:[],conflicts:[]};events.set(o.eventId,event);}
      if(!event.markets.some(m=>m.id===id))event.markets.push(card);
      event.scheduleHistory.push({start:o.start,evidence:o.evidence});
      event.missing=[...new Set([...event.missing,...o.missing])];event.conflicts=[...new Set([...event.conflicts,...o.conflicts])];
    }
    // A trustworthy ordering requires an observation timestamp for every observation.
    // Ties with different prices remain explicit; capture time is never event time.
    for(const card of cards.values())for(const option of card.options){const list=offers.get(option.offerId)!;const known=list.every(o=>o.observedAt!==null);const max=known?Math.max(...list.map(o=>Date.parse(o.observedAt!))):null;
      const recent=known?list.filter(o=>Date.parse(o.observedAt!)===max):[];const tiedPrices=new Set(recent.map(o=>JSON.stringify([o.row.rawOdds,o.row.rawOddsFormat])));
      option.temporalUncertainty=!known || tiedPrices.size>1;
      option.latest=known && tiedPrices.size===1 && option.evidence.some(e=>recent.some(o=>o.evidence.id===e.id && o.evidence.row===e.row));
    }
    for(const event of events.values()){
      const history=event.scheduleHistory.filter(h=>h.start);const dated=history.every(h=>h.evidence.observedAt);
      const ordered=dated?[...history].sort((a,b)=>Date.parse(b.evidence.observedAt!)-Date.parse(a.evidence.observedAt!)):history;
      const latest=ordered[0];const simultaneous=latest && ordered.filter(h=>h.evidence.observedAt===latest.evidence.observedAt);
      if(new Set(history.map(h=>h.start)).size>1 && (!dated || new Set(simultaneous?.map(h=>h.start)).size>1)){event.start=null;event.conflicts.push('Horario con conflicto; consulta el historial en la evidencia');}
      else event.start=latest?.start||null;
    }
    const compare=(a:EventCard,b:EventCard)=>(a.territory.value?.displayName||'~').localeCompare(b.territory.value?.displayName||'~','es') || a.sport.localeCompare(b.sport,'es') || (a.competition?.displayName||'').localeCompare(b.competition?.displayName||'','es') || (a.start||'9999').localeCompare(b.start||'9999') || a.id.localeCompare(b.id);
    const entityFacets=deriveFacets(observations,appliedFilters,now),facets:Record<string,string[]>={};
    for(const name of ['sport','league','search','source','bookmaker','marketName','from','captureFrom']){
      const values=new Set<string>();for(const o of observations){if(!['VALID','PARTIAL'].includes(o.assessment.status) || filterObservation(o,appliedFilters,now,name).truth!=='TRUE')continue;
        const value=({sport:o.row.sport,league:o.row.competition,search:o.row.eventName,source:o.source.type,bookmaker:o.bookmaker,marketName:o.row.market,from:o.start&&dayInZone(o.start,'Asia/Bangkok'),captureFrom:o.evidence.capturedAt&&dayInZone(o.evidence.capturedAt,'Asia/Bangkok')} as Record<string,string|null|undefined>)[name];if(value)values.add(value);}
      facets[name]=[...values].sort((a,b)=>a.localeCompare(b,'es'));
    }
    const value:OrganizerResult={cards:[...cards.values()],events:[...events.values()].sort(compare),pending,captures:[...captureMap.values()],facets,entityFacets,overlapTotal:[...validFiles].filter(id=>pendingFiles.has(id)).length,pendingFileTotal:pendingFiles.size,
      counts:{events:events.size,markets:cards.size,selections:new Set(matches.map(o=>o.selectionId)).size,offers:offers.size,observations:matches.length,evidenceFiles:validFiles.size,pendingGroups:pending.length,filterPending:pending.filter(p=>p.status==='FILTER_UNKNOWN').length,interpretationPending:pending.filter(p=>['AMBIGUOUS','UNRELATED','UNPARSED'].includes(p.status||'')).length},catalog:snapshot.catalog,warnings:snapshot.warning?[snapshot.warning]:[],versions:{parser:BESTFIGHTODDS_DOM_PROFILE.version,validation:VALIDATION_VERSION,identity:IDENTITY_VERSION,catalog:snapshot.catalog.identityVersion,territory:snapshot.catalog.territoryVersion,logos:snapshot.catalog.logoVersion},removedFilters,appliedFilters};
    this.results.set(cacheKey,{at:now,revision:this.revision,value});if(this.results.size>8)this.results.delete(this.results.keys().next().value!);return value;
  }
}
const indexes = new Map<string, SavedEvidenceIndex>();
export function savedEvidence(root: string) { const path = resolve(root); let index = indexes.get(path); if (!index) { index = new SavedEvidenceIndex(path); indexes.set(path, index); } return index; }
