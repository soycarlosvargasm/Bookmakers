import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { dayInZone } from '../engine/collection.js';
import type { Source } from '../engine/types.js';

export type CopiedRow = { name: string; rawPrices: string; props: string | null };
export type CopiedBlock = { title: string; date: string | null; rows: CopiedRow[] };
export type ManualNote = { id: string; source: Source; at: string; text: string; records: number; pendingReason?: string; blocks: CopiedBlock[] };

/** A readable transcription, not verified bookmaker/market assignments. */
export function organizeCopiedFightText(text: string): CopiedBlock[] {
  const months = 'January|February|March|April|May|June|July|August|September|October|November|December';
  const heading = new RegExp(`(?:DWCS\\s+Week\\s+\\d+\\s+\\d{4}|UFC(?:\\s+[A-Za-z0-9]+){1,5})\\s+Odds\\s*(?:${months})\\s+\\d{1,2}(?:st|nd|rd|th)?`, 'g');
  const matches = [...text.matchAll(heading)];
  const spans = matches.map((match,index)=>({ heading:match[0], body:text.slice(match.index!+match[0].length,matches[index+1]?.index??text.length) }));
  if(matches[0]?.index)spans.unshift({heading:'Fragmento sin encabezado',body:text.slice(0,matches[0].index)});
  if (!spans.length) spans.push({ heading:'Fragmento copiado', body:text });
  const blocks: CopiedBlock[] = [];
  for (const span of spans) {
    const split = new RegExp(`\\s*(${months})\\s+(\\d{1,2}(?:st|nd|rd|th)?)$`).exec(span.heading);
    const title = split ? span.heading.slice(0,split.index).trim() : span.heading;
    let body = span.body.split(/Last change:/i)[0];
    const props = body.indexOf('Props');
    if (props>=0) body=body.slice(props+5);
    const rows: CopiedRow[] = [];
    const lines=body.replace(/[▲▼]/g,'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if (lines.length>1) {
      for(let i=0;i<lines.length;i++){
        const name=lines[i];
        if(!/^\p{L}[\p{L}\p{M} .'-]*$/u.test(name) || /^(View |Polymarket|Kalshi|FanDuel|Caesars|BetRivers|BetWay|Unibet|BetMGM|DraftKings|Props)/i.test(name))continue;
        const prices:string[]=[];
        let next=i+1;
        while(next<lines.length&&/^[+-]\d{3,5}$/.test(lines[next]))prices.push(lines[next++]);
        if(!prices.length)continue;
        const count=next<lines.length&&/^\d+$/.test(lines[next])?lines[next++]:null;
        rows.push({name,rawPrices:prices.join(' | '),props:count});i=next-1;
      }
    } else {
      // Concatenated clipboard text loses the price/Props boundary. Keep the
      // complete numeric sequence verbatim; do not turn +1041 into +104.
      const row=/([\p{L}][\p{L}\p{M} .'-]*?)([+-]\d+(?:[+-]\d+)*)/gu;
      for(const match of body.matchAll(row))rows.push({name:match[1].trim(),rawPrices:match[2],props:null});
    }
    if(rows.length)blocks.push({title,date:split?`${split[1]} ${split[2]}`:null,rows});
  }
  return blocks;
}

export async function readManualNotes(root: string, date = dayInZone(Date.now(),'Asia/Bangkok')): Promise<{date:string;notes:ManualNote[];textChars:number;records:number}> {
  const folder=join(root,'raw');
  const names=await readdir(folder).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
  const notes:ManualNote[]=[];
  for(const name of names.filter(name=>/^[a-zA-Z0-9_-]+-\d{13}-dom\.json$/.test(name)).sort()){
    const timestamp=Number(/-(\d{13})-dom\.json$/.exec(name)![1]);
    if(dayInZone(timestamp,'Asia/Bangkok')!==date)continue;
    const raw:{source:Source;evidence?:{capturedAt?:string;payload?:{scrollMode?:string;copiedText?:string;records?:unknown[];pendingReason?:string}}}=JSON.parse(await readFile(join(folder,name),'utf8'));
    const payload=raw.evidence?.payload;
    if(payload?.scrollMode!=='manual'||typeof payload.copiedText!=='string')continue;
    const id=basename(name,'.json');
    const text=await readFile(join(folder,`${id}.txt`),'utf8').catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return payload.copiedText!;throw error;});
    notes.push({id,source:raw.source,at:raw.evidence?.capturedAt??'',text,records:payload.records?.length??0,
      ...(payload.pendingReason?{pendingReason:payload.pendingReason}:{}),
      blocks:/bestfightodds\.com/i.test(raw.source.url)?organizeCopiedFightText(text):[]});
  }
  notes.sort((a,b)=>a.at.localeCompare(b.at));
  return {date,notes,textChars:notes.reduce((sum,note)=>sum+note.text.length,0),records:notes.reduce((sum,note)=>sum+note.records,0)};
}
