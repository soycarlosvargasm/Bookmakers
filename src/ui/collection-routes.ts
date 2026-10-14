import { assessRecord } from "../validation/records.js";
import type { ProviderRecord } from "../normalization/types.js";
import { savedEvidence } from './saved-evidence.js';
import type { FastifyInstance } from "fastify";
import { basename, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { Source } from "../engine/types.js";
import { validateCollection, CollectionRuntime, type Receipt, type SkipRule, type CoverageEntry } from "../engine/collection.js";
import type { UiSettings } from "./actions.js";
import type { UiActions } from "./actions.js";
import { readJson } from "./state.js";

export function validateSource(value: unknown): Source {
  const input = value as Source;
  if (!input || typeof input.url !== "string" || input.url.length > 4096 || typeof input.type !== "string" || !input.type.trim() || input.type.length > 200) throw new Error("Selecciona una fuente válida.");
  const url = new URL(input.url);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("URL inválida.");
  return { url: url.href, type: input.type.trim() };
}

export function registerCollectionRoutes(app: FastifyInstance, actions: UiActions, root: string, settings: () => UiSettings) {
  const store = actions.collection;
  app.get<{ Querystring: { url?: string; type?: string } }>("/api/collection/profile", async (request, reply) => {
    try { const source = validateSource(request.query); return { source, saved: Boolean(await readJson(store.path("profiles", (await import("../engine/memory.js")).sourceKey(source)))), options: await store.options(source), inventory: await readJson(store.path("inventory", (await import("../engine/memory.js")).sourceKey(source))) }; }
    catch (error) { return reply.code(400).send({ error: String(error instanceof Error ? error.message : error) }); }
  });
  app.post<{ Body: { source?: Source; options?: unknown } }>("/api/collection/profile", async (request, reply) => {
    try { const source = validateSource(request.body?.source), options = validateCollection(request.body?.options, source); await store.saveProfile(source, options); return { source, options }; }
    catch (error) { return reply.code(400).send({ error: String(error instanceof Error ? error.message : error) }); }
  });
  app.post<{ Body: { source?: Source; options?: unknown } }>("/api/collection/plan", async (request, reply) => {
    try {
      const source = validateSource(request.body?.source), options = validateCollection(request.body?.options, source);
      const rules = (await store.rules()).filter(rule => rule.source.type === source.type && rule.source.url === source.url && (rule.duration !== "until" || Date.parse(rule.until!) > Date.now()) && (rule.duration !== "run" || !rule.runId || [...actions.runs.values()].some(run => run.runId === rule.runId && !run.finishedAt)));
      const checkpoint = await store.checkpoint(source, options);
      const runtime = new CollectionRuntime(store, source, options, "preview"); runtime.rules = rules;
      const pending = checkpoint?.betfair ? (checkpoint.betfair.pending as unknown[]).length + Number(Boolean(checkpoint.betfair.active)) : checkpoint?.crawl?.pending.length ?? 0;
      return { options, rules: rules.length, pending: options.resume && checkpoint?.state !== "COMPLETE" ? pending : 0, sourceAllowed: runtime.allowedUrl(source.url) };
    } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { id?: string } }>("/api/collection/resume", async (request, reply) => {
    const id = request.body?.id;
    if (!id || !/^[a-f0-9]{64}$/.test(id)) return reply.code(400).send({ error: "Selecciona un recorrido guardado." });
    const checkpoint = await readJson<any>(store.path("checkpoints", id));
    if (!checkpoint) return reply.code(404).send({ error: "Recorrido no encontrado." });
    try { return reply.code(202).send(actions.run(checkpoint.source, false, settings(), undefined, true, validateCollection({ ...checkpoint.options, resume: true }, checkpoint.source))); }
    catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { source?: Source } }>("/api/collection/discover", async (request, reply) => {
    let source: Source; try { source = validateSource(request.body?.source); } catch (error) { return reply.code(400).send({ error: String(error) }); }
    try { return await actions.discover(source); } catch (error) { return reply.code(409).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { source?: Source; rule?: Partial<SkipRule> } }>("/api/collection/skip", async (request, reply) => {
    try { return await actions.skip(validateSource(request.body?.source), request.body?.rule ?? {}); }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.post<{ Body: { id?: string } }>("/api/collection/reactivate", async (request, reply) => {
    if (typeof request.body?.id !== "string") return reply.code(400).send({ error: "Selecciona una regla." });
    await store.removeRule(request.body.id); return { reactivated: true };
  });
  app.get<{ Querystring: { offset?: string; type?: string; url?: string } }>("/api/collection/state", async request => {
    const matches = (source: Source) => (!request.query.type || source.type === request.query.type) && (!request.query.url || source.url === request.query.url);
    const [receipts, checkpoints, rules, coverage] = await Promise.all([savedEvidence(root).all().then(files => files.map(file => file.receipt)), store.files<any>("checkpoints"), store.rules(), store.files<CoverageEntry[]>("coverage")]);
    const captures = receipts.filter(r => matches(r.source)).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    const offset = Math.max(0, Number(request.query.offset) || 0);
    return { captures: captures.slice(offset, offset + 30), total: captures.length, offset,
      sources: [...new Map([...receipts, ...checkpoints, ...rules].map(c => [JSON.stringify(c.source), c.source])).values()],
      checkpoints: checkpoints.filter(c => matches(c.source)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(c => ({ ...c, id: store.checkpointId(c.source, c.options), crawl: c.crawl ? { pending: c.crawl.pending, visited: c.crawl.visited, rawPaths: c.crawl.rawPaths } : undefined, betfair: c.betfair ? { pending: c.betfair.pending, active: c.betfair.active } : undefined })),
      rules: rules.filter(r => matches(r.source) && (r.duration !== "until" || Date.parse(r.until!) > Date.now())),
      coverage: coverage.flat().filter(c => matches(c.source)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100),
      counts: { captures: captures.filter(r => !r.summary).length, records: captures.filter(r => !r.summary).reduce((total, r) => total + r.records, 0), loaded: captures.filter(r => r.ingestion === "LOADED").length, pending: captures.filter(r => r.ingestion === "PENDING").length },
      dataDirectory: resolve(root, "raw"),
    };
  });
  app.get<{ Params: { id: string } }>("/api/collection/capture/:id", async (request, reply) => {
    const id = request.params.id;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return reply.code(404).send({ error: "Captura no encontrada." });
    const receipt = await store.receipt(id) ?? await savedEvidence(root).receipt(id);
    if (!receipt) return reply.code(404).send({ error: "Captura no encontrada." });
    const original = await readFile(join(root, "raw", `${id}.json`), 'utf8');
    let raw: any = null; try { raw = JSON.parse(original); } catch { /* Preserve access to unclassified RAW. */ }
    const text = raw?.evidence?.textPath ? await readFile(join(root,"raw",`${id}.txt`),"utf8").catch(()=>raw?.evidence?.payload?.copiedText) : raw?.evidence?.payload?.copiedText;
    return { ...receipt, ...(!raw ? {rawContent: original} : {}), copiedText: text, assessments:(raw?.evidence?.payload?.records ?? []).map((row:ProviderRecord)=>assessRecord(row,receipt.url)), rows: raw?.evidence?.payload?.records ?? [], navigation: raw?.evidence?.payload?.navigation ?? [], coverage: raw?.evidence?.payload?.coverage };
  });
  app.get<{ Params: { id: string; image: string } }>("/api/collection/capture/:id/image/:image", async (request, reply) => {
    const { id, image } = request.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || basename(image) !== image || !image.endsWith(".png")) return reply.code(404).send({ error: "Imagen no encontrada." });
    const receipt = await store.receipt(id) ?? await savedEvidence(root).receipt(id);
    if (!receipt?.images.includes(image)) return reply.code(404).send({ error: "Imagen no encontrada." });
    return reply.type("image/png").header("Cache-Control", "private, max-age=60").send(await readFile(join(root, "raw", image)));
  });
}
