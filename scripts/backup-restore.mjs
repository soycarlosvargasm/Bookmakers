import {execFileSync,spawnSync} from 'node:child_process';
import {open,readFile,rename} from 'node:fs/promises';
const [action,path,target]=process.argv.slice(2);
const container=process.env.POSTGRES_CONTAINER??'sportsbookcollector-postgres-1';
const config=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];
const env=Object.fromEntries(config.Config.Env.map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)]}));
if(!env.POSTGRES_USER||!env.POSTGRES_DB)throw new Error('PostgreSQL container configuration missing');
if(action==='backup'){
  if(!path)throw new Error('Usage: backup-restore.mjs backup OUTPUT.dump');
  const dump=execFileSync('docker',['exec',container,'pg_dump','-U',env.POSTGRES_USER,'-d',env.POSTGRES_DB,'-Fc'],{maxBuffer:1024*1024*1024});
  const tmp=path+'.partial';const file=await open(tmp,'wx',0o600);
  try{await file.writeFile(dump);await file.sync();}finally{await file.close();}
  await rename(tmp,path);console.log(`backup complete: ${dump.byteLength} bytes`);
}else if(action==='restore'){
  if(!path||!target||!/^[a-z][a-z0-9_]*_restore[0-9]*$/.test(target)||target===env.POSTGRES_DB)throw new Error('Restore target must be an isolated *_restore database');
  const exists=execFileSync('docker',['exec',container,'psql','-U',env.POSTGRES_USER,'-d',env.POSTGRES_DB,'-At','-c',`SELECT 1 FROM pg_database WHERE datname='${target}'`],{encoding:'utf8'}).trim();
  if(exists)throw new Error('Restore target already exists; refusing to overwrite');
  execFileSync('docker',['exec',container,'createdb','-U',env.POSTGRES_USER,target]);
  const restored=spawnSync('docker',['exec','-i',container,'pg_restore','-U',env.POSTGRES_USER,'-d',target,'--exit-on-error'],{input:await readFile(path),encoding:'utf8',maxBuffer:1024*1024*1024});
  if(restored.status!==0)throw new Error(`pg_restore failed: ${restored.stderr.slice(0,500)}`);
  console.log(`restored isolated database ${target}`);
}else throw new Error('Usage: backup-restore.mjs backup OUTPUT.dump | restore INPUT.dump target_restore');
