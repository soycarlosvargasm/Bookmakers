import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openRenzoPages} from '../src/ui/country-pages.js';import {createUiServer} from '../src/ui/server.js';import {loadBrands} from '../src/ui/brands.js';import {groupCountries} from '../src/ui/countries.js';
import {installCountryPagesBundle} from '../src/ui/country-pages-bundle.js';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const localState={profile:{info_cache:{Default:{name:'Other'},'Profile 2':{name:'Renzo'}}}};
const processes='123 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n456 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/testing';

test('native Express bundle loads independently of the project and opens the configured country in one invocation',async t=>{
  const resources=await mkdtemp(join(tmpdir(),'country-pages-bundle-'));
  t.after(()=>rm(resources,{recursive:true,force:true}));
  await installCountryPagesBundle(process.cwd(),resources);
  const root=join(resources,'express');
  const script=`import {openRenzoPages} from './src/ui/country-pages.js';
    import {loadBrands} from './src/ui/brands.js';import {groupCountries} from './src/ui/countries.js';
    const country=groupCountries(await loadBrands()).find(value=>value.code==='global'),calls=[];
    const result=await openRenzoPages(country.brands.map(brand=>brand.region.url),{
      localState:${JSON.stringify(localState)},command:async(command,args)=>{calls.push({command,args});return command==='ps'?${JSON.stringify(processes)}:'';}
    });console.log(JSON.stringify({result,calls}));`;
  const {stdout}=await promisify(execFile)(process.execPath,['--input-type=module','-e',script],{cwd:root});
  const {result,calls}=JSON.parse(stdout);
  assert.equal(result.opened,16);
  assert.equal(calls.filter((call:{command:string})=>call.command==='open').length,1);
  assert.equal(calls[1].args.slice(-16).length,16);
});

test('Express opens all distinct URLs in one invocation, preserving Renzo and literal query/fragment arguments',async()=>{
  const calls:Array<{command:string;args:string[]}>=[];const urls=['https://one.test/sports?section=a&view=b#football','https://two.test/','https://two.test/'];
  const result=await openRenzoPages(urls,{localState,command:async(command,args)=>{calls.push({command,args});return command==='ps'?processes:'';}});
  assert.equal(result.opened,2);assert.equal(calls.length,2);assert.equal(calls[1]!.command,'open');assert.ok(calls[1]!.args.includes('--profile-directory=Profile 2'));assert.ok(calls[1]!.args.includes('--new-window'));assert.deepEqual(calls[1]!.args.slice(-2),urls.slice(0,2));
});
test('Express rejects arbitrary schemes, credentials, missing Renzo and only test Chrome before navigation',async()=>{
  let navigations=0;const command=async(name:string)=>{if(name==='open')navigations++;return processes;};
  for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:password@one.test'])await assert.rejects(openRenzoPages([url],{localState,command}));
  await assert.rejects(openRenzoPages(['https://one.test'],{localState:{profile:{info_cache:{Default:{name:'Test'}}}},command}),/Renzo/);
  await assert.rejects(openRenzoPages(['https://one.test'],{localState,command:async()=> '456 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/testing'}),/personal/);assert.equal(navigations,0);
});
test('country Express route enforces native access and only supplies the catalog URLs for every country',async t=>{
  const root=await mkdtemp(join(tmpdir(),'country-pages-'));let urls:string[]=[];const server=await createUiServer({dataDir:root,nativeToken:'fixture-country-pages-token',openCountryPages:async input=>{urls=input;return {opened:input.length};}});t.after(async()=>{await server.close();await rm(root,{recursive:true,force:true});});
  assert.equal((await server.app.inject({method:'POST',url:'/api/countries/open',payload:{country:'global'}})).statusCode,403);
  const catalog=groupCountries(await loadBrands()),headers={'x-collector-app':'fixture-country-pages-token'};
  for(const country of catalog){const response=await server.app.inject({method:'POST',url:'/api/countries/open',headers,payload:{country:country.code}});assert.equal(response.statusCode,200);assert.equal(response.json().mode,'express');assert.deepEqual(urls,[...new Set(country.brands.map(b=>b.region.url))]);assert.equal(response.json().opened,urls.length);}
  assert.equal(catalog.find(c=>c.code==='global')!.brands.length,16);
  assert.equal((await server.app.inject({method:'POST',url:'/api/countries/open',headers,payload:{country:'unknown',urls:['https://arbitrary.test']}})).statusCode,400);
  assert.equal((await server.app.inject({method:'POST',url:'/api/countries/open',headers,payload:{country:['global']}})).statusCode,400);
  assert.equal(server.actions.runs.size,0,'opening pages never creates acquisition runs');
});
test('Express remains available during collection, prevents duplicate in-flight opens and allows retry after failure',async t=>{
  const root=await mkdtemp(join(tmpdir(),'country-pages-lock-'));let release:(()=>void)|undefined;let fail=false;const server=await createUiServer({dataDir:root,openCountryPages:async urls=>{if(fail)throw Error('controlled Chrome error');await new Promise<void>(resolve=>release=resolve);return {opened:urls.length};}});t.after(async()=>{release?.();await server.close();await rm(root,{recursive:true,force:true});});
  server.actions.runs.set('fixture-active',{runId:'fixture-active',source:{type:'fixture',url:'https://fixture.test'},state:'RUNNING',origin:'manual',startedAt:new Date().toISOString()});
  const pending=server.app.inject({method:'POST',url:'/api/countries/open',payload:{country:'global'}});await new Promise<void>(resolve=>{const timer=setInterval(()=>{if(release){clearInterval(timer);resolve();}},2);});
  assert.equal((await server.app.inject({method:'POST',url:'/api/countries/open',payload:{country:'global'}})).statusCode,409);release?.();assert.equal((await pending).statusCode,200);assert.equal(server.actions.runs.get('fixture-active')!.state,'RUNNING','opening pages leaves the active collection untouched');
  fail=true;for(let i=0;i<2;i++)assert.equal((await server.app.inject({method:'POST',url:'/api/countries/open',payload:{country:'global'}})).statusCode,503);
});
