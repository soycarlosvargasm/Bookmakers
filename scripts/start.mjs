// Container entry point: derive a safe internal database URL from Compose's PG fields.
if (!process.env.DATABASE_URL && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  const url=new URL('postgresql://localhost');
  url.hostname=process.env.PGHOST;
  url.port=process.env.PGPORT??'5432';
  url.username=process.env.PGUSER;
  url.password=process.env.PGPASSWORD;
  url.pathname='/'+process.env.PGDATABASE;
  process.env.DATABASE_URL=url.toString();
}
if (process.env.DATABASE_URL && process.env.RUN_APP_MIGRATIONS !== "false") await import('./migrate.mjs');
await import('../dist/src/main.js');
