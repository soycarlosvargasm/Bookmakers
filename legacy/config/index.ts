export type AppConfig = {
  host: string;
  port: number;
  databaseUrl?: string;
  apiKey?: string;
  sessionStoragePath: string;
  betonlineCdpUrl?: string;
  pollingEnabled: boolean;
  logLevel: string;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const databaseUrlFromPg = (env: NodeJS.ProcessEnv): string | undefined => {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!env.PGHOST || !env.PGUSER || !env.PGPASSWORD || !env.PGDATABASE) return undefined;
  const url = new URL("postgresql://localhost");
  url.hostname = env.PGHOST;
  url.username = env.PGUSER;
  url.password = env.PGPASSWORD;
  url.pathname = `/${env.PGDATABASE}`;
  return url.toString();
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  host: env.HOST ?? "127.0.0.1",
  port: Number(env.PORT ?? 8787),
  databaseUrl: databaseUrlFromPg(env),
  apiKey: env.API_KEY,
  sessionStoragePath: env.SESSION_STORAGE_PATH ?? ".sessions",
  betonlineCdpUrl: env.BETONLINE_CDP_URL ?? env.BROWSER_CDP_URL,
  pollingEnabled: parseBoolean(env.POLLING_ENABLED, false),
  logLevel: env.LOG_LEVEL ?? "info"
});
