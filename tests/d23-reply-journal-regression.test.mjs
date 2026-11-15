import test from 'node:test';
import assert from 'node:assert/strict';
import {needsChessAnalysis,predeterminedChessReply,prewrittenChessReply} from '../src/services/chess-lesson.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {entryFor,diaryDate} from '../src/story/diary/entries.js';

test('bare novice questions bypass scolding even while teaching',()=>{
 const match={id:'regression',invitationId:'s55-d23-chess-invite',history:[],lesson:{teaching:true}};
 for(const text of ['我不会','我不會','看不懂','我不會下']){
  assert.equal(needsChessAnalysis(text),true,text);
  assert.equal(predeterminedChessReply(match,text,{}),null,text);
  assert.match(prewrittenChessReply(match,text,{}),/我教你/);
 }
});
test('D23 journal belongs to June 10 and appears only after the actual farewell',()=>{
 const s=activateStory55(initialState());s.day=23;
 assert.equal(diaryDate(23),'2025-06-10');
 assert.equal(entryFor(s,23),null);
 s.story55.completed['d23-chess-finish']={day:23,clock:'23:10'};
 const e=entryFor(s,23);assert.equal(e.title,'王翼棄兵');
 assert.match(e.body,/干爹挑出不少毛病/);assert.match(e.body,/躺下了還在想/);
 assert.doesNotMatch(entryFor(s,5).body,/东西|设备|内存|还有|没/);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(entryFor(restored,23).body,e.body);
});
