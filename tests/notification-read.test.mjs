import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {PhoneRouter} from '../src/services/router.js';
import {registry} from '../src/system/registry.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import {readConversationInState,readNotification} from '../src/services/messaging/read.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {lock,notifications} from '../src/system/shell.js';

const setup=()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 return {store:new PhoneStore(storage),storage};
};
const notice=(id,channel,conversationId)=>({id,title:channel==='wechat'?'微信':'短信',body:'收到消息',conversationId,link:{appId:channel,route:'/chat/'+conversationId,params:{}}});

test('opening one conversation clears its badge and all notices but leaves other chats unread',()=>{
 const {store,storage}=setup();
 store.update(s=>{
  s.content.conversations.wechat.find(c=>c.id==='wang').unread=2;
  s.notifications=[notice('w1','wechat','wang'),notice('w2','wechat','wang'),notice('group','wechat','group'),notice('sms','messages','sms-delivery')];
 });
 assert.match(renderWeChatHome(store.get(),'/'),/wx-unread-badge/);
 const priorDoc=globalThis.document;
 globalThis.document={querySelector:()=>null};
 try{new PhoneRouter(store,registry).open({appId:'wechat',route:'/chat/wang'});}finally{globalThis.document=priorDoc;}
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='wang').unread,0);
 assert.deepEqual(store.get().notifications.map(n=>n.id),['group','sms']);
 assert.match(renderWeChatHome(store.get(),'/'),/1条未读消息/);
 store.update(s=>{readConversationInState(s,'wechat','group');});
 assert.doesNotMatch(renderWeChatHome(store.get(),'/'),/wx-unread-badge|wx-chat-unread/);
 assert.deepEqual(new PhoneStore(storage).get().notifications.map(n=>n.id),['sms']);
});

test('reading an unrelated notification dismisses only that card, on lock and shade',()=>{
 const {store}=setup();
 store.update(s=>{s.notifications=[notice('w1','wechat','wang'),notice('w2','wechat','group')];});
 assert.equal(readNotification(store,'w1'),true);
 assert.equal(readNotification(store,'w1'),false);
 assert.deepEqual(store.get().notifications.map(n=>n.id),['w2']);
 assert.doesNotMatch(lock(store.get()),/data-id="w1"/);
 assert.doesNotMatch(notifications(store.get()),/data-id="w1"/);
 assert.match(notifications(store.get()),/data-id="w2"/);
});

test('new delivered incoming chat message increases unread once and is cleared when opened',()=>{
 const {store}=setup();
 store.update(s=>{
  s.unlocked=true;
  s.nav.current={appId:'home',route:'/',params:{}};
  s.day=57;s.clock='09:00';
  s.content.conversations.wechat.find(c=>c.id==='wang').messages.push({id:'delivered-once',from:'wang',text:'阿蒙，醒了吗？',time:'09:00',schedule:{mode:'game-time',day:57,clock:'08:59'}});
 });
 const delivery=new MessageDelivery(store);
 assert.equal(delivery.tick().length,1);
 assert.equal(delivery.tick().length,0);
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='wang').unread,1);
 assert.equal(store.get().notifications.filter(n=>n.conversationId==='wang').length,1);
 const priorDoc=globalThis.document;
 globalThis.document={querySelector:()=>null};
 try{new PhoneRouter(store,registry).open({appId:'wechat',route:'/chat/wang'});}finally{globalThis.document=priorDoc;}
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='wang').unread,0);
 assert.equal(store.get().notifications.filter(n=>n.conversationId==='wang').length,0);
});

test('KIRA list and deep links persist read state per mail without clearing other blue dots',async()=>{
 const {kiraInbox}=await import('../src/apps/kira/features/inbox/index.js');
 const {store,storage}=setup(),mail=store.get().content.mail[0];
 const count=()=> (kiraInbox(store.get()).match(/●/g)||[]).length;
 const before=count(),priorDoc=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const router=new PhoneRouter(store,registry);router.open({appId:'kira',route:'/mail/'+mail.id});router.back();}finally{globalThis.document=priorDoc;}
 assert.equal(store.get().content.mail[0].read,true);assert.equal(count(),before-1);
 assert.equal(new PhoneStore(storage).get().content.mail[0].read,true);
});
