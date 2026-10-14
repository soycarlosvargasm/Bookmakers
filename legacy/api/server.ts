import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { SportsbookConnector } from "../connectors/types.js";
import type { SourceHealth } from "../health/types.js";
import type { AppendOnlyOddsHistory, OddsObservation } from "../normalization/deduplication.js";
import { redactSecrets } from "../health/logger.js";
import type { PostgresStorage } from "../storage/postgres.js";
import { DataQualityService } from "../quality/service.js";
import { ComparisonService } from "../comparison/service.js";
import { SOURCE_CAPABILITIES } from "../sources/capabilities.js";
import { classifyFailure } from "../health/errors.js";
import { MlService, type MlRepository } from "../ml/service.js";

export type ApiDependencies = {
  connectors?: SportsbookConnector[];
  health?: () => SourceHealth[];
  history?: AppendOnlyOddsHistory;
  apiKey?: string;
  storage?: Pick<PostgresStorage, "getMarketObservations" | "getSourceHealth" | "getEvents" | "getFacets" | "pool">;
};

type Pagination = { limit: number; offset: number };

const parsePagination = (request: FastifyRequest): Pagination | { error: string } => {
  const query = request.query as { limit?: string; offset?: string };
  const limit = query.limit === undefined ? 100 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) return { error: "limit must be an integer between 1 and 1000" };
  if (!Number.isInteger(offset) || offset < 0) return { error: "offset must be a non-negative integer" };
  return { limit, offset };
};

const filters = (request: FastifyRequest): {sport?:string;sportsbook?:string;competition?:string;excludeStale?:boolean;staleAfterMs?:number} => {
  const q=request.query as Record<string,string|undefined>;
  return {...(q.sport?{sport:q.sport}:{}),...(q.sportsbook?{sportsbook:q.sportsbook}:{}),...(q.competition?{competition:q.competition}:{}),...(q.excludeStale==='true'||q.excludeStale==='false'?{excludeStale:q.excludeStale==='true'}:{}),...(q.staleAfterMs && Number.isFinite(Number(q.staleAfterMs))?{staleAfterMs:Number(q.staleAfterMs)}:{})};
};
const page = <T>(items: readonly T[], pagination: Pagination): T[] => items.slice(pagination.offset, pagination.offset + pagination.limit);
const observations = (history?: AppendOnlyOddsHistory): readonly OddsObservation[] => history?.all() ?? [];
const loadObservations = async (dependencies: ApiDependencies): Promise<readonly OddsObservation[]> => dependencies.storage ? dependencies.storage.getMarketObservations() : observations(dependencies.history);
const loadHealth = async (dependencies: ApiDependencies): Promise<SourceHealth[]> => dependencies.storage ? dependencies.storage.getSourceHealth() : dependencies.health?.() ?? [];
const eventId = (record: OddsObservation): string | null => record.sourceEventId ?? record.eventName;
const decodeId = (value: string): string | null => {
  try { return decodeURIComponent(value); } catch { return null; }
};
const safeSourceUrl = (sourceUrl: string | null): string | null => {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    url.username = ""; url.password = ""; url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/(token|key|secret|password|cookie|auth)/i.test(key)) url.searchParams.set(key, "[REDACTED]");
    return url.toString();
  } catch {
    return null;
  }
};
const publicObservation = (record: OddsObservation): OddsObservation => ({ ...record, sourceUrl: safeSourceUrl(record.sourceUrl) });

const unique = <T>(items: readonly T[], key: (item: T) => string | null): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (value === null || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const apiKeyMatches = (provided: string | undefined, expected: string): boolean => {
  if (!provided) return false;
  const actual = Buffer.from(provided);
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
};

const unauthorized = (reply: FastifyReply) => reply.code(401).send({ error: "unauthorized" });

export const buildServer = (dependencies: ApiDependencies = {}): FastifyInstance => {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    const failure = classifyFailure(error);
    if (failure.kind === "database_unavailable") return reply.code(503).send({ error: "market storage unavailable" });
    return reply.code(500).send({ error: "request failed" });
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!dependencies.apiKey) return reply.code(503).send({ error: "API key is not configured" });
    const provided = request.headers["x-api-key"];
    if (typeof provided !== "string" || !apiKeyMatches(provided, dependencies.apiKey)) return unauthorized(reply);
  });

  app.get("/health", async () => ({ status: "ok", service: "sportsbook-collector-core" }));

  app.get("/sources/capabilities", async () => SOURCE_CAPABILITIES);

  app.get("/sportsbooks", async () => {
    if(dependencies.storage) return dependencies.storage.getFacets("sportsbook");
    const ids = unique(await loadObservations(dependencies), (record) => record.sportsbook).map((record) => record.sportsbook);
    return ids;
  });

  app.get("/sportsbooks/:id/status", async (request) => {
    const id = (request.params as { id: string }).id;
    return redactSecrets((await loadHealth(dependencies)).filter((source) => source.sportsbook === id));
  });

  app.get("/sports", async () => dependencies.storage ? dependencies.storage.getFacets("sport") : unique(await loadObservations(dependencies), (record) => record.sport).map((record) => record.sport));
  app.get("/competitions", async () => dependencies.storage ? dependencies.storage.getFacets("competition") : unique(await loadObservations(dependencies), (record) => record.competition).map((record) => record.competition));

  app.get("/events", async (request, reply) => {
    const pagination = parsePagination(request);
    if ("error" in pagination) return reply.code(400).send(pagination);
    if(dependencies.storage) return dependencies.storage.getEvents({...pagination,...filters(request)});
    const records = unique(await loadObservations(dependencies), eventId);
    return page(records.map((record) => ({
      id: eventId(record), sportsbook: record.sportsbook, sport: record.sport, competition: record.competition,
      eventName: record.eventName, participants: record.participants, homeParticipant: record.homeParticipant,
      awayParticipant: record.awayParticipant, eventStartTime: record.eventStartTime, eventStatus: record.eventStatus,
      phase: record.phase, liveScore: record.liveScore, liveClock: record.liveClock, sourceUrl: safeSourceUrl(record.sourceUrl), providerTimestamp: record.providerTimestamp
    })), pagination);
  });

  app.get("/events/:id", async (request, reply) => {
    const id = decodeId((request.params as { id: string }).id);
    if (id === null) return reply.code(400).send({ error: "invalid event id" });
    if(dependencies.storage){const found=await dependencies.storage.getEvents({eventId:id,limit:1});return found[0]??reply.code(404).send({error:"event not found"});}
    const record = (await loadObservations(dependencies)).find((item) => eventId(item) === id);
    return record ? { id, sportsbook: record.sportsbook, sport: record.sport, competition: record.competition, eventName: record.eventName,
      participants: record.participants, homeParticipant: record.homeParticipant, awayParticipant: record.awayParticipant,
      eventStartTime: record.eventStartTime, eventStatus: record.eventStatus, phase: record.phase, liveScore: record.liveScore, liveClock: record.liveClock, sourceUrl: safeSourceUrl(record.sourceUrl) } : reply.code(404).send({ error: "event not found" });
  });

  app.get("/events/:id/markets", async (request, reply) => {
    const id = decodeId((request.params as { id: string }).id);
    if (id === null) return reply.code(400).send({ error: "invalid event id" });
    const records = dependencies.storage ? await dependencies.storage.getMarketObservations({eventId:id,current:true}) : (await loadObservations(dependencies)).filter((record) => eventId(record) === id);
    if (!records.length) return reply.code(404).send({ error: "event not found" });
    return unique(records, (record) => record.identity).map((record) => ({ identity: record.identity, market: record.market,
      marketPeriod: record.marketPeriod, selection: record.selection, selectionStatus: record.selectionStatus, line: record.line, participantPlayer: record.participantPlayer,
      qualifiers: record.qualifiers, sourceMarketId: record.sourceMarketId, sourceSelectionId: record.sourceSelectionId }));
  });

  app.get("/events/:id/odds", async (request, reply) => {
    const id = decodeId((request.params as { id: string }).id);
    if (id === null) return reply.code(400).send({ error: "invalid event id" });
    const records = dependencies.storage ? await dependencies.storage.getMarketObservations({eventId:id}) : (await loadObservations(dependencies)).filter((record) => eventId(record) === id);
    if (!records.length) return reply.code(404).send({ error: "event not found" });
    return records.map(publicObservation);
  });

  app.get("/odds/current", async (request, reply) => {
    const pagination = parsePagination(request);
    if ("error" in pagination) return reply.code(400).send(pagination);
    if(dependencies.storage) return (await dependencies.storage.getMarketObservations({...pagination,...filters(request),current:true})).map(publicObservation);
    return page([...new Map((await loadObservations(dependencies)).map((record) => [record.identity, publicObservation(record)])).values()], pagination);
  });

  app.get("/odds/history", async (request, reply) => {
    const pagination = parsePagination(request);
    if ("error" in pagination) return reply.code(400).send(pagination);
    if(dependencies.storage) return (await dependencies.storage.getMarketObservations({...pagination,...filters(request)})).map(publicObservation);
    return page((await loadObservations(dependencies)).map(publicObservation), pagination);
  });

  app.get("/changes", async (request, reply) => {
    const pagination = parsePagination(request);
    if ("error" in pagination) return reply.code(400).send(pagination);
    if(dependencies.storage) return (await dependencies.storage.getMarketObservations({...pagination,...filters(request),changesOnly:true})).map(publicObservation);
    return page((await loadObservations(dependencies)).map(publicObservation), pagination);
  });

  app.get("/source-health", async () => redactSecrets(await loadHealth(dependencies)));
  app.get("/quality/sources", async () => dependencies.storage ? new DataQualityService(dependencies.storage.pool).getSourceQuality() : []);
  app.get("/ml/status", async (_request, reply) => dependencies.storage ? new MlService(dependencies.storage as unknown as MlRepository).status() : reply.code(503).send({ error: "database required" }));
  app.get("/ml/matches", async (request, reply) => { if (!dependencies.storage) return reply.code(503).send({ error: "database required" }); const query = request.query as { limit?: string }; const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 100))); if (!Number.isInteger(limit)) return reply.code(400).send({ error: "limit must be an integer" }); return new MlService(dependencies.storage as unknown as MlRepository).assists(limit); });
  app.get("/ml/anomalies", async (request, reply) => { if (!dependencies.storage) return reply.code(503).send({ error: "database required" }); const query = request.query as { limit?: string }; const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 100))); if (!Number.isInteger(limit)) return reply.code(400).send({ error: "limit must be an integer" }); return new MlService(dependencies.storage as unknown as MlRepository).anomalies(limit); });
  app.get("/ml/review-cases", async (request, reply) => { if (!dependencies.storage) return reply.code(503).send({ error: "database required" }); const query = request.query as { limit?: string; status?: string }; const limit = Math.min(1000, Math.max(1, Number(query.limit ?? 100))); const statuses = new Set(["OPEN","CONFIRMED_MATCH","CONFIRMED_NON_MATCH","DISMISSED","CORRECTED"]); if (!Number.isInteger(limit) || (query.status !== undefined && !statuses.has(query.status))) return reply.code(400).send({ error: "invalid review case query" }); return new MlService(dependencies.storage as unknown as MlRepository).reviewCases(limit, query.status as never); });
  app.post("/ml/review-cases/:id/review", async (request, reply) => { if (!dependencies.storage) return reply.code(503).send({ error: "database required" }); const id = Number((request.params as { id: string }).id); const body = request.body as { status?: string; groundTruthLabel?: boolean; correction?: Record<string, unknown>; reviewer?: string; reason?: string }; const statuses = new Set(["CONFIRMED_MATCH","CONFIRMED_NON_MATCH","DISMISSED","CORRECTED"]); if (!Number.isInteger(id) || id < 1 || !body || !body.status || !statuses.has(body.status)) return reply.code(400).send({ error: "status must be a valid human review decision" }); await new MlService(dependencies.storage as unknown as MlRepository).reviewCase({ caseId: id, status: body.status as never, ...(body.groundTruthLabel === undefined ? {} : { groundTruthLabel: body.groundTruthLabel }), ...(body.correction === undefined ? {} : { correction: body.correction }), ...(body.reviewer === undefined ? {} : { reviewer: body.reviewer }), ...(body.reason === undefined ? {} : { reason: body.reason }) }); return { ok: true, caseId: id, revisioned: true }; });
  app.get("/odds/comparison", async (request,reply) => {
    if(!dependencies.storage) return reply.code(503).send({error:"database required"});
    const pagination=parsePagination(request);if('error' in pagination)return reply.code(400).send(pagination);
    const query=request.query as Record<string,string|undefined>;
    return new ComparisonService(dependencies.storage.pool).compare({...pagination,...filters(request),...(query.eventId?{eventId:query.eventId}:{}),includeExchange:query.includeExchange==='true'});
  });
  app.get("/v1/feed/events", async (request,reply) => {const p=parsePagination(request);if('error' in p)return reply.code(400).send(p);return dependencies.storage?dependencies.storage.getEvents({...p,...filters(request)}):page(unique(await loadObservations(dependencies),eventId).map(publicObservation),p);});
  app.get("/v1/feed/odds", async (request,reply) => {const p=parsePagination(request);if('error' in p)return reply.code(400).send(p);return dependencies.storage?(await dependencies.storage.getMarketObservations({...p,...filters(request),current:true})).map(publicObservation):page((await loadObservations(dependencies)).map(publicObservation),p);});
  app.get("/v1/feed/changes", async (request,reply) => {const p=parsePagination(request);if('error' in p)return reply.code(400).send(p);return dependencies.storage?(await dependencies.storage.getMarketObservations({...p,...filters(request),changesOnly:true})).map(publicObservation):page((await loadObservations(dependencies)).map(publicObservation),p);});

  return app;
};
