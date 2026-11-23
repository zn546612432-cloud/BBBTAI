import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {registry} from '../src/system/registry.js';
import * as phone from '../src/apps/phone/replica.js';
import * as messages from '../src/apps/messages/replica.js';
import * as originalMessages from '../src/apps/messages/index.js';
import * as weather from '../src/apps/weather/replica.js';
import * as editor from '../src/editor/index.js';
import {addTestSMS} from './fixture-chat.mjs';

function setup(){
 const data=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const store=new PhoneStore(storage);store.update(addTestSMS);return {store,storage};
}

test('native phone replica has a functional 12-key dialer and reference-style contacts',()=>{
 assert.equal(registry.get('phone'),phone);
 let updates=0;const ctx={refresh:()=>updates++,toast:()=>{}};
 phone.handle('phone-tab',{dataset:{tab:'keypad'}},ctx);
 let html=phone.render();
 assert.equal((html.match(/data-action="phone-digit"/g)||[]).length,12);
 assert.match(html,/ios-digit-grid/);
 assert.match(html,/ios-green-call/);
 phone.handle('phone-digit',{dataset:{digit:'8'}},ctx);
 assert.match(phone.render(),/ios-entered-digits">8</);
 phone.handle('phone-tab',{dataset:{tab:'contacts'}},ctx);
 html=phone.render();
 assert.match(html,/ios-contact-toolbar/);
 assert.match(html,/联系人/);
 assert.match(html,/ios-alpha-rail/);
 assert.ok(updates>=3);
});

test('native Messages replica keeps conversations and real SMS form',()=>{
 const {store}=setup(),ctx={store};
 assert.equal(registry.get('messages'),originalMessages);
 let html=messages.render(ctx,{route:'/',params:{}});
 assert.match(html,/ios-msg-floating-search/);
 assert.match(html,/ios-msg-row/);
 assert.match(html,/\+853 6601 1000/);
 const id=store.get().content.conversations.messages[0].id;
 html=messages.render(ctx,{route:'/chat/'+id,params:{}});
 assert.match(html,/ios-chat-name/);
 assert.match(html,/ios-chat-bubble/);
 assert.match(html,/data-form="send-chat"/);
 assert.match(html,/data-channel="messages"/);
});

test('Weather displays a fixed read-only city list, ignoring historical hidden-city preferences',()=>{
 const {store,storage}=setup();
 assert.equal(registry.get('weather'),weather);
 store.update(s=>{s.content.weatherHiddenCities=['paris'];});
 const html=weather.render({store},{route:'/',params:{}});
 assert.deepEqual(weather.visibleWeatherCities(store.get()).map(x=>x.id),['macau','london','paris']);
 assert.match(html,/巴黎/);
 assert.doesNotMatch(html,/weather-swipe-row|weather-delete-button|weather-edit|weather-foot/);
 assert.deepEqual(weather.visibleWeatherCities(new PhoneStore(storage).get()).map(x=>x.id),['macau','london','paris']);
});

test('Weather exposes no city-delete or manual-edit affordances',()=>{
 const {store}=setup();
 const list=weather.render({store},{route:'/',params:{}});
 const detail=weather.render({store},{route:'/city/london',params:{}});
 assert.doesNotMatch(list,/weather-delete|weather-edit|•••/);
 assert.doesNotMatch(detail,/weather-edit|weather-history-credit/);
});

test('phone book contains only the seven authored contacts and Macau identity',()=>{
 const {store,storage}=setup(),ctx={store,refresh:()=>{},toast:()=>{}};
 phone.handle('phone-tab',{dataset:{tab:'contacts'}},ctx);
 const html=phone.render({store}),people=store.get().content.phone.contacts;
 assert.deepEqual(people.map(p=>p.name),['哥','口腔前台','傅隆生','阿威','小辛','仔仔','胡枫']);
 assert.match(html,/熙蒙/);assert.match(html,/\+853 6935 0816/);
 assert.doesNotMatch(html,/张娜|阿飞定餐总部|阿梅/);
 assert.ok(store.get().content.phone.calls.every(call=>call.number.startsWith('+853')&&call.place==='澳门'));
 store.update(s=>{s.content.phone.contacts[0].name='哥哥';s.content.phone.contacts[0].number='+853 6000 1234';});
 assert.match(phone.render({store}),/哥哥/);
 assert.equal(new PhoneStore(storage).get().content.phone.contacts[0].number,'+853 6000 1234');
});

test('older saved games acquire a phone book without overwriting their chats',()=>{
 const {store,storage}=setup(),old=structuredClone(store.get());
 delete old.content.phone;old.content.conversations.messages[0].name='保留短信';
 store.replace(old);
 assert.equal(store.get().content.phone.contacts.length,7);
 assert.equal(new PhoneStore(storage).get().content.conversations.messages[0].name,'保留短信');
});

test('developer phone editor exposes forms and deletes only the selected records',()=>{
 const {store}=setup(),ctx={store,toast:()=>{}};
 let html=editor.render({store},{route:'/phone'});
 assert.match(html,/电话编辑/);assert.match(html,/data-form="phone-add-contact"/);
 assert.match(html,/data-form="phone-edit-call"/);assert.match(html,/data-form="phone-self"/);
 editor.handle('delete-phone-contact',{dataset:{id:'contact-dentist'}},ctx);
 assert.ok(!store.get().content.phone.contacts.some(p=>p.id==='contact-dentist'));
 editor.handle('delete-phone-call',{dataset:{id:'macau-call-2'}},ctx);
 assert.ok(!store.get().content.phone.calls.some(call=>call.id==='macau-call-2'));
 assert.equal(store.get().content.phone.contacts.length,6);
 assert.equal(store.get().content.phone.calls.length,4);
});

test('developer phone forms add and edit people, calls, and the Macau owner card',()=>{
 const {store,storage}=setup(),ctx={store,toast:()=>{}},NativeFormData=globalThis.FormData;
 globalThis.FormData=class {constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}has(key){return Object.hasOwn(this.values,key);}};
 const save=(name,values)=>editor.submit({dataset:{form:name},values},ctx);
 try{
  save('phone-self',{name:'熙蒙',number:'+853 6234 5678',region:'澳门'});
  save('phone-add-contact',{name:'新增联系人',number:'+853 6123 4567'});
  const person=store.get().content.phone.contacts.at(-1);
  save('phone-edit-contact',{id:person.id,name:'新昵称',number:'+853 6987 6543'});
  save('phone-add-call',{name:'哥',number:'+853 6888 9999',place:'澳门',day:'今天 20:10',missed:'on'});
  const call=store.get().content.phone.calls[0];
  save('phone-edit-call',{id:call.id,name:'哥',number:'+853 6777 9999',place:'澳门',day:'昨天',missed:'on'});
  const reloaded=new PhoneStore(storage).get();
  assert.equal(reloaded.content.phone.self.number,'+853 6234 5678');
  assert.equal(reloaded.content.phone.contacts.at(-1).name,'新昵称');
  assert.equal(reloaded.content.phone.calls[0].number,'+853 6777 9999');
  assert.equal(reloaded.content.phone.calls[0].missed,true);
 }finally{globalThis.FormData=NativeFormData;}
});

test('SMS selected conversations show a real delete action with confirmation and persistence',()=>{
 const {store,storage}=setup(),id=store.get().content.conversations.messages[0].id;
 const ctx={store,refresh:()=>{},toast:()=>{}};
 messages.handle('sms-select',{dataset:{}},ctx);
 let html=messages.render({store},{route:'/',params:{}});
 assert.match(html,/删除选中的短信/);assert.match(html,/disabled aria-label="删除选中的短信"/);
 messages.handle('sms-pick',{dataset:{id}},ctx);
 messages.handle('sms-delete',{dataset:{}},ctx);
 html=messages.render({store},{route:'/',params:{}});
 assert.match(html,/删除选中的 1 条信息/);
 messages.handle('sms-cancel-delete',{dataset:{}},ctx);
 assert.equal(store.get().content.conversations.messages.length,3);
 messages.handle('sms-delete',{dataset:{}},ctx);
 messages.handle('sms-confirm-delete',{dataset:{}},ctx);
 assert.ok(!store.get().content.conversations.messages.some(c=>c.id===id));
 assert.equal(new PhoneStore(storage).get().content.conversations.messages.length,2);
 assert.doesNotMatch(messages.render({store},{route:'/',params:{}}),/\+853 6601 1000/);
});
