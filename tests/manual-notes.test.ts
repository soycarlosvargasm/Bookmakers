import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EngineStorage } from '../src/engine/storage.js';
import { organizeCopiedFightText, readManualNotes } from '../src/ui/manual-notes.js';

test('the notebook survives the session and retains the full copied text even when zero quotes were classified',async t=>{
  const root=await mkdtemp(join(tmpdir(),'manual-notes-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const text='DWCS Week 10 2026 Odds\nOctober 13th\nProps\nErick Visconde\n+128\n+100\n+104\n+104\n1\nIlias Bulaid\n-149\n-130\n-137\n-137\n1\n'+'Texto conservado literalmente\n'.repeat(1000);
  await new EngineStorage(root).saveRaw({type:'bestfightodds',url:'https://www.bestfightodds.com/'},'dom',
    {url:'https://www.bestfightodds.com/',transport:'manual-visible-text',capturedAt:new Date().toISOString(),payload:{scrollMode:'manual',copiedText:text,records:[],pendingReason:'Pendiente de columnas'}},0);
  const notes=await readManualNotes(root);
  assert.equal(notes.notes.length,1);assert.equal(notes.records,0);assert.equal(notes.notes[0].text,text);
  assert.equal(notes.textChars,text.length);
  assert.equal(notes.notes[0].blocks[0].rows.length,2);
  assert.equal(notes.notes[0].blocks[0].rows[0].rawPrices,'+128 | +100 | +104 | +104');
  assert.equal(notes.notes[0].blocks[0].rows[0].props,'1');
});

test('concatenated clipboard text is ordered without guessing houses or silently changing a price/Props suffix',()=>{
  const text='DWCS Week 10 2026 OddsOctober 13thView DWCS Week 10 2026 Odds (October 13th) →Polymarket$20 BonusKalshiUp to $500FanDuel Caesars BetWay PropsErick Visconde+128+100+104+1041Ilias Bulaid-149-130-137-1371Last change: 4 min agoUFC 334 OddsNovember 15thView UFC 334 Odds (November 15th) →PropsCiryl Gane-265-275-275-275-275Josh Hokit+200+200+210+210+210';
  const blocks=organizeCopiedFightText(text);
  assert.equal(blocks.length,2);
  assert.equal(blocks[0].title,'DWCS Week 10 2026 Odds');
  assert.equal(blocks[0].rows[0].name,'Erick Visconde');
  assert.equal(blocks[0].rows[0].rawPrices,'+128+100+104+1041');
  assert.equal(blocks[0].rows[0].props,null);
  assert.equal(blocks[1].rows[1].name,'Josh Hokit');
});

test('a saved viewport fragment before the next card heading is retained when ordering text',()=>{
  const blocks=organizeCopiedFightText('Ciryl Gane\n-265\nJosh Hokit\n+200\nLast change: 1 day ago\nUFC 335 Odds\nDecember 13th\nProps\nBo Nickal\n+145\nJoe Pyfer\n-182');
  assert.equal(blocks.length,2);assert.equal(blocks[0].rows[0].name,'Ciryl Gane');
});
