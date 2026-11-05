import test from 'node:test';
import assert from 'node:assert/strict';
import {activateStory55} from '../src/services/story55/runtime.js';
import {initialState} from '../src/services/storage.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {tickD04Chats,d04Draft,sendD04WeChat} from '../src/story/d04/wechat.js';
import {tickD03Chats} from '../src/story/d03/wechat.js';
import {unreadAppCount} from '../src/services/unread-badges.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {IncomingBannerQueue} from '../src/services/messaging/incoming-banner-queue.js';
import {worldMinuteRate,D04_BROADCAST_MINUTES_PER_MS} from '../src/system/time/clock.js';

const store=s=>({get:()=>s,update:fn=>fn(s)});
const conversation=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
function state(day=4,clock='09:50'){
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'wechat',route:'/',params:{}};
 return s;
}

test('D04 authored replies are present as literal native input values, not blank typewriter drafts',()=>{
 const s=state(4,'09:50');
 tickD04Chats(s,0);
 tickD04Chats(s,2100);
 assert.equal(d04Draft(s,'hufeng')?.text,'有');
 s.nav.current={appId:'wechat',route:'/chat/hufeng',params:{}};
 const html=renderWeChatChat(s,'hufeng');
 assert.match(html,/value="有"/);
 assert.match(html,/data-story-type="有"/);
 assert.match(html,/data-story-stage="d04:hufeng-am:2"/);
 assert.equal(conversation(s,'hufeng').messages.filter(m=>m.from==='me').length,0);
 assert.equal(sendD04WeChat(store(s),'hufeng','不是預設').handled,true);
 assert.equal(conversation(s,'hufeng').messages.filter(m=>m.from==='me').length,0);
 assert.equal(sendD04WeChat(store(s),'hufeng','有',4000).messageId,'d04-hufeng-am-2');
 assert.equal(conversation(s,'hufeng').messages.filter(m=>m.from==='me').length,1);
});
test('D04 old pending reply remains available even after next private scene reaches its timestamp',()=>{
 const s=state(4,'09:50');
 tickD04Chats(s,0);tickD04Chats(s,2000);
 assert.equal(d04Draft(s,'hufeng')?.text,'有');
 s.clock='16:50';tickD04Chats(s,5000);
 assert.equal(d04Draft(s,'hufeng')?.text,'有');
 assert.ok(!conversation(s,'hufeng').messages.some(m=>m.text==='我買了兩杯咖啡'));
});
test('all authored D04 notifications count per bubble, each with author and group',()=>{
 const s=state(4,'08:20');
 tickD04Chats(s,0);
 tickD04Chats(s,600);
 tickD04Chats(s,2700);
 const group=conversation(s,'group');
 assert.equal(group.unread,2);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,2);
 assert.ok(s.notifications.filter(n=>n.conversationId==='group').every(n=>n.title.includes('小辛')&&n.title.includes(group.name)));
 const before=unreadAppCount(s,'wechat');
 s.nav.current={appId:'wechat',route:'/chat/group',params:{}};
 assert.equal(readConversationInState(s,'wechat','group'),true);
 assert.equal(group.unread,0);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,0);
 assert.equal(unreadAppCount(s,'wechat'),before-2);
 tickD04Chats(s,5000);
 assert.equal(group.unread,0);
});
test('D03 existing NPC dialogue now counts each unread message, not only first of scene',()=>{
 const s=state(3,'08:40');
 tickD03Chats(s,0);tickD03Chats(s,1000);tickD03Chats(s,3400);
 assert.equal(conversation(s,'group').unread,2);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,2);
 assert.notEqual(s.notifications[0].id,s.notifications[1].id);
});
test('banner queue serializes every unread event and skips banners read before display',()=>{
 const shown=[],jobs=[],pending=new Set(['a','b','c']);
 const queue=new IncomingBannerQueue({
  show:(n)=>shown.push(n.id),
  stillUnread:n=>pending.has(n.id),
  eligible:n=>n.id!=='c',
  schedule:(fn)=>{jobs.push(fn);},
  interval:1750
 });
 queue.enqueue([{id:'a'},{id:'b'},{id:'c'}]);
 assert.deepEqual(shown,['a']);
 assert.equal(jobs.length,1);
 queue.enqueue([{id:'a'},{id:'b'}]);
 pending.delete('a');jobs.shift()();
 assert.deepEqual(shown,['a','b']);
 jobs.shift()();
 assert.deepEqual(shown,['a','b']); // c is skipped, no replays
 assert.equal(queue.running,false);
});

test('D04 group delivery temporarily caps clock speed so scenes do not outrun bubbles',()=>{
 const s=state(4,'08:20');s.nav.current={appId:'home',route:'/',params:{}};
 assert.equal(worldMinuteRate(s),5/1000);
 tickD04Chats(s,0);
 assert.equal(worldMinuteRate(s),D04_BROADCAST_MINUTES_PER_MS);
 for(let now=2000;now<80000;now+=2000)tickD04Chats(s,now);
 assert.ok(s.story55.d04Chats.morning.completed);
 assert.equal(worldMinuteRate(s),5/1000);
});

test('D04 optional player answer appears in group composer, never auto-sent',()=>{
 const s=state(4,'11:00');
 s.story55.d04Chats={video:{started:true,index:20,completed:true,nextAt:null},videoReplied:false};
 s.nav.current={appId:'wechat',route:'/chat/group',params:{}};
 const markup=renderWeChatChat(s,'group');
 const input=markup.match(/<input name="text"[^>]*>/)?.[0]||'';
 assert.match(input,/value="看見了"/);
 assert.match(input,/data-story-type="看見了"/);
 assert.doesNotMatch(input,/ disabled/);
 assert.equal(conversation(s,'group').messages.some(m=>m.from==='me'&&m.storyD04),false);
});
