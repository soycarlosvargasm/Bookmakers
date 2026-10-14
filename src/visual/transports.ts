import type { Page, Response, WebSocket } from 'playwright';
import type { AcquisitionContext } from '../engine/types.js';

/** Passive discovery for newly opened exploration pages. Does not alter NetworkHandler. */
export async function observeExplorationPage(page: Page, context: AcquisitionContext) {
  let closed = false, epoch = 0;
  const sockets = new Map<WebSocket, (frame: { payload: string | Buffer }) => void>();
  const pending = new Set<Promise<void>>();
  const add = (url: string, transport: string, body: string, status: number | null = null, contentType: string | null = null) => {
    if (closed || Buffer.byteLength(body) > 8 * 1024 * 1024) return;
    (context.networkCaptures ??= []).push({url,transport,body,status,contentType});
  };
  const response = (res: Response) => {
    const type = res.headers()['content-type'] || '';
    if (res.status() >= 400 || /event-stream/i.test(type) || !/json/i.test(type)) return;
    const observedEpoch = epoch;
    const task = res.text().then(body=>{if(observedEpoch===epoch)add(res.url(),'fetch',body,res.status(),type);}).catch(()=>undefined).finally(()=>pending.delete(task));
    pending.add(task);
  };
  const socket = (ws: WebSocket) => { const listener = (frame: { payload: string | Buffer }) => {if(typeof frame.payload==='string')add(ws.url(),'websocket',frame.payload);}; sockets.set(ws,listener);ws.on('framereceived',listener); };
  page.on('response',response);page.on('websocket',socket);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const streams=new Map<string,string>();
  cdp.on('Network.responseReceived',(event:{requestId:string;response:{url:string}})=>streams.set(event.requestId,event.response.url));
  cdp.on('Network.eventSourceMessageReceived',(event:{requestId:string;data:string})=>add(streams.get(event.requestId)||page.url(),'sse',event.data,null,'text/event-stream'));
  return {
    reset() { epoch++; context.networkCaptures = []; },
    async settle() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {await Promise.race([Promise.allSettled([...pending]),new Promise<void>(resolve=>{timer=setTimeout(resolve,1000);})]);}
      finally {clearTimeout(timer);}
    },
    async close() {closed=true;for(const [ws,listener] of sockets)ws.off('framereceived',listener);page.off('response',response);page.off('websocket',socket);await cdp.detach().catch(()=>undefined);}
  };
}
