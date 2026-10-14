// Local audit helper: never prints container credentials. Explicit URL wins.
import { execFileSync } from 'node:child_process';
export function localDatabaseUrl(database) {
  if (process.env.DATABASE_URL) { const u = new URL(process.env.DATABASE_URL); if(database) u.pathname = '/' + database; return u.toString(); }
  const info = JSON.parse(execFileSync('docker', ['inspect', 'sportsbookcollector-postgres-1'], {encoding:'utf8'}))[0];
  const env = Object.fromEntries(info.Config.Env.map(s => { const i=s.indexOf('='); return [s.slice(0,i),s.slice(i+1)]; }));
  const u = new URL('postgresql://127.0.0.1:5432'); u.username=env.POSTGRES_USER; u.password=env.POSTGRES_PASSWORD; u.pathname='/'+(database || env.POSTGRES_DB); return u.toString();
}
