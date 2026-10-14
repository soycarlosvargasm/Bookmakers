import { isBestFightOdds, quoteKey } from "../validation/records.js";
import { navigationDecision, navigationUrl } from "../visual/navigation-policy.js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { extractGenericSportsRecords } from "../network/discovery.js";
import { extractPinnacleRecords, isPinnacleFeedUrl, PINNACLE_NETWORK_PROFILE_VERSION } from "../network/pinnacle.js";
import { extractBetssonRecords, isBetssonFeedUrl, BETSSON_NETWORK_PROFILE_VERSION } from "../network/betsson.js";
import { fetchWinpotFeed, extractWinpotRecords, WINPOT_NETWORK_PROFILE_VERSION } from "../network/winpot.js";
import { fetchAltenarFeed, extractAltenarRecords, ALTENAR_NETWORK_PROFILE_VERSION } from "../network/altenar.js";
import { fetchCodereFeeds, extractCodereRecords, CODERE_NETWORK_PROFILE_VERSION } from "../network/codere.js";
import { fetchBetwayFeed, extractBetwayRecords, BETWAY_NETWORK_PROFILE_VERSION } from "../network/betway.js";
import { fetchRushbetFeeds, extractRushbetRecords, RUSHBET_NETWORK_PROFILE_VERSION } from "../network/rushbet.js";
import { extractStakeRecords, isStakeFeedUrl, STAKE_NETWORK_PROFILE_VERSION } from "../network/stake.js";
import { fetchBetplayFeeds, extractBetplayRecords, BETPLAY_NETWORK_PROFILE_VERSION } from "../network/betplay.js";
import { fetchRushbetCoFeeds, extractRushbetCoRecords, RUSHBET_CO_NETWORK_PROFILE_VERSION } from "../network/rushbet-co.js";
import { fetchApuestaTotalFeed, extractApuestaTotalRecords, APUESTATOTAL_NETWORK_PROFILE_VERSION } from "../network/apuestatotal.js";
import { fetchRetabetPeFeed, extractRetabetPeRecords, RETABET_PE_NETWORK_PROFILE_VERSION } from "../network/retabet-pe.js";
import { fetchMicasinoFeed, extractMicasinoRecords, MICASINO_NETWORK_PROFILE_VERSION } from "../network/micasino.js";
import { fetchPalmsbetFeed, extractPalmsbetRecords, PALMSBET_NETWORK_PROFILE_VERSION } from "../network/palmsbet.js";
import { fetchBrasilDaSorteFeed, extractBrasilDaSorteRecords, BRASILDASORTE_NETWORK_PROFILE_VERSION } from "../network/brasildasorte.js";
import { fetchMultibetFeed, extractMultibetRecords, MULTIBET_NETWORK_PROFILE_VERSION } from "../network/multibet.js";
import { fetchKtoFeeds, extractKtoRecords, KTO_NETWORK_PROFILE_VERSION } from "../network/kto.js";
import { fetchOnexbetFeeds, extractOnexbetRecords, ONEXBET_NETWORK_PROFILE_VERSION } from "../network/onexbet.js";
import { fetch22betFeeds, extract22betRecords, TWENTYTWO_BET_NETWORK_PROFILE_VERSION } from "../network/22bet.js";
import { fetchMelbetFeeds, extractMelbetRecords, MELBET_NETWORK_PROFILE_VERSION } from "../network/melbet.js";
import { fetchBetwinnerFeeds, extractBetwinnerRecords, BETWINNER_NETWORK_PROFILE_VERSION } from "../network/betwinner.js";
import { fetchTencricFeed, extractTencricRecords, TENCRIC_GRAPHQL_URL, TENCRIC_HEADERS, TENCRIC_NETWORK_PROFILE_VERSION } from "../network/tencric.js";
import { fetchBet9jaFeeds, extractBet9jaRecords, BET9JA_NETWORK_PROFILE_VERSION } from "../network/bet9ja.js";
import { captureVisibleDom, launchPersistentChrome, revealLazyContent } from "../dom/browser.js";
import { extractRenderedDom } from "../dom/extractor.js";
import { extractAccessibility, type AxNode } from "../accessibility/extractor.js";
import type { ProviderRecord } from "../normalization/types.js";
import type { AcquisitionContext, AcquisitionMethod, Evidence, Handler, HandlerResult } from "./types.js";
import { detectHttpChallenge, detectPageChallenge } from "./challenge.js";
import { BESTFIGHTODDS_DOM_PROFILE, BESTFIGHTODDS_EXTRACTION_PROFILE, extractBestFightOddsDom, bestFightOddsPending } from "../profiles/bestfightodds.js";
import { FIGHTODDS_DOM_PROFILE, FIGHTODDS_EXTRACTION_PROFILE, captureFightOddsDom, extractFightOddsDom } from "../profiles/fightodds.js";
import { RenzoChromePage } from "./renzo-browser.js";
import { closeAcquisitionContext } from "./cancellation.js";
import { observeExplorationPage } from "../visual/transports.js";
import { activateBrowsingControl, navigationFingerprint, nextBrowsingControl, scanScrollRegions, visualNavigationCandidates } from "../visual/exploration.js";
import { chooseVisualNavigation, readVisualQuotes } from "../visual/openai-vision.js";
import { visionConfig } from "../visual/openai-config.js";
import { recognizeScreenshot, type OcrLine } from "../visual/ocr.js";
import { extractScreenshotRecords } from "../visual/screenshot.js";
import { captureActionBoard, discoverVisualLinks, prepareActionBoard } from "../visual/browser.js";
import { crawlBetfair } from "./betfair-crawler.js";
import { captureBetfairDom, betfairRecords, extractBetfairFeed } from "../profiles/betfair.js";
import { ACTION_PROFILE, extractActionBoard } from "../visual/extractor.js";
import { copyVisibleSportsText, waitForSportsContent } from "../visual/readiness.js";
import { detectOdds } from "../dom/extractor.js";

const MAX_BODY = 2 * 1024 * 1024;
const MAX_HTML_BODY = 8 * 1024 * 1024;
const DIAGNOSTIC_BODY = 10 * 1024;
const evidence = (url: string, transport: string, payload: unknown): Evidence => ({ url, transport, payload, capturedAt: new Date().toISOString() });
const records = (payload: unknown, context: AcquisitionContext, url: string): ProviderRecord[] => extractGenericSportsRecords(payload, context.source.type, url);
const parse = (value: string): unknown | null => { try { return JSON.parse(value); } catch { return null; } };
const embeddedJson = (html: string): unknown[] => {
  const payloads: unknown[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    if (/\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attributes) || /\bid\s*=\s*["']__NEXT_DATA__["']/i.test(attributes)) {
      const payload = parse(body);
      if (payload !== null) payloads.push(payload);
    }
    const assignment = /\b(?:window\.)?(?:__INITIAL_STATE__|__PRELOADED_STATE__|__NEXT_DATA__)\s*=\s*([\s\S]+?)\s*;?\s*$/.exec(body);
    if (assignment) {
      const payload = parse(assignment[1]!.replace(/;\s*$/, ""));
      if (payload !== null) payloads.push(payload);
    }
  }
  return payloads;
};
const asChallenge = (found: ReturnType<typeof detectHttpChallenge>): HandlerResult | null => found ? { kind: "challenge", ...found } : null;

export async function ensurePage(context: AcquisitionContext): Promise<Page> {
  context.signal?.throwIfAborted();
  if (context.page && !context.page.isClosed()) return context.page;
  if (context.browserMode === "renzo") {
    context.renzoPagePromise ??= RenzoChromePage.open({ signal: context.signal });
    context.closePage ??= async () => { if (!context.keepPersonalPageOpen || context.signal?.aborted) await (await context.renzoPagePromise)?.close(); };
    const page = await context.renzoPagePromise;
    if (context.signal?.aborted) { await page.close(); context.signal.throwIfAborted(); }
    context.renzoPage = page;
    context.closePage = async () => { if (!context.keepPersonalPageOpen || context.signal?.aborted) await page.close(); };
    context.page = page.asPage();
    return context.page;
  }
  try {
    if (context.source.type === "stake") {
      context.browserContext ??= await launchPersistentChrome();
      context.signal?.throwIfAborted();
      context.browser = context.browserContext.browser() ?? undefined;
      context.page = context.browserContext.pages()[0] ?? await context.browserContext.newPage();
      context.signal?.throwIfAborted();
      return context.page;
    }
    context.browser ??= await chromium.launch({ headless: false });
    context.signal?.throwIfAborted();
    context.browserContext ??= await context.browser.newContext(context.sessionState ? { storageState: context.sessionState } : {});
    context.signal?.throwIfAborted();
    context.page = await context.browserContext.newPage();
    context.signal?.throwIfAborted();
    return context.page;
  } catch (error) {
    if (context.signal?.aborted) await closeAcquisitionContext(context);
    throw error;
  }
}

async function navigate(context: AcquisitionContext): Promise<HandlerResult | null> {
  const page = await ensurePage(context);
  let status: number | undefined;
  if (page.url() === "about:blank") {
    const response = await page.goto(context.collection?.resumeUrl || context.source.url, { waitUntil: "domcontentloaded", timeout: context.timeoutMs });
    if (!response && context.browserMode !== "renzo") return { kind: "miss", reason: "Navigation returned no response" };
    status = response?.status();
  }
  if (/^(chrome-error:|edge-error:|about:neterror)/i.test(page.url())) return { kind: "miss", reason: "La fuente no cargó. No se enviará su pantalla de error a visión." };
  return asChallenge(await detectPageChallenge(page, status, context.source.url));
}

export class HttpHandler implements Handler {
  readonly method: AcquisitionMethod = "http";
  async run(context: AcquisitionContext): Promise<HandlerResult> {
    const headers: Record<string, string> = { accept: "application/json, text/html;q=0.8, */*;q=0.5" };
    for (const [name, value] of Object.entries(context.configuration?.headers ?? {}))
      if (/^(accept|accept-language|content-type|user-agent|x-requested-with)$/i.test(name)) headers[name] = value;
    if (context.sessionState) {
      const state = JSON.parse(await readFile(context.sessionState, "utf8")) as { cookies?: Array<{ name: string; value: string; domain: string; path: string; secure: boolean; expires: number }> };
      const url = new URL(context.source.url);
      const cookies = (state.cookies ?? []).filter((cookie) => {
        const domain = cookie.domain.replace(/^\./, "");
        return (url.hostname === domain || url.hostname.endsWith(`.${domain}`)) && url.pathname.startsWith(cookie.path) && (!cookie.secure || url.protocol === "https:") && (cookie.expires < 0 || cookie.expires > Date.now() / 1_000);
      });
      if (cookies.length) headers.cookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    }
    const timeout = AbortSignal.timeout(context.timeoutMs);
    const response = await fetch(context.source.url, { signal: context.signal ? AbortSignal.any([context.signal, timeout]) : timeout, headers });
    const limit = /\btext\/html\b/i.test(response.headers.get("content-type") ?? "") ? MAX_HTML_BODY : MAX_BODY;
    const size = Number(response.headers.get("content-length") ?? 0);
    if (size > limit) return { kind: "miss", reason: "Response exceeds capture limit" };
    const body = await response.text();
    if (Buffer.byteLength(body) > limit) return { kind: "miss", reason: "Response exceeds capture limit" };
    const blocked = asChallenge(detectHttpChallenge(response.status, response.url, body, context.source.url));
    if (blocked) return blocked;
    if (!response.ok) return { kind: "miss", reason: `HTTP ${response.status}`, sessionInvalid: Boolean(context.sessionState && [401, 403].includes(response.status)) };
    const payload = parse(body) ?? embeddedJson(body);
    const found = records(payload, context, response.url);
    return found.length ? { kind: "data", records: found, evidence: evidence(response.url, "http", payload), configuration: { headers, endpoints: [response.url] } } : { kind: "miss", reason: "No complete event, market, selection and price" };
  }
}

export class NetworkHandler implements Handler {
  readonly method: AcquisitionMethod = "network";
  async run(context: AcquisitionContext): Promise<HandlerResult> {
    if (context.collection?.restricted && context.browserMode !== "renzo") return this.observed(context);
    if (context.browserMode === "renzo" && !["retabet-pe", "bet9ja", "10cric"].includes(context.source.type)) {
      const blocked = await navigate(context); if (blocked) return blocked;
      const page = await ensurePage(context);
      await page.waitForTimeout(context.observeMs);
      const feeds = await context.renzoPage!.readSportsFeeds();
      context.networkCaptures = feeds.map(feed => ({ ...feed, transport: "chrome-renzo-fetch" }));
      const captures = feeds.map(feed => ({ url: feed.url, transport: "chrome-renzo-fetch", payload: JSON.parse(feed.body) as unknown }));
      const found = context.source.type === "betfair" ? captures.flatMap(capture => extractBetfairFeed(capture.payload, page.url()))
        : context.source.type === "betsson" ? extractBetssonRecords(captures.filter(capture => isBetssonFeedUrl(capture.url)))
        : context.source.type === "pinnacle" ? extractPinnacleRecords(captures.filter(capture => isPinnacleFeedUrl(capture.url)))
        : captures.flatMap(capture => records(capture.payload, context, capture.url));
      return found.length ? { kind: "data", records: found, evidence: evidence(page.url(), "chrome-renzo-fetch", { captures }),
        configuration: { endpoints: captures.map(capture => capture.url), transport: "chrome-renzo-fetch" } }
        : { kind: "miss", reason: "Chrome Renzo: los GET deportivos observados no contienen registros completos; se continúa con el DOM visible." };
    }
    if (context.source.type === "bet9ja") {
      const page = await ensurePage(context);
      const response = await page.goto(new URL(context.source.url).origin, {
        waitUntil: "domcontentloaded", timeout: context.timeoutMs,
      });
      await page.waitForTimeout(1500);
      const blocked = asChallenge(await detectPageChallenge(page, response?.status(), context.source.url));
      if (blocked) return blocked;
      const feeds = await fetchBet9jaFeeds(context.timeoutMs, page);
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const successful = feeds.filter(feed => feed.status >= 200 && feed.status < 300);
      const found = extractBet9jaRecords(successful);
      if (!found.length) return { kind: "miss", reason: `Bet9ja FEAPI returned no complete priced events; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = successful.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: BET9JA_NETWORK_PROFILE_VERSION,
          captures: successful.map(feed => ({ mode: feed.mode, url: feed.url, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport: "fetch" },
        extractionProfile: { version: BET9JA_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "10cric") {
      const page = await ensurePage(context);
      const response = await page.goto(new URL(context.source.url).origin, {
        waitUntil: "domcontentloaded", timeout: context.timeoutMs,
      });
      await page.waitForTimeout(1500);
      const blocked = asChallenge(await detectPageChallenge(page, response?.status(), context.source.url));
      if (blocked) return blocked;
      const feed = await fetchTencricFeed(context.timeoutMs, page);
      context.networkCaptures = [{ url: feed.url, transport: "graphql", status: feed.status, contentType: feed.contentType,
        method: "POST", requestHeaders: TENCRIC_HEADERS, requestBody: feed.requestBody,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }];
      const found = feed.status >= 200 && feed.status < 300 ? extractTencricRecords(feed.payload, feed.url) : [];
      if (!found.length) return { kind: "miss", reason: `10cric GraphQL listContentCards returned no complete records; HTTP ${feed.status}` };
      return { kind: "data", records: found,
        evidence: evidence(feed.url, "graphql", { profileVersion: TENCRIC_NETWORK_PROFILE_VERSION,
          request: { method: "POST", headers: TENCRIC_HEADERS, body: feed.requestBody }, response: feed.payload, records: found }),
        configuration: { endpoints: [TENCRIC_GRAPHQL_URL], transport: "graphql" },
        extractionProfile: { version: TENCRIC_NETWORK_PROFILE_VERSION, networkEndpoints: [TENCRIC_GRAPHQL_URL] } };
    }
    if (context.source.type === "melbet") {
      const feeds = await fetchMelbetFeeds(context.timeoutMs);
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const found = extractMelbetRecords(feeds);
      if (!found.length) return { kind: "miss", reason: `Melbet BetB2B adapter found no priced events; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: MELBET_NETWORK_PROFILE_VERSION,
          captures: feeds.map(feed => ({ url: feed.url, mode: feed.mode, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: MELBET_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "betwinner") {
      const feeds = await fetchBetwinnerFeeds(context.timeoutMs);
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const found = extractBetwinnerRecords(feeds);
      if (!found.length) return { kind: "miss", reason: `Betwinner BetB2B adapter found no priced events; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: BETWINNER_NETWORK_PROFILE_VERSION,
          captures: feeds.map(feed => ({ url: feed.url, mode: feed.mode, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: BETWINNER_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "22bet") {
      const feeds = await fetch22betFeeds(context.timeoutMs);
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const found = extract22betRecords(feeds);
      if (!found.length) return { kind: "miss", reason: `22bet BetB2B adapter found no priced events; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: TWENTYTWO_BET_NETWORK_PROFILE_VERSION,
          captures: feeds.map(feed => ({ url: feed.url, mode: feed.mode, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: TWENTYTWO_BET_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "1xbet") {
      const feeds = await fetchOnexbetFeeds(context.timeoutMs);
      context.networkCaptures = feeds.captures.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const found = extractOnexbetRecords(feeds);
      if (!found.length) return { kind: "miss", reason: `1xBet BetB2B adapter found no priced events; HTTP statuses: ${feeds.captures.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.captures.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: ONEXBET_NETWORK_PROFILE_VERSION,
          captures: feeds.captures.map(feed => ({ url: feed.url, mode: feed.mode, payload: feed.payload })),
          dictionaries: [...feeds.dictionaries.values()].map(dictionary => ({ url: dictionary.url, type: dictionary.type, status: dictionary.status })), records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: ONEXBET_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "kto") {
      const feeds = await fetchKtoFeeds(context.timeoutMs);
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      const found = extractKtoRecords(feeds.filter(feed => feed.status >= 200 && feed.status < 300));
      if (!found.length) return { kind: "miss", reason: `KTO Kambi adapter found no complete records; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion: KTO_NETWORK_PROFILE_VERSION, records: found }),
        configuration: { endpoints, transport: "fetch" },
        extractionProfile: { version: KTO_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (context.source.type === "multibet") {
      const feed = await fetchMultibetFeed(context.timeoutMs);
      context.networkCaptures = [{ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }];
      const found = feed.status >= 200 && feed.status < 300 ? extractMultibetRecords([feed]) : [];
      if (!found.length) return { kind: "miss", reason: `Multibet Altenar adapter found no complete records; HTTP ${feed.status}` };
      return { kind: "data", records: found,
        evidence: evidence(feed.url, "fetch", { profileVersion: MULTIBET_NETWORK_PROFILE_VERSION, records: found }),
        configuration: { endpoints: [feed.url], transport: "fetch" },
        extractionProfile: { version: MULTIBET_NETWORK_PROFILE_VERSION, networkEndpoints: [feed.url] } };
    }
    if (context.source.type === "brasildasorte") {
      const feed = await fetchBrasilDaSorteFeed(context.timeoutMs);
      context.networkCaptures = [{ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }];
      const found = feed.status >= 200 && feed.status < 300 ? extractBrasilDaSorteRecords([feed]) : [];
      if (!found.length) return { kind: "miss", reason: `Brasil da Sorte Altenar adapter found no complete records; HTTP ${feed.status}` };
      return { kind: "data", records: found,
        evidence: evidence(feed.url, "fetch", { profileVersion: BRASILDASORTE_NETWORK_PROFILE_VERSION, records: found }),
        configuration: { endpoints: [feed.url], transport: "fetch" },
        extractionProfile: { version: BRASILDASORTE_NETWORK_PROFILE_VERSION, networkEndpoints: [feed.url] } };
    }
    if (["apuestatotal", "retabet-pe", "micasino", "palmsbet"].includes(context.source.type)) {
      const type = context.source.type;
      let page: Page | undefined;
      if (type === "retabet-pe") {
        page = await ensurePage(context);
        const response = await page.goto(new URL(context.source.url).origin, {
          waitUntil: "domcontentloaded", timeout: context.timeoutMs,
        });
        await page.waitForTimeout(1500);
        const blocked = asChallenge(await detectPageChallenge(page, response?.status(), context.source.url));
        if (blocked) return blocked;
      }
      const feed = type === "apuestatotal" ? await fetchApuestaTotalFeed(context.timeoutMs)
        : type === "retabet-pe" ? await fetchRetabetPeFeed(context.timeoutMs, page)
        : type === "micasino" ? await fetchMicasinoFeed(context.timeoutMs)
        : await fetchPalmsbetFeed(context.timeoutMs);
      const transport = type === "retabet-pe" ? "http" : "fetch";
      const found = feed.status >= 200 && feed.status < 300
        ? type === "apuestatotal" ? extractApuestaTotalRecords("payload" in feed ? feed.payload : null, feed.url)
        : type === "retabet-pe" ? extractRetabetPeRecords(feed.body, feed.url)
        : type === "micasino" ? extractMicasinoRecords([{ url: feed.url, payload: "payload" in feed ? feed.payload : null }])
        : extractPalmsbetRecords([{ url: feed.url, payload: "payload" in feed ? feed.payload : null }])
        : [];
      const profileVersion = type === "apuestatotal" ? APUESTATOTAL_NETWORK_PROFILE_VERSION
        : type === "retabet-pe" ? RETABET_PE_NETWORK_PROFILE_VERSION
        : type === "micasino" ? MICASINO_NETWORK_PROFILE_VERSION : PALMSBET_NETWORK_PROFILE_VERSION;
      context.networkCaptures = [{ url: feed.url, transport, status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }];
      if (!found.length) return { kind: "miss", reason: `${type} adapter found no complete event, market and selection prices; HTTP ${feed.status}` };
      return { kind: "data", records: found,
        evidence: evidence(feed.url, transport, { profileVersion, records: found }),
        configuration: { endpoints: [feed.url], transport }, extractionProfile: { version: profileVersion, networkEndpoints: [feed.url] } };
    }
    if (["betplay", "rushbet-co"].includes(context.source.type)) {
      const isBetplay = context.source.type === "betplay";
      const feeds = await (isBetplay ? fetchBetplayFeeds(context.timeoutMs) : fetchRushbetCoFeeds(context.timeoutMs));
      const successful = feeds.filter(feed => feed.status >= 200 && feed.status < 300);
      const found = isBetplay ? extractBetplayRecords(successful) : extractRushbetCoRecords(successful);
      const profileVersion = isBetplay ? BETPLAY_NETWORK_PROFILE_VERSION : RUSHBET_CO_NETWORK_PROFILE_VERSION;
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      if (!found.length) return { kind: "miss", reason: `${context.source.type} Kambi adapter found no joined event, market and selection prices; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = successful.map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, "fetch", { profileVersion, captures: successful.map(feed => ({ url: feed.url, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: profileVersion, networkEndpoints: endpoints } };
    }
    if (context.source.type === "winpot") {
      const feed = await fetchWinpotFeed(context.timeoutMs);
      context.networkCaptures = [{ url: feed.url, transport: "fetch", status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }];
      if (feed.status < 200 || feed.status >= 300) return { kind: "miss", reason: `Winpot Altenar HTTP ${feed.status}` };
      if (feed.payload === null) return { kind: "miss", reason: "Winpot Altenar response is not valid JSON" };
      const found = extractWinpotRecords([feed]);
      if (!found.length) return { kind: "miss", reason: "Winpot network adapter found no joined event, market and odd prices" };
      const endpoints = [feed.url];
      return { kind: "data", records: found,
        evidence: evidence(feed.url, "fetch", { profileVersion: WINPOT_NETWORK_PROFILE_VERSION, captures: [{ url: feed.url, payload: feed.payload }], records: found }),
        configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: WINPOT_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
    }
    if (["playdoit", "codere", "betway", "rushbet"].includes(context.source.type)) {
      let feeds: Array<{ url: string; status: number; contentType: string | null; body: string; payload: unknown }>;
      let found: ProviderRecord[];
      let profileVersion: string;
      let transport = "fetch";
      if (context.source.type === "playdoit") {
        feeds = [await fetchAltenarFeed("playdoit2", context.timeoutMs, "en-GB")];
        found = extractAltenarRecords(feeds.filter(feed => feed.status >= 200 && feed.status < 300), { integration: "playdoit2", sportsbook: "playdoit" });
        profileVersion = ALTENAR_NETWORK_PROFILE_VERSION;
      } else if (context.source.type === "codere") {
        feeds = await fetchCodereFeeds(context.timeoutMs);
        found = extractCodereRecords(feeds.filter(feed => feed.status >= 200 && feed.status < 300));
        profileVersion = CODERE_NETWORK_PROFILE_VERSION;
      } else if (context.source.type === "betway") {
        const feed = await fetchBetwayFeed(context.timeoutMs);
        feeds = [feed];
        found = feed.status >= 200 && feed.status < 300 ? extractBetwayRecords(feed.payload, feed.url) : [];
        profileVersion = BETWAY_NETWORK_PROFILE_VERSION;
        transport = "http"; // The confirmed payload is JSON embedded in server-rendered HTML.
      } else {
        feeds = await fetchRushbetFeeds(context.timeoutMs);
        found = extractRushbetRecords(feeds.filter(feed => feed.status >= 200 && feed.status < 300));
        profileVersion = RUSHBET_NETWORK_PROFILE_VERSION;
      }
      context.networkCaptures = feeds.map(feed => ({ url: feed.url, transport, status: feed.status, contentType: feed.contentType,
        body: Buffer.from(feed.body).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]" }));
      if (!found.length) return { kind: "miss", reason: `${context.source.type} adapter found no joined event, market and selection prices; HTTP statuses: ${feeds.map(feed => feed.status).join(", ")}` };
      const endpoints = feeds.filter(feed => feed.status >= 200 && feed.status < 300).map(feed => feed.url);
      return { kind: "data", records: found,
        evidence: evidence(endpoints[0]!, transport, { profileVersion, captures: feeds.map(feed => ({ url: feed.url, payload: feed.payload })), records: found }),
        configuration: { endpoints, transport }, extractionProfile: { version: profileVersion, networkEndpoints: endpoints } };
    }
    return this.observed(context);
  }
  private async observed(context: AcquisitionContext): Promise<HandlerResult> {
    const page = await ensurePage(context);
    const captures: Array<{ url: string; transport: string; payload: unknown }> = [];
    context.networkCaptures = [];
    const pending = new Set<Promise<void>>();
    const onResponse = (response: import("playwright").Response) => {
      const request = response.request();
      const transport = request.resourceType();
      if (!["xhr", "fetch", "eventsource"].includes(transport) && !/graphql/i.test(response.url())) return;
      const job = (async () => {
        const kind = /graphql/i.test(response.url()) ? "graphql" : transport;
        const contentType = response.headers()["content-type"] ?? null;
        // Capture the exact public GraphQL request used by 10cric. Keep only
        // reproducible headers; browser credentials and tracing IDs stay out.
        const requestMeta = context.source.type === "10cric" && kind === "graphql" ? {
          method: request.method(),
          requestHeaders: Object.fromEntries(Object.entries(await request.allHeaders()).filter(([name]) =>
            /^(accept|content-type|origin|referer|x-language|x-operation-name|x-tenant|apollographql-client-name|apollo-require-preflight)$/i.test(name))),
          requestBody: request.postData(),
        } : {};
        if (transport === "eventsource") {
          context.networkCaptures!.push({ url: response.url(), transport: kind, status: response.status(), contentType, body: "[Streaming response; messages captured separately]", ...requestMeta });
          return;
        }
        let body: Buffer;
        try { body = await response.body(); }
        catch (error) {
          context.networkCaptures!.push({ url: response.url(), transport: kind, status: response.status(), contentType, body: `[Body unavailable: ${error instanceof Error ? error.message : String(error)}]`, ...requestMeta });
          return;
        }
        context.networkCaptures!.push({ url: response.url(), transport: kind, status: response.status(), contentType, body: body.subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty response body]", ...requestMeta });
        if (response.status() >= 400 || body.length > MAX_BODY) return;
        const payload = parse(body.toString("utf8"));
        if (payload !== null) captures.push({ url: response.url(), transport: kind, payload });
      })().catch(() => undefined).finally(() => pending.delete(job));
      pending.add(job);
    };
    page.on("response", onResponse);
    page.on("websocket", (socket) => socket.on("framereceived", (frame) => {
      if (typeof frame.payload !== "string") return;
      context.networkCaptures!.push({ url: socket.url(), transport: "websocket", status: null, contentType: null, body: Buffer.from(frame.payload).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty WebSocket frame]" });
      if (Buffer.byteLength(frame.payload) > MAX_BODY) return;
      const payload = parse(frame.payload);
      if (payload !== null) captures.push({ url: socket.url(), transport: "websocket", payload });
    }));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    const streams = new Map<string, { url: string; status: number; mimeType: string }>();
    cdp.on("Network.responseReceived", (event: { requestId: string; response: { url: string; status: number; mimeType: string } }) => streams.set(event.requestId, event.response));
    cdp.on("Network.eventSourceMessageReceived", (event: { requestId: string; data: string }) => {
      const stream = streams.get(event.requestId);
      context.networkCaptures!.push({ url: stream?.url ?? page.url(), transport: "sse", status: stream?.status ?? null, contentType: stream?.mimeType ?? "text/event-stream", body: Buffer.from(event.data).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty SSE message]" });
      if (Buffer.byteLength(event.data) > MAX_BODY) return;
      const payload = parse(event.data);
      if (payload !== null) captures.push({ url: stream?.url ?? page.url(), transport: "sse", payload });
    });
    try {
      const navigation = await page.goto(context.source.url, { waitUntil: "domcontentloaded", timeout: context.timeoutMs });
      // Pinnacle hydrates the guest board after loading configuration and translations.
      if (context.source.type === "stake") await page.waitForTimeout(Math.max(context.observeMs, 20_000));
      else if (context.source.type === "betsson") await page.waitForTimeout(Math.max(context.observeMs, 20_000));
      else await page.waitForTimeout(context.source.type === "pinnacle" ? Math.max(context.observeMs, 20_000) : context.observeMs);
      if (context.source.type === "10cric" && new URL(context.source.url).pathname === "/") {
        await page.goto(new URL("/sports/", context.source.url).toString(), { waitUntil: "domcontentloaded", timeout: context.timeoutMs });
        await page.waitForTimeout(context.observeMs);
      }
      await Promise.race([Promise.allSettled([...pending]), new Promise((resolve) => setTimeout(resolve, 1_000))]);
      const blocked = asChallenge(await detectPageChallenge(page, navigation?.status(), context.source.url));
      if (blocked) return blocked;
      const embedded = await page.locator('script[type="application/json"], script[type="application/ld+json"], script#__NEXT_DATA__').allTextContents();
      for (const text of embedded.slice(0, 30)) {
        context.networkCaptures.push({ url: page.url(), transport: "embedded-config", status: null, contentType: "application/json", body: Buffer.from(text).subarray(0, DIAGNOSTIC_BODY).toString("utf8") || "[Empty embedded config]" });
        const payload = parse(text); if (payload !== null) captures.push({ url: page.url(), transport: "embedded-config", payload });
      }
      const preferred = new Set(context.configuration?.endpoints ?? []);
      captures.sort((left, right) => Number(preferred.has(right.url)) - Number(preferred.has(left.url)));
      if (context.source.type === "stake") {
        const feeds = captures.filter(capture => isStakeFeedUrl(capture.url));
        const found = extractStakeRecords(feeds);
        if (found.length) {
          const endpoints = [...new Set(feeds.map(capture => capture.url))];
          return { kind: "data", records: found, evidence: evidence(page.url(), "graphql", { profileVersion: STAKE_NETWORK_PROFILE_VERSION, captures: feeds }),
            configuration: { endpoints, transport: "graphql" }, extractionProfile: { version: STAKE_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
        }
        return { kind: "miss", reason: "Stake network adapter found no current fixture, market and outcome prices" };
      }
      if (context.source.type === "pinnacle") {
        const feeds = captures.filter(capture => isPinnacleFeedUrl(capture.url));
        const found = extractPinnacleRecords(feeds);
        if (found.length) {
          const endpoints = [...new Set(feeds.map(capture => capture.url))];
          return { kind: "data", records: found, evidence: evidence(page.url(), "fetch", { profileVersion: PINNACLE_NETWORK_PROFILE_VERSION, captures: feeds }),
            configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: PINNACLE_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
        }
        return { kind: "miss", reason: "Pinnacle network adapter found no joined matchup, market and price records" };
      }
      if (context.source.type === "betsson") {
        const feeds = captures.filter(capture => isBetssonFeedUrl(capture.url));
        const found = extractBetssonRecords(feeds);
        if (found.length) {
          const endpoints = [...new Set(feeds.map(capture => capture.url))];
          return { kind: "data", records: found, evidence: evidence(page.url(), "fetch", { profileVersion: BETSSON_NETWORK_PROFILE_VERSION, captures: feeds }),
            configuration: { endpoints, transport: "fetch" }, extractionProfile: { version: BETSSON_NETWORK_PROFILE_VERSION, networkEndpoints: endpoints } };
        }
        return { kind: "miss", reason: "Betsson network adapter found no joined event, market and selection prices" };
      }
      for (const capture of captures) {
        const found = records(capture.payload, context, capture.url);
        if (found.length) return { kind: "data", records: found, evidence: evidence(capture.url, capture.transport, capture.payload), configuration: { endpoints: [capture.url], transport: capture.transport } };
      }
      return { kind: "miss", reason: "No usable XHR/fetch/GraphQL/SSE/WebSocket/config payload" };
    } finally { page.off("response", onResponse); await cdp.detach().catch(() => undefined); }
  }
}

export class DomHandler implements Handler {
  readonly method: AcquisitionMethod = "dom";
  async run(context: AcquisitionContext): Promise<HandlerResult> {
    const blocked = await navigate(context); if (blocked) return blocked;
    const page = await ensurePage(context);
    if (!context.skipReveal) await revealLazyContent(page, { maxScrolls: 4, signal: context.signal });
    if (context.source.type === "betfair") {
      const snapshot = await captureBetfairDom(page), found = betfairRecords(snapshot.events, page.url());
      return found.length ? { kind: "data", records: found, evidence: evidence(page.url(), "betfair-dom", { records: found, visiblePrices: snapshot.visiblePrices }) }
        : { kind: "miss", reason: "Betfair DOM: no hay cuotas con evento, mercado y selección verificables en esta vista" };
    }
    if (context.source.type === "fightodds") {
      const tree = await captureFightOddsDom(page);
      const found = extractFightOddsDom(tree, { sportsbook: context.source.type, sourceUrl: page.url() });
      return found.length
        ? { kind: "data", records: found, evidence: evidence(page.url(), "dom", { profileVersion: FIGHTODDS_DOM_PROFILE.version, records: found }), configuration: { profile: FIGHTODDS_DOM_PROFILE }, extractionProfile: FIGHTODDS_EXTRACTION_PROFILE }
        : { kind: "miss", reason: "FightOdds DOM profile found no complete moneyline records" };
    }
    const profile = context.configuration?.profile ?? (context.configuration?.selectors?.event ? { version: "source-memory-v1", eventSelector: context.configuration.selectors.event } : null);
    const bfo = isBestFightOdds(context.source);
    const tree = await captureVisibleDom(page, bfo ? { rootSelector: "div.table-div:not(.event-collapsed)", maxNodes: 30_000, maxDepth: 16 } : {});
    if (bfo) {
      const found = extractBestFightOddsDom(tree, { sportsbook: context.source.type, sourceUrl: page.url() });
      return found.length
        ? { kind: "data", records: found, evidence: evidence(page.url(), "dom", { profileVersion: BESTFIGHTODDS_DOM_PROFILE.version, records: found, pendingGroups:bestFightOddsPending(tree,found) }), configuration: { profile: BESTFIGHTODDS_DOM_PROFILE }, extractionProfile: BESTFIGHTODDS_EXTRACTION_PROFILE }
        : { kind: "data", records: [], evidence:evidence(page.url(),"dom",{records:[],domTree:tree,pendingGroups:bestFightOddsPending(tree,found),pendingReason:"BestFightOdds: no se pudo demostrar la asociación de la tabla"}) };
    }
    const result = extractRenderedDom(tree, { sportsbook: context.source.type, sourceUrl: page.url(), profile });
    const eventSelector = profile?.eventSelector;
    return result.records.length ? { kind: "data", records: result.records, evidence: evidence(page.url(), "dom", { candidates: result.candidates, eventCards: result.detectedEventCards, visibleOdds: result.visibleOdds }), configuration: { selectors: { root: "body", ...(eventSelector ? { event: eventSelector } : {}) } } }
      : { kind: "miss", reason: "Rendered DOM has no validated records" };
  }
}

export class AccessibilityHandler implements Handler {
  readonly method: AcquisitionMethod = "accessibility";
  async run(context: AcquisitionContext): Promise<HandlerResult> {
    const blocked = await navigate(context); if (blocked) return blocked;
    if (isBestFightOdds(context.source)) return {kind:"miss",reason:"BestFightOdds requiere asociaciones data-mu/data-li/data-b; no se usa un lector genérico de accesibilidad"};
    if (context.browserMode === "renzo") return { kind: "miss", reason: "Chrome Renzo mediante Apple Events no expone Accessibility.getFullAXTree; no se cambia de navegador." };
    const page = await ensurePage(context);
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Accessibility.enable");
      const tree = await cdp.send("Accessibility.getFullAXTree") as { nodes: Array<{ nodeId: string; parentId?: string; childIds?: string[]; role?: { value?: string }; name?: { value?: string }; ignored?: boolean }> };
      context.accessibilityTree = tree;
      const nodes: AxNode[] = tree.nodes.slice(0, 12_000).map((node) => ({ id: node.nodeId, parentId: node.parentId, childIds: node.childIds ?? [], role: node.role?.value ?? "unknown", name: String(node.name?.value ?? "").slice(0, 500), ignored: Boolean(node.ignored) }));
      const result = extractAccessibility(nodes, { sportsbook: context.source.type, sourceUrl: page.url(), sport: null, profile: context.memory?.extractionProfile?.accessibilityProfile });
      return result.records.length ? { kind: "data", records: result.records, evidence: evidence(page.url(), "accessibility", { evidence: result.evidence, nodeCount: nodes.length }), configuration: { patterns: { tree: "Accessibility.getFullAXTree" } } }
        : { kind: "miss", reason: "Accessibility tree has no validated records" };
    } finally { await cdp.detach().catch(() => undefined); }
  }
}

export type VisualExtractor = (screenshot: Buffer, context: AcquisitionContext) => Promise<ProviderRecord[]>;
export class VisualHandler implements Handler {
  readonly method: AcquisitionMethod = "visual";
  constructor(private readonly extractor?: VisualExtractor) {}
  async run(context: AcquisitionContext): Promise<HandlerResult> {
    const blocked = await navigate(context); if (blocked) return blocked;
    if (context.source.type === "betfair" && !context.collection?.options.textOnly) return crawlBetfair(await ensurePage(context), context, () => this.capture(context.page!, context));
    if (context.browserMode === "renzo") return { kind: "miss", reason: "La conexión Chrome Renzo no expone capturas visuales; no se cambia de navegador." };
    let page = await ensurePage(context);
    const crawl = context.visualCrawl ??= { visited: [], pending: [], records: [], rawPaths: [], visits: [], tabsOpened: 1, ocrCaptures: 0 };
    const allowedDestination = (url:string) => navigationDecision(url,context.source.url).allowed && (!context.collection || context.collection.allowedUrl(url));
    // Intercept document requests before controls or popups can load excluded pages.
    const browserContext = typeof page.context === "function" ? page.context() : undefined;
    const guard = async (route: import("playwright").Route) => {
      const request = route.request();
      if (request.isNavigationRequest() && !allowedDestination(request.url())) {
        context.collection?.allowedUrl(request.url());
        crawl.visits.push({url:request.url(),records:0,method:"navigation",reason:navigationDecision(request.url(),context.source.url).reason});
        await route.abort();
      } else await route.fallback();
    };
    if (browserContext?.route) await browserContext.route("**/*",guard);
    const popupPages = context.visualPopupPages ??= [];
    const popupTasks = new Set<Promise<void>>();
    const collectPopup = (child: Page) => {
      crawl.tabsOpened++;
      const task = (async () => {
        try {
          await child.waitForLoadState("domcontentloaded", { timeout: Math.min(context.timeoutMs, 8000) });
          context.signal?.throwIfAborted();
          const url = new URL(child.url());
          if (!allowedDestination(url.href) || url.origin !== new URL(context.source.url).origin || url.username || url.password || /casino|login|register|deposit|withdraw|account|wallet/i.test(url.pathname)) { await child.close(); return; }
          popupPages.push(child); progress("RUNNING");
        } catch { await child.close().catch(() => undefined); }
      })().finally(() => popupTasks.delete(task));
      popupTasks.add(task);
    };
    const enqueue = (value: string) => { const url=navigationUrl(value); if (allowedDestination(url) && url !== navigationUrl(page.url()) && !crawl.visited.map(navigationUrl).includes(url) && !crawl.pending.map(navigationUrl).includes(url)) crawl.pending.push(url); };
    let phase = "Descubriendo contenido deportivo";
    const progress = (state: "RUNNING" | "CHALLENGE" | "COMPLETE") => context.visualProgress?.({ phase, updatedAt: new Date().toISOString(), visionCalls: context.vision?.calls ?? 0, visionQuotes: context.vision?.accepted ?? 0, lastError: context.vision?.lastError, visited: crawl.visited.length, pending: crawl.pending.length + popupPages.length, tabsOpened: crawl.tabsOpened, records: crawl.records.length, ocrCaptures: crawl.ocrCaptures, url: page.url(), state });
    const remember = async (method: AcquisitionMethod, result: Extract<HandlerResult, { kind: "data" }>) => {
      const saved = result.validatedPages ? { records: result.records, rawPath: "" } : context.savePageCapture ? await context.savePageCapture(method, result) : { records: result.records, rawPath: "" };
      for (const path of [...(result.validatedPages ?? []), ...(saved.rawPath ? [saved.rawPath] : [])]) if (!crawl.rawPaths.includes(path)) crawl.rawPaths.push(path);
      for (const record of saved.records) {
        const key = quoteKey(record);
        const index = crawl.records.findIndex(r => quoteKey(r) === key);
        if (index >= 0) crawl.records[index] = record; else crawl.records.push(record);
      }
      return saved.records.length;
    };
    const previousPhase = context.visualPhase;
    context.visualPhase = value => { phase = value; progress("RUNNING"); };
    const heartbeat = setInterval(() => { if (!context.signal?.aborted) progress("RUNNING"); }, 1000);
    let lastEvidence: Evidence | undefined;
    let observer: Awaited<ReturnType<typeof observeExplorationPage>> | undefined;
    try { if (typeof page.on === "function") page.on("popup", collectPopup); observer = typeof page.context === "function" ? await observeExplorationPage(page, context) : undefined; while (true) {
      context.signal?.throwIfAborted(); progress("RUNNING");
      await context.collection?.refreshRules();
      context.collection?.checkBudget();
      context.collection?.setView(page.url());
      await context.collection?.checkpoint(context);
      const controls = new Set<string>();
      const visitsBefore = crawl.visits.length;
      let firstView = true;
      while (true) {
        const challenge = asChallenge(await detectPageChallenge(page, undefined, context.source.url));
        if (challenge) { progress("CHALLENGE"); return challenge; }
        await observer?.settle();
        const current = new URL(page.url());
        if (!this.extractor && /^(?:www\.)?actionnetwork\.com$/i.test(current.hostname) && /^\/nfl\/odds\/?$/.test(current.pathname)) await prepareActionBoard(page);
        const links = (await discoverVisualLinks(page).catch(error => { context.signal?.throwIfAborted(); if (typeof page.context !== "function") return []; throw error; })) ?? [];
        for (const url of links) enqueue(url);
        let result: HandlerResult | undefined;
        let method: AcquisitionMethod = "visual";
        if (firstView && context.visualSeed?.url === page.url() && !context.collection?.options.textOnly) {
          if (typeof page.context === "function") await scanScrollRegions(page, context, async () => {
            for (const url of await discoverVisualLinks(page)) enqueue(url);
          });
          result = { kind: "data", records: context.visualSeed.records, evidence: evidence(page.url(), context.visualSeed.method, { records: context.visualSeed.records }) };
          method = context.visualSeed.method; delete context.visualSeed;
        } else if (!this.extractor && typeof page.context === "function") {
          const ready = await waitForSportsContent(page, context);
          if (!ready.ready) {
            context.collection?.noteFailure(page.url(), ready.reason!);
            result = { kind: "miss", reason: ready.reason! };
          } else {
          const rendered = new Map<string, ProviderRecord>();
          const copied: string[] = [];
          const pendingGroups = new Map<string,{id:string;path:string;reason:string}>();
          await scanScrollRegions(page, context, async () => {
            const visible = await copyVisibleSportsText(page);
            if (context.collection?.options.textOnly ? !visible.text.trim()&&!visible.loading : !visible.prices && !visible.canvas && !visible.loading) return;
            const copy = await waitForSportsContent(page, context, Math.min(context.timeoutMs, 4000));
            if (!copy.ready) return;
            copied.push(copy.text);
            if (context.collection?.options.textOnly) context.visualPhase?.(`Scroll y copiar texto: ${copied.length} tramos leídos`);
            const discovered = await discoverVisualLinks(page);
            for (const url of discovered) enqueue(url);
            const bfo = isBestFightOdds(context.source);
            const tree = await captureVisibleDom(page, bfo ? {rootSelector:"div.table-div:not(.event-collapsed)", maxNodes:30_000,maxDepth:16} : {});
            const found = bfo ? extractBestFightOddsDom(tree,{sportsbook:context.source.type,sourceUrl:page.url()}) : extractRenderedDom(tree, { sportsbook: context.source.type, sourceUrl: page.url(), profile: context.configuration?.profile }).records;
            if (bfo) for(const group of bestFightOddsPending(tree,found)) pendingGroups.set(group.id,group);
            for (const row of found) rendered.set(quoteKey(row), row);
          });
          const feedRecords = isBestFightOdds(context.source) ? [] : (context.networkCaptures ?? []).flatMap(c => { const json = parse(c.body); return json ? records(json, context, c.url) : []; });
          if (feedRecords.length) { result = { kind: "data", records: feedRecords, evidence: evidence(page.url(), "network", { records: feedRecords }) }; method = "network"; }
          if (!result && rendered.size) { result = { kind: "data", records: [...rendered.values()], evidence: evidence(page.url(), "dom", { records: [...rendered.values()], copiedText: [...new Set(copied)].join('\n\n'), scan: "all-scroll-regions", pendingGroups:[...pendingGroups.values()] }) }; method = "dom"; }
          if (!result) for (const reader of isBestFightOdds(context.source) ? [new DomHandler()] : [new DomHandler(), new AccessibilityHandler()]) {
            const probe = await reader.run(context);
            if (probe.kind === "challenge") { progress("CHALLENGE"); return probe; }
            if (probe.kind === "data") { result = probe; method = reader.method; break; }
          }
          if (result?.kind === "data" && !(result.evidence.payload as Record<string,unknown>)?.copiedText) result.evidence.payload = { ...(result.evidence.payload as Record<string,unknown>), copiedText: [...new Set(copied)].join('\n\n') };
          if (!result && (context.collection?.options.textOnly || isBestFightOdds(context.source)) && copied.length && context.savePageCapture) {
            const proof = evidence(page.url(), "dom", { records: [], pendingReason: "No se pudo demostrar la asociación local de la tabla; evidencia pendiente", copiedText: [...new Set(copied)].join('\n\n'), scan: "all-scroll-regions" });
            const saved = await context.savePageCapture("dom", { kind: "data", records: [], evidence: proof });
            if (saved.rawPath) crawl.rawPaths.push(saved.rawPath);
          }
          }
        }
        if (!result) result = isBestFightOdds(context.source) ? {kind:"miss",reason:"BestFightOdds: tabla pendiente; sin asociación data-mu/data-li/data-b suficiente"} : await this.capture(page, context);
        if (result.kind === "challenge") { progress("CHALLENGE"); return result; }
        const count = result.kind === "data" ? await remember(method, result) : 0;
        if (result.kind === "data") lastEvidence = result.evidence;
        crawl.visits.push({ url: page.url(), records: count, method, ...(result.kind === "miss" ? { reason: result.reason } : {}) });
        progress("RUNNING"); firstView = false;
        if (typeof page.context !== "function") break;
        context.visualPhase?.("Buscando el siguiente evento o mercado");
        await context.collection?.refreshRules();
        let control = await nextBrowsingControl(page, controls, context);
        const visionSettings = !context.collection?.options.textOnly && !control && !this.extractor && result.kind === "data" ? await visionConfig() : null;
        if (visionSettings?.enabled && visionSettings.apiKey && !context.vision?.disabledReason) {
          while (!control) {
            context.signal?.throwIfAborted();
            let candidates = await visualNavigationCandidates(page, controls, false, context);
            if (!candidates.length) {
              const offscreen = (await visualNavigationCandidates(page, controls, true, context))[0];
              if (!offscreen) break;
              try { await page.locator(`[data-collector-navigation="${offscreen.id}"]`).scrollIntoViewIfNeeded({ timeout: 3000 }); }
              catch { controls.add(offscreen.key); continue; }
              candidates = await visualNavigationCandidates(page, controls, false, context);
              if (!candidates.length) { controls.add(offscreen.key); continue; }
            }
            context.visualPhase?.("OpenAI está viendo los controles deportivos");
            const selected = await chooseVisualNavigation(await page.screenshot({ fullPage: false }), candidates, context);
            control = selected.target;
            if (!control) for (const candidate of candidates) controls.add(candidate.key);
            if (context.vision?.lastError) break;
          }
        }
        if (!control) break;
        controls.add(control.key);
        const beforeUrl = page.url();
        const before = await navigationFingerprint(page);
        // Do not reuse the previous market's prices for the next market tab.
        observer?.reset(); context.networkCaptures = []; context.accessibilityTree = undefined;
        try {
          context.visualPhase?.(`Abriendo: ${control.label}`);
          await activateBrowsingControl(page, control, context.timeoutMs, context);
          await page.waitForTimeout(500);
          if (!allowedDestination(page.url())) { await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: context.timeoutMs }); continue; }
          let changed = await navigationFingerprint(page);
          for (let wait = 0; changed === before && wait < 3; wait++) { context.signal?.throwIfAborted(); await page.waitForTimeout(500); changed = await navigationFingerprint(page); }
          if (changed === before) {
            crawl.visits.push({ url: page.url(), records: 0, method: "navigation", reason: `Sin avance: ${control.label}` });
            continue;
          }
        } catch (error) {
          context.signal?.throwIfAborted();
          crawl.visits.push({ url: page.url(), records: 0, method: "navigation", reason: `Control ${control.key}: ${String(error)}` });
        }
      }
      if (!crawl.visited.includes(page.url())) crawl.visited.push(page.url());
      crawl.pending = crawl.pending.filter(url => !crawl.visited.map(navigationUrl).includes(navigationUrl(url)));
      await context.collection?.view(context, page.url(), "", !crawl.visits.slice(visitsBefore).some(v => v.reason), crawl.visits.slice(visitsBefore).find(v => v.reason)?.reason);
      await Promise.allSettled([...popupTasks]);
      context.signal?.throwIfAborted();
      let opened: Page | undefined;
      while (popupPages.length && !opened) { const candidate = popupPages.shift()!; if (!candidate.isClosed()) opened = candidate; }
      await context.collection?.refreshRules();
      crawl.pending = crawl.pending.filter(allowedDestination);
      while (opened && !allowedDestination(opened.url())) { await opened.close(); opened = popupPages.shift(); }
      const next = opened?.url() ?? crawl.pending[0];
      if (!next) break;
      context.collection?.checkBudget();
      if (!opened) crawl.pending.shift();
      context.collection?.setView(next);
      await context.collection?.checkpoint(context);
      const previous = page;
      page = opened ?? await page.context().newPage(); context.page = page; if (!opened) crawl.tabsOpened++;
      previous.off("popup", collectPopup); page.on("popup", collectPopup);
      // Process sequentially with inherited cookies; release completed child tabs.
      if (previous !== context.browserContext?.pages()[0]) await previous.close().catch(() => undefined);
      context.networkCaptures = []; context.accessibilityTree = undefined;
      await observer?.close(); observer = await observeExplorationPage(page, context);
      try {
        const response = opened ? null : await page.goto(next, { waitUntil: "domcontentloaded", timeout: context.timeoutMs });
        await page.waitForTimeout(context.observeMs || 500); await observer.settle();
        const blocked = asChallenge(await detectPageChallenge(page, response?.status(), context.source.url));
        if (blocked) { progress("CHALLENGE"); return blocked; }
      } catch (error) {
        context.signal?.throwIfAborted();
        if (!crawl.visited.includes(next)) crawl.visited.push(next);
        crawl.visits.push({ url: next, records: 0, method: "navigation", reason: String(error) });
      }
    } } finally { if(browserContext?.unroute) await browserContext.unroute("**/*",guard); clearInterval(heartbeat); context.visualPhase = previousPhase; if (typeof page.off === "function") page.off("popup", collectPopup); await observer?.close(); }
    progress("COMPLETE");
    if (!crawl.records.length) return { kind: "miss", reason: `Visual collector visited ${crawl.visited.length} pages automatically; ${crawl.ocrCaptures} OCR views; no complete current quotes. ${crawl.visits.map(v => v.reason).filter(Boolean).join("; ")}` };
    const methods = [...new Set(crawl.visits.filter(visit => visit.records > 0).map(visit => visit.method as AcquisitionMethod))];
    return { kind: "data", records: crawl.records, acquisitionMethod: methods.length === 1 ? methods[0] : "visual", ...(context.savePageCapture ? { validatedPages: crawl.rawPaths } : {}),
      evidence: { ...(lastEvidence ?? evidence(page.url(), "visual", {})), ...(context.savePageCapture ? { screenshot: undefined, screenshots: undefined } : {}),
        payload: { coverage: { complete: !crawl.visits.some(v => v.reason) && !context.collection?.reason }, ...(lastEvidence?.payload as Record<string, unknown> ?? {}), records: crawl.records, navigation: crawl.visits, pageRawPaths: crawl.rawPaths, pagesVisited: crawl.visited.length, tabsOpened: crawl.tabsOpened, ocrCaptures: crawl.ocrCaptures } } };
  }
  private async capture(page: Page, context: AcquisitionContext): Promise<HandlerResult> {
    if (context.collection?.options.textOnly) return { kind: "miss", reason: "Modo scroll y copiar texto: OCR y screenshots desactivados; lo que no pueda leerse queda pendiente." };
    if (this.extractor) {
      const screenshot = await page.screenshot({ fullPage: true }), found = await this.extractor(screenshot, context);
      return found.length ? { kind: "data", records: found, evidence: { url: page.url(), transport: "visual", capturedAt: new Date().toISOString(), screenshot, payload: { records: found } } }
        : { kind: "miss", reason: "Visual extractor returned no complete records" };
    }
    const url = new URL(page.url());
    if (/^(?:www\.)?actionnetwork\.com$/i.test(url.hostname) && /^\/nfl\/odds\/?$/.test(url.pathname)) {
      const board = await captureActionBoard(page), result = extractActionBoard(board, ACTION_PROFILE, new Date().toISOString());
      if (result.records.length) return { kind: "data", acquisitionMethod: "dom", records: result.records, evidence: { url: page.url(), transport: "dom", capturedAt: new Date().toISOString(),
        payload: { profileVersion: ACTION_PROFILE.version, records: result.records, copiedText: (await copyVisibleSportsText(page)).text, board } } };
    }
    const found = new Map<string, ProviderRecord>(), rawPaths: string[] = [], visitedPositions = new Set<string>();
    const screenshots: Buffer[] = [];
    const references = new Map<string, OcrLine[]>();
    let challenge: Extract<HandlerResult, { kind: "challenge" }> | undefined;
    let regions = 0, lastEvidence: Evidence | undefined;
    const recordKey = (row: ProviderRecord) => JSON.stringify([row.sportsbook, row.bookmaker, row.eventName, row.market, row.marketPeriod, row.selection, row.line]);
    const captureView = async (position: { region: string; top: number; left: number }) => {
      context.signal?.throwIfAborted();
      if (challenge) return;
      const blocked = asChallenge(await detectPageChallenge(page, undefined, context.source.url));
      if (blocked?.kind === "challenge") { challenge = blocked; return; }
      // Repeated stable-bottom samples are needed for discovery, not repeated OCR/API charges.
      const identity = `${position.region}:${position.top}:${position.left}`;
      if (visitedPositions.has(identity)) return; visitedPositions.add(identity);
      if (typeof page.context === "function") {
        const visible = await copyVisibleSportsText(page);
        if (!visible.prices && !visible.canvas && !visible.loading) return;
      }
      const copied = typeof page.context === "function" ? await waitForSportsContent(page, context, Math.min(context.timeoutMs, 4000)) : undefined;
      if (copied && !copied.ready) { context.collection?.noteFailure(page.url(),copied.reason!); return; }
      context.visualPhase?.(`Leyendo tramo ${visitedPositions.size}: OCR local`);
      const screenshot = await page.screenshot({ fullPage: false }), capturedAt = new Date().toISOString();
      const image = await recognizeScreenshot(screenshot, context.signal); regions += image.lines.length;
      if (context.visualCrawl) context.visualCrawl.ocrCaptures++;
      const quotes = extractScreenshotRecords(image, { sportsbook: context.source.type, sourceUrl: page.url(), collectedAt: capturedAt });
      const referenceKey = `${position.region}:${position.left}`;
      const earlier = references.get(referenceKey) ?? [];
      const visiblePrices = image.lines.reduce((count, line) => count + detectOdds(line.text).length, 0);
      if (!visiblePrices) { context.collection?.noteFailure(page.url(),'La imagen no contiene cuotas legibles; se conserva pendiente'); return; }
      let vision: { records: ProviderRecord[]; evidence: unknown } = { records: [], evidence: undefined };
      if (!quotes.length || visiblePrices > quotes.length) {
        context.visualPhase?.(`OpenAI interpreta tramo ${visitedPositions.size}: eventos, mercados y columnas`);
        vision = await readVisualQuotes(screenshot, image, context, capturedAt, earlier);
      }
      // Previous labels are context only; earlier prices are never accepted as current viewport prices.
      references.set(referenceKey, [...earlier, ...image.lines.filter(line => line.confidence >= .8 && !/^[+-]?\d+(?:[.,]\d+|\/\d+)?$/.test(line.text.trim()))]
        .filter((line, index, all) => all.findIndex(other => other.text === line.text && Math.abs(other.box.x - line.box.x) < 3) === index).slice(-5000));
      const grouped = new Map<string, ProviderRecord[]>();
      for (const row of [...quotes.map(quote => quote.record), ...vision.records]) grouped.set(recordKey(row), [...(grouped.get(recordKey(row)) ?? []), row]);
      const rows = [...grouped.values()].filter(group => new Set(group.map(row => row.decimalOdds)).size === 1).map(group => group[0]!);
      if (!rows.length) { context.collection?.noteFailure(page.url(),'No hay cuotas completas verificables en esta vista'); return; }
      if (!context.savePageCapture) screenshots.push(screenshot);
      const proof: Evidence = { url: page.url(), transport: "visual", capturedAt, screenshot, payload: { records: rows, position, copiedText: copied?.text,
        screenshotSha256: createHash("sha256").update(screenshot).digest("hex"), ocrEngine: "apple-vision", vision: vision.evidence,
        imageSize: { width: image.width, height: image.height }, quotes: quotes.map(({ record, ...anchors }) => ({ sourceSelectionId: record.sourceSelectionId, ...anchors })) } };
      lastEvidence = proof;
      context.visualPhase?.(`Guardando evidencia del tramo ${visitedPositions.size}: ${rows.length} cuotas candidatas`);
      const saved = context.savePageCapture ? await context.savePageCapture("visual", { kind: "data", records: rows, evidence: proof }) : { records: rows, rawPath: "" };
      if (saved.rawPath) { rawPaths.push(saved.rawPath); context.visualCrawl?.rawPaths.push(saved.rawPath); }
      for (const row of saved.records) {
        found.set(recordKey(row), row);
        const crawl = context.visualCrawl;
        if (crawl) { const index = crawl.records.findIndex(existing => recordKey(existing) === recordKey(row)); if (index < 0) crawl.records.push(row); else crawl.records[index] = row; }
      }
      context.visualPhase?.(`Tramo ${visitedPositions.size} guardado: ${saved.records.length} cuotas aceptadas`);
    };
    if (typeof page.context === "function") await scanScrollRegions(page, context, captureView);
    else await captureView({ region: "document", top: 0, left: 0 });
    if (challenge) return challenge;
    return found.size ? { kind: "data", records: [...found.values()], ...(context.savePageCapture ? { validatedPages: rawPaths } : {}),
      evidence: { ...lastEvidence!, screenshot: context.savePageCapture || screenshots.length > 1 ? undefined : screenshots[0], ...(screenshots.length > 1 ? { screenshots } : {}), payload: { ...(lastEvidence!.payload as Record<string, unknown>), tileCount: context.savePageCapture ? rawPaths.length : screenshots.length, records: [...found.values()], pageRawPaths: rawPaths,
        views: visitedPositions.size, visionCalls: context.vision?.calls ?? 0, visionQuotes: context.vision?.accepted ?? 0 } }, configuration: { patterns: { capture: "viewport raster vertical+horizontal", extraction: "local-ocr+openai-anchored-v1" } } }
      : { kind: "miss", reason: `OCR leyó ${regions} regiones en ${visitedPositions.size} tramos; sin cuotas completas verificables${context.vision?.lastError ? `; ${context.vision.lastError}` : ""}` };
  }
}
