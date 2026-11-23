import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTaiMemoryPreset,alreadyRecentlyUsedTaiPreset} from '../src/apps/noapp/memory-replies.js';
import {taiCallReplyStatus} from '../src/apps/noapp/call-engine-v2.js';

const state=(day=55)=>({day,clock:'20:00',story55:{version:1,ended:false,
 completed:{recognition:{day:33,clock:'08:00'}},scenes:{'d55-briefing':{index:5}}},
 content:{conversations:{noapp:[{id:'tai',messages:[]}]}}});
const history=s=>s.content.conversations.noapp[0].messages;
const d53=(index,text,from='tai',actual=true)=>({
 id:'s55-d53-tai-night-'+index,from,day:53,text,kind:'text',actual
});

test('NoApp call shows a truthful response state during model generation and TTS',()=>{
 const c={state:'connected',replyPhase:'thinking'};
 assert.equal(taiCallReplyStatus(c),'熙泰正在回覆…');
 c.replyPhase='voice';
 assert.equal(taiCallReplyStatus(c),'熙泰正在準備語音…');
 assert.equal(taiCallReplyStatus(c,'已經說出口'),'');
 c.audioReady=true;
 assert.equal(taiCallReplyStatus(c),'');
 c.audioReady=false;c.transcribing=true;
 assert.equal(taiCallReplyStatus(c),'');
 c.transcribing=false;c.scripted={id:'d55-noapp-opening'};
 assert.equal(taiCallReplyStatus(c),'','fixed author clips cannot pretend to be a generated answer');
 c.scripted=null;c.state='ended';
 assert.equal(taiCallReplyStatus(c),'','a finished call cannot show reply pending');
});

test('Wynn recall uses the actual D55 briefing gate, without predicting an outcome',()=>{
 const s=state();
 assert.deepEqual(selectTaiMemoryPreset(s,'你還記得永利皇宮原本的計劃嗎'),{
  id:'d55-wynn-recall',text:'原本的計劃是十點前到永利皇宮，混進撤展隊伍，離開澳門。'
 });
 assert.equal(selectTaiMemoryPreset(s,'永利現在怎麼辦'),null);
 assert.equal(selectTaiMemoryPreset(s,'永利'),null,'a keyword alone is insufficient to bypass context');
 s.story55.scenes['d55-briefing'].index=4;
 assert.equal(selectTaiMemoryPreset(s,'你還記得永利的計劃嗎'),null);
 s.story55.scenes['d55-briefing'].index=5;
 s.day=54;
 assert.equal(selectTaiMemoryPreset(s,'你還記得永利的計劃嗎'),null);
 s.day=55;s.story55.ended=true;
 assert.equal(selectTaiMemoryPreset(s,'你還記得永利的計劃嗎'),null);
});

test('the D53 rescue promise is repeated only after Tai actually said it',()=>{
 const s=state(53);
 const utterance='就算被抓了也沒關係，只要你還活著，我就有辦法把你救出來。';
 assert.equal(selectTaiMemoryPreset(s,'你還記得你說過會救我嗎'),null);
 history(s).push(d53(19,utterance,'tai',false));
 assert.equal(selectTaiMemoryPreset(s,'你還記得你說過會救我嗎'),null);
 history(s)[0].actual=true;
 assert.deepEqual(selectTaiMemoryPreset(s,'你還記得你說過會救我嗎'),{id:'d53-rescue-promise',text:utterance});
 assert.equal(selectTaiMemoryPreset(s,'如果我現在被抓了你怎麼救我'),null,'new choices require AI, not a quote');
});

test('Jack figurine exact author line only plays in its original D53/D54 context',()=>{
 const s=state(54),gift='手辦已經包好了，自己過來拿。';
 history(s).push(d53(15,gift));
 assert.deepEqual(selectTaiMemoryPreset(s,'你還記得傑克的手辦嗎'),{id:'d53-jack-gift',text:gift});
 s.day=55;
 assert.equal(selectTaiMemoryPreset(s,'你還記得傑克的手辦嗎'),null);
});

test('a recently answered memory question falls back to natural AI conversation',()=>{
 const messages=[d53(19,'只要你還活著，我就有辦法把你救出來。'),
 {id:'reply',from:'tai',text:'記得',aiPresetId:'d53-rescue-promise'}];
 assert.equal(alreadyRecentlyUsedTaiPreset(messages,'d53-rescue-promise'),true);
 assert.equal(alreadyRecentlyUsedTaiPreset(messages,'d53-jack-gift'),false);
 assert.equal(alreadyRecentlyUsedTaiPreset([...messages,...Array.from({length:12},(_,i)=>({id:'new-'+i,from:'me',text:'新消息'}))],'d53-rescue-promise'),false);
});
