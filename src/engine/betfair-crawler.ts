import type { Page } from "playwright";
import { createHash } from "node:crypto";
import type { ProviderRecord } from "../normalization/types.js";
import { extractGenericSportsRecords } from "../network/discovery.js";
import { BETFAIR_PROFILE_VERSION, betfairRecords, captureBetfairDom, extractBetfairFeed } from "../profiles/betfair.js";
import { scanScrollRegions } from "../visual/exploration.js";
import { observeExplorationPage } from "../visual/transports.js";
import { detectPageChallenge } from "./challenge.js";
import type { AcquisitionContext, HandlerResult } from "./types.js";

export type BetfairControl = { key: string; label: string; id: string; role?: string; category?: string };
type Target = { url: string; path: BetfairControl[]; competition?: string | null; retries?: number };
export type BetfairCrawlState = {
  pending: Target[]; queued: Set<string>; seen: Set<string>; competitions: Set<string>; events: Set<string>;
  marketViews: Set<string>; failures: Array<{ url: string; path: string[]; reason: string }>;
  rootControls?: Map<string, Set<string>>;
  active?: Target; ready?: string; completed: boolean;
};
export type BetfairView = { links: Array<{ url: string; label: string }>; controls: BetfairControl[]; fingerprint: string };

/** Follow observed football routes only. Competition names and country/league
 * tiers are intentionally unrestricted; no favourite-league allowlist. */
export function betfairNavigationUrl(input: string, base: string): string | null {
  try {
    const url = new URL(input, base), origin = new URL(base).origin;
    if (url.origin !== origin || url.username || url.password || !/^\/betting\/football(?:\/|$)/i.test(url.pathname)) return null;
    if (/mybets|betslip|place.?bet|deposit|withdraw|login|account|wallet|casino|promotions?|results|history/i.test(url.pathname)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/token|secret|password|auth|session|stake|betSlip/i.test(key)) return null;
      if (/^utm_|^gclid$|^fbclid$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (!url.hash.startsWith("#/")) url.hash = "";
    return url.href;
  } catch { return null; }
}

export async function discoverBetfairView(page: Page, includeSelected = false): Promise<BetfairView> {
  const view = await page.evaluate<{ links: Array<{ url: string; label: string }>; controls: BetfairControl[]; identity: unknown }>(String.raw`(() => {
    const clean = text => (text||'').replace(/\s+/g,' ').trim();
    const visible = el => {const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const forbidden = /bet.?slip|place.?bet|add to bet|apostar|deposit|withdraw|login|sign.?in|register|my bets|account|wallet|casino|promotions?|results|history|cash.?out|boost|stake|captcha|verify.*human/i;
    const excluded = '[data-selection-id],[data-runner-id],[data-outcome-id],[data-odds],[data-testid*="selection"],[data-testid*="runner"],[data-betslip],[class*="-betslip"],[class*="-selection"],[class*="-runner"],form';
    const links = [...document.querySelectorAll('a[href]')].filter(visible).filter(a=>!a.closest(excluded)&&!forbidden.test(clean(a.innerText))).map(a=>({url:a.href,label:clean(a.innerText||a.getAttribute('aria-label'))}));
    const emptySchedule=/no (?:events|fixtures|matches|markets)(?: available)?|nothing scheduled|no hay (?:eventos|partidos|mercados)/i.test(document.querySelector('main')?.innerText||'');
    const controls = [...document.querySelectorAll('button,[role="tab"],[role="button"],summary')].filter(visible).flatMap((el,index)=>{
      const label=clean(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title'));
      const scope=el.closest('[role="tablist"],[data-testid*="competition"],[data-testid*="league"],[data-testid*="market"],[data-testid*="navigation"],[class*="-competition"],[class*="-league"],[class*="-market"],[class*="-tabs"],[class*="-navigation"],nav');
      const expands=/^(all competitions|all leagues|all markets|more markets|show all|show more|load more|next|more|view more|competitions|leagues|countries|today|tomorrow|in.play|upcoming)(?:\s*\(?\d+\)?)?$/i.test(label);
      if(emptySchedule&&/^(next|load more|show more|more markets|all markets)$/i.test(label))return [];
      if(!label||label.length>180||forbidden.test(label)||/^[+\-]?\d+(?:[.,]\d+|\/\d+)?$/.test(label)||el.closest(excluded)||el.disabled||el.getAttribute('aria-disabled')==='true'||(!${includeSelected}&&(el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-expanded')==='true')))return [];
      if(el.tagName==='SUMMARY'&&!scope&&!expands)return [];
      const navigationScope=scope&&(scope.tagName==='NAV'||scope.getAttribute('role')==='tablist'||/competition|league|navigation|tabs|filter/i.test(scope.getAttribute('data-testid')||scope.className||''));
      if(el.getAttribute('role')!=='tab'&&!expands&&!navigationScope&&!(scope&&el.getAttribute('aria-controls')))return [];
      // A priced button in a market is a selection, never navigation.
      if(el.querySelector('[data-testid*="odds"],[data-testid*="price"],[class*="-price"],.odds')||el.hasAttribute('data-odds'))return [];
      const parent=el.closest('[data-event-id],[data-market-id]');
      const key=[label,el.getAttribute('role')||el.tagName,el.getAttribute('aria-controls')||'',el.getAttribute('data-testid')||'',parent?.getAttribute('data-event-id')||parent?.getAttribute('data-market-id')||'',index].join('|');
      const id='bf-nav-'+index;el.setAttribute('data-collector-betfair-control',id);
      const category=scope&&/league|competition|country/i.test(scope.getAttribute('data-testid')||scope.className||'')?'league':'';
      return [{label,key,id,role:el.getAttribute('role')||el.tagName.toLowerCase(),category}];
    });
    const identity={url:location.href,links:links.map(l=>l.url).sort(),headings:[...document.querySelectorAll('h1,h2,h3,[data-testid="event-name"],[data-testid="market-name"]')].filter(visible).map(e=>clean(e.innerText)),tabs:[...document.querySelectorAll('[role="tab"]')].map(e=>[clean(e.innerText),e.getAttribute('aria-selected')]),expanded:[...document.querySelectorAll('[aria-expanded]')].map(e=>[e.getAttribute('aria-controls')||e.getAttribute('data-testid')||clean(e.innerText).slice(0,120),e.getAttribute('aria-expanded')]),events:[...document.querySelectorAll('[data-event-id],[data-market-id]')].map(e=>[e.getAttribute('data-event-id')||e.getAttribute('data-market-id'),e.getAttribute('data-event-name'),e.getAttribute('data-market-name')])};
    return {links,controls,identity};
  })()`);
  const links = view.links.flatMap(link => { const url = betfairNavigationUrl(link.url, page.url()); return url ? [{ url, label: link.label }] : []; });
  return { links: [...new Map(links.map(link => [link.url, link])).values()], controls: view.controls,
    fingerprint: createHash("sha256").update(JSON.stringify(view.identity)).digest("hex") };
}

async function activate(page: Page, expected: BetfairControl): Promise<void> {
  const found = (await discoverBetfairView(page, true)).controls.find(control => control.key === expected.key);
  if (!found) throw new Error(`El control deportivo ya no está disponible: ${expected.label}`);
  // Re-discovery revalidates that this is navigation, not a selection or form.
  const pressed = await page.evaluate<boolean>(`(() => {const e=document.querySelector('[data-collector-betfair-control="${found.id}"]');if(!e)return false;if(e.getAttribute('aria-selected')==='true'||e.getAttribute('aria-expanded')==='true')return true;e.scrollIntoView({block:'center'});e.click();return true;})()`);
  if (!pressed) throw new Error(`No se pudo abrir: ${expected.label}`);
  await page.waitForTimeout(350);
}

const targetKey = (target: Target) => JSON.stringify([target.url, target.path.map(control => control.key)]);
const quoteKey = (row: ProviderRecord) => JSON.stringify([row.sourceEventId || row.eventName, row.sourceMarketId || row.market, row.marketPeriod, row.sourceSelectionId || row.selection, row.line, row.participantPlayer]);

/** One reusable browser tab, a recursive frontier, and per-view durable RAW.
 * The same DOM-based traversal works in Playwright and the Renzo adapter. */
export async function crawlBetfair(page: Page, context: AcquisitionContext, fallback?: () => Promise<HandlerResult>): Promise<HandlerResult> {
  const crawl = context.visualCrawl ??= { visited: [], pending: [], records: [], rawPaths: [], visits: [], tabsOpened: 1, ocrCaptures: 0 };
  const state = context.betfairCrawl ??= { pending: [{ url: context.source.url, path: [] }], queued: new Set([JSON.stringify([context.source.url, []])]), seen: new Set(),
    competitions: new Set(), events: new Set(), marketViews: new Set(), failures: [], completed: false };
  const records = new Map(crawl.records.map(row => [quoteKey(row), row]));
  const rootControls = state.rootControls ??= new Map<string, Set<string>>();
  let phase = "Betfair: descubriendo todas las competiciones de fútbol";
  const progress = (status: "RUNNING" | "CHALLENGE" | "COMPLETE") => {
    crawl.pending = [...new Set(state.pending.map(target => target.url))];
    context.visualProgress?.({ state: status, url: page.url(), phase, updatedAt: new Date().toISOString(),
      visited: crawl.visited.length, pending: state.pending.length + Number(Boolean(state.active)), tabsOpened: 1, records: records.size, ocrCaptures: 0,
      competitionsDiscovered: state.competitions.size, eventsDiscovered: state.events.size, marketViews: state.marketViews.size,
      failedViews: state.failures.length, complete: state.completed && !state.failures.length && !context.collection?.reason });
  };
  const enqueue = (target: Target, key = targetKey(target)) => {
    if (context.collection && (!context.collection.allowedUrl(target.url, target.competition || "") || target.path.some(c => !context.collection!.allowedControl(c.label, null, c.role || "navigation", c.category)))) return;
    if (!state.queued.has(key)) { state.queued.add(key); state.pending.push(target); }
  };
  let observer: Awaited<ReturnType<typeof observeExplorationPage>> | undefined;
  let lastProof: Extract<HandlerResult, { kind: "data" }>["evidence"] | undefined;
  try {
    if (context.browserMode !== "renzo" && typeof page.context === "function") observer = await observeExplorationPage(page, context);
    while (state.active || state.pending.length) {
      context.signal?.throwIfAborted();
      await context.collection?.refreshRules();
      context.collection?.checkBudget();
      const target = state.active ?? state.pending.shift()!;
      if (context.collection && (!context.collection.allowedUrl(target.url, target.competition || "") || target.path.some(c => !context.collection!.allowedControl(c.label, null, c.role || "navigation", c.category)))) { state.active = undefined; await context.collection.checkpoint(context); continue; }
      state.active = target; state.completed = false;
      context.collection?.setView(target.url, target.competition || "");
      await context.collection?.checkpoint(context);
      phase = `Betfair: ${target.competition || target.url}${target.path.length ? ` · ${target.path.at(-1)!.label}` : ""}`; progress("RUNNING");
      try {
        const key = targetKey(target);
        if (state.ready !== key || betfairNavigationUrl(page.url(), context.source.url) !== target.url) {
          state.ready = undefined; context.networkCaptures = []; observer?.reset();
          const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: context.timeoutMs });
          if (response && response.status() >= 400 && !(await detectPageChallenge(page, response.status(), target.url))) throw new Error(`HTTP ${response.status()}`);
          await page.waitForTimeout(Math.min(context.observeMs, 1000));
          for (const control of target.path) {
            const blocked = await detectPageChallenge(page, undefined, target.url);
            if (blocked) { progress("CHALLENGE"); return { kind: "challenge", ...blocked }; }
            await activate(page, control);
            if (context.collection && !context.collection.allowedUrl(page.url(), target.competition || "")) throw new Error("Control fuera del alcance seleccionado");
          }
          state.ready = key;
        }
        const blocked = await detectPageChallenge(page, undefined, target.url);
        if (blocked) { progress("CHALLENGE"); return { kind: "challenge", ...blocked }; }
        if (!betfairNavigationUrl(page.url(), context.source.url)) throw new Error("La navegación salió de las rutas deportivas de la fuente");
        const firstView = await discoverBetfairView(page);
        if (!target.path.length && !rootControls.has(target.url)) {
          rootControls.set(target.url, new Set((await discoverBetfairView(page, true)).controls
            .filter(control => !/load more|show more|next/i.test(control.label)).map(control => control.key)));
        }
        const fingerprint = `${target.url}|${firstView.fingerprint}`;
        if (state.seen.has(fingerprint)) { state.active = undefined; continue; }
        const viewRecords = new Map<string, ProviderRecord>();
        let visiblePrices = 0, challenge: Awaited<ReturnType<typeof detectPageChallenge>> = null;
        const scan = async () => {
          context.signal?.throwIfAborted();
          if (challenge) return;
          challenge = await detectPageChallenge(page, undefined, target.url);
          if (challenge) return;
          if (!betfairNavigationUrl(page.url(), context.source.url)) throw new Error("El control salió de las rutas deportivas de la fuente");
          const view = await discoverBetfairView(page);
          for (const link of view.links) {
            const competition = /\/c-[^/]+/.test(link.url) ? link.label : target.competition;
            const competitionId = /\/c-([^/]+)/.exec(new URL(link.url).pathname)?.[1];
            const eventId = /\/(?:e|event)-([^/]+)/.exec(new URL(link.url).pathname)?.[1];
            if (competitionId) state.competitions.add(competitionId);
            if (eventId) state.events.add(`event:${eventId}`);
            enqueue({ url: link.url, path: [], competition });
          }
          for (const control of view.controls) {
            // State identity prevents pagination loops when live odds change.
            if (rootControls.get(target.url)?.has(control.key)) {
              // Restore a sibling tab directly from the root, once. Replaying
              // every A→B→C permutation would make N tabs require N² loads.
              enqueue({ ...target, retries: undefined, path: [control] }, `${target.url}|root|${control.key}`);
            } else enqueue({ ...target, retries: undefined, path: [...target.path, control] }, `${target.url}|${view.fingerprint}|${control.key}`);
          }
          const snapshot = await captureBetfairDom(page);
          visiblePrices = Math.max(visiblePrices, snapshot.visiblePrices);
          for (const event of snapshot.events) {
            event.competition ??= target.competition;
            state.events.add(`event:${event.id || event.label}`);
            for (const market of event.markets) state.marketViews.add(JSON.stringify([event.id || event.label, market.id || market.label, market.period]));
          }
          for (const row of betfairRecords(snapshot.events, page.url())) viewRecords.set(quoteKey(row), row);
          await observer?.settle();
          progress("RUNNING");
        };
        await scanScrollRegions(page, context, scan);
        const foundChallenge = challenge as Awaited<ReturnType<typeof detectPageChallenge>>;
        if (foundChallenge) { progress("CHALLENGE"); return { kind: "challenge", ...foundChallenge }; }
        if (context.renzoPage) {
          try {
            const feeds = await context.renzoPage.readSportsFeeds({ exhaustive: !context.collection?.restricted });
            context.networkCaptures = feeds.map(feed => ({ ...feed, transport: "chrome-renzo-fetch" }));
          } catch (error) {
            context.signal?.throwIfAborted();
            state.failures.push({ url: target.url, path: target.path.map(c => c.label), reason: `Red: ${String(error)}` });
          }
        }
        if (visiblePrices > viewRecords.size && fallback && context.browserMode !== "renzo") {
          phase = "Betfair: comprobando precios pendientes mediante OCR"; progress("RUNNING");
          const result = await fallback();
          if (result.kind === "challenge") { progress("CHALLENGE"); return result; }
          if (result.kind === "data") for (const row of result.records) viewRecords.set(quoteKey(row), row);
        }
        for (const capture of context.networkCaptures ?? []) {
          if (/account|wallet|betslip|payment|login|tracking|analytics/i.test(capture.url)) continue;
          try {
            const payload = JSON.parse(capture.body);
            for (const row of [...extractBetfairFeed(payload, page.url()), ...extractGenericSportsRecords(payload, "betfair", page.url())]) {
              row.competition ??= target.competition;
              if (row.sport && !/^(football|soccer|fútbol)$/i.test(row.sport)) continue;
              row.sport ??= "football";
              viewRecords.set(quoteKey(row), row);
              state.events.add(`event:${row.sourceEventId || row.eventName!}`);
              state.marketViews.add(JSON.stringify([row.sourceEventId || row.eventName, row.sourceMarketId || row.market, row.marketPeriod]));
            }
          } catch { /* A non-JSON sports response is not a price. */ }
        }
        const proof = { url: page.url(), transport: "betfair-exhaustive", capturedAt: new Date().toISOString(), payload: {
          profileVersion: BETFAIR_PROFILE_VERSION, product: "sportsbook", records: [...viewRecords.values()], path: target.path.map(c => c.label),
          competition: target.competition ?? null, visiblePrices, discoveredLinks: (await discoverBetfairView(page)).links,
        } };
        const saved = context.savePageCapture ? await context.savePageCapture("dom", { kind: "data", records: [...viewRecords.values()], evidence: proof })
          : { records: [...viewRecords.values()], rawPath: "" };
        if (saved.rawPath) crawl.rawPaths.push(saved.rawPath);
        for (const row of saved.records) records.set(quoteKey(row), row);
        crawl.records = [...records.values()]; lastProof = proof;
        if (visiblePrices > viewRecords.size) state.failures.push({ url: target.url, path: target.path.map(c => c.label), reason: "Hay precios visibles sin asociación verificable a evento, mercado y selección" });
        if (!crawl.visited.includes(target.url)) crawl.visited.push(target.url);
        crawl.visits.push({ url: target.url, records: saved.records.length, method: "dom" });
        state.seen.add(fingerprint); state.active = undefined; progress("RUNNING");
        await context.collection?.view(context, target.url, target.path.map(c => c.label).join(" / "), visiblePrices <= viewRecords.size, visiblePrices > viewRecords.size ? "Precios pendientes de asociación" : undefined);
      } catch (error) {
        context.signal?.throwIfAborted();
        if (/Presupuesto de/.test(String(error))) throw error;
        const failure = { url: target.url, path: target.path.map(c => c.label), reason: String(error), controls: target.path };
        if (!target.retries) {
          state.pending.push({ ...target, retries: 1 });
          phase = `Betfair: se reintentará una vista que falló · ${failure.reason}`;
        } else state.failures.push(failure);
        crawl.visits.push({ url: target.url, records: 0, method: "navigation", reason: failure.reason });
        state.active = undefined; state.ready = undefined; progress("RUNNING");
      }
    }
    state.completed = true; phase = state.failures.length ? `Betfair: recorrido parcial · ${state.failures.length} vistas pendientes de revisión` : "Betfair: agotadas las ligas, eventos y pestañas descubiertas"; progress("COMPLETE");
    const coverage = { complete: !state.failures.length && !context.collection?.reason, competitions: state.competitions.size, events: state.events.size, marketViews: state.marketViews.size, views: state.seen.size, failures: state.failures, pending: state.pending.length };
    if (!records.size) return { kind: "miss", reason: `Betfair: ${coverage.competitions} competiciones, ${coverage.events} eventos y ${coverage.views} vistas; sin cuotas verificables. ${state.failures.map(f => f.reason).join("; ")}` };
    return { kind: "data", records: [...records.values()], acquisitionMethod: "dom", ...(context.savePageCapture ? { validatedPages: crawl.rawPaths } : {}),
      evidence: { ...(lastProof ?? { url: page.url(), transport: "betfair-exhaustive", capturedAt: new Date().toISOString() }), payload: {
        profileVersion: BETFAIR_PROFILE_VERSION, product: "sportsbook", records: [...records.values()], coverage, pageRawPaths: crawl.rawPaths, navigation: crawl.visits } } };
  } finally { await observer?.close(); }
}
