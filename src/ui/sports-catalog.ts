import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';
import type { Pool } from 'pg';
import type { EntityRef, LogoAsset, SportsCatalog } from './sports-organizer.js';
import { emptyCatalog, canonicalJSON } from './sports-organizer.js';

export async function readSportsCatalog(root:string):Promise<{catalog:SportsCatalog;fingerprint:string;warning:string|null}> {
  try{
    const content=await readFile(join(root,'collection','sports-catalog.json'),'utf8'), c=JSON.parse(content);
    if(c.schema!==1 || !['identityVersion','territoryVersion','logoVersion'].every(k=>typeof c[k]==='string') || !['entries','events','logoLinks','logos'].every(k=>Array.isArray(c[k])))throw Error('Esquema de catálogo incompatible');
    for(const e of c.entries) if(!e.entity || typeof e.entity.id!=='string' || !Array.isArray(e.entity.externalIds) || !Array.isArray(e.evidenceRefs))throw Error('Correspondencia inválida');
    return {catalog:c,fingerprint:createHash('sha256').update(content).digest('hex'),warning:null};
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {catalog:emptyCatalog,fingerprint:'empty',warning:null};return {catalog:emptyCatalog,fingerprint:'invalid',warning:'Catálogo auxiliar no utilizable; se conservan las identidades locales.'};}
}
export type LogoState={status:'available'|'missing'|'conflict'|'broken';url:string|null;reason:string};
const typeMatches=(kind:EntityRef['kind'],type:string)=>kind==='competition'?['league','tournament'].includes(type):kind==='team'?['team','club'].includes(type):kind==='organization'?type==='federation':kind===type;
export class SportsLogoCatalog {
  private assets=new Map<string,{buffer:Buffer;type:string}>();
  constructor(readonly assetRoot=resolve('data/logos/assets'),readonly pool?:Pool){}
  async attach(entities:EntityRef[],catalog:SportsCatalog):Promise<Record<string,LogoState>> {
    this.assets.clear();
    const assets=[...catalog.logos];
    // Read selected rows only after an independently reviewed typed crosswalk exists.
    const ids=[...new Set(catalog.logoLinks.filter(l=>l.reviewed===true && l.evidenceRefs?.length).map(l=>l.betfluxId))];
    if(this.pool && ids.length){try{assets.push(...(await this.pool.query<LogoAsset>('SELECT betflux_entity_id,entity_type,sha256,canonical_path,media_type FROM sports_entity_logos WHERE betflux_entity_id = ANY($1::text[])',[ids])).rows);}catch{/* Offline snapshot remains sufficient; no speculative correspondence. */}}
    const result:Record<string,LogoState>={};
    for(const e of entities){
      const links=catalog.logoLinks.filter(l=>l.reviewed===true && l.evidenceRefs?.length && l.entityId===e.id && l.kind===e.kind);
      const candidates=assets.filter(a=>links.some(l=>l.betfluxId===a.betflux_entity_id) && typeMatches(e.kind,a.entity_type));
      const distinct=new Map(candidates.map(a=>[canonicalJSON([a.betflux_entity_id,a.sha256]),a]));
      let state:LogoState={status:'missing',url:null,reason:'Sin logotipo'};
      if(new Set(links.map(l=>l.betfluxId)).size>1 || distinct.size>1)state={status:'conflict',url:null,reason:'Correspondencia de logotipo ambigua; requiere revisión'};
      else if(distinct.size===1){const asset=[...distinct.values()][0]!;const resource=await this.readApproved(asset);
        if(resource){this.assets.set(asset.sha256,resource);state={status:'available',url:`/api/workbench/logos/${asset.sha256}`,reason:'Logotipo por correspondencia revisada'};}
        else state={status:'broken',url:null,reason:'Sin logotipo · archivo no disponible o no aprobado'};
      }
      result[e.id]=state;
    }
    return result;
  }
  private async readApproved(a:LogoAsset):Promise<{buffer:Buffer;type:string}|null>{
    if(!/^[a-f0-9]{64}$/.test(a.sha256) || !['image/png','image/jpeg','image/webp'].includes(a.media_type))return null;
    try{
      const root=await realpath(this.assetRoot), path=await realpath(resolve(root,a.canonical_path));
      if(!path.startsWith(root+sep))return null;
      if(!['.png','.jpg','.jpeg','.webp'].includes(extname(path).toLowerCase()))return null;
      const buffer=await readFile(path);
      if(buffer.length>10*1024*1024 || createHash('sha256').update(buffer).digest('hex')!==a.sha256)return null;
      const valid=a.media_type==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):a.media_type==='image/jpeg'?buffer[0]===255 && buffer[1]===216:buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP';
      return valid?{buffer,type:a.media_type}:null;
    }catch{return null;}
  }
  resource(hash:string){return this.assets.get(hash);}
}
