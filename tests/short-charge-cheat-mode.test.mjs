import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {LockScreen} from '../src/system/lock.js';
import {worldMinuteRate} from '../src/system/time/clock.js';
import {beginShortCharge,endShortCharge} from '../src/system/power/battery.js';
import {nextStoryEventClock55} from '../src/services/story55/state.js';
import {nextAuthoredChatBoundary} from '../src/services/messaging/lifecycle/registry.js';
import {jumpShortChargeToNextEvent} from '../src/system/power/short-charge-jump.js';
import {dynamicIsland} from '../src/system/power/island.js';
import {authorize,begin} from '../src/apps/ghost/state.js';
import {skipGhostGame} from '../src/apps/ghost/features/dev-skip/index.js';

const phone=()=>{const s=activateStory55(initialState());s.day=2;s.clock='08:00';s.unlocked=true;s.story55.completed.intro={day:1,clock:'12:00'};return s;};
test('lockscreen secret codes leave restart and terminal recovery unchanged',()=>{
 const lock=new LockScreen();lock.open();for(const digit of '1234')lock.key(digit,['0816','0119'],{allowCheat:true});assert.equal(lock.stage,'cheat-on');
 lock.open();for(const digit of '4321')lock.key(digit,['0816','0119'],{allowCheat:true});assert.equal(lock.stage,'cheat-off');
 lock.open();for(const digit of '1234')lock.key(digit,'6180');assert.equal(lock.stage,'error');
 lock.open();for(const digit of '0000')lock.key(digit,['0816','0119'],{allowCheat:true});assert.equal(lock.stage,'restart');
});
test('App time stays slow while short charging, home switches from 3 to 5',()=>{
 const s=phone();s.nav.current={appId:'wechat',route:'/chat/group',params:{}};
 assert.equal(worldMinuteRate(s),5/60000);
 assert.equal(beginShortCharge(s),true);assert.equal(worldMinuteRate(s),5/60000);
 s.nav.current={appId:'home',route:'/',params:{}};assert.equal(worldMinuteRate(s),5/1000);
 endShortCharge(s);assert.equal(worldMinuteRate(s),3/1000);
});
test('cheat event jump finds the next same-day clock but cannot run in normal mode',()=>{
 const s=phone();s.day=41;s.clock='08:00';
 s.story55.config.nodes=[{id:'custom-event',day:41,at:'21:00',kind:'scene',title:'晚間消息',requires:[]}];
 assert.equal(nextStoryEventClock55(s),'21:00');
 assert.equal(jumpShortChargeToNextEvent(s).ok,false);
});
test('GHOST skip is inaccessible normally and uses the real success settlement',()=>{
 const s=phone(),id='author-ghost-verify';
 authorize(s,{orderId:id,mailId:null,type:'verify'});assert.equal(begin(s,id),true);
 assert.equal(skipGhostGame(s,id),false);
 s.editor??={};s.editor.cheatMode=true;
 assert.equal(skipGhostGame(s,id),true);
 assert.equal(s.ghost.orders[id].status,'success');
 assert.equal(s.ghost.history[0].success,true);
});
test('purple presence stays textless and is invisible before recognition',()=>{
 const s=phone();assert.doesNotMatch(dynamicIsland(s),/has-tai-glow|熙泰在線/);
 s.day=54;s.story55.completed.recognition={day:33,clock:'12:00'};
 const island=dynamicIsland(s);
 assert.match(island,/has-tai-glow/);assert.doesNotMatch(island,/熙泰在線/);
});

test('friends cheat considers D02 authored player-initiated chats before the evening event',()=>{
 const s=phone();
 s.story55.config.nodes=[{id:'evening',day:2,at:'20:00',kind:'scene',title:'晚上主線',requires:[]}];
 const next=nextAuthoredChatBoundary(s);
 assert.equal(next.kind,'upcoming');
 assert.equal(next.clock,'12:16'); // 熙蒙 must send the prefilled first line to 熙旺.
 assert.equal(nextStoryEventClock55(s),'20:00');
 s.editor.cheatMode=true;
 const result=jumpShortChargeToNextEvent(s,{includeAuthoredChats:true});
 assert.equal(result.ok,true);
 assert.equal(s.clock,'12:16');
});

test('daily chat lookup catches the later D02 Xiao Xin conversation when Wang is complete',()=>{
 const s=phone();s.clock='13:00';
 s.story55.d02??={};s.story55.d02.wechat={version:2,wang:{completed:true}};
 const next=nextAuthoredChatBoundary(s);
 assert.equal(next.kind,'upcoming');
 assert.equal(next.clock,'16:08');
});

test('friends cheat cannot skip a pending typed daily chat response',()=>{
 const s=phone();s.clock='12:18';s.editor.cheatMode=true;
 s.story55.d02??={};s.story55.d02.wechat={version:2,wang:{started:true,index:2,nextAt:null,completed:false}};
 const next=nextAuthoredChatBoundary(s);
 assert.equal(next.kind,'reply');
 assert.equal(next.conversationId,'wang');
 const result=jumpShortChargeToNextEvent(s,{includeAuthoredChats:true});
 assert.equal(result.reason,'pending-reply');
 assert.equal(result.ok,false);
 assert.equal(s.clock,'12:18');
});

test('friends cheat sees D25 daily chat without changing the default mainline clock finder',()=>{
 const s=phone();s.day=25;s.clock='10:00';
 s.story55.completed['d23-chess-finish']={day:23,clock:'23:00'};
 s.story55.config.nodes=[{id:'night',day:25,at:'21:00',kind:'scene',title:'主線',requires:[]}];
 assert.equal(nextAuthoredChatBoundary(s).clock,'11:38');
 assert.equal(nextStoryEventClock55(s),'21:00');
});

test('D01 cheat recognizes a started group chat without inventing the opening',()=>{
 const s=phone();s.day=1;s.clock='08:00';s.editor.cheatMode=true;
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 assert.equal(nextAuthoredChatBoundary(s),null);
 s.story55.d01.group={started:true,branch:'morning',index:4,awaitingPlayer:true,dueAt:null};
 assert.equal(jumpShortChargeToNextEvent(s).reason,'pending-reply');
 assert.equal(s.clock,'08:00');
 s.story55.d01.group={started:true,branch:'morning',index:0,awaitingPlayer:false,dueAt:Date.now()+1000};
 assert.equal(jumpShortChargeToNextEvent(s).reason,'chat-delivering');
});
test('D01 cheat selects the actual game-time brother reply boundary',()=>{
 const s=phone();s.day=1;s.clock='10:00';s.editor.cheatMode=true;
 s.story55.d01={bankClaimed:true,rewardPaid:true,brother:{phase:'waiting',helloDelivered:true,dueGameMinute:602}};
 s.story55.config.nodes=[];
 const next=nextAuthoredChatBoundary(s);
 assert.equal(next.kind,'upcoming');assert.equal(next.clock,'10:02');
 assert.equal(jumpShortChargeToNextEvent(s).ok,true);
 assert.equal(s.clock,'10:02');
 assert.equal(s.story55.d01.brother.phase,'replySecond');
 assert.equal(jumpShortChargeToNextEvent(s).reason,'chat-delivering');
});
