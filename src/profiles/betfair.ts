import type { Page } from "playwright";
import { oddsToDecimal } from "../normalization/odds.js";
import type { ProviderRecord } from "../normalization/types.js";

export const BETFAIR_PROFILE_VERSION = "betfair-sportsbook-v1";
type Selection = { id?: string | null; label: string; odds: string; line?: string | null; status?: string | null; player?: string | null };
type Market = { id?: string | null; label: string; period?: string | null; selections: Selection[] };
export type BetfairEvent = { id?: string | null; label: string; competition?: string | null; start?: string | null; live?: boolean; markets: Market[] };
export type BetfairSnapshot = { events: BetfairEvent[]; visiblePrices: number };
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const values = (value: unknown): any[] => Array.isArray(value) ? value : Object.values(object(value));
const text = (value: unknown): string | null => typeof value === "string" || typeof value === "number" ? String(value).trim() || null : null;

export function betfairRecords(events: BetfairEvent[], sourceUrl: string, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const rows: ProviderRecord[] = [];
  for (const event of events) {
    const match = /^(.+?)\s+(?:vs?\.?|versus|@)\s+(.+)$/i.exec(event.label);
    const participants = match ? [match[1]!.trim(), match[2]!.trim()] : null;
    for (const market of event.markets) for (const selection of market.selections) {
      const raw = selection.odds.trim().replace(",", ".");
      const format = /^\d+\/\d+$/.test(raw) ? "fractional" : /^[+-]\d{3,}$/.test(raw) ? "american" : "decimal";
      const decimal = oddsToDecimal(raw, format);
      if (!event.label || !market.label || !selection.label || decimal === null || !Number.isFinite(decimal) || decimal <= 1 || decimal >= 10_000) continue;
      const resultMarket = /^(match odds|match result|full time result|1x2)$/i.test(market.label);
      const label = resultMarket && participants && /^(1|home)$/i.test(selection.label) ? participants[0]!
        : resultMarket && participants && /^(2|away)$/i.test(selection.label) ? participants[1]!
        : resultMarket && /^(x|draw|tie)$/i.test(selection.label) ? "Draw" : selection.label;
      rows.push({ sportsbook: "betfair", sport: "football", competition: event.competition ?? null, eventName: event.label,
        participants, homeParticipant: participants?.[0] ?? null, awayParticipant: participants?.[1] ?? null,
        eventStartTime: event.start && Number.isFinite(Date.parse(event.start)) ? new Date(event.start).toISOString() : null,
        eventStatus: event.live ? "live" : "prematch", market: market.label, marketPeriod: market.period ?? null,
        selection: label, selectionStatus: selection.status ?? null, line: selection.line ?? null,
        participantPlayer: selection.player ?? null, rawOdds: raw, rawOddsFormat: format, decimalOdds: decimal,
        sourceEventId: event.id ?? null, sourceMarketId: market.id ?? null, sourceSelectionId: selection.id ?? null,
        sourceUrl, collectedAt, qualifiers: { profileVersion: BETFAIR_PROFILE_VERSION, product: "sportsbook" } });
    }
  }
  return rows;
}

/** Join observed Sportsbook attachments by provider IDs. Exchange back/lay
 * ladders have different semantics and are never treated as fixed odds. */
export function extractBetfairFeed(payload: unknown, sourceUrl: string): ProviderRecord[] {
  const root = object(payload), attachment = object(root.attachments ?? root);
  const competitions = new Map(values(attachment.competitions).map(c => [String(c.competitionId ?? c.id), text(c.name)]));
  const events = new Map<string, BetfairEvent>();
  for (const value of values(attachment.events)) {
    const e = object(value), id = text(e.eventId ?? e.id), label = text(e.name ?? e.eventName);
    if (!id || !label) continue;
    events.set(id, { id, label, competition: text(e.competitionName) ?? competitions.get(String(e.competitionId)) ?? null,
      start: text(e.openDate ?? e.startTime ?? e.eventStartTime), live: e.inPlay === true || e.inplay === true, markets: [] });
  }
  for (const value of values(attachment.markets)) {
    const m = object(value), event = events.get(String(m.eventId)), label = text(m.marketName ?? m.name);
    if (!event || !label) continue;
    const selections: Selection[] = [];
    for (const value of values(m.runners ?? m.selections)) {
      const r = object(value);
      if (r.ex || r.availableToBack || r.availableToLay) continue;
      const decimal = text(r.winRunnerOdds?.trueOdds?.decimalOdds?.decimalOdds ?? r.winRunnerOdds?.decimalOdds?.decimalOdds ?? r.decimalOdds ?? r.odds?.decimal ?? r.price?.decimal);
      const fractional = text(r.winRunnerOdds?.trueOdds?.fractionalOdds?.numerator) && text(r.winRunnerOdds?.trueOdds?.fractionalOdds?.denominator)
        ? `${r.winRunnerOdds.trueOdds.fractionalOdds.numerator}/${r.winRunnerOdds.trueOdds.fractionalOdds.denominator}` : null;
      const name = text(r.runnerName ?? r.selectionName ?? r.name);
      if (name && (decimal || fractional)) selections.push({ id: text(r.selectionId ?? r.runnerId ?? r.id), label: name, odds: decimal ?? fractional!,
        line: text(r.handicap ?? r.line), status: text(r.status)?.toLowerCase(), player: text(r.playerName) });
    }
    event.markets.push({ id: text(m.marketId ?? m.id), label, period: text(m.period ?? m.marketPeriod), selections });
  }
  return betfairRecords([...events.values()], sourceUrl);
}

/** Snapshot only sports labels, IDs and prices; no account fields or scripts. */
export async function captureBetfairDom(page: Page): Promise<BetfairSnapshot> {
  return page.evaluate(String.raw`(() => {
    const clean = value => (value || '').replace(/\s+/g,' ').trim();
    const visible = e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'; };
    const read = (e,selector) => clean(e.querySelector(selector)?.innerText);
    const attr = (e,names) => names.map(name=>e.getAttribute(name)).find(Boolean)||null;
    const pricePattern = /^(?:[1-9]\d*(?:[.,]\d+)?|[+-]\d{3,}|\d+\/\d+|EVS|EVENS)$/i;
    const privateUi = 'form,[data-betslip],[data-testid*="betslip"],[class*="-betslip"]';
    const eventSelector = '[data-event-id],[data-fixture-id],[data-testid*="event-card"],[data-testid*="event-row"],[data-urn*=":event:"],[class*="-eventCard"],[class*="-eventRow"]';
    const marketSelector = '[data-market-id],[data-testid="market"],[data-testid*="market-card"],[data-testid*="market-container"],[data-urn*=":market:"],[class*="-marketCard"],[class*="-marketContainer"]';
    const runnerSelector = '[data-selection-id],[data-runner-id],[data-testid*="selection"],[data-testid*="runner"],[class*="-selection"],[class*="-runner"],[class*="-outcome"],[class*="-priceButton"]';
    const roots = [...document.querySelectorAll(eventSelector)].filter(visible).filter(e=>!e.closest(privateUi)&&!e.parentElement?.closest(eventSelector));
    const pageEvent = /\/(?:e|event)-([^/?#]+)/.exec(location.pathname);
    if(!roots.length&&pageEvent) roots.push(document.querySelector('main')||document.body);
    const selectedMarket = read(document,'[data-testid="selected-market"]')||clean([...document.querySelectorAll('[role="tab"][aria-selected="true"]')].find(e=>e.closest('[data-testid*="market"],[class*="-market"],[data-testid="event-tabs"]'))?.innerText);
    const pageCompetition = read(document,'[data-testid="competition-name"],[data-competition-name],h1');
    const events = roots.map(e=>{
      const link=e.querySelector('a[href*="/e-"],a[href*="/event-"]');
      const participants=[...e.querySelectorAll('[data-testid*="participant-name"],[data-testid*="team-name"],[class*="-participantName"],[class*="-teamName"]')].filter(visible).map(e=>clean(e.innerText));
      const label=attr(e,['data-event-name'])||read(e,'[data-testid="event-name"],[class*="-eventName"],h1')||clean(link?.innerText)||(participants.length===2?participants.join(' vs '):'');
      const id=attr(e,['data-event-id','data-fixture-id'])||/\/(?:e|event)-([^/?#]+)/.exec(link?.href||'')?.[1]||pageEvent?.[1]||null;
      const groups=[...e.querySelectorAll(marketSelector)].filter(visible).filter(m=>!m.parentElement?.closest(marketSelector));
      if(e.matches(marketSelector))groups.unshift(e);
      if(!groups.length)groups.push(e);
      const markets=groups.map(m=>{
        const label=attr(m,['data-market-name'])||read(m,'[data-testid="market-name"],[class*="-marketName"],h2,h3,header')||selectedMarket;
        const selections=[...m.querySelectorAll(runnerSelector)].filter(visible).filter(r=>!r.closest(privateUi)&&!r.parentElement?.closest(runnerSelector)).flatMap(r=>{
          const oddsElement=r.querySelector('[data-testid*="price"],[data-testid*="odds"],[class*="-price"],[class*="-odds"],.odds');
          let odds=attr(r,['data-odds'])||clean(oddsElement?.innerText);
          if(!odds)odds=[...r.querySelectorAll('span')].filter(visible).map(e=>clean(e.innerText)).find(t=>pricePattern.test(t))||'';
          if(!pricePattern.test(odds))return [];
          if(/^EVS|EVENS$/i.test(odds))odds='2.0';
          const name=attr(r,['data-selection-name','data-runner-name'])||read(r,'[data-testid*="runner-name"],[data-testid*="selection-name"],[class*="-runnerName"],[class*="-selectionName"],.name')||clean(r.getAttribute('aria-label'))||clean(r.innerText).replace(odds,'').trim();
          if(!name||pricePattern.test(name))return [];
          return [{id:attr(r,['data-selection-id','data-runner-id']),label:name,odds,line:attr(r,['data-handicap','data-line']),player:attr(r,['data-player-name']),status:attr(r,['data-status'])||(r.disabled||r.getAttribute('aria-disabled')==='true'?'suspended':null)}];
        });
        return {id:attr(m,['data-market-id']),label,period:attr(m,['data-period']),selections};
      }).filter(m=>m.label&&m.selections.length);
      const competition=attr(e,['data-competition-name'])||read(e,'[data-testid="competition-name"],[class*="-competitionName"]')||(!pageEvent?pageCompetition:null);
      return {id,label,competition,start:attr(e,['data-start-time'])||e.querySelector('time[datetime]')?.getAttribute('datetime')||null,live:attr(e,['data-inplay'])==='true',markets};
    }).filter(e=>e.label&&e.markets.length);
    const visiblePrices=[...document.querySelectorAll('[data-testid*="price"],[data-testid*="odds"],[class*="-price"],[class*="-odds"],.odds')].filter(visible).filter(e=>!e.closest(privateUi)&&pricePattern.test(clean(e.innerText))&&![...e.children].some(child=>visible(child)&&pricePattern.test(clean(child.innerText)))).length;
    return {events,visiblePrices};
  })()`);
}
