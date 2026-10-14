// Offline derived classification only: no acquisition, OCR, AI or PostgreSQL.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SavedEvidenceIndex } from '../src/ui/saved-evidence.js';
const evidence='.engine/raw/c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-1791683977635-dom.json';
const hash=async()=>createHash('sha256').update(await readFile(evidence)).digest('hex');
const before=await hash();
const result=await new SavedEvidenceIndex('.engine').organize({source:'bestfightodds'},{});
if(await hash()!==before)throw Error('El RAW original cambió');
console.log(JSON.stringify({source:'bestfightodds',files:result.captures.length,markets:result.cards.length,pendingGroups:result.pending.length,pendingFiles:result.pendingFileTotal,mixedFiles:result.overlapTotal,unknownEventDates:result.cards.filter(c=>!c.start).length,originalSha256:before,originalPreserved:true},null,2));
