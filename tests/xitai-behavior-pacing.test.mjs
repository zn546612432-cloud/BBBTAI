import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {normalizeTaiBehavior,replyDelayMs} from '../src/services/ai/behavior.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {composeCallSpeech} from '../src/services/voice/call-speech.js';
import {prepareXitaiSpeech} from '../src/services/voice/voice-regex.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {isTaiFollowupDue,isProactiveMessageDue,maybeSendProactive} from '../src/services/ai/proactive.js';
import {nextCallIdleEvent} from '../src/apps/noapp/voice-call.js';
import {clearTaiEngagement} from '../src/services/presence.js';
import {readBehaviorForm,behaviorSettings} from '../src/apps/noapp/settings/behavior.js';

function fixture(){
 const s=initialState();s.day=60;s.clock='21:00';s.powerMode='idle';s.events=[];
 s.aiDraft.behavior={triggerClock:'game',idleMinutes:10,followupMinutes:15,cooldownMinutes:30};
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');chat.messages=[];
 return {s,chat,store:{get:()=>s,update:fn=>fn(s)}};
}
function provider(replies){return async url=>new Response(JSON.stringify(String(url).endsWith('/status')?{deepseek:true,minimax:false}:{text:JSON.stringify({messages:replies.map(text=>({text,mode:'text'}))})}),{headers:{'content-type':'application/json'}});}

test('settings normalize corrupt saves and retain meaningful order/ranges',()=>{
 const c=normalizeTaiBehavior({maxMessages:100,messageGapMin:7,messageGapMax:2,callPause:100,verbosity:'bogus'});
 assert.equal(c.maxMessages,6);assert.equal(c.messageGapMax,7);assert.equal(c.callPause,4);
 assert.equal(c.verbosity,'expansive');
 assert.ok(replyDelayMs('这是一段比较长的实际聊天内容',c,{random:()=>0})>=7000);
 const form=new FormData();form.set('behavior_verbosity','expansive');form.set('behavior_maxMessages','4');
 assert.equal(readBehaviorForm(form).proactive,false);
 assert.match(behaviorSettings(c),/保存聊天与通话设置/);
});
test('runtime prompt resolves incompatible imported quotas and applies chosen verbosity',()=>{
 const p=buildTaiPrompt({day:60,channel:'noapp',behavior:{verbosity:'expansive',maxMessages:4}});
 assert.match(p,/一次允许1—4条独立消息/);assert.match(p,/展开表达/);
 assert.doesNotMatch(p,/CRITICAL_FREQUENCY_OVERRIDE|SYSTEM_OVERRIDE_PRIORITY|两条封顶|一条消息12字以内/);
 assert.doesNotMatch(p,/\{\{char\}\}|\{\{user\}\}/);
});
test('three telephone thoughts include explicit pauses; legal sound tags survive and captions stay clean',()=>{
 const replies=unpackTaiReply({text:JSON.stringify({messages:[{text:'嗯？我在忙。(breath)',mode:'voice'},{text:'你把后面的也讲完。',mode:'voice'},{text:'我听着。',mode:'voice'}]})},'call');
 const speech=composeCallSpeech(replies,{callPause:1.6});
 assert.equal((speech.match(/<#1.6#>/g)||[]).length,2);
 assert.match(prepareXitaiSpeech(speech).text,/<#1.6#>/);
 assert.doesNotMatch(replies.map(r=>r.text).join(''),/breath|<#/);
 const single=composeCallSpeech([{text:'第一句。第二句。第三句。'}],{callPause:1});
 assert.equal((single.match(/<#0.45#>/g)||[]).length,2);
});
test('new user message cancels all stale AI text before first bubble arrives',async()=>{
 const {s,chat,store}=fixture();chat.messages.push({id:'u1',from:'me',text:'先说这个',day:60,time:'21:00'});
 const original=globalThis.fetch;globalThis.fetch=provider(['旧的第一句','旧的第二句']);
 try{
  const result=await replyToTaiMessage(store,'u1',{wait:async()=>{chat.messages.push({id:'u2',from:'me',text:'等等改一下',day:60,time:'21:00'});}});
  assert.equal(result.count,0);assert.equal(chat.messages.filter(m=>m.from==='tai').length,0);
 }finally{globalThis.fetch=original;}
});
test('a reply during a paced burst cancels remaining messages rather than dropping the new turn',async()=>{
 const {chat,store}=fixture();chat.messages.push({id:'u1',from:'me',text:'看看这个',day:60,time:'21:00'});
 const original=globalThis.fetch;globalThis.fetch=provider(['第一段','第二段','第三段']);let waits=0;
 try{
  const result=await replyToTaiMessage(store,'u1',{random:()=>0,wait:async ms=>{
   assert.ok(ms>=3000);if(++waits===2)chat.messages.push({id:'u2',from:'me',text:'等下',day:60,time:'21:00'});
  }});
  assert.equal(result.count,1);assert.deepEqual(chat.messages.filter(m=>m.from==='tai').map(m=>m.text),['第一段']);
  const next=await replyToTaiMessage(store,'u2',{wait:async()=>{}});assert.equal(next.status,'replied');
 }finally{globalThis.fetch=original;}
});
test('ordinary unanswered AI replies can be followed up once; player response, opt-out and sleep cancel',()=>{
 clearTaiEngagement();const {s,chat}=fixture();s.clock='21:20';
 chat.messages.push({id:'normal-reply',from:'tai',text:'你发的那份我看了。',aiGenerated:true,day:60,time:'21:00'});
 assert.equal(isTaiFollowupDue(s),true);
 s.events.push({type:'tai_proactive_followup',sourceId:'normal-reply',day:60,clock:'21:20'});
 assert.equal(isTaiFollowupDue(s),false);s.events=[];
 chat.messages.push({id:'u2',from:'me',text:'去睡了，晚安',day:60,time:'21:10'});
 assert.equal(isTaiFollowupDue(s),false);assert.equal(isProactiveMessageDue(s),false);
 chat.messages.pop();s.aiDraft.behavior.proactive=false;assert.equal(isTaiFollowupDue(s),false);
});
test('real-clock follow-up ignores accelerated game time and respects the actual waiting threshold',()=>{
 const {s,chat}=fixture();s.clock='23:50';s.aiDraft.behavior.triggerClock='real';
 chat.messages.push({id:'normal',from:'tai',text:'还在吗？',aiGenerated:true,day:60,time:'19:00',receivedAt:1_000_000});
 assert.equal(isTaiFollowupDue(s,{now:1_000_000+14*60000}),false);
 assert.equal(isTaiFollowupDue(s,{now:1_000_000+15*60000}),true);
});
test('quiet-gap topic can trigger on any day; cooldown and daily budget limit automatic initiations',()=>{
 const {s,chat}=fixture();s.day=62;s.clock='21:12';
 chat.messages.push({id:'reply',from:'tai',text:'我刚把它看完。',aiGenerated:true,day:62,time:'21:00'});
 assert.equal(isProactiveMessageDue(s),true);
 s.events.push({type:'tai_proactive_sent',day:62,clock:'21:00'});
 assert.equal(isProactiveMessageDue(s),false);
 s.events=[1,2,3].map(x=>({type:'tai_proactive_sent',day:62,clock:'19:0'+x}));
 assert.equal(isProactiveMessageDue(s),false);
});
test('proactive messages pace delivery and cancel the rest when the player replies',async()=>{
 const {s,chat,store}=fixture();s.clock='21:20';
 chat.messages.push({id:'unanswered',from:'tai',text:'你还没发给我。',aiGenerated:true,day:60,time:'21:00'});
 const original=globalThis.fetch;globalThis.fetch=provider(['你还在忙？','我这里有了新进展']);
 try{
  const sent=await maybeSendProactive(store,{wait:async()=>{chat.messages.push({id:'answer',from:'me',text:'刚忙完',day:60,time:'21:20'});}});
  assert.equal(sent,true);assert.equal(chat.messages.filter(m=>m.followup).length,1);
  assert.equal(s.events.filter(e=>e.type==='tai_proactive_followup'&&e.sourceId==='unanswered').length,1);
 }finally{globalThis.fetch=original;}
});
test('telephone silence follows custom settings and never times out unplayed audio',()=>{
 const state={state:'connected',busy:false,listening:false,lastTaiEndAt:1000,nudgeCount:0};
 assert.equal(nextCallIdleEvent(state,11000,{callNudgeSeconds:10}),'nudge');
 state.audioReady=true;assert.equal(nextCallIdleEvent(state,90000,{callNudgeSeconds:10}),'');
});
test('phone startup actually mounts gestures and viewport, preserving the deleted integration',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/mountViewport\(\$\('#phone'\)\)/);
 assert.match(main,/mountGestures\(\$\('#phone'\),\s*\{/);
 assert.match(main,/unlock:\(\)=>\{if\(lockscreen.stage==='cover'\)requestUnlock\(\)/);
});

test('future and undelivered authored messages do not masquerade as a reply or cancel the current turn',async()=>{
 const {chat,store}=fixture();
 chat.messages.push({id:'u-now',from:'me',text:'现在说的事',day:60,time:'21:00'},
  {id:'future-tai',from:'tai',text:'未来剧情不能用',day:61,time:'21:00',schedule:{mode:'game-time',day:61,clock:'21:00'}},
  {id:'future-me',from:'me',text:'下一天的预设',day:61,time:'21:01',schedule:{mode:'game-time',day:61,clock:'21:01'}});
 const old=globalThis.fetch;globalThis.fetch=provider(['我在看。']);
 try{const r=await replyToTaiMessage(store,'u-now',{wait:async()=>{}});assert.equal(r.count,1);}
 finally{globalThis.fetch=old;}
});
