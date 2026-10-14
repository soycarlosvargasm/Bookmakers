// Run with: node --import tsx scripts/verify-workbench-native.ts
// Uses isolated local fixtures and the existing native shell. No ingestion or extraction starts.
import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { createUiServer } from '../src/ui/server.js';
import { saveSportsCatalogFixtures } from '../tests/fixtures/sports-catalog.js';
import { saveEvidenceFixtures } from '../tests/fixtures/workbench-evidence.js';
const root=await mkdtemp(join(tmpdir(),'workbench-native-'));
await saveEvidenceFixtures(root,true);
await saveSportsCatalogFixtures(root);
const token='local-workbench-review-fixture-token';
await mkdir(join(root,'.engine','ui'),{recursive:true});
await writeFile(join(root,'.engine','ui','native-access.json'),JSON.stringify({token}),{mode:0o600});
const appPath=join(root,'Sportsbook Collector Review.app');
await cp(resolve('dist/ui-macos/Sportsbook Collector.app'),appPath,{recursive:true});
const plist=join(appPath,'Contents','Info.plist');
await writeFile(plist,(await readFile(plist,'utf8')).replace('com.sportsbookcollector.local','com.sportsbookcollector.workbench-review'));
await writeFile(join(appPath,'Contents','Resources','launch.json'),JSON.stringify({root,node:process.execPath,port:3447}));
const server=await createUiServer({dataDir:root,nativeToken:token,port:3447});
await server.listen();
// Sports page for testing user-controlled scroll; the administrator remains native.
const sportsPage=createServer((_request,response)=>{
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  response.end('<html><head><title>Lectura manual · fixture local</title></head><body style="font:28px Arial"><main><section style="height:1300px"><h2>Alpha vs Beta</h2><p>Alpha -150</p><p>Beta +190</p></section><section style="height:1300px"><h2>Gamma vs Delta</h2><p>Gamma 3/2</p><p>Delta 2.50</p></section></main></body></html>');
});
await new Promise<void>(resolve=>sportsPage.listen(3448,'127.0.0.1',resolve));
console.log(JSON.stringify({appPath,root,port:3447,manualUrl:'http://127.0.0.1:3448/'}));
const close=()=>{sportsPage.close();void server.close().then(()=>process.exit(0));};
process.once('SIGINT',close);
process.once('SIGTERM',close);
