import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,scene55,sceneLines,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {scriptedDraft55,currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {completed} from '../src/services/story55/state.js';
import {entryFor,saveDiaryEntry,allDiaryDays} from '../src/story/diary/entries.js';
import {diaryView} from '../src/apps/schedule/features/diary/index.js';
import {registry} from '../src/system/registry.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';

const fixture=()=>{
 const s=activateStory55(initialState());
 s.day=6;s.clock='08:00';s.unlocked=true;
 s.story55.completed.intro??={day:1,clock:'08:00'};
 return s;
};
const convo=s=>s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
const advance=(s)=>{
 const q=scene55(s,'invitation');
 const line=currentScript55(s,'mirage','s55-ouroboros');
 assert.ok(line,'D06 first conversation is still pending');
 if(line.kind==='me'){
  const draft=scriptedDraft55(s,'mirage','s55-ouroboros');
  assert.ok(draft);
  const before=convo(s).messages.filter(m=>m.from==='me').length;
  sendScriptedDraft55(s,'mirage','s55-ouroboros',draft.text);
  assert.equal(convo(s).messages.filter(m=>m.from==='me').length,before+1);
 }else{
  // The shared scene queue is the only way NPC turns are delivered.
  const now=Math.max(Date.now(),q.nextAt||0);
  assert.equal(tickQueuedStoryScenes55(s,now),true);
 }
};

test('D06 journal exists at 08:00 and does not leak the winner or Ouroboros before finishing the chat',()=>{
 const s=fixture();
 assert.ok(allDiaryDays(s).includes(6));
 const entry=entryFor(s,6);
 assert.equal(entry.title,'今天有点意思');
 assert.match(entry.body,/昨天整理的东西/);
 assert.doesNotMatch(entry.body,/10 BTC|Ouroboros|黑客天才/);
 const html=diaryView(s,{route:'/',params:{day:'6'}});
 assert.match(html,/DAY 06/);
 assert.match(html,/今天有点意思/);
 assert.doesNotMatch(html,/Ouroboros|10 BTC/);
 // Winning the wallet alone is not equivalent to finishing the conversation.
 s.story55.completed.wallet={day:6,clock:'11:00'};
 tickStory55(s);
 assert.ok(convo(s));
 assert.equal(completed(s,'invitation'),false);
 assert.doesNotMatch(entryFor(s,6).body,/Ouroboros/);
 assert.equal(convo(s).messages.filter(m=>m.from==='me').length,0);
});

test('D06 approved first-chat runs as one ordered gated scene; journal unlocks once only after final NPC line',()=>{
 const s=fixture();
 s.story55.completed.wallet={day:6,clock:'11:00'};
 tickStory55(s);
 assert.equal(sceneLines(s,'invitation').length,24);
 assert.equal(sceneLines(s,'invitation').filter(l=>l[0]==='me').length,6);
 assert.equal(completed(s,'invitation'),false);
 // No imaginary player messages, even after repeated clock ticks.
 tickQueuedStoryScenes55(s,Math.max(Date.now(),scene55(s,'invitation').nextAt));
 assert.equal(convo(s).messages.filter(m=>m.from==='me').length,0);
 while(!completed(s,'invitation')){
  const current=scene55(s,'invitation').index;
  assert.ok(current<24,'the authored stage can advance without deadlock');
  advance(s);
  assert.equal(convo(s).messages.length,scene55(s,'invitation').index);
  if(current<23)assert.doesNotMatch(entryFor(s,6).body,/Ouroboros/);
 }
 const texts=convo(s).messages.map(m=>m.text);
 assert.ok(texts.includes('你属于哪个组织？'));
 assert.ok(texts.includes('我单干。'));
 assert.ok(texts.includes('因为我是天才。'));
 assert.ok(texts.includes('I like that.'));
 assert.equal(convo(s).messages.filter(m=>m.from==='me').length,6);
 assert.equal(new Set(convo(s).messages.map(m=>m.id)).size,24);
 const text=entryFor(s,6).body;
 assert.match(text,/10 BTC/);
 assert.match(text,/Dr Ouroboros/);
 assert.match(text,/行啊，有钱赚再说。/);
 tickStory55(s);tickQueuedStoryScenes55(s,Date.now()+60000);
 assert.equal(convo(s).messages.length,24,'refresh/retry does not send duplicate messages');
 assert.equal(entryFor(s,6).body,text,'the postscript is not appended twice');
 s.day=7;s.clock='08:00';tickStory55(s);
 assert.equal(entryFor(s,6).body,text,'previous days are stable in the archive');
});

test('D06 journal retains editor overrides while a story section is still hidden',()=>{
 const s=fixture();
 saveDiaryEntry(s,6,{weather:'晴',title:'今天有点意思',body:'今天先把资料备份一下。',stages:{'mirage-conversation':'这单赚了十个比特币。'}});
 assert.equal(entryFor(s,6).body,'今天先把资料备份一下。');
 s.story55.completed.wallet={day:6,clock:'12:00'};
 assert.equal(entryFor(s,6).body,'今天先把资料备份一下。');
 s.story55.completed.invitation={day:6,clock:'15:00'};
 assert.equal(entryFor(s,6).body,'今天先把资料备份一下。\n\n这单赚了十个比特币。');
 assert.equal(s.content.storyDiary['6'].stages['mirage-conversation'],'这单赚了十个比特币。');
});

test('MIRAGE displays the player reply through the standard story55 text input, not legacy Ouroboros scripts',()=>{
 const s=fixture();
 s.story55.completed.wallet={day:6,clock:'12:00'};
 tickStory55(s);
 const q=scene55(s,'invitation');
 tickQueuedStoryScenes55(s,q.nextAt);
 tickQueuedStoryScenes55(s,scene55(s,'invitation').nextAt);
 const draft=scriptedDraft55(s,'mirage','s55-ouroboros');
 assert.equal(draft.text,'谢谢老板，奖金已经收到了。');
 setMirageAuthenticated(true);
 try{
  const html=registry.get('mirage').render({store:{get:()=>s}},{route:'/chat/s55-ouroboros',params:{}});
  assert.match(html,/data-story-scene="invitation"/);
  assert.match(html,/data-story-type="谢谢老板，奖金已经收到了。"/);
  assert.doesNotMatch(html,/mc-ourob-d05/);
 }finally{setMirageAuthenticated(false);}
});
