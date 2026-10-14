import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import { renzoChromePid, renzoProfileDirectory, type ChromeCommandRunner } from '../engine/renzo-browser.js';
import { loadBrands } from './brands.js';
import { findCountry, groupCountries } from './countries.js';

const executeFile=promisify(execFile);
const run:ChromeCommandRunner=async(command,args)=>{const result=await executeFile(command,args,{timeout:10000,maxBuffer:1024*1024});return result.stdout.trim();};

/** One Chrome invocation starts all navigations together, without waiting for any
 * site to load. The new window belongs to the user, not to the collector's runner. */
export async function openRenzoPages(urls:string[], options:{command?:ChromeCommandRunner;localState?:unknown}={}):Promise<{opened:number}> {
  if(process.platform!=='darwin'&&!options.command)throw new Error('Abrir país Express requiere Chrome en macOS.');
  if(!urls.length||urls.length>100)throw new Error('No hay páginas válidas para abrir.');
  const validated=[...new Set(urls.map(value=>{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('URL de fuente no válida.');return url.href;}))];
  const state=options.localState??JSON.parse(await readFile(join(homedir(),'Library/Application Support/Google/Chrome/Local State'),'utf8'));
  const directory=renzoProfileDirectory(state),command=options.command??run;
  renzoChromePid(await command('ps',['-axo','pid=,command=']));
  // All arguments are passed as an argv array, including query strings and fragments.
  await command('open',['-n','-a','/Applications/Google Chrome.app','--args',`--profile-directory=${directory}`,'--new-window',...validated]);
  return {opened:validated.length};
}
export type CountryPagesOpener=(urls:string[])=>Promise<{opened:number}>;
export function registerCountryPagesRoutes(app:FastifyInstance,opener:CountryPagesOpener=openRenzoPages){
  const opening=new Set<string>();
  app.post<{Body:{country?:unknown}}>('/api/countries/open',async(request,reply)=>{
    const country=findCountry(request.body?.country);if(!country)return reply.code(400).send({error:'Selecciona un país del catálogo.'});
    const group=groupCountries(await loadBrands()).find(c=>c.code===country.code)!;
    const urls=[...new Set(group.brands.map(b=>b.region.url))];if(!urls.length)return reply.code(400).send({error:'Este país no tiene páginas configuradas.'});
    if(opening.has(country.code))return reply.code(409).send({error:'Las páginas de este país ya se están abriendo.'});
    opening.add(country.code);
    try{const result=await opener(urls);return {country:country.code,name:country.name,opened:result.opened,mode:'express',message:`${result.opened} ${result.opened===1?'pestaña abierta':'pestañas abiertas'} en Chrome Renzo. Las páginas cargan a la vez.`};}
    catch(error){return reply.code(503).send({error:(error as Error).message});}
    finally{opening.delete(country.code);}
  });
}
