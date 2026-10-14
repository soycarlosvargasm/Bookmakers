import { loadConfig } from "./config/index.js";
import { buildServer } from "./api/server.js";
import { AppendOnlyOddsHistory } from "./normalization/deduplication.js";
import { PostgresStorage } from "./storage/postgres.js";

const config = loadConfig();
const history = new AppendOnlyOddsHistory();
const storage = config.databaseUrl ? new PostgresStorage(config.databaseUrl) : undefined;
const app = buildServer({ apiKey: config.apiKey, history, storage });
if (storage) app.addHook("onClose", async () => storage.close());

const start = async (): Promise<void> => {
  await app.listen({ host: config.host, port: config.port });
};

start().catch((error) => { app.log.error(error); process.exitCode = 1; });
