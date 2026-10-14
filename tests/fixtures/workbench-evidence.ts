import { EngineStorage } from '../../src/engine/storage.js';
import { CollectionStore } from '../../src/engine/collection.js';
import type { ProviderRecord } from '../../src/normalization/types.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export const evidenceSource = { type: 'local-review', url: 'https://local-review.test/sports' };
export const evidenceRow: ProviderRecord = { sportsbook: 'local-review', sport: 'Soccer', competition: 'Liga local', eventName: 'Alpha vs Beta', sourceEventId: 'event-a', market: 'Totals', marketPeriod: 'full_event', selection: 'Over', line: '2.5', rawOdds: '+190', rawOddsFormat: 'american', decimalOdds: 2.9, eventStartTime: '2030-10-10T18:00:00Z', collectedAt: '2026-10-10T05:59:00Z' };
export async function saveEvidenceFixtures(root: string, bfoReview = false) {
  const storage = new EngineStorage(root), paths: string[] = [];
  const save = async (rows: ProviderRecord[], copiedText?: string, screenshot?: Buffer, capturedAt='2020-10-10T05:00:00Z', source=evidenceSource) => {
    const path = await storage.saveRaw(source, 'dom', { url: source.url, transport: 'local-fixture', capturedAt, screenshot, payload: { records: rows, copiedText } }, rows.length);
    paths.push(path); return path.split('/').at(-1)!.replace('.json','');
  };
  const image = await readFile(fileURLToPath(new URL('./workbench-evidence.png', import.meta.url)));
  const multi = await save([evidenceRow, {...evidenceRow, selection:'Under',rawOdds:'-150'}, {...evidenceRow,sourceEventId:'event-b',eventName:'Gamma vs Delta',sport:'Tennis',competition:'Copa distinta',line:null,market:'Winner',rawOdds:'3/2',rawOddsFormat:'fractional'}], 'Alpha vs Beta · Over 2.5 +190 · Under 2.5 -150\nGamma vs Delta · Winner 3/2', image);
  const text = await save([{...evidenceRow,sourceSelectionId:'different-id'}, {...evidenceRow,line:'3.5'}, {...evidenceRow,marketPeriod:'first_half'}, {...evidenceRow,qualifiers:{variant:'corners'}}, {...evidenceRow,bookmaker:'Other Book'}, {...evidenceRow,rawOdds:'+200'}], 'Texto guardado · Alpha vs Beta · Over 2.5 +190');
  const pending = await save([], 'Texto todavía sin clasificar', image);
  const unknown = await save([{...evidenceRow,eventStartTime:null}], 'Fecha del evento desconocida', undefined, '');
  const other = await save([evidenceRow], 'Otra fuente', undefined, undefined, {type:'other-source',url:'https://other.test/'});
  const historical = JSON.parse(await readFile(fileURLToPath(new URL('./bfo-historical-invalid.json',import.meta.url)),'utf8'));
  const bfoSource={type:'bestfightodds',url:'https://www.bestfightodds.com/'};
  const bfoRows:ProviderRecord[]=['Alex Pereira','Fighter B'].flatMap((name,i)=>['fanduel','betmgm'].map((book,b)=>({sportsbook:'bestfightodds',bookmaker:book,sport:'mma',competition:'UFC 332',eventName:'Alex Pereira vs Fighter B',participants:['Alex Pereira','Fighter B'],eventStartTime:null,sourceEventId:'45001',sourceMarketId:`45001:moneyline:${b?23:21}`,sourceSelectionId:`45001:moneyline:${b?23:21}:${i+1}`,market:'Moneyline',marketPeriod:'fight',selection:name,rawOdds:i?'-140':b?'+130':'+122',rawOddsFormat:'american',decimalOdds:i?1.714:2.22,collectedAt:'2026-10-11T05:00:00Z',qualifiers:{profileVersion:'bestfightodds-dom-v3',displayedBookId:b?'23':'21',association:'data-mu-data-li-data-b',competitionKind:'card',selectionPath:`body/table/tr:${i+1}`}})));
  const bfo=bfoReview ? await save([...bfoRows,historical.evidence.payload.records[0]],'Alex Pereira vs Fighter B · FanDuel +122 · BetMGM +130',undefined,'2020-10-10T05:00:00Z',bfoSource) : undefined;
  await new CollectionStore(root).ingestion(paths[0]!);
  return { multi, text, pending, unknown, other, bfo, paths };
}
