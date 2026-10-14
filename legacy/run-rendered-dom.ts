import { loadConfig } from "./config/index.js";
import { RenderedDomDiscoveryEngine, type DomDiscoveryReport } from "./dom/discovery.js";
import { loadSourceCatalog, SourceRegistryRepository } from "./sources/registry.js";
import { PostgresStorage } from "./storage/postgres.js";
import { SupabaseManagementDiscoveryRepository } from "./storage/supabase-management.js";
import type { NormalizedRecord, RawPayloadInput } from "./normalization/types.js";

const INITIAL_DOMAINS=["esportsinsider.com","kh8.bio","m71p.io","tk791.io","top99.im","actionnetwork.com","oddshub.io","strikingodds.io"];
const config=loadConfig();
const requested=(process.env.RENDERED_DOM_DOMAINS??INITIAL_DOMAINS.join(",")).split(",").map((value)=>value.trim()).filter(Boolean);
class DomCaptureBuffer {
  readonly rawPayloads:RawPayloadInput[]=[];
  readonly records:NormalizedRecord[]=[];
  async saveRawPayload(payload:RawPayloadInput):Promise<void>{this.rawPayloads.push(payload);}
  async saveNormalizedRecords(records:NormalizedRecord[]):Promise<void>{this.records.push(...records);}
}
const directStorage=config.databaseUrl?new PostgresStorage(config.databaseUrl):null;
const managementRepository=directStorage?null:await SupabaseManagementDiscoveryRepository.fromLinkedProject();
const repository=directStorage?new SourceRegistryRepository(directStorage.pool):managementRepository!;
const captureBuffer=directStorage?null:new DomCaptureBuffer();
const options={timeoutMs:Number(process.env.RENDERED_DOM_TIMEOUT_MS??20_000),renderWaitMs:Number(process.env.RENDERED_DOM_RENDER_WAIT_MS??1_200),maxScrolls:Number(process.env.RENDERED_DOM_MAX_SCROLLS??6),maxNodes:Number(process.env.RENDERED_DOM_MAX_NODES??3_000),maxDepth:Number(process.env.RENDERED_DOM_MAX_DEPTH??10)};
const engine=new RenderedDomDiscoveryEngine(directStorage??captureBuffer!,options);
try {
  await repository.sync(await loadSourceCatalog());
  const sources=await repository.sourcesForDomains(requested);
  const found=new Set(sources.map((source)=>source.domain.replace(/^www\./,"")));
  const missing=requested.filter((domain)=>!found.has(domain.replace(/^www\./,"")));
  if(missing.length)throw new Error(`Requested domains are absent from source registry: ${missing.join(", ")}`);
  const reports:DomDiscoveryReport[]=[];
  for(const source of sources){
    const profile=await repository.getDomProfile(source.domain);
    const report=await engine.discover(source,profile);
    if(managementRepository){
      const buffer=engineStorageBuffer();
      await managementRepository.saveDomDiscovery(source,report,profile,buffer.rawPayloads,buffer.records);
      buffer.rawPayloads.length=0;
      buffer.records.length=0;
    } else await (repository as SourceRegistryRepository).saveDomDiscovery(source,report,profile);
    reports.push(report);
    console.log(JSON.stringify({renderedDom:"domain",domain:source.domain,status:report.status,eventCards:report.extraction.detectedEventCards,visibleOdds:report.extraction.visibleOdds,rawSaved:report.rawSaved,normalizedRecords:report.normalizedRecords}));
  }
  console.log(JSON.stringify({renderedDom:"finished",domains:reports.length,statuses:Object.fromEntries(["DOM_RECOVERED","DOM_NO_CURRENT_MARKETS","DOM_NO_SPORTS_DATA","DOM_AMBIGUOUS","NEEDS_ACCESSIBILITY","NEEDS_VISUAL","PAGE_UNAVAILABLE"].map((status)=>[status,reports.filter((report)=>report.status===status).length])),rawSaved:reports.reduce((sum,report)=>sum+report.rawSaved,0),normalizedRecords:reports.reduce((sum,report)=>sum+report.normalizedRecords,0)}));
} finally {await engine.close();await directStorage?.close();}

function engineStorageBuffer():DomCaptureBuffer {
  if(!captureBuffer)throw new Error("DOM capture buffer is unavailable");
  return captureBuffer;
}
