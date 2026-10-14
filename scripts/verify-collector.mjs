import { Pool } from 'pg';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
// All fixtures stay in a newly created disposable database, never the user's data.
if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');
const configured = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(configured.hostname)) throw Error('Verification requires the local project PostgreSQL.');
const admin = new Pool({connectionString: configured.href});
const name = `collector_verification_${process.pid}_${Date.now()}`;
let created = false;
try {
  const owner = (await admin.query('SELECT current_user')).rows[0].current_user;
  try { await admin.query(`CREATE DATABASE "${name}"`); }
  catch (error) {
    if (error.code !== '42501') throw error;
    const ownerQuoted = '"' + owner.replaceAll('"', '""') + '"';
    const result = spawnSync('docker',['exec','-i','sportsbookcollector-postgres-1','sh','-c','exec psql -v ON_ERROR_STOP=1 -U collector -d postgres'],{input:`CREATE DATABASE "${name}" OWNER ${ownerQuoted};`,encoding:'utf8'});
    if(result.status !== 0) throw Error('Could not create isolated verification database: '+result.stderr);
  }
  created = true;
  configured.pathname = `/${name}`;
  const env = {...process.env,DATABASE_URL:configured.href,TEST_DATABASE_URL:configured.href};
  delete env.SUPABASE_DB_URL;
  const migrations = spawnSync(process.execPath,['scripts/migrate.mjs'],{env,stdio:'inherit'});
  if (migrations.status !== 0) throw Error('Verification migrations failed.');
  const test = spawnSync('npm',['test'],{env,stdio:'inherit'});
  process.exitCode = test.status ?? 1;
} finally {
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
