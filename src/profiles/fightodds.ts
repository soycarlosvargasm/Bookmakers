import { createHash } from "node:crypto";
import type { Page } from "playwright";
import { detectOdds, type DomNode, type DomProfile } from "../dom/extractor.js";
import type { ExtractionProfile } from "../engine/types.js";
import type { ProviderRecord } from "../normalization/types.js";

export const FIGHTODDS_DOM_PROFILE: DomProfile = {
  version: "fightodds-dom-v2",
  eventSelector: ".MuiList-root:has(table)",
  competitionSelector: 'a[href^="/odds/"]',
  participantSelector: 'tbody tr td:first-child a[href^="/fighters/"]',
  oddsSelector: "tbody tr td:not(:first-child) button"
};
export const FIGHTODDS_EXTRACTION_PROFILE: ExtractionProfile = {
  version: "fightodds-extraction-v2", domProfile: FIGHTODDS_DOM_PROFILE
};
const clean = (value: string): string => value.replace(/\s+/g, " ").trim();
const descendants = (node: DomNode): DomNode[] => [node, ...(node.children ?? []).flatMap(descendants)];
const bookmakerName = (value: string): string => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Keep href evidence locally: the generic DOM capture deliberately omits it. */
export async function captureFightOddsDom(page: Page): Promise<DomNode> {
  await page.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 20_000 });
  let previous = -1;
  for (let check = 0; check < 4; check++) {
    const count = await page.locator("table tbody tr").count();
    if (count === previous) break;
    previous = count;
    await page.waitForTimeout(350);
  }
  // Material UI class names are not the board contract: read actual rendered tables and hrefs.
  const program = `(() => {
    let seen=0;
    function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';}
    function node(el,depth=0){
      if(!el||depth>20||seen++>60000||!visible(el)||/^(SCRIPT|STYLE|SVG|PATH)$/.test(el.tagName))return null;
      const text=(el.innerText||el.querySelector('img[alt]')?.alt||'').replace(/\\s+/g,' ').trim();
      const attrs=Object.fromEntries([...el.attributes].filter(a=>/^(href|id|role|datetime|aria-label|data-(event|fixture|match)-id)$/.test(a.name)).map(a=>[a.name,a.value]));
      return {tag:el.tagName.toLowerCase(),text,path:'fightodds/'+seen,attrs,children:[...el.children].map(child=>node(child,depth+1)).filter(Boolean)};
    }
    return {tag:'body',text:'',path:'body',children:[...document.querySelectorAll('table')].filter(t=>visible(t)&&t.querySelector('tbody tr td:first-child a[href*="/fighters/"]')).map(table=>{
      let root=table.parentElement;
      while(root?.parentElement&&root.parentElement!==document.body&&root.parentElement.querySelectorAll('table').length===1)root=root.parentElement;
      const link=[...(root||table).querySelectorAll('a[href]')].find(a=>/^\\/odds\\/\\d+/.test(a.getAttribute('href')||''));
      const heading=(root||table).querySelector('h1,h2,h3,[role="heading"]');
      const children=[...(link?[node(link)]:heading?[node(heading)]:[]),node(table)].filter(Boolean);
      return {tag:'section',text:'',path:'fightodds/block',children};
    })};
  })()`;
  return page.evaluate(source=>(0,eval)(source) as DomNode,program);
}

/** One fighter per row, paired in table order; bookmaker columns stay aligned,
 * including empty headers/cells. Only displayed prices become records. */
export function extractFightOddsDom(root: DomNode, input: { sportsbook: string; sourceUrl: string; collectedAt?: string }): ProviderRecord[] {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const records: ProviderRecord[] = [];
  for (const block of root.children ?? []) {
    const eventLink = descendants(block).find(node => node.tag === "a" && /^\/odds\/\d+(?:\/|$)/.test(node.attrs?.href ?? ""));
    const eventId = /^\/odds\/(\d+)/.exec(eventLink?.attrs?.href ?? "")?.[1];

    const heading = eventLink ? descendants(eventLink).find(node => node.tag === "p") ?? eventLink : descendants(block).find(node => /^(h1|h2|h3)$/.test(node.tag) || node.attrs?.role === "heading");
    const date = heading?.children?.find(node => node.tag === "span")?.text;
    let competition = clean(heading?.text ?? eventLink?.text ?? "");
    if (date && competition.endsWith(clean(date))) competition = clean(competition.slice(0, -clean(date).length));
    for (const table of descendants(block).filter(node => node.tag === "table")) {
      const headerRow = descendants(table).find(node => node.tag === "thead")?.children?.find(node => node.tag === "tr");
      const headers = (headerRow?.children ?? []).filter(node => node.tag === "th");
      const body = (table.children ?? []).find(node => node.tag === "tbody");
      const rows = (body?.children ?? []).filter(node => node.tag === "tr" && descendants((node.children ?? []).find(cell => cell.tag === "td") ?? { tag: "td", text: "", path: "" })
        .some(child => child.tag === "a" && /^\/fighters\//.test(child.attrs?.href ?? "")));
      for (let index = 0; index + 1 < rows.length; index += 2) {
        const pair = [rows[index]!, rows[index + 1]!];
        const cells = pair.map(row => (row.children ?? []).filter(node => node.tag === "td"));
        const fighters = cells.map(row => descendants(row[0] ?? { tag: "td", text: "", path: "" })
          .find(node => node.tag === "a" && /^\/fighters\//.test(node.attrs?.href ?? "")));
        if (fighters.some(node => !node || !clean(node.text))) continue;
        const participants = fighters.map(node => clean(node!.text));
        if (participants[0] === participants[1]) continue;
        const fighterIds = fighters.map(node => /-(\d+)$/.exec(node!.attrs!.href!)?.[1] ?? null);
        // This is a composite source key, not a claimed provider fight ID.
        const blockId = eventId ?? `dom:${createHash("sha256").update(JSON.stringify([input.sourceUrl,competition,participants])).digest("hex").slice(0,24)}`;
        const sourceEventId = `${blockId}:fighters:${fighterIds.every(Boolean) ? fighterIds.join(":") : index / 2}`;
        for (const [side, row] of cells.entries()) {
          for (let column = 1; column < row.length; column++) {
            // The final, empty-headed column contains prop counts, not prices.
            if (column >= headers.length || !clean(headers[column]!.text)) continue;
            const price = detectOdds(clean(row[column]!.text));
            if (price.length !== 1 || price[0]!.decimal === null) continue;
            const odds = price[0]!;
            const book = clean(headers[column]!.text);
            const bookmaker = bookmakerName(book) || null;
            const sourceMarketId = `${sourceEventId}:moneyline:${bookmaker ?? `column-${column}`}`;
            records.push({
              sportsbook: input.sportsbook, bookmaker, sport: "mma", competition: competition || null,
              eventName: `${participants[0]} vs ${participants[1]}`, participants,
              awayParticipant: participants[0], homeParticipant: participants[1],
              eventStartTime: null, eventStatus: null, market: "Moneyline", marketPeriod: "fight",
              selection: participants[side]!, selectionStatus: null, line: null,
              rawOdds: odds.raw, rawOddsFormat: odds.format, decimalOdds: odds.decimal,
              sourceEventId, sourceMarketId, sourceSelectionId: `${sourceMarketId}:${fighterIds[side] ?? side + 1}`,
              sourceUrl: input.sourceUrl, providerTimestamp: null, collectedAt, participantPlayer: null,
              qualifiers: { extraction: "rendered-dom", profileVersion: FIGHTODDS_DOM_PROFILE.version,
                displayedBook: book, ...(eventId ? { displayedEventId: eventId } : {}), sourceEventIdKind: "composite-event-and-fighters" }
            });
          }
        }
      }
    }
  }
  return [...new Map(records.map(record => [JSON.stringify([record.eventName, record.market, record.selection, record.bookmaker, record.rawOdds]), record])).values()];
}
