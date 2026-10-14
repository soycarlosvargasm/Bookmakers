import { navigationDecision, sportsControl } from "./navigation-policy.js";
import type { Page } from 'playwright';
import type { AcquisitionContext } from '../engine/types.js';
import type { NavigationCandidate } from './openai-vision.js';

/** Stable content identity excludes live prices and clocks, which must not reopen pagination forever. */
export async function navigationFingerprint(page: Page): Promise<string> {
  const program = `(() => JSON.stringify({url:location.href, links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')), events:[...document.querySelectorAll('[data-event-id],[data-fixture-id],[data-match-id]')].map(e=>e.getAttribute('data-event-id')||e.getAttribute('data-fixture-id')||e.getAttribute('data-match-id')), rows:document.querySelectorAll('tbody tr').length, headings:[...document.querySelectorAll('h1,h2,h3,[role="tab"]')].map(e=>[e.textContent?.trim().slice(0,150),e.getAttribute('aria-selected')]), expanded:[...document.querySelectorAll('[aria-expanded]')].map(e=>[e.getAttribute('aria-controls'),e.getAttribute('aria-expanded')])}))()`;
  return page.evaluate(source => (0, eval)(source) as string, program);
}

async function candidates(page: Page): Promise<Array<NavigationCandidate & { known: boolean; repeat: boolean }>> {
  const program = `(() => {
    const known=/^(?:all sports|sports|deportes|todos los deportes|football|soccer|fútbol|futbol|cricket|tennis|tenis|basketball|baloncesto|mma|ufc|boxing|boxeo|events|eventos|odds|cuotas|live|en vivo|prematch|prepartido|today|hoy|tomorrow|mañana|next|siguiente|load more|show more|ver más|mostrar más|all markets|todos los mercados|more markets|más mercados|moneyline|match winner|winner|ganador|1x2|handicap|spread|totals?|over.?under|both teams to score|ambos marcan)(?:\\s*\\(\\d+\\))?$/i;
    const forbidden=/bet.?slip|place.?bet|apostar|deposit|withdraw|casino|login|log.?in|sign.?in|register|account|results|history|cashier|wallet|balance|promotions?|bonuses?|affiliate|payment|purchase|captcha|verify.*human/i;
    const price=/^[+-]?\\d+(?:[.,]\\d+|\\/\\d+)?$/;
    return [...document.querySelectorAll('button,[role="tab"],[role="button"],summary,[tabindex]:not([tabindex="-1"]),[onclick]')].flatMap((el,index)=>{
      const rendered=(el.innerText||'').replace(/\\s+/g,' ').trim();
      const accessible=(el.getAttribute('aria-label')||el.getAttribute('title')||'').replace(/\\s+/g,' ').trim();
      const marketCounter=price.test(rendered)&&/props|more markets|market details|expand markets|más mercados/i.test(accessible);
      const label=(marketCounter?accessible:rendered||accessible);
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      const href=el.closest('a[href]')?.href||null;
      if(!label||label.length>180||forbidden.test(label+' '+(href||''))||(price.test(rendered)&&!marketCounter)||price.test(label)||r.width<=0||r.height<=0||s.display==='none'||s.visibility==='hidden'||el.disabled||el.getAttribute('aria-disabled')==='true'||el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-current')==='page'||el.closest('[data-selection-id],[data-outcome-id],[data-betslip],form'))return [];
      if(href){if(href.includes('/fighters/'))return [];try{const u=new URL(href);if(u.origin!==location.origin||u.username||u.password)return [];}catch{return [];}}
      const id='collector-navigation-'+index;el.setAttribute('data-collector-navigation',id);
      const role=el.getAttribute('role')||el.tagName.toLowerCase();
      const parent=el.closest('[data-event-id],[data-fixture-id],[data-match-id]');
      const key=[label,role,el.getAttribute('aria-controls'),el.getAttribute('data-id'),el.id,parent?.getAttribute('data-event-id')||parent?.getAttribute('data-fixture-id')||parent?.getAttribute('data-match-id')||''].join('|');
      const category=el.closest('[data-competition-id],[data-league-id],[data-testid*="league"],[data-testid*="competition"],[class*="-league"],[class*="-competition"]')?'league':'';
      return [{id,key,label,role,category,href,x:r.x,y:r.y,width:r.width,height:r.height,known:known.test(label),repeat:/load more|show more|ver más|mostrar más|next|siguiente/i.test(label)}];
    });
  })()`;
  return page.evaluate(source => (0, eval)(source) as Array<NavigationCandidate & { known: boolean; repeat: boolean }>, program);
}

export async function nextBrowsingControl(page: Page, visited: Set<string>, context?: AcquisitionContext): Promise<NavigationCandidate | null> {
  const found = await candidates(page), signature = await navigationFingerprint(page);
  return found.filter(c=>sportsControl(c.label,c.category) && (!c.href || navigationDecision(c.href,page.url(),c.category).allowed) && (!context?.collection || context.collection.allowedControl(c.label, c.href, c.role, c.category))).map(c=>({...c,key:c.repeat?`${c.key}|${signature}`:c.key})).find(c=>!visited.has(c.key))??null;
}
export async function visualNavigationCandidates(page: Page, visited: Set<string>, includeOffscreen=false, context?: AcquisitionContext): Promise<NavigationCandidate[]> {
  const found=await candidates(page), viewport=page.viewportSize();
  return found.filter(c=>sportsControl(c.label,c.category)&&(!c.href||navigationDecision(c.href,page.url(),c.category).allowed)&&(!context?.collection || context.collection.allowedControl(c.label, c.href, c.role, c.category))&&!visited.has(c.key)&&(includeOffscreen||c.y+c.height>0&&c.x+c.width>0&&(!viewport||c.y<viewport.height&&c.x<viewport.width)));
}
export async function activateBrowsingControl(page: Page, control: NavigationCandidate, timeoutMs: number, context?: AcquisitionContext): Promise<void> {
  const element=page.locator(`[data-collector-navigation="${control.id}"]`);
  // Revalidate identity after the model call; dynamic pages can replace controls while vision is running.
  const actual=await element.evaluate(el=>{
    const rendered=((el as HTMLElement).innerText||'').replace(/\s+/g,' ').trim(),accessible=(el.getAttribute('aria-label')||el.getAttribute('title')||'').replace(/\s+/g,' ').trim();
    const counter=/^[+-]?\d+(?:[.,]\d+|\/\d+)?$/.test(rendered)&&/props|more markets|market details|expand markets|más mercados/i.test(accessible);
    return {label:counter?accessible:rendered||accessible,href:(el.closest('a[href]') as HTMLAnchorElement|null)?.href||null,blocked:Boolean(el.closest('[data-selection-id],[data-outcome-id],[data-betslip],form'))};
  });
  if(actual.label!==control.label||actual.href!==control.href||actual.blocked)throw new Error('El control cambió mientras visión analizaba la página; se redescubrirá.');
  if (!sportsControl(control.label,control.category) || actual.href && !navigationDecision(actual.href,context?.source.url || page.url(),control.category).allowed || context?.collection && !context.collection.allowedControl(control.label,actual.href,control.role,control.category)) throw new Error("Destino omitido por política deportiva");
  await element.click({timeout:Math.min(timeoutMs,5000)});
}

/** Raster-scan vertical AND horizontal overflow, with a stagnation guard even for broken scroll regions. */
export async function scanScrollRegions(page: Page, context: AcquisitionContext, capture: (position: { region: string; top: number; left: number }) => Promise<void>): Promise<void> {
  context.signal?.throwIfAborted();
  const program = `(() => {
    const elements=[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>200&&r.height>100&&((el.scrollHeight>el.clientHeight+80&&/auto|scroll/.test(s.overflowY))||(el.scrollWidth>el.clientWidth+40&&/auto|scroll/.test(s.overflowX)));});
    elements.forEach((el,i)=>el.setAttribute('data-collector-scroll',String(i)));
    return ['document',...elements.map((_,i)=>String(i))];
  })()`;
  const regions=await page.evaluate(source=>(0,eval)(source) as string[],program);
  for(const region of regions){
    const step=async(axis:'x'|'y',reset:boolean)=>{
      context.signal?.throwIfAborted();
      const program=`(() => {const region=${JSON.stringify(region)},axis=${JSON.stringify(axis)},reset=${JSON.stringify(reset)};
        const el=region==='document'?document.scrollingElement:document.querySelector('[data-collector-scroll="'+region+'"]');
        if(!el)return {top:0,left:0,height:0,width:0,bottom:true,right:true};
        if(axis==='x')el.scrollLeft=reset?0:el.scrollLeft+Math.max(100,el.clientWidth*.7);else el.scrollTop=reset?0:el.scrollTop+Math.max(100,el.clientHeight*.7);
        return {top:el.scrollTop,left:el.scrollLeft,height:el.scrollHeight,width:el.scrollWidth,bottom:el.scrollTop+el.clientHeight>=el.scrollHeight-2,right:el.scrollLeft+el.clientWidth>=el.scrollWidth-2};})()`;
      return page.evaluate(source=>(0,eval)(source) as {top:number;left:number;height:number;width:number;bottom:boolean;right:boolean},program);
    };
    let row=await step('y',true),previousRow='',previousTop=-1,stableRows=0,unchangedRows=0;
    while(stableRows<2&&unchangedRows<3){
      let position=await step('x',true),previousColumn='',previousLeft=-1,stableColumns=0,unchangedColumns=0;
      while(stableColumns<2&&unchangedColumns<3){
        context.signal?.throwIfAborted();
        context.collection?.checkBudget();
        await page.waitForTimeout(context.exhaustive?200:120);
        context.signal?.throwIfAborted();
        context.visualPhase?.(`Scroll ${region}: vertical ${Math.round(position.top)} px · horizontal ${Math.round(position.left)} px`);
        await capture({region,top:position.top,left:position.left});
        position=await step('x',false);
        const key=`${position.left}:${position.width}`;
        unchangedColumns=position.left===previousLeft?unchangedColumns+1:0;previousLeft=position.left;
        stableColumns=position.right&&key===previousColumn?stableColumns+1:0;previousColumn=key;
      }
      await step('x',true);row=await step('y',false);
      const key=`${row.top}:${row.height}`;
      unchangedRows=row.top===previousTop?unchangedRows+1:0;previousTop=row.top;
      stableRows=row.bottom&&key===previousRow?stableRows+1:0;previousRow=key;
    }
    await step('x',true);await step('y',true);
  }
}
