import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore,KEY} from '../src/services/storage.js';
import {todayShanghai,calendarAnchor,dateParts,dateLabel,monthCells,setPreviewDate,validDate} from '../src/services/calendar.js';
import {home,lock} from '../src/system/shell.js';
import {createConversation,selectedConversation,actors,renameActor,newMessage} from '../src/editor/conversations/model.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import * as noapp from '../src/apps/noapp/index.js';
import * as messages from '../src/apps/messages/index.js';
function setup(){const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);return {store,storage,data};}
test('calendar uses Shanghai date and real month lengths, leap days and weekdays',()=>{
 assert.equal(todayShanghai(new Date('2026-10-25T17:00:00Z')),'2026-10-26');
 assert.equal(validDate('2026-02-30'),false);
 const s={day:1,calendar:calendarAnchor(1,'2024-02-28')};s.day=2;assert.equal(dateParts(s).iso,'2024-02-29');s.day=3;assert.equal(dateParts(s).iso,'2024-03-01');
 s.calendar=calendarAnchor(3,'2026-10-26');assert.equal(dateParts(s).weekday,'星期一');const cells=monthCells(s);assert.equal(cells.filter(Boolean).length,31);assert.equal(cells.find(c=>c?.today).date,26);
});
test('old saves acquire a date anchor without losing messages, and public shell hides day counters',()=>{
 const {store,storage,data}=setup(),old=structuredClone(store.get());delete old.calendar;old.content.notes[0].text='保留旧笔记';data.set(KEY,JSON.stringify(old));
 const restored=new PhoneStore(storage);assert.ok(restored.get().calendar);assert.equal(restored.get().content.notes[0].text,'保留旧笔记');
 restored.update(s=>setPreviewDate(s,{day:56,date:'2026-10-26',clock:'21:18'}));const state=restored.get();
 assert.match(lock(state),/2025年7月13日 星期日/);assert.match(home(state),/2025年7月13日/);assert.ok(!/第\s*56\s*天|D56/.test(lock(state)+home(state)));
 restored.update(s=>{s.day=57;});assert.equal(dateLabel(new PhoneStore(storage).get()),'2025年7月14日');
});
test('new direct windows in all four chat apps persist and messages target only the selected window',()=>{
 const {store,storage}=setup();
 for(const channel of ['wechat','noapp','mirage','messages']){
  const before=store.get().content.conversations.noapp[0].messages.length;
  const id=createConversation(store,{channel,name:'新朋友'});assert.equal(selectedConversation(store.get()).c.id,id);
  sendMessage(store,{channel,conversationId:id,text:'你好'});
  const c=new PhoneStore(storage).get().content.conversations[channel].find(c=>c.id===id);assert.equal(c.messages.length,1);assert.equal(c.messages[0].text,'你好');
  assert.equal(store.get().content.conversations.noapp[0].messages.length,before);
 }
});
test('custom groups have their own selectable actors without altering the canonical GROUP',()=>{
 const {store}=setup(),original=structuredClone(store.get().content.conversations.wechat.find(c=>c.id==='group'));
 const id=createConversation(store,{channel:'wechat',name:'周末计划',type:'group',members:'小明\n小红\n小明'});
 store.update(s=>{const c=s.content.conversations.wechat.find(c=>c.id===id);assert.deepEqual(actors(c).map(a=>a.name),['熙蒙','小明','小红']);renameActor(c,c.participants[1].id,'阿明');c.messages.push(newMessage(s,c));});
 assert.deepEqual(store.get().content.conversations.wechat.find(c=>c.id==='group'),original);assert.equal(actors(selectedConversation(store.get()).c)[1].name,'阿明');
 const before=structuredClone(store.get());assert.throws(()=>createConversation(store,{channel:'wechat',name:'空群',type:'group'}));assert.deepEqual(store.get(),before);
});
test('NoApp lists and opens new windows; its list does not start a private chat delay timer',()=>{
 const {store}=setup(),id=createConversation(store,{channel:'noapp',name:'新内网朋友'});
 store.update(s=>{const c=s.content.conversations.noapp.find(c=>c.id===id);c.messages.push({...newMessage(s,c),schedule:{mode:'chat-delay',seconds:1}});s.unlocked=true;s.nav.current={appId:'noapp',route:'/',params:{}};});
 assert.match(noapp.render({store},{route:'/'}),/新内网朋友/);const engine=new MessageDelivery(store);assert.equal(engine.tick(0).length,0);assert.equal(engine.tick(5000).length,0);
 store.update(s=>{s.nav.current.route='/chat/'+id;});assert.equal(engine.tick(6000).length,0);assert.equal(engine.tick(7000).length,1);
 assert.match(noapp.render({store},{route:'/chat/'+id}),/新消息/);
});
test('SMS renders authored conversations and opens their actual chat views',()=>{
 const {store}=setup(),id=createConversation(store,{channel:'messages',name:'测试短信'});sendMessage(store,{channel:'messages',conversationId:id,text:'短信内容'});
 assert.match(messages.render({store},{route:'/'}),/测试短信/);assert.match(messages.render({store},{route:'/chat/'+id}),/短信内容/);
});
