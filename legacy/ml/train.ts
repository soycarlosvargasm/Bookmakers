import { loadConfig } from "../config/index.js";
import { MlService } from "./service.js";
import { PostgresStorage } from "../storage/postgres.js";

const config = loadConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required for ML training");
const storage = new PostgresStorage(config.databaseUrl);
try { const report = await new MlService(storage).train(); console.log(JSON.stringify(report, null, 2)); }
finally { await storage.close(); }
