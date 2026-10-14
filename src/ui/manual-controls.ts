import type { Page } from 'playwright';
import { detectOdds, type DomNode } from '../dom/extractor.js';
import type { ManualReadingStatus } from './manual-reading.js';

export type ManualRegion = { x: number; y: number; width: number; height: number };
export type ManualCommand = { id: number; type: 'activate' | 'pause' | 'selection' | 'save' | 'finish'; region?: ManualRegion | null };
export type ManualControlState = { url: string; revision: number; movedAt: number; selecting: boolean; commands: ManualCommand[] };

// The Chrome tab passes commands back through the existing Apple Events bridge.
// No Collector credentials or cross-origin HTTP access are exposed to the website.
const program = String.raw`(() => {
  window.__collectorManualCapture?.remove();
  const initial = INITIAL_STATE;
  const host = document.createElement('sportsbook-manual-control');
  host.style.cssText = 'all:initial!important;position:fixed!important;width:0!important;height:0!important;z-index:2147483647!important;pointer-events:none!important';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = '<style>' +
    ':host{all:initial}*{box-sizing:border-box}.bar{position:fixed;left:24px;top:80px;padding:7px;background:#151a21;color:#f2f5f8;border:1px solid #536273;border-radius:9px;font:11px system-ui,sans-serif;box-shadow:0 3px 14px #0005;pointer-events:auto;user-select:none;max-width:calc(100vw - 8px)}' +
    '.actions{display:flex;gap:4px;flex-wrap:wrap}button{font:11px system-ui,sans-serif;padding:6px 7px;border:1px solid #586577;border-radius:5px;background:#27323f;color:#fff;cursor:pointer}button:hover{background:#3d5066}button:disabled{opacity:.6;cursor:wait}button[aria-pressed=true]{border-color:#73bfeb}.info{display:flex;gap:10px;margin-top:6px;cursor:grab;touch-action:none}.info:active{cursor:grabbing}.state{color:#9de1b0}.error{color:#ffbeb8;max-width:280px;margin-top:5px}.area{position:fixed;border:2px solid #56b9ef;background:#56b9ef12;pointer-events:none}.selecting{position:fixed;inset:0;cursor:crosshair;pointer-events:auto;touch-action:none}.hint{position:fixed;left:12px;bottom:12px;padding:6px 9px;background:#151a21;color:#fff;font:12px system-ui;pointer-events:none}</style>' +
    '<div class="area" hidden></div><div class="selecting" hidden></div><div class="hint" hidden>Arrastra para seleccionar. Pulsa SELECCIONAR otra vez para toda la vista. Escape cancela.</div>' +
    '<div class="bar" role="toolbar" aria-label="Scroll Manual"><div class="actions">' +
    '<button data-action="capture"></button><button data-action="selection">▣ SELECCIONAR</button><button data-action="save">💾 GUARDAR</button><button data-action="finish">✕ TERMINAR</button>' +
    '</div><div class="info" title="Arrastra para fijar. Doble clic para volver a seguir el cursor."><span class="state"></span><span class="views"></span><span class="new"></span></div><div class="error" role="status" hidden></div></div>';
  const bar = root.querySelector('.bar'), info = root.querySelector('.info'), area = root.querySelector('.area');
  const mask = root.querySelector('.selecting'), hint = root.querySelector('.hint');
  const buttons = Object.fromEntries([...root.querySelectorAll('button')].map(button => [button.dataset.action,button]));
  let state = initial, pinned = false, dragging = null, selecting = false, origin = null, draft = null;
  let revision = 0, movedAt = 0, serial = initial.lastCommand||0, pending = 0, queue = [], savedUntil = 0;
  let cursor = {x:24,y:80}, frame = 0, savedTimer = 0;
  const enqueue = (type, extra={}) => { pending = ++serial; queue.push({id:serial,type,...extra}); render(); };
  const dirty = () => { revision++; movedAt = Date.now(); };
  const draw = region => {
    area.hidden = !region;
    if(region)Object.assign(area.style,{left:region.x+'px',top:region.y+'px',width:region.width+'px',height:region.height+'px'});
  };
  const place = (x,y) => {
    const box = bar.getBoundingClientRect();
    bar.style.left = Math.max(4,Math.min(x,innerWidth-box.width-4))+'px';
    bar.style.top = Math.max(4,Math.min(y,innerHeight-box.height-4))+'px';
  };
  const follow = () => {
    frame = 0;
    const box = bar.getBoundingClientRect();
    place(cursor.x+18+box.width<innerWidth?cursor.x+18:cursor.x-box.width-18,
      cursor.y+18+box.height<innerHeight?cursor.y+18:cursor.y-box.height-18);
  };
  const render = () => {
    buttons.capture.textContent = state.captureActive?'Ⅱ PAUSAR':'▶ ACTIVAR';
    buttons.capture.setAttribute('aria-pressed',String(state.captureActive));
    buttons.selection.setAttribute('aria-pressed',String(Boolean(state.selection)||selecting));
    buttons.selection.title = 'Marcar una zona. Durante la selección, pulsar otra vez vuelve a la vista completa.';
    buttons.save.textContent = Date.now()<savedUntil?'GUARDADO ✓':'💾 GUARDAR';
    info.querySelector('.state').textContent = selecting?'▣ SELECCIONANDO':state.captureActive?'● CAPTURANDO':'Ⅱ PAUSADO';
    info.querySelector('.views').textContent = 'Vistas: '+state.savedViews;
    info.querySelector('.new').textContent = 'Nuevos: '+state.newRecords;
    const error = root.querySelector('.error'); error.textContent = state.error||''; error.hidden = !state.error;
    for(const button of Object.values(buttons))button.disabled = Boolean(pending)||!state.ready||(selecting&&(button===buttons.capture||button===buttons.save));
    if(!selecting)draw(state.selection);
  };
  const endSelection = () => { selecting = false; origin = null; draft = null; mask.hidden = hint.hidden = true; draw(state.selection); render(); };
  buttons.capture.onclick = () => enqueue(state.captureActive?'pause':'activate');
  buttons.save.onclick = () => enqueue('save');
  buttons.finish.onclick = () => {endSelection();enqueue('finish');};
  buttons.selection.onclick = () => {
    if(selecting){endSelection();enqueue('selection',{region:null});return;}
    selecting = true; mask.hidden = hint.hidden = false; render();
  };
  mask.onpointerdown = event => {
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();mask.setPointerCapture(event.pointerId);
    origin = {x:event.clientX,y:event.clientY};draft = null;
  };
  mask.onpointermove = event => {
    if(!origin)return;
    draft = {x:Math.min(origin.x,event.clientX),y:Math.min(origin.y,event.clientY),
      width:Math.abs(event.clientX-origin.x),height:Math.abs(event.clientY-origin.y)};
    draw(draft);
  };
  mask.onpointerup = event => {
    if(!origin)return;
    event.preventDefault();event.stopPropagation();
    const region = {x:Math.max(0,Math.min(origin.x,event.clientX)),y:Math.max(0,Math.min(origin.y,event.clientY)),
      width:Math.abs(event.clientX-origin.x),height:Math.abs(event.clientY-origin.y)};
    endSelection();
    if(region.width>=4&&region.height>=4)enqueue('selection',{region});
  };
  mask.onpointercancel = endSelection;
  info.onpointerdown = event => {
    if(event.button!==0)return;
    event.preventDefault();pinned = true;const box = bar.getBoundingClientRect();
    dragging = {x:event.clientX-box.left,y:event.clientY-box.top};info.setPointerCapture(event.pointerId);
  };
  info.onpointermove = event => { if(dragging)place(event.clientX-dragging.x,event.clientY-dragging.y); };
  info.onpointerup = info.onpointercancel = () => { dragging = null; };
  info.ondblclick = () => { pinned = false;follow(); };
  const move = event => {
    const previous = cursor, box = bar.getBoundingClientRect();
    cursor = {x:event.clientX,y:event.clientY};
    const distance = point => Math.hypot(Math.max(box.left-point.x,0,point.x-box.right),Math.max(box.top-point.y,0,point.y-box.bottom));
    // Stop moving away when the pointer approaches the buttons.
    if(distance(cursor)<32&&distance(cursor)<distance(previous)){cancelAnimationFrame(frame);frame=0;return;}
    if(!pinned&&!selecting&&!event.composedPath().includes(host)&&!frame)frame = requestAnimationFrame(follow);
  };
  const escape = event => { if(event.key==='Escape'&&selecting){event.preventDefault();endSelection();} };
  const resize = () => {const box=bar.getBoundingClientRect();place(box.left,box.top);dirty();};
  const onScroll = event => {if(!event.composedPath().includes(host))dirty();};
  const observer = new MutationObserver(changes => {
    if(movedAt&&Date.now()-movedAt<2000&&changes.some(change=>change.target!==host&&!host.contains(change.target)))revision++;
  });
  document.documentElement.append(host);
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('keydown',escape,true);
  document.addEventListener('scroll',onScroll,{capture:true,passive:true});
  window.addEventListener('resize',resize);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:['class','style','hidden','aria-hidden']});
  window.__collectorManualCapture = {
    poll(){
      if(!host.isConnected)(document.fullscreenElement||document.documentElement).append(host);
      if(!bar.isConnected)return null;
      const commands=queue;queue=[];return {url:location.href,revision,movedAt,selecting,commands};
    },
    update(next){
      if(next.lastSavedAt&&next.lastSavedAt!==state.lastSavedAt){
        savedUntil=Date.now()+3000;clearTimeout(savedTimer);savedTimer=setTimeout(render,3050);
      }
      state=next;
      if(next.lastCommand>=pending)pending=0;
      render();
    },
    remove(){
      observer.disconnect();cancelAnimationFrame(frame);clearTimeout(savedTimer);
      document.removeEventListener('pointermove',move);document.removeEventListener('keydown',escape,true);
      document.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',resize);
      host.remove();delete window.__collectorManualCapture;
    }
  };
  render();
})()`;

export async function installManualControl(page: Page, status: ManualReadingStatus): Promise<void> {
  await page.evaluate(program.replace('INITIAL_STATE', JSON.stringify(status)));
}
export async function pollManualControl(page: Page): Promise<ManualControlState | null> {
  return page.evaluate('window.__collectorManualCapture?.poll() ?? null');
}
export async function updateManualControl(page: Page, status: ManualReadingStatus): Promise<void> {
  await page.evaluate(`window.__collectorManualCapture?.update(${JSON.stringify(status)})`);
}
export async function removeManualControl(page: Page): Promise<void> {
  await page.evaluate('window.__collectorManualCapture?.remove()');
}

/** Restrict the existing visible DOM snapshot without changing its extractor. */
export async function selectedManualView(page: Page, tree: DomNode, region: ManualRegion): Promise<{ tree: DomNode; text: string }> {
  const program = String.raw`(() => {
    const region = REGION, left = region.x, top = region.y;
    const right = Math.min(innerWidth,left+region.width), bottom = Math.min(innerHeight,top+region.height);
    if(left>=right||top>=bottom)throw Error('La zona seleccionada quedó fuera de la vista. Selecciona otra zona.');
    const excluded='sportsbook-manual-control,script,style,noscript,input,textarea,select,[contenteditable],form,[data-betslip],[class*="betslip"],[class*="account"],[class*="wallet"],header,footer,nav';
    const inside = rect => rect.width>0&&rect.height>0&&rect.left>=left&&rect.right<=right&&rect.top>=top&&rect.bottom<=bottom;
    const intersects = rect => rect.width>0&&rect.height>0&&rect.right>left&&rect.left<right&&rect.bottom>top&&rect.top<bottom;
    const paths = new WeakMap(), selected = {}, lines = [];
    const path = element => {
      if(paths.has(element))return paths.get(element);
      const parent=element.parentElement, value=element===document.body?'body':path(parent)+'/'+element.tagName.toLowerCase()+':'+([...parent.children].indexOf(element)+1);
      paths.set(element,value);return value;
    };
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let chars=0;
    for(let node=walker.nextNode();node&&chars<250000;node=walker.nextNode()){
      const parent=node.parentElement,text=node.textContent;
      if(!parent||!text?.trim()||parent.closest(excluded))continue;
      const style=getComputedStyle(parent);
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
      const range=document.createRange();range.selectNodeContents(node);
      const boxes=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
      if(!boxes.some(intersects))continue;
      let content='';
      if(boxes.every(inside))content=text.trim();
      else {
        // Keep complete tokens only: clipping a price must never turn 1.42 into 1.4.
        for(const word of text.matchAll(/\S+/g)){
          range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
          const rects=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
          if(rects.length&&rects.every(inside))content+=(content?' ':'')+word[0];
        }
      }
      if(!content)continue;
      chars+=content.length;lines.push(content);
      const key=path(parent),entry=selected[key]??={text:[],inside:inside(parent.getBoundingClientRect())};
      entry.text.push(content);
    }
    return {selected,text:lines.join('\n').slice(0,250000)};
  })()`;
  const scoped = await page.evaluate<{ selected: Record<string, { text: string[]; inside: boolean }>; text: string }>(
    program.replace('REGION', JSON.stringify(region)));
  const prune = (node: DomNode): DomNode | null => {
    const children = (node.children ?? []).map(prune).filter((child): child is DomNode => child !== null);
    const own = scoped.selected[node.path];
    if (!own && !children.length) return null;
    // Attribute labels are retained only on elements fully inside the selection.
    const attrs = own?.inside ? node.attrs : undefined;
    return { tag: node.tag, path: node.path, ...(attrs ? { attrs } : {}),
      text: [...(own?.text ?? []), ...children.map(child => child.text)].join(' ').slice(0,8000), children };
  };
  return { tree: prune(tree) ?? { tag: 'body', path: 'body', text: '', children: [] }, text: scoped.text };
}

/** Preserve original table legends/pair IDs as context, never out-of-zone prices. */
export function scopedBestFightOddsTree(original: DomNode, visible: DomNode): DomNode {
  const selected = new Map<string, DomNode>(), matchups = new Set<string>(), tables = new Set<string>();
  const index = (node: DomNode) => { selected.set(node.path,node); for (const child of node.children ?? []) index(child); };
  index(visible);
  const scan = (node: DomNode, table?: string) => {
    if (node.tag === 'table') table = node.path;
    if (node.tag === 'td' && detectOdds(selected.get(node.path)?.text ?? '').some(odds => odds.format === 'american')) {
      const id = /^\[\d+,[12],(\d+)\]$/.exec(node.attrs?.['data-li'] ?? '')?.[1];
      if (id) matchups.add(id);
      if (table) tables.add(table);
    }
    for (const child of node.children ?? []) scan(child, table);
  };
  // The visible crop may omit ancestor attributes. Read identifiers only from
  // the original DOM; price text still comes exclusively from the visible crop.
  scan(original);
  const matchup = (node: DomNode): string | undefined => node.attrs?.['data-mu'] || (node.children ?? []).map(matchup).find(Boolean);
  const crop = (node: DomNode): DomNode | null => {
    if (node.tag === 'table' && !tables.has(node.path)) return null;
    if (node.tag === 'tr') { const id = matchup(node); if (id && !matchups.has(id)) return null; }
    if (node.tag === 'td') {
      const scoped = selected.get(node.path);
      return { ...node, attrs: scoped?.text ? node.attrs : { ...(node.attrs?.['data-li'] ? { 'data-li': node.attrs['data-li'] } : {}) },
        text: scoped?.text ?? '', children: scoped?.children ?? [] };
    }
    if (node.tag === 'th' || /^h[1-3]$/.test(node.tag) || node.tag === 'time') return node;
    const children = (node.children ?? []).map(crop).filter((child): child is DomNode => child !== null);
    return { ...node, text: children.length ? children.map(child=>child.text).join(' ') : selected.get(node.path)?.text ?? '', children };
  };
  return crop(original) ?? { tag: 'body', path: 'body', text: '', children: [] };
}
