import type { Page } from 'playwright';
import type { AcquisitionContext } from '../engine/types.js';

export type CopiedPage = { text: string; prices: number; loading: number; canvas: boolean; signature: string; ready: boolean; reason?: string };
/** Read rendered text as a copy/paste would, preserving line breaks. Do not read
 * inputs, account panels, hidden DOM or the user's system clipboard. */
export async function copyVisibleSportsText(page: Page, viewportTextOnly=false): Promise<CopiedPage> {
  const program = String.raw`(() => {
    const excluded='script,style,noscript,input,textarea,select,[contenteditable],form,[data-betslip],[class*="betslip"],[class*="account"],[class*="wallet"],header,footer,nav';
    const visible=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0;};
    const leaves=[...document.querySelectorAll('body *')].filter(el=>!el.closest(excluded)&&visible(el)&&![...el.children].some(child=>visible(child)&&(child.textContent||'').trim()));
    let lines=leaves.map(el=>el.innerText?.trim()).filter(text=>Boolean(text));
    if (VIEWPORT_TEXT_ONLY) {
      // A partly visible container must not copy its children above/below the viewport.
      lines=[];
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      for(let node=walker.nextNode();node;node=walker.nextNode()){
        const parent=node.parentElement,text=node.textContent?.trim();
        if(!text||!parent||parent.closest(excluded)||!visible(parent))continue;
        const range=document.createRange();range.selectNodeContents(node);
        if([...range.getClientRects()].some(r=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth))lines.push(text);
      }
    }
    const text=lines.join('\n').slice(0,250000);
    const prices=lines.reduce((n,line)=>n+(line.match(/(?:^|\s)(?:[+-]\d{3,5}|[1-9]\d{0,2}[.,]\d{1,3}|\d{1,3}\/\d{1,3})(?=\s|$)/g)||[]).length,0);
    const loading=[...document.querySelectorAll('[aria-busy="true"],[role="progressbar"],[class*="skeleton"],[class*="placeholder"],[class*="spinner"]')].filter(visible).length;
    const canvas=[...document.querySelectorAll('canvas')].some(el=>{if(!visible(el)||el.width<150||el.height<100)return false;try{const ctx=el.getContext('2d');if(!ctx)return true;const pixels=ctx.getImageData(0,0,el.width,el.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=97*4){if(pixels[i+3])colors.add([pixels[i],pixels[i+1],pixels[i+2]].join(','));if(colors.size>=2)return true;}return false;}catch{return true;}});
    return {text,prices,loading,canvas,signature:JSON.stringify([lines.length,prices,text.replace(/[\d.,:+/-]+/g,'#').slice(0,10000)]),ready:false};
  })()`;
  return page.evaluate(source => (0, eval)(source) as CopiedPage, program.replace('VIEWPORT_TEXT_ONLY',String(viewportTextOnly)));
}

export async function waitForSportsContent(page: Page, context: AcquisitionContext, maximumMs=Math.min(context.timeoutMs,12000)): Promise<CopiedPage> {
  const deadline=Date.now()+maximumMs;
  let previous='',stable=0,last:CopiedPage={text:'',prices:0,loading:0,canvas:false,signature:'',ready:false};
  do {
    context.signal?.throwIfAborted();context.collection?.checkBudget();
    last=await copyVisibleSportsText(page);
    stable=last.signature===previous?stable+1:0;previous=last.signature;
    // A canvas may need OCR; text pages must actually expose prices. A loading
    // skeleton with headers, league names and no prices is never ready.
    const populated=context.collection?.options.textOnly ? last.text.length>=40&&last.loading===0 : last.prices>=2||(last.prices>=1&&last.text.length>=40)||(last.canvas&&last.loading===0);
    if(populated&&stable>=1)return {...last,ready:true};
    if(Date.now()>=deadline)break;
    context.visualPhase?.(last.loading?'Esperando que termine la carga de cuotas':'Esperando texto y cuotas visibles');
    await page.waitForTimeout(Math.min(300,Math.max(1,deadline-Date.now())));
  }while(Date.now()<=deadline);
  return {...last,reason:last.loading?'La página sigue cargando; se conserva pendiente':'No hay cuotas visibles; se conserva pendiente'};
}
