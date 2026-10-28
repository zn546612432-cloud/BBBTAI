import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore,KEY} from '../src/services/storage.js';
import {weatherFor,render as weatherRender} from '../src/apps/weather/index.js';
import {render as smsRender} from '../src/apps/messages/index.js';
import {render as editorRender} from '../src/editor/index.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {setSchedule} from '../src/editor/conversations/model.js';
function setup(){const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);return {store,storage};}
test('weather edits are scoped to the selected game day and city',()=>{
 const {store}=setup();
 store.update(s=>{s.content.weather={57:{paris:{name:'巴黎',condition:'小雨',temp:12,high:16,low:8}}};});
 assert.equal(weatherFor(store.get(),57).find(c=>c.id==='paris').temp,12);
 assert.equal(weatherFor(store.get(),56).find(c=>c.id==='paris').temp,14);
 assert.match(weatherRender({store},{route:'/edit',params:{city:'paris',day:57}}),/value="57"/);
 assert.match(weatherRender({store},{route:'/edit',params:{city:'paris',day:57}}),/value="12"/);
});
test('seeded SMS can be edited, scheduled, delivered as a notification, and persist',()=>{
 const {store,storage}=setup();
 assert.equal(store.get().content.conversations.messages.length,3);
 const c=store.get().content.conversations.messages[0];
 store.update(s=>{const m=s.content.conversations.messages[0].messages[0];m.text='测试短信';setSchedule(s,s.content.conversations.messages[0],m,{mode:'game-time',day:57,clock:'10:00'});});
 assert.equal(visibleMessages(store.get().content.conversations.messages[0]).length,0);
 assert.ok(!smsRender({store},{route:'/',params:{}}).includes('测试短信'));
 store.update(s=>{s.day=57;s.clock='10:00';});
 assert.equal(new MessageDelivery(store).tick(1).length,1);
 assert.equal(store.get().notifications[0].link.appId,'messages');
 assert.match(smsRender({store},{route:'/chat/'+c.id,params:{}}),/测试短信/);
 assert.match(editorRender({store},{route:'/sms'}),/短信编辑/);
 assert.equal(new PhoneStore(storage).get().content.conversations.messages[0].messages[0].text,'测试短信');
});
test('SMS migration only seeds an empty legacy inbox once',()=>{
 const {store,storage}=setup();
 const old=structuredClone(store.get());old.content.conversations.messages=[];delete old.content.smsSeedVersion;storage.setItem(KEY,JSON.stringify(old));
 const migrated=new PhoneStore(storage);
 assert.equal(migrated.get().content.conversations.messages.length,3);
 migrated.update(s=>s.content.conversations.messages=[]);
 assert.equal(new PhoneStore(storage).get().content.conversations.messages.length,0);
});
