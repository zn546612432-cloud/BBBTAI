import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickPhoneStoryMessages,phoneStoryMessagesDue} from '../src/services/messaging/phone-story-scheduler.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {d04Track} from '../src/story/d04/wechat.js';
import {d03Track} from '../src/story/d03/wechat.js';
import {d05Track} from '../src/story/d05/wechat.js';
import {D02_DIALOGUES} from '../src/story/d02/dialogue.js';
import {d02Track} from '../src/story/d02/wechat.js';
import {createConversationTrack} from '../src/services/messaging/lifecycle/engine.js';
import {IncomingBannerQueue} from '../src/services/messaging/incoming-banner-queue.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {allMoments} from '../src/apps/wechat/features/moments/model.js';

const fresh=(day=4,clock='09:50')=>{
 const s=activateStory55(initialState());s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'home',route:'/',params:{}};return s;
};
const cv=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const messages=(s,id,prefix)=>cv(s,id).messages.filter(m=>m.id.startsWith(prefix));
const store=s=>({get:()=>s,update:fn=>fn(s)});
const advance=(s,start=0,count=10)=>{for(let i=0;i<count;i++)tickPhoneStoryMessages(s,start+i*2500);};

test('a next-day reconciliation finishes yesterday groups at their original date in one quiet pass',()=>{
 const s=fresh();advance(s,0,2);
 s.day=5;s.clock='08:00';tickPhoneStoryMessages(s,100000);
 const history=messages(s,'group','d04-');
 assert.ok(history.length>160);assert.ok(history.every(m=>m.day===4&&m.sentDate==='2025-05-22'));
 assert.ok(history.some(m=>m.id==='d04-cat-0'&&m.time==='13:25'));
 assert.ok(s.notifications.filter(n=>n.messageId?.startsWith('d04-')).every(n=>n.silent));
 const ids=history.map(m=>m.id),unread=cv(s,'group').unread;
 const loaded=JSON.parse(JSON.stringify(s));tickPhoneStoryMessages(loaded,900000);
 assert.deepEqual(messages(loaded,'group','d04-').map(m=>m.id),ids);
 assert.equal(cv(loaded,'group').unread,unread);
 assert.equal(messages(s,'hufeng','d04-hufeng-am-').some(m=>m.from==='me'),false);
 assert.equal(messages(s,'hufeng','d04-hufeng-am-').some(m=>m.text==='真的？！'),false);
});

test('same-day topic transition reconciles the old group and paces only the new live scene',()=>{
 const s=fresh(4,'08:20');d04Track.tick(s,0);d04Track.tick(s,500);
 s.clock='10:50';d04Track.tick(s,3000);
 assert.ok(s.story55.d04Chats.morning.completed);
 assert.ok(s.notifications.filter(n=>n.messageId?.startsWith('d04-morning-')).every(n=>n.silent));
 assert.equal(messages(s,'group','d04-video-').length,0);
 d04Track.tick(s,3500);assert.equal(messages(s,'group','d04-video-').length,1);
 d04Track.tick(s,4000);assert.equal(messages(s,'group','d04-video-').length,1);
 assert.equal(messages(s,'group','d04-earbuds-').length,0,'Korea earbuds now happen after class');

});
test('non-expired topics retain time-aware alternatives; the missed dinner expires',()=>{
 const s=fresh(4,'08:00');tickPhoneStoryMessages(s,0);
 assert.equal(nativeWeChatComposer(s,'hufeng').text,null,'deleted repair thread never comes back');
 assert.match(d03Track.draft(s,'xiaoxin').text,/昨天那台/);
 s.day=5;tickPhoneStoryMessages(s,1000);
 assert.match(d03Track.draft(s,'xiaoxin').text,/電腦買了沒有/);
 assert.equal(d04Track.draft(s,'wang'),null);
 s.day=8;tickPhoneStoryMessages(s,2000);
 assert.equal(d04Track.draft(s,'wang'),null,'expired invitation has no indefinite draft');

});
test('valid late player sends are stamped today, NPC answers wait, reload is idempotent, and no dinner is invented',()=>{
 const s=fresh(5,'08:00');tickPhoneStoryMessages(s,0);
 const text=nativeWeChatComposer(s,'wang').text;assert.match(text,/衣服我自己收拾/);
 assert.equal(messages(s,'wang','d03-wang-late-later-').length,0);
 assert.ok(sendNativeWeChatPreset(store(s),'wang',text,500).messageId);
 let sent=messages(s,'wang','d03-wang-late-later-');
 assert.equal(sent.length,1);assert.equal(sent[0].from,'me');
 assert.equal(sent[0].day,5);assert.equal(sent[0].sentDate,'2025-05-23');
 tickPhoneStoryMessages(s,1000);assert.equal(messages(s,'wang','d03-wang-late-later-').length,1);
 const loaded=JSON.parse(JSON.stringify(s));tickPhoneStoryMessages(loaded,3000);
 assert.equal(messages(loaded,'wang','d03-wang-late-later-').length,2);
 tickPhoneStoryMessages(loaded,7000);assert.equal(messages(loaded,'wang','d03-wang-late-later-').length,2);
 assert.ok(loaded.notifications.filter(n=>n.messageId?.startsWith('d03-wang-late-later-')).every(n=>!n.silent),'today late NPC is a live incoming notification');
 assert.equal(!!loaded.story55.d04Chats.dinnerConfirmed,false);
 assert.equal(allMoments(loaded).some(m=>m.id==='xw-d04'),false);
 assert.ok(messages(loaded,'wang','d03-wang-late-later-').every(m=>m.day===5));
});

test('missed invitation has an NPC closure; obsolete emoji is rejected and late reply cannot confirm it',()=>{
 const s=fresh(4,'18:31');d04Track.tick(s,0);
 assert.ok(messages(s,'wang','d04-wang-dinner-late-unanswered').some(m=>m.text.includes('我先去吃了')));
 const draft=d04Track.draft(s,'wang');assert.equal(draft,null);
 assert.ok(d04Track.send(store(s),'wang','😘',500).reason);
 assert.equal(messages(s,'wang','d04-wang-dinner-late-sameDay').length,0);
 d04Track.tick(s,4000);
 assert.equal(!!s.story55.d04Chats.dinnerConfirmed,false);
 assert.equal(messages(s,'wang','d04-wang-dinner-').some(m=>m.from==='me'&&m.text==='😘'),false);
});

test('today replies close obsolete ordinary topics, including across refresh',()=>{
 const s=fresh(5,'08:05');tickPhoneStoryMessages(s,0);
 assert.equal(nativeWeChatComposer(s,'wang').text,null);
 tickPhoneStoryMessages(s,1000);
 assert.equal(nativeWeChatComposer(s,'wang').text,'嗯');
 assert.ok(sendNativeWeChatPreset(store(s),'wang','昨天忙忘了，下次一起吃？',1100).reason);
 advance(s,4000,3);
 assert.equal(nativeWeChatComposer(s,'wang').text,'嗯');
 sendNativeWeChatPreset(store(s),'wang','嗯',15000);
 assert.equal(nativeWeChatComposer(s,'wang').text,null);
 tickPhoneStoryMessages(s,18000);
 assert.equal(s.story55.d03Chats.wang.lateHandled,true);
 assert.equal(s.story55.d04Chats['wang-dinner'].lateHandled,true);
 const loaded=JSON.parse(JSON.stringify(s));loaded.day=6;loaded.clock='08:00';tickPhoneStoryMessages(loaded,30000);
 assert.equal(nativeWeChatComposer(loaded,'wang').text,null);
 assert.equal(messages(loaded,'wang','d04-wang-dinner-late-nextDay-').length,0);
});

test('crossing midnight during a late reply quietly settles earned NPC tail using the actual reply date',()=>{
 const s=fresh(4,'23:59');d03Track.tick(s,0);
 const draft=d03Track.draft(s,'wang');
 assert.ok(draft);
 d03Track.send(store(s),'wang',draft.text,1000);
 s.day=5;s.clock='08:00';d03Track.tick(s,2000);
 const replies=messages(s,'wang','d03-wang-late-nextDay-');
 assert.equal(replies.length,2);
 assert.ok(replies.every(m=>m.day===4&&m.time==='23:59'));
 assert.equal(replies[1].historical,true);
 assert.ok(s.notifications.filter(n=>n.messageId===replies[1].id).every(n=>n.silent));

});
test('real hours away do not expire a conversation while its game-time window is unchanged',()=>{
 const s=fresh(4,'17:45');d04Track.tick(s,0);d04Track.tick(s,1000);
 d04Track.tick(s,36000000);
 assert.equal(messages(s,'wang','d04-wang-dinner-').length,2);
 assert.equal(d04Track.draft(s,'wang').text,'你請？');
 assert.equal(s.story55.d04Chats['wang-dinner'].historySettled,undefined);

});
test('legacy dueAt/nextAt saves preserve sent messages and only catch up the earned NPC prefix',()=>{
 const s=fresh(5,'08:00'),c=cv(s,'hufeng');
 c.messages.push({id:'historic-personal',from:'胡枫',text:'過去的正常歷史',day:0,time:'11:00',sentDate:'2024-03-10'});
 c.messages.push({id:'d04-hufeng-am-0',from:'胡枫',text:'阿蒙',day:4,time:'09:50',storyD04:true});
 c.messages.push({id:'d04-hufeng-am-2',from:'me',text:'有',day:4,time:'09:51',storyD04:true});
 s.story55.d04Chats={'hufeng-am':{started:true,index:3,nextAt:123,completed:false}};
 s.story55.legacyHuFengPlotRetired=false; // Simulate an un-migrated older save.
 assert.equal(tickPhoneStoryMessages(s,1000),true);
 assert.equal(c.messages.some(m=>m.id==='d04-hufeng-am-0'),false,'retired NPC copy is hidden');
 assert.equal(c.messages.find(m=>m.id==='d04-hufeng-am-2')?.text,'有','real player Send survives retirement');
 assert.ok(s.story55.contentArchives.some(x=>x.id==='d04-hufeng-am-0'&&x.original.text==='阿蒙'));
 assert.equal(c.messages.find(m=>m.id==='historic-personal')?.text,'過去的正常歷史');
 const count=c.messages.length;
 tickPhoneStoryMessages(s,999999);
 assert.equal(c.messages.length,count,'cancelled script must not regenerate');

});
test('silent history still contributes exact unread and opening the conversation clears it once',()=>{
 const s=fresh(6,'08:00');tickPhoneStoryMessages(s,0);
 const c=cv(s,'group');
 assert.equal(c.unread,s.notifications.filter(n=>n.conversationId==='group'&&n.link.appId==='wechat').length);
 assert.ok(c.unread>300);readConversationInState(s,'wechat','group');
 assert.equal(c.unread,0);tickPhoneStoryMessages(s,5000);assert.equal(c.unread,0);
});

test('queued copies of yesterday notices are invalidated, without throwing away unread',()=>{
 const saved=[{id:'a'},{id:'b'}],shown=[],jobs=[];
 const queue=new IncomingBannerQueue({show:n=>shown.push(n.id),stillUnread:n=>saved.some(x=>x.id===n.id&&!x.silent),eligible:()=>true,schedule:fn=>jobs.push(fn)});
 queue.enqueue(saved.map(n=>({...n})));assert.deepEqual(shown,['a']);
 saved[1].silent=true;jobs.shift()();assert.deepEqual(shown,['a']);assert.equal(saved.length,2);
 queue.enqueue([{id:'history',silent:true}]);assert.equal(queue.pending.length,0);
});

test('unstarted player-led D02 thread never becomes a fake conversation during developer jumps',()=>{
 const s=fresh(8,'08:00');tickPhoneStoryMessages(s,0);
 assert.equal(messages(s,'wang','d02-wang-script-').length,0);
 assert.equal(s.story55.d02.wechat.wang.status,'unstarted');
 assert.equal(s.story55.d02.wechat.wang.lateRun,undefined);
 // A different contact's generic missed-reply reminder may now be due;
 // the unstarted D02 scene itself must never join that backlog.
 const episode=s.story55.genericMissedReplies?.episodes?.wang;
 assert.equal(episode?.sourceKeys?.includes('d02:wang')??false,false);
});

test('a configured mandatory scene stays replyable across dates; unrelated history still settles',()=>{
 const s=fresh(6),track=createConversationTrack({day:4,prefix:'test',progress:s=>s.story55.test??={},scenes:[
  {id:'required',chat:'hufeng',at:'09:00',mandatory:true,lines:[{who:'me',text:'確定'}]},
  {id:'background',chat:'group',at:'09:00',lines:[{who:'小辛',text:'早'}]}
 ]});
 track.tick(s,0);assert.equal(track.draft(s,'hufeng').text,'確定');
 assert.ok(messages(s,'group','test-background-')[0].historical);
 track.send(store(s),'hufeng','確定',1000);
 assert.equal(messages(s,'hufeng','test-required-')[0].day,6);
});

test('new daily definitions share a conversation cooldown even when a late and current reply are both due',()=>{
 const s=fresh(5,'08:04');tickPhoneStoryMessages(s,0);
 const draft=d03Track.draft(s,'wang');d03Track.send(store(s),'wang',draft.text,1000);
 s.clock='08:05';tickPhoneStoryMessages(s,2800);tickPhoneStoryMessages(s,3300);
 const incoming=s.events.filter(e=>e.channel==='wechat'&&e.conversationId==='wang'&&e.type==='authored_message_delivered'&&!e.silent);
 assert.equal(incoming.length,1);
 tickPhoneStoryMessages(s,5500);
 assert.equal(s.events.filter(e=>e.channel==='wechat'&&e.conversationId==='wang'&&e.type==='authored_message_delivered'&&!e.silent).length,2);
});


test('merely offering a player-led D02 draft does not start a conversation or manufacture a late reply',()=>{
 const s=fresh(2,'12:16');tickPhoneStoryMessages(s,0);
 assert.match(nativeWeChatComposer(s,'wang').text,/電腦真該退休/);
 s.day=3;s.clock='08:00';tickPhoneStoryMessages(s,5000);
 assert.equal(s.story55.d02.wechat.wang.status,'unstarted');
 assert.equal(messages(s,'wang','d02-wang-script-').length,0);
 assert.equal(nativeWeChatComposer(s,'wang').text,null);
});

test('breakfast group never claims an unsent player reply happened',()=>{
 const s=fresh(5,'08:15');advance(s,0,30);
 assert.ok(messages(s,'group','d05-breakfast-').some(m=>m.text==='粥放桌上了，等他起來吃。'));
 assert.equal(messages(s,'group','d05-breakfast-').some(m=>m.text==='醒了，剛回我'),false);
});


test('D02 Xiao Xin keeps all nine approved turns across midnight without auto-sending Xi Meng',()=>{
 const s=fresh(2,'16:08'),records=()=>messages(s,'xiaoxin','d02-xin-script-');
 tickPhoneStoryMessages(s,0);tickPhoneStoryMessages(s,2500);
 assert.equal(records().length,1);
 assert.equal(records()[0].text,D02_DIALOGUES.xin[0][1]);
 s.day=3;s.clock='08:04';tickPhoneStoryMessages(s,5000);
 assert.equal(records().length,1,'crossing midnight must not invent player messages');
 assert.equal(messages(s,'xiaoxin','d02-xin-late-').length,0);
 assert.equal(nativeWeChatComposer(s,'xiaoxin').text,D02_DIALOGUES.xin[1][1]);
 const original=store(s);let now=5000;
 for(let i=1;i<D02_DIALOGUES.xin.length;i++){
  const [who,line]=D02_DIALOGUES.xin[i];
  if(who==='me'){
   assert.equal(nativeWeChatComposer(s,'xiaoxin').text,line);
   assert.ok(sendNativeWeChatPreset(original,'xiaoxin',line,now).messageId);
  }else{
   now+=5000;tickPhoneStoryMessages(s,now);
  }
  assert.equal(records().find(m=>m.id==='d02-xin-script-'+i)?.text,line);
 }
 assert.equal(records().length,9);
 assert.equal(records().filter(m=>m.from==='me').length,3);
 assert.ok(s.story55.d02.wechat.xin.completed);
 tickPhoneStoryMessages(s,now+5000);
 assert.equal(records().length,9,'refresh or more ticks must not duplicate dialogue');
});

test('D02 Xiao Xin late-branch saves retain actual sent messages and restore remaining original turns',()=>{
 const s=fresh(3,'08:04'),c=cv(s,'xiaoxin');
 s.story55.d02??={};s.story55.d02.wechat??={version:2};
 const q=s.story55.d02.wechat.xin={started:true,index:1,historySettled:true,
  lateHandled:true,status:'closed',lateRun:{kind:'nextDay',index:2}};
 c.messages.push({id:'d02-xin-script-0',from:'小辛',text:D02_DIALOGUES.xin[0][1],actual:true,day:2,time:'16:08',sentDate:'2025-05-20'});
 c.messages.push({id:'d02-xin-late-nextDay-0',from:'me',text:'昨天沒顧上回。那台先別買，配置再看看。',actual:true,day:3,time:'01:04',sentDate:'2025-05-21'});
 c.messages.push({id:'d02-xin-late-nextDay-1',from:'小辛',text:'行，我先不下單。',actual:true,day:3,time:'01:04',sentDate:'2025-05-21'});
 const previous=c.messages.map(m=>m.id);
 tickPhoneStoryMessages(s,1000);
 assert.deepEqual(c.messages.map(m=>m.id),previous,'previous real sends and replies are never rewritten');
 assert.equal(nativeWeChatComposer(s,'xiaoxin').text,D02_DIALOGUES.xin[1][1]);
 assert.equal(q.historySettled,false);
 assert.equal(q.lateHandled,false);
 const sent=sendNativeWeChatPreset(store(s),'xiaoxin',D02_DIALOGUES.xin[1][1],2000);
 assert.ok(sent.messageId);
 tickPhoneStoryMessages(s,6000);
 assert.equal(messages(s,'xiaoxin','d02-xin-script-').length,3);
 assert.equal(c.messages.filter(m=>m.id==='d02-xin-late-nextDay-0').length,1);
});

test('D02 Xiao Xin missed first delivery backfills only his scheduled opener at original time',()=>{
 const s=fresh(3,'08:04'),c=cv(s,'xiaoxin');
 assert.equal(messages(s,'xiaoxin','d02-xin-script-').length,0);
 tickPhoneStoryMessages(s,1000);
 const rows=messages(s,'xiaoxin','d02-xin-script-');
 assert.equal(rows.length,1);
 assert.equal(rows[0].time,'16:08');assert.equal(rows[0].day,2);
 assert.equal(rows[0].historical,true);
 assert.equal(rows.filter(m=>m.from==='me').length,0);
 assert.equal(nativeWeChatComposer(s,'xiaoxin').text,D02_DIALOGUES.xin[1][1]);
 tickPhoneStoryMessages(s,8000);
 assert.equal(messages(s,'xiaoxin','d02-xin-script-').length,1);
});
