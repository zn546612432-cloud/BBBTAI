import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {PhoneRouter,dismissNoAppCallRoute} from '../src/services/router.js';
import {startOutgoing,callAction} from '../src/apps/noapp/voice-call.js';
import {render,manifest} from '../src/apps/noapp/index.js';
import {appFrame} from '../src/system/shell.js';
import {unreadAppCount} from '../src/services/unread-badges.js';
import {planCallSpeech,needsCallContinuation,finalizeCallSegments,nextNaturalCallIdleEvent,outgoingCallOpening,callPersonaGuidance} from '../src/apps/noapp/call-engine-v2.js';
import {taiCallAvailabilityQuestion,shortTaiCallReply} from '../src/services/ai/call-intent.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

const link=(appId,route='/')=>({appId,route,params:{}});
function fixture(){
 const s=activateStory55(initialState());s.day=35;s.clock='21:30';s.story55.completed.recognition={day:35};s.story55.noappInstalled=true;s.unlocked=true;
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');chat.messages=[];chat.unread=0;
 return {s,chat,store:{get:()=>s,update:fn=>fn(s)}};
}
test('outgoing missed calls never create a badge or a historical call page; returning preserves the previous chat',()=>{
 const {s,chat,store}=fixture();
 s.nav={current:link('noapp','/chat/tai'),stack:[link('home'),link('noapp')]};
 const ctx={store,router:{open(next){s.nav.stack.push(s.nav.current);s.nav.current=next;}},refresh(){},toast(){}};
 assert.equal(startOutgoing(ctx),true);
 assert.equal(s.nav.current.route,'/call');
 callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'ignored',outcomeOverride:'missed'});
 assert.equal(chat.messages.at(-1).callStatus,'missed');
 assert.equal(unreadAppCount(s,'noapp'),0);
 assert.deepEqual(s.nav.current,link('noapp','/chat/tai'));
 assert.deepEqual(s.nav.stack,[link('home'),link('noapp')]);
 new PhoneRouter(store,new Map()).back();
 assert.deepEqual(s.nav.current,link('noapp'));
 // Old saves and a call ended while in another app also clean up stale routes.
 s.nav={current:link('notes'),stack:[link('home'),link('noapp','/call')]};
 dismissNoAppCallRoute(s);
 assert.deepEqual(s.nav.current,link('notes'));
 assert.deepEqual(s.nav.stack,[link('home')]);
});
test('NoApp list has no back/home buttons but chat retains call, AI setup and contact settings',()=>{
 const {s,store}=fixture();
 s.nav.current=link('noapp');
 const list=appFrame(s,{manifest},render({store},s.nav.current));
 assert.doesNotMatch(list,/data-action="(?:back|home)"/);
 s.nav.current=link('noapp','/chat/tai');
 const chat=appFrame(s,{manifest},render({store},s.nav.current));
 for(const action of ['tai-outgoing','tai-api-settings','tai-contact-more'])assert.match(chat,new RegExp('data-action="'+action+'"'));
});
test('ordinary call plan no longer forces extra voice clips or DeepSeek continuation',()=>{
 const plan=planCallSpeech({text:'你最近研究的东西有意思吗？',history:[{role:'user',content:'你好'},{role:'user',content:'你在忙吗？'},{role:'user',content:'你最近研究的东西有意思吗？'}]});
 assert.equal(plan.minSegments,1);assert.equal(plan.smallTalk,true);
 assert.equal(needsCallContinuation([{text:'還行。'}],plan),false);
 assert.equal(needsCallContinuation([{text:'見面的時候再說。'}],plan),false);
 assert.equal(planCallSpeech({text:'嗯'}).minSegments,1);
 assert.equal(planCallSpeech({text:'多說幾句'}).minSegments,1);
 assert.ok(planCallSpeech({text:'多說幾句'}).maxSegments>=3);
 const near=planCallSpeech({text:'你怎麼看？',remaining:3});
 assert.equal(near.close,false);
 const farewell=finalizeCallSegments([{text:'我聽見了。'},{text:'這個晚點談。'}],{close:true,maxSegments:1});
 assert.equal(farewell.segments.length,1);assert.match(farewell.segments[0].text,/先聊到/);assert.equal(farewell.endAfter,true);
 assert.equal(nextNaturalCallIdleEvent({state:'connected',lastTaiEndAt:1000,nudgeCount:0},11000),'nudge');
 assert.equal(nextNaturalCallIdleEvent({state:'connected',lastTaiEndAt:1000,nudgeCount:0,quietUntil:20000},11000),'');
});
test('call availability refusal is one short text, actual call command survives, examples are call-only',()=>{
 for(const phrase of ['你為什麼不接電話','為甚麼沒接我電話','你方便接電話嗎'])assert.equal(taiCallAvailabilityQuestion(phrase),true);
 assert.equal(taiCallAvailabilityQuestion('我很好奇電話是怎麼發明的'),false);
 const response=shortTaiCallReply([{text:'在忙，晚點再說。你先去做自己的事。',mode:'voice'},{text:'還有另外的事情。',mode:'text'}]);
 assert.equal(response.length,1);assert.equal(response[0].text,'在忙，晚點再說。');assert.equal(response[0].mode,'text');
 assert.equal(shortTaiCallReply([{text:'好'},{text:'喂',action:'phone'}]).at(-1).action,'phone');
 const call=buildTaiPrompt({day:60,channel:'noapp',recognized:true,outputMode:'call'});
 const text=buildTaiPrompt({day:60,channel:'noapp',recognized:true,outputMode:'text'});
 assert.match(call,/三个工作日后我大概有空回复你/);
 assert.doesNotMatch(text,/三个工作日后我大概有空回复你/);
});
test('author-approved outgoing pickups never use the caller name and sleep farewells stay intact',()=>{
 assert.deepEqual(outgoingCallOpening({activity:'工作與會議'},{sessionId:3}),['怎么了？']);
 assert.deepEqual(outgoingCallOpening({activity:'外出或私人事務'},{sessionId:3}),['喂？我这边风很大，听得不是很清楚。等我一下。','好了，说吧。']);
 assert.deepEqual(outgoingCallOpening({activity:'外出或私人事務'},{sessionId:4}),['怎么了？']);
 assert.match(callPersonaGuidance({minute:75,local:'01:15'}),/伦敦当地时间是 01:15/);assert.match(callPersonaGuidance({minute:75,local:'01:15'}),/不得把伦敦深夜当成熙蒙的深夜/);
 assert.doesNotMatch(callPersonaGuidance({minute:720,local:'12:00'}),/凌晨12点/);
 for(const text of ['很晚了，我这边已经是凌晨1点了。你不睡觉，我要睡觉的。','今天很累，有什么事情明天再说吧。','你去找你的好哥哥熙旺聊吧，我要睡觉了。']){
  const reply={text,mode:'voice'};assert.deepEqual(finalizeCallSegments([reply],{close:true}),{segments:[reply],endAfter:true});
 }
});

test('NoApp clears an old offline banner when live presence becomes contactable',async()=>{
 const {currentTaiFeedback}=await import('../src/apps/noapp/index.js');
 const s=initialState();s.day=63;s.clock='22:30';
 assert.equal(currentTaiFeedback(s,'暫時不在線'),'');
 assert.equal(currentTaiFeedback(s,'已送达'),'已送达');
 s.day=1;assert.equal(currentTaiFeedback(s,'暫時不在線'),'暫時不在線');
});
