import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {advanceGameMinutes,tickWorld,worldMinuteRate,STORY55_NORMAL_MINUTES_PER_MS} from '../src/system/time/clock.js';
import {syncDeathNight,phoneBlocked} from '../src/system/power/story.js';
import {drainBattery} from '../src/system/power/battery.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {dateParts} from '../src/services/calendar.js';
import {LockScreen} from '../src/system/lock.js';
import {currentScript55} from '../src/services/story55/scripted-chat.js';
import {ENDING_CLOCKS,ENDING_FINAL_REPLY,ENDING_VOICE_APPEAR_DELAY_MS,endingAwaitingVoice55,endingVoiceRevealDue55,revealEndingVoice55,endingReplyDue55,tickFinale55,startSecondCharge55,syncSecondClock55,secondView55,FAST_FORWARD_MS,ONE_PERCENT_MS,ZERO_PERCENT_MS,RECHARGE_MS} from '../src/services/story55/finale.js';

function endingReady(){
 const s=initialState();activateStory55(s);previewNode55(s,'ending');
 s.story55.noappInstalled=true;
 const historical=s.content.conversations.wechat[0].messages.length;
 return {s,historical};
}

test('D55 scripted NoApp lines start at 21:00, and last voice is SENT at 22:46',()=>{
 const {s}=endingReady();
 assert.equal(s.day,55);
 assert.equal(ENDING_CLOCKS[0],'21:00');
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 assert.equal(scene55(s,'ending').index,5);
 assert.equal(s.clock,'22:25');
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 const messages=c.messages.filter(m=>m.id.startsWith('s55-ending-'));
 assert.deepEqual(messages.map(m=>m.time),['21:00','21:16','21:49','22:25']);
 assert.throws(()=>advanceScene55(s,'ending'),/语音/);
 s.story55.finalAudioHeard=true;
 advanceScene55(s,'ending');
 assert.equal(s.clock,'22:46');
 const voice=c.messages.find(m=>m.id==='s55-ending-final-voice');
 assert.equal(voice?.time,'22:46');
 assert.equal(voice?.sentDate,'2025-07-12');
 assert.equal(endingReplyDue55(s),false);
 assert.equal(currentScript55(s,'noapp','tai'),null);
});

test('three GAME minutes later, Xitai sends one final message and starts a real-second countdown',()=>{
 const {s}=endingReady();
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 s.story55.finalAudioHeard=true;advanceScene55(s,'ending');
 assert.throws(()=>advanceScene55(s,'ending'),/三分钟/);
 advanceGameMinutes(s,2);
 assert.equal(s.clock,'22:48');assert.equal(endingReplyDue55(s),false);
 advanceGameMinutes(s,1);
 assert.equal(s.clock,'22:49');assert.equal(endingReplyDue55(s),true);
 advanceScene55(s,'ending');
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 assert.equal(c.messages.filter(x=>x.text===ENDING_FINAL_REPLY).length,1);
 assert.equal(c.messages.find(x=>x.text===ENDING_FINAL_REPLY).time,'22:49');
 assert.equal(s.story55.ended,true);
 assert.equal(s.deathPhase,'s55-accelerating');
 assert.equal(phoneBlocked(s),true);
 assert.equal(advanceGameMinutes(s,60).minutes,0);
 const start=s.story55.finalTransition.startedAt;
 assert.equal(tickWorld(s,2000).minutes,0);
 tickFinale55(s,start+FAST_FORWARD_MS-1000);
 assert.notEqual(s.clock,'03:00');
 assert.equal(s.deathPhase,'s55-accelerating');
 tickFinale55(s,start+FAST_FORWARD_MS);
 assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 assert.equal(dateParts(s).iso,'2025-07-13');
 assert.equal(s.deathPhase,'s55-one-percent');
 assert.match(powerFullscreen(s),/1%/);
 assert.match(powerFullscreen(s),/<button type="button" disabled/);
 tickFinale55(s,start+FAST_FORWARD_MS+ONE_PERCENT_MS);
 assert.equal(s.batteryPercent,0);
 assert.equal(s.deathPhase,'s55-zero-percent');
 assert.match(powerFullscreen(s),/0%/);
 tickFinale55(s,start+FAST_FORWARD_MS+ONE_PERCENT_MS+ZERO_PERCENT_MS);
 assert.equal(s.deathPhase,'s55-off');
 assert.equal(s.unlocked,false);
 assert.match(powerFullscreen(s),/data-action="story55-wake"/);
});

test('tap to charge to 100%, show lock, unlock with 6180 and preserve existing app data',()=>{
 const {s}=endingReady();
 const beforeWeChat=s.content.conversations.wechat.map(x=>x.messages.length);
 const beforeNotes=s.content.notes.length;
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 s.story55.finalAudioHeard=true;advanceScene55(s,'ending');
 advanceGameMinutes(s,3);advanceScene55(s,'ending');
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

test('regression: 22:25 voice is NOT immediately visible; 22:46 voice is one timestamped bubble',()=>{
 const {s}=endingReady();
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 assert.equal(endingAwaitingVoice55(s),true);
 assert.equal(s.clock,'22:25');
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 const start=s.story55.endingVoiceQueuedAt;
 assert.ok(Number.isFinite(start));
 assert.equal(chat.messages.filter(m=>m.id==='s55-ending-final-voice').length,0);
 assert.equal(endingVoiceRevealDue55(s,start+ENDING_VOICE_APPEAR_DELAY_MS-1),false);
 assert.equal(tickWorld(s,60000).minutes,0);
 assert.equal(advanceGameMinutes(s,10).minutes,0);
 assert.equal(s.clock,'22:25');
 assert.equal(revealEndingVoice55(s,start+ENDING_VOICE_APPEAR_DELAY_MS-1),false);
 assert.equal(revealEndingVoice55(s,start+ENDING_VOICE_APPEAR_DELAY_MS),true);
 assert.equal(s.clock,'22:46');
 assert.equal(chat.messages.filter(m=>m.id==='s55-ending-final-voice').length,1);
 assert.equal(chat.messages.find(m=>m.id==='s55-ending-final-voice').time,'22:46');
 assert.equal(revealEndingVoice55(s,start+100000),false);
 assert.equal(endingReplyDue55(s),false);
 // Listening to the real audio cannot consume the 3 game-minute wait.
 assert.equal(tickWorld(s,23000).minutes,0);
 assert.equal(s.clock,'22:46');
 assert.equal(endingReplyDue55(s),false);
});

test('regression: after real audio ends, exactly 3 game minutes progress in 9 real seconds; never an instant reply',()=>{
 const {s}=endingReady();
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 revealEndingVoice55(s,s.story55.endingVoiceQueuedAt+ENDING_VOICE_APPEAR_DELAY_MS);
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 s.story55.finalAudioHeard=true;
 advanceScene55(s,'ending');
 assert.equal(s.clock,'22:46');
 assert.equal(worldMinuteRate(s,{taiChat:true}),STORY55_NORMAL_MINUTES_PER_MS);
 assert.equal(endingReplyDue55(s),false);
 tickWorld(s,2999,{taiChat:true});
 assert.equal(s.clock,'22:46');
 assert.equal(chat.messages.some(m=>m.text===ENDING_FINAL_REPLY),false);
 tickWorld(s,1,{taiChat:true});
 assert.equal(s.clock,'22:47');
 tickWorld(s,3000,{taiChat:true});
 assert.equal(s.clock,'22:48');
 assert.equal(endingReplyDue55(s),false);
 tickWorld(s,3000,{taiChat:true});
 assert.equal(s.clock,'22:49');
 assert.equal(endingReplyDue55(s),true);
 advanceScene55(s,'ending');
 assert.equal(chat.messages.filter(m=>m.text===ENDING_FINAL_REPLY).length,1);
 assert.equal(s.deathPhase,'s55-accelerating');
});
