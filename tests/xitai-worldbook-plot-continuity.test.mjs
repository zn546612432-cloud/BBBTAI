import test from 'node:test';
import assert from 'node:assert/strict';
import {taiPlotMemory,recallTaiOlderTalk} from '../src/services/ai/worldbook/plot-memory.js';
import {absorbPendingTaiTextsForCall} from '../src/services/ai/incoming-turn.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';

const state=()=>({day:55,clock:'20:00',events:[],story55:{version:1,scenes:{'d55-briefing':{index:0}},completed:{}},content:{conversations:{noapp:[{id:'tai',messages:[]}]}},poweredOff:false,powerMode:'idle'});
const chat=s=>s.content.conversations.noapp[0];
const line=(id,text,from='me',day=53)=>({id,text,from,day,time:'23:30',kind:'text',actual:true});

test('plot memory includes only authored NoApp lines already delivered, not future D53 lines',()=>{
 const s=state();
 chat(s).messages.push(line('s55-d53-tai-night-25','兩百個人，還有一枚足以炸掉整棟樓的炸彈。'));
 chat(s).messages.push({...line('s55-d53-tai-night-26','就算他不死，警察也會控制住他。'),actual:false});
 const prompt=taiPlotMemory(s,chat(s).messages);
 assert.match(prompt,/兩百個人/);
 assert.doesNotMatch(prompt,/就算他不死/);
 assert.doesNotMatch(prompt,/永利皇宮/);
});

test('Wynn extraction plan unlocks after its actual D55 briefing line, never just by calendar day',()=>{
 const s=state();
 assert.doesNotMatch(taiPlotMemory(s,[]),/永利皇宮/);
 s.story55.scenes['d55-briefing'].index=4;
 assert.doesNotMatch(taiPlotMemory(s,[]),/永利皇宮/);
 s.story55.scenes['d55-briefing'].index=5;
 assert.match(taiPlotMemory(s,[]),/永利皇宮/);
 assert.match(taiPlotMemory(s,[]),/計劃已提出/);
 s.day=54;
 assert.doesNotMatch(taiPlotMemory(s,[]),/永利皇宮/);
});

test('older player statements can be recalled from existing messages without duplicating storage',()=>{
 const history=[
  line('old','我的貓叫泡芙', 'me',40),
  ...Array.from({length:20},(_,i)=>line('later-'+i,'今天挺好的',i%2?'tai':'me',50))
 ];
 assert.match(recallTaiOlderTalk(history,'泡芙最近怎麼樣'),/我的貓叫泡芙/);
 assert.equal(recallTaiOlderTalk(history,'完全沒有談過的新話題'),'', 'unrelated old facts are not injected');
});

test('starting a call permanently absorbs unanswered text and invalidates a late model result',async()=>{
 const s=state(),m=line('pending-text','想你','me',55);
 m.taiPending=true;
 chat(s).messages.push(m);
 const count=absorbPendingTaiTextsForCall(s);
 assert.equal(count,1);
 assert.equal(m.taiHandledAction,'absorbed_by_call');
 assert.equal(m.taiPending,false);
 assert.equal(absorbPendingTaiTextsForCall(s),0);
 assert.equal(s.events.filter(e=>e.type==='tai_text_absorbed_by_call').length,1);
 const store={get:()=>s,update:fn=>fn(s)};
 const result=await replyToTaiMessage(store,m.id,{wait:async()=>{}});
 assert.equal(result.status,'scripted');
 assert.equal(chat(s).messages.length,1);
});

test('call takeover does not rewrite already answered text or yesterday messages',()=>{
 const s=state();
 chat(s).messages.push({...line('old','昨天的消息','me',54),taiPending:true});
 chat(s).messages.push({...line('answered','早安','me',55),taiPending:true});
 chat(s).messages.push({...line('answer','早','tai',55),replySourceId:'answered'});
 assert.equal(absorbPendingTaiTextsForCall(s),0);
 assert.equal(chat(s).messages[1].taiHandledAction,undefined);
});
