import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Pool } from "pg";
const exec = promisify(execFile);

/** Recover only the existing project's local PostgreSQL container. Never
 * provision another database, alter credentials or connect to a different URL. */
export async function ensureLocalDatabase(pool: Pool, databaseUrl: string | undefined, log: (line: string) => void, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  try { await pool.query("SELECT 1"); return; } catch { /* Try the existing local service. */ }
  signal?.throwIfAborted();
  if (!databaseUrl || process.platform !== "darwin") throw new Error("Configured database is unavailable");
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || (url.port && url.port !== "5432"))
    throw new Error("Configured database is unavailable; it is not the managed local PostgreSQL service");
  const container = "sportsbookcollector-postgres-1";
  try { await exec("docker", ["inspect", "--format", "{{.Name}}", container], { timeout: 3000 }); }
  catch {
    log("INFO Starting installed Docker Desktop to recover the existing local database…");
    await exec("open", ["-a", "Docker"], { timeout: 5000 });
  }
  const deadline = Date.now() + 60_000;
  let started = false;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    if (!started) {
      try { await exec("docker", ["start", container], { timeout: 5000 }); started = true; }
      catch { /* Docker Desktop may still be starting. */ }
    }
    if (started) {
      try { await pool.query("SELECT 1"); log("OK Local PostgreSQL ready; Data loading resumes automatically."); return; }
      catch { /* Wait for PostgreSQL health. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Existing local PostgreSQL did not become ready within 60 seconds");
}
