import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickPhoneStoryMessages,phoneStoryMessagesDue} from '../src/services/messaging/phone-story-scheduler.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {d04Track} from '../src/story/d04/wechat.js';
import {d05Track} from '../src/story/d05/wechat.js';
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
 s.clock='09:35';d04Track.tick(s,3000);
 assert.ok(s.story55.d04Chats.morning.completed);
 assert.ok(s.notifications.filter(n=>n.messageId?.startsWith('d04-morning-')).every(n=>n.silent));
 assert.equal(messages(s,'group','d04-earbuds-').length,0);
 d04Track.tick(s,3500);assert.equal(messages(s,'group','d04-earbuds-').length,1);
 d04Track.tick(s,4000);assert.equal(messages(s,'group','d04-earbuds-').length,1);
});

test('next-day and several-day replies differ; a resolved computer never asks to repair it again',()=>{
 const s=fresh(5,'08:00');tickPhoneStoryMessages(s,0);
 assert.match(nativeWeChatComposer(s,'hufeng').text,/昨天.*電腦弄好了叫你/);
 s.day=6;tickPhoneStoryMessages(s,1000);
 assert.match(d04Track.draft(s,'hufeng').text,/電腦已經弄好了/);
 const invitation=d04Track.draft(s,'wang');assert.match(invitation.text,/前幾天/);
 s.day=8;tickPhoneStoryMessages(s,2000);
 assert.equal(d04Track.draft(s,'wang'),null,'expired invitations have no indefinite draft');
});

test('late player sends are stamped today, NPC answers wait, reload is idempotent, and no dinner is invented',()=>{
 const s=fresh(5,'08:00');tickPhoneStoryMessages(s,0);
 const text=nativeWeChatComposer(s,'wang').text;assert.match(text,/昨天忙忘了/);
 assert.equal(messages(s,'wang','d04-wang-dinner-late-nextDay-').length,0);
 assert.ok(sendNativeWeChatPreset(store(s),'wang',text,500).messageId);
 let sent=messages(s,'wang','d04-wang-dinner-late-nextDay-');
 assert.equal(sent.length,1);assert.equal(sent[0].from,'me');
 assert.equal(sent[0].day,5);assert.equal(sent[0].sentDate,'2025-05-23');
 tickPhoneStoryMessages(s,1000);assert.equal(messages(s,'wang','d04-wang-dinner-late-nextDay-').length,1);
 const loaded=JSON.parse(JSON.stringify(s));tickPhoneStoryMessages(loaded,3000);
 assert.equal(messages(loaded,'wang','d04-wang-dinner-late-nextDay-').length,2);
 tickPhoneStoryMessages(loaded,7000);assert.equal(messages(loaded,'wang','d04-wang-dinner-late-nextDay-').length,2);
 assert.ok(loaded.notifications.filter(n=>n.messageId?.startsWith('d04-wang-dinner-late-nextDay-')).every(n=>!n.silent),'today late NPC is a live incoming notification');
 assert.equal(!!loaded.story55.d04Chats.dinnerConfirmed,false);
 assert.equal(allMoments(loaded).some(m=>m.id==='xw-d04'),false);
 assert.ok(messages(loaded,'wang','d04-wang-dinner-late-nextDay-').every(m=>m.day===5));
});

test('missed invitation has an NPC closure; obsolete emoji is rejected and late reply cannot confirm it',()=>{
 const s=fresh(4,'18:31');d04Track.tick(s,0);
 assert.ok(messages(s,'wang','d04-wang-dinner-late-unanswered').some(m=>m.text.includes('我先去吃了')));
 const draft=d04Track.draft(s,'wang');assert.match(draft.text,/改天一起/);
 assert.ok(d04Track.send(store(s),'wang','😘',500).reason);
 assert.equal(messages(s,'wang','d04-wang-dinner-late-sameDay').length,0);
 d04Track.send(store(s),'wang',draft.text,1000);d04Track.tick(s,4000);
 assert.equal(!!s.story55.d04Chats.dinnerConfirmed,false);
 assert.equal(messages(s,'wang','d04-wang-dinner-').some(m=>m.from==='me'&&m.text==='😘'),false);
});

test('today NPC and player turns outrank old replies, which can be handled after the current scene',()=>{
 const s=fresh(5,'08:05');tickPhoneStoryMessages(s,0);
 assert.equal(nativeWeChatComposer(s,'wang').text,null);
 tickPhoneStoryMessages(s,1000);
 assert.equal(nativeWeChatComposer(s,'wang').text,'嗯');
 assert.ok(sendNativeWeChatPreset(store(s),'wang','昨天忙忘了，下次一起吃？',1100).reason);
 advance(s,4000,3);
 assert.equal(nativeWeChatComposer(s,'wang').text,'嗯');
 sendNativeWeChatPreset(store(s),'wang','嗯',15000);
 assert.equal(nativeWeChatComposer(s,'wang').text,null);
});

test('crossing midnight during a late reply quietly settles earned NPC tail using the actual reply date',()=>{
 const s=fresh(5,'23:59');d04Track.tick(s,0);
 const draft=d04Track.draft(s,'hufeng');d04Track.send(store(s),'hufeng',draft.text,1000);
 s.day=6;s.clock='08:00';d04Track.tick(s,2000);
 const replies=messages(s,'hufeng','d04-hufeng-am-late-resolved');
 assert.equal(replies.length,2);assert.ok(replies.every(m=>m.day===5&&m.time==='23:59'));
 assert.equal(replies[1].historical,true);
 assert.ok(s.notifications.filter(n=>n.messageId===replies[1].id).every(n=>n.silent));
});

test('real hours away do not expire a conversation while its game-time window is unchanged',()=>{
 const s=fresh();d04Track.tick(s,0);d04Track.tick(s,1000);
 d04Track.tick(s,36000000);
 assert.equal(messages(s,'hufeng','d04-hufeng-am-').length,2);
 assert.equal(d04Track.draft(s,'hufeng').text,'有');
 assert.equal(s.story55.d04Chats['hufeng-am'].historySettled,undefined);
});

test('legacy dueAt/nextAt saves preserve sent messages and only catch up the earned NPC prefix',()=>{
 const s=fresh(5,'08:00');
 s.story55.d04Chats={'hufeng-am':{started:true,index:3,nextAt:123,completed:false}};
 cv(s,'hufeng').messages.push({id:'d04-hufeng-am-2',from:'me',text:'有',day:4,time:'16:20',sentDate:'2025-05-22',storyD04:true});
 d04Track.tick(s,1000);
 const tail=messages(s,'hufeng','d04-hufeng-am-');
 assert.equal(tail.filter(m=>m.from==='me').length,1);
 assert.ok(tail.some(m=>m.text==='真的？！'&&m.time==='16:20'&&m.historical));
 assert.equal(tail.some(m=>m.text==='灰比你頭髮還多'),false);
 const count=tail.length;d04Track.tick(s,999999);assert.equal(messages(s,'hufeng','d04-hufeng-am-').length,count);
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
 const draft=d04Track.draft(s,'wang');d04Track.send(store(s),'wang',draft.text,1000);
 s.clock='08:05';tickPhoneStoryMessages(s,2800);tickPhoneStoryMessages(s,3300);
 const incoming=s.events.filter(e=>e.channel==='wechat'&&e.conversationId==='wang'&&e.type==='authored_message_delivered'&&!e.silent);
 assert.equal(incoming.length,1);
 tickPhoneStoryMessages(s,5500);
 assert.equal(s.events.filter(e=>e.channel==='wechat'&&e.conversationId==='wang'&&e.type==='authored_message_delivered'&&!e.silent).length,2);
});


test('merely offering a player-led D02 draft does not start a conversation or manufacture a late reply',()=>{
 const s=fresh(2,'12:16');tickPhoneStoryMessages(s,0);
 assert.match(nativeWeChatComposer(s,'wang').text,/电脑真该退休/);
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
