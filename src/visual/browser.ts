import { navigationDecision, navigationUrl } from "./navigation-policy.js";
import type { Page } from "playwright";
import type { VisualBoard } from "./extractor.js";

/** Recovered from the previous VisualDiscoveryEngine: choose the observed
 * Moneyline option automatically before reading its board. */
export async function prepareActionBoard(page: Page): Promise<void> {
  const consentClose = page.locator('#onetrust-banner-sdk button[aria-label="Close"]');
  if (await consentClose.isVisible().catch(() => false)) await consentClose.click();
  const marketSelect = page.locator("select").filter({ has: page.locator('option[value="ml"]') });
  if (await marketSelect.count() === 1) {
    await marketSelect.selectOption("ml");
    await page.waitForTimeout(800);
  }
}

/** Navigation targets must be visible sports/menu links, with an explicit
 * sports label or fixture name. Prices and account controls are not targets. */
export async function discoverVisualLinks(page: Page): Promise<string[]> {
  const program = `(() => {
    const sports = /^(sports?|sportsbook|deportes|apuestas deportivas|football|soccer|fútbol|futbol|cricket|tennis|tenis|basketball|baloncesto|all sports|todos los deportes|live|en vivo|prematch|prepartido)$/i;
    const fixture = /^.{2,100}\\s+(?:vs\\.?|v\\.?|versus)\\s+.{2,100}$/i;
    const excluded = /casino|poker|slots|login|sign.?in|register|account|wallet|deposit|withdraw|cashier|betslip|place.?bet|apostar|mi.?cuenta/i;
    return [...new Set([...document.querySelectorAll('a[href]')].filter(a => {
      const s = getComputedStyle(a), r = a.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 0 && r.height > 0;
    }).map(a => ({ label: (a.innerText || a.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim(), url: a.href, event: Boolean(a.closest('[data-event-id],[data-fixture-id],[data-match-id]')) }))
      .filter(a => {
        try { const u = new URL(a.url); return u.origin === location.origin && !u.username && !u.password &&
          !excluded.test(a.label + ' ' + u.pathname) && !/history|results|resultados|archivo|previous|last month/i.test(a.label + ' ' + u.pathname) &&
          (a.event || sports.test(a.label) || /(?:^|[#_-])(?:sports?|sportsbook|football|soccer|futbol|cricket|tennis|basketball|event|events|fixture|fixtures|match|matches|league|leagues|competition|competitions|tournament|odds|eventdetails|matchdetails|prematch|inplay|in-play)(?:[#?_-]|$)/i.test(u.pathname.replaceAll("/", "_") + u.hash)); } catch { return false; }
      }).map(a => { const u=new URL(a.url); ['utm_source','utm_medium','utm_campaign'].forEach(k=>u.searchParams.delete(k)); return u.href; }))];
  })()`;
  const links = await page.evaluate((source) => (0, eval)(source) as string[], program);
  return [...new Set(links.filter(url => navigationDecision(url, page.url()).allowed).map(navigationUrl))];
}

/** Read only the visible odds board, its labels, and their document coordinates. */
export async function captureActionBoard(page: Page): Promise<VisualBoard> {
  const program = `(() => {
    const box = (e) => { const r=e.getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}; };
    const visible = (e) => { const s=getComputedStyle(e),r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity || 1)>0 && r.width>0 && r.height>0; };
    const table=[...document.querySelectorAll('table')].find(t => visible(t) && [...t.querySelectorAll('thead th')].some(h=>h.innerText.trim().toUpperCase()==='SCHEDULED') && [...t.querySelectorAll('thead th')].some(h=>h.innerText.trim().toUpperCase()==='BEST ODDS'));
    const market=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='ml'))?.selectedOptions[0]?.textContent?.trim() || '';
    if(!table) return {pageUrl:location.href,viewport:{width:innerWidth,height:innerHeight},market,headers:[],rows:[]};
    const headers=[...table.querySelectorAll('thead th')].map((h,column)=>({label:h.querySelector('img')?.alt || h.innerText.trim(),box:box(h.querySelector('img') || h),cell:box(h),column}));
    const rows=[...table.querySelectorAll('tbody tr')].filter(tr=>tr.querySelectorAll('td').length>2 && tr.querySelector('a[href*="-game/"]')).map(tr=>{
      const cells=[...tr.querySelectorAll(':scope > td')].map((td,column)=>({box:box(td),column,prices:[...td.querySelectorAll('[data-testid="book-cell__odds"]')].filter(visible).map(e=>({text:e.innerText.trim().slice(0,30),box:box(e)}))}));
      const teams=[...tr.querySelectorAll('.game-info__team')].filter(visible).slice(0,3).map(t=>{const name=t.querySelector('.game-info__team--desktop span'),icon=t.querySelector('img[alt$="Team Icon"]');return {name:{text:name?.textContent?.trim().slice(0,80)||'',box:name?box(name):box(t)},iconLabel:icon?.alt||'',box:box(t)};});
      return {box:box(tr),eventHref:tr.querySelector('a[href*="-game/"]')?.getAttribute('href')||null,teams,cells};
    });
    return {pageUrl:location.href,viewport:{width:innerWidth,height:innerHeight},market,headers,rows};
  })()`;
  return page.evaluate((source) => (0, eval)(source) as VisualBoard, program);
}
