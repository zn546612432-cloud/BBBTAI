import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {advanceGameMinutes,tickWorld,worldMinuteRate,STORY55_FINALE_REPLY_MINUTES_PER_MS} from '../src/system/time/clock.js';
import {syncDeathNight,phoneBlocked} from '../src/system/power/story.js';
import {drainBattery} from '../src/system/power/battery.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {dateParts} from '../src/services/calendar.js';
import {LockScreen} from '../src/system/lock.js';
import {currentScript55} from '../src/services/story55/scripted-chat.js';
import {retireLegacyD55Ending} from '../src/story/d55/retire-legacy.js';
import {ENDING_CLOCKS,ENDING_VOICE_APPEAR_DELAY_MS,endingAwaitingVoice55,endingVoiceRevealDue55,revealEndingVoice55,endingReplyDue55,tickFinale55,startSecondCharge55,syncSecondClock55,secondView55,FAST_FORWARD_MS,ONE_PERCENT_MS,ZERO_PERCENT_MS,RECHARGE_MS} from '../src/services/story55/finale.js';

function endingReady(){
 const s=initialState();activateStory55(s);previewNode55(s,'ending');
 s.story55.noappInstalled=true;
 s.story55.d55Disconnected=true;
 s.story55.scriptedCallCompleted??={};
 for(const id of ['d55-noapp-opening','d55-fulongsheng-last','d55-final-cut'])s.story55.scriptedCallCompleted[id]=true;
 const historical=s.content.conversations.wechat[0].messages.length;
 return {s,historical};
}

test('D55 removes old 21:00–22:25 NoApp dialogue; 22:46 watch remains',()=>{
 const {s}=endingReady();
 assert.equal(s.day,55);
 assert.deepEqual(ENDING_CLOCKS,['22:46']);
 assert.deepEqual(sceneLines(s,'ending'),[['watch','手表同步：最后一段语音']]);
 assert.equal(s.clock,'22:46');
 assert.equal(endingAwaitingVoice55(s),true);
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 assert.equal(c.messages.some(m=>/^s55-ending-[0-4]$/.test(m.id)),false);
 assert.throws(()=>advanceScene55(s,'ending'),/语音/);
 s.story55.finalAudioHeard=true;
 advanceScene55(s,'ending');
 assert.equal(scene55(s,'ending').index,1);
 assert.equal(s.clock,'22:46');
 const voice=c.messages.find(m=>m.id==='s55-ending-final-voice');
 assert.equal(voice?.time,'22:46');
 assert.equal(voice?.sentDate,'2025-07-12');
 assert.equal(endingReplyDue55(s),false);
 assert.equal(currentScript55(s,'noapp','tai'),null);
});

test('22:46 voice waits for unanswered call then powers down at 22:49',()=>{
 const {s}=endingReady();
 s.story55.finalAudioHeard=true;advanceScene55(s,'ending');
 assert.equal(s.story55.ended,false);
 assert.throws(()=>advanceScene55(s,'ending'),/回撥/);
 advanceGameMinutes(s,2);assert.equal(s.clock,'22:48');
 advanceGameMinutes(s,1);assert.equal(s.clock,'22:49');
 assert.equal(endingReplyDue55(s),false);
 s.story55.d55RecallCompleted=true;assert.equal(endingReplyDue55(s),true);
 advanceScene55(s,'ending');assert.equal(s.story55.ended,true);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').messages.some(m=>m.text==='熙蒙！熙蒙！'),false);
 assert.equal(s.deathPhase,'s55-accelerating');assert.equal(phoneBlocked(s),true);
 assert.equal(advanceGameMinutes(s,60).minutes,0);
 const mark=s.story55.finalTransition.startedAt;
 tickFinale55(s,mark+FAST_FORWARD_MS);
 assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 tickFinale55(s,mark+FAST_FORWARD_MS+ONE_PERCENT_MS+ZERO_PERCENT_MS);
 assert.equal(s.deathPhase,'s55-off');
});

test('tap to charge to 100%, show lock, unlock with 6180 and preserve existing app data',()=>{
 const {s}=endingReady();
 const beforeWeChat=s.content.conversations.wechat.map(x=>x.messages.length);
 const beforeNotes=s.content.notes.length;
 s.story55.finalAudioHeard=true;advanceScene55(s,'ending');
 advanceGameMinutes(s,3);s.story55.d55RecallCompleted=true;advanceScene55(s,'ending');
 const anchor=s.story55.finalTransition.startedAt;
 tickFinale55(s,anchor+FAST_FORWARD_MS+ONE_PERCENT_MS+ZERO_PERCENT_MS);
 const tapTime=anchor+FAST_FORWARD_MS+ONE_PERCENT_MS+ZERO_PERCENT_MS+300;
 assert.equal(startSecondCharge55(s,tapTime),true);
 assert.equal(s.deathPhase,'s55-charging');
 assert.match(powerFullscreen(s),/正在充电/);
 tickFinale55(s,tapTime+RECHARGE_MS/2);
 assert.equal(s.batteryPercent,50);
 tickFinale55(s,tapTime+RECHARGE_MS);
 assert.equal(secondView55(s),true);
 assert.equal(s.deathPhase,'recovered');
 assert.equal(powerFullscreen(s),'');
 assert.equal(s.batteryPercent,100);
 assert.equal(s.unlocked,false);
 assert.equal(startSecondCharge55(s,tapTime),false);
 const keys=new LockScreen();keys.open();
 for(const d of '6180')keys.key(d,'6180');
 assert.equal(keys.stage,'unlocking');
 const simulated=new Date(2026,10,1,22,15,0);
 syncSecondClock55(s,simulated);
 assert.equal(s.clock,'22:15');
 assert.equal(s.realDate,'2026-11-01');
 assert.equal(drainBattery(s,120000),0);
 assert.equal(s.batteryPercent,100);
 assert.equal(advanceGameMinutes(s,200).minutes,0);
 syncDeathNight(s);
 assert.equal(s.deathPhase,'recovered');
 assert.deepEqual(s.content.conversations.wechat.map(x=>x.messages.length),beforeWeChat);
 assert.equal(s.content.notes.length,beforeNotes);
});

test('main preserves 0816 and 0119 before handoff; only 6180 after, without a wipe screen',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/secondView55\(store\.get\(\)\)/);
 assert.match(main,/'6180':\['0816','0119'\]/);
 assert.match(main,/startSecondCharge55/);
 assert.doesNotMatch(main,/blood-wipe|wipe-blood|擦血/);
});


test('legacy D55 ending saves migrate without deleting conversations or bypassing charging',()=>{
 const {s}=endingReady();
 const id='do-not-delete';s.content.conversations.noapp.find(x=>x.id==='tai').messages.push({id,from:'me',text:'别删我的聊天',time:'22:46'});
 s.story55.ended=true;s.deathPhase='off';s.batteryPercent=1;
 syncDeathNight(s);
 assert.equal(s.deathPhase,'s55-off');
 assert.equal(s.batteryPercent,0);
 assert.equal(startSecondCharge55(s,Date.now()),true);
 assert.ok(s.content.conversations.noapp.find(x=>x.id==='tai').messages.some(m=>m.id===id));
 const resumed=endingReady().s;
 resumed.story55.ended=true;resumed.deathPhase='recovered';resumed.batteryPercent=25;
 syncDeathNight(resumed);
 assert.equal(secondView55(resumed),true);
 assert.equal(resumed.batteryPercent,100);
 assert.equal(resumed.deathPhase,'recovered');
});

test('regression: the final watch bubble is gated to 22:46 and is never duplicated',()=>{
 const {s}=endingReady();
 assert.equal(endingAwaitingVoice55(s),true);
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 s.clock='22:45';
 assert.equal(endingAwaitingVoice55(s),false);
 assert.equal(endingVoiceRevealDue55(s),false);
 s.clock='22:46';
 const start=Date.now();
 s.story55.endingVoiceQueuedAt=start;
 assert.equal(endingVoiceRevealDue55(s,start+ENDING_VOICE_APPEAR_DELAY_MS-1),false);
 assert.equal(tickWorld(s,60000).minutes,0);
 assert.equal(advanceGameMinutes(s,10).minutes,0);
 assert.equal(s.clock,'22:46');
 assert.equal(revealEndingVoice55(s,start+ENDING_VOICE_APPEAR_DELAY_MS-1),false);
 assert.equal(revealEndingVoice55(s,start+ENDING_VOICE_APPEAR_DELAY_MS),true);
 assert.equal(chat.messages.filter(m=>m.id==='s55-ending-final-voice').length,1);
 assert.equal(chat.messages.find(m=>m.id==='s55-ending-final-voice').time,'22:46');
 assert.equal(revealEndingVoice55(s,start+100000),false);
 assert.equal(endingReplyDue55(s),false);
 assert.equal(tickWorld(s,23000).minutes,0);
});

test('regression: after real audio ends, exactly 3 game minutes progress in 9 real seconds; never an instant reply',()=>{
 const {s}=endingReady();
 revealEndingVoice55(s,s.story55.endingVoiceQueuedAt+ENDING_VOICE_APPEAR_DELAY_MS);
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 s.story55.finalAudioHeard=true;
 advanceScene55(s,'ending');
 assert.equal(s.clock,'22:46');
 assert.equal(worldMinuteRate(s,{taiChat:true}),STORY55_FINALE_REPLY_MINUTES_PER_MS);
 assert.equal(endingReplyDue55(s),false);
 tickWorld(s,2999,{taiChat:true});
 assert.equal(s.clock,'22:46');
 assert.equal(chat.messages.some(m=>m.text==='熙蒙！熙蒙！'),false);
 tickWorld(s,1,{taiChat:true});
 assert.equal(s.clock,'22:47');
 tickWorld(s,3000,{taiChat:true});
 assert.equal(s.clock,'22:48');
 assert.equal(endingReplyDue55(s),false);
 tickWorld(s,3000,{taiChat:true});
 assert.equal(s.clock,'22:49');
 s.story55.d55RecallCompleted=true;
 assert.equal(endingReplyDue55(s),true);
 advanceScene55(s,'ending');
 assert.equal(chat.messages.filter(m=>m.text==='熙蒙！熙蒙！').length,0);
 assert.equal(s.deathPhase,'s55-accelerating');
});

test('old D55 saves remove only obsolete authored bubbles, preserving player chat and final audio',()=>{
 const {s}=endingReady();
 delete s.story55.config.d55EndingRevision;
 delete s.story55.config.nodes.find(n=>n.id==='ending').at;
 s.story55.config.scenes.ending=[
  ['system','孤儿院事件：围杀失败，熙旺死亡。'],
  ['me','赶紧集合，上车！'],
  ['tai','旧版监控消息'],
  ['me','旧版密钥消息'],
  ['tai','旧版巴黎消息'],
  ['watch','手表同步：最后一段语音'],
  ['tai','熙蒙！熙蒙！']
 ];
 s.story55.scenes.ending={index:5,accepted:false};
 s.clock='22:25';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 for(let i=1;i<=4;i++)chat.messages.push({id:'s55-ending-'+i,from:i%2?'me':'tai',text:'old-'+i,time:'21:00',story55:true});
 chat.messages.push({id:'keep-real-message',from:'me',text:'真实玩家的自由消息',time:'22:20'});
 s.notifications.push({id:'message-noapp-tai-s55-ending-2',messageId:'s55-ending-2'});
 s.story55.developerChatArchive=[{message:{id:'s55-ending-4'}},{message:{id:'keep-real-message'}}];
 assert.equal(retireLegacyD55Ending(s),true);
 assert.equal(s.story55.scenes.ending.index,0);
 assert.equal(s.clock,'22:25','save migration never changes the game clock');
 assert.equal(s.story55.config.nodes.find(n=>n.id==='ending').at,'22:46');
 assert.equal(chat.messages.some(m=>/^s55-ending-[0-4]$/.test(m.id)),false);
 assert.equal(chat.messages.some(m=>m.id==='keep-real-message'),true);
 assert.equal(s.notifications.some(n=>n.messageId==='s55-ending-2'),false);
 assert.deepEqual(s.story55.developerChatArchive.map(e=>e.message.id),['keep-real-message']);
 assert.equal(retireLegacyD55Ending(s),false,'idempotent migration');
 s.story55.scenes.ending.index=6;
 delete s.story55.config.d55EndingRevision;
 assert.equal(retireLegacyD55Ending(s),true);
 assert.equal(s.story55.scenes.ending.index,1,'old watch-completed state resumes at callback');
});
