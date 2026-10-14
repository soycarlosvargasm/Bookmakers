import { loadConfig } from "./config/index.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for matching");
const storage = new PostgresStorage(config.databaseUrl);
try {
  await storage.reconcileMatching({ full: process.argv.includes("--full") });
  const summary = await storage.pool.query(`SELECT 'events' AS entity,status,count(*)::int AS records FROM event_matches GROUP BY status
    UNION ALL SELECT 'markets',status,count(*)::int FROM market_matches GROUP BY status
    UNION ALL SELECT 'selections',status,count(*)::int FROM selection_matches GROUP BY status ORDER BY entity,status`);
  console.log(JSON.stringify({ matching: "reconciled", summary: summary.rows }));
} finally { await storage.close(); }
