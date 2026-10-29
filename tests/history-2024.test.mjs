import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {exportPresetPacks} from '../src/story/presets/io/export.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {render as smsRender} from '../src/apps/messages/index.js';
import {render as nativeSmsRender} from '../src/apps/messages/replica.js';
import {render as browserRender,handle as browserHandle} from '../src/apps/browser/index.js';
import {initializeMirage} from '../src/apps/mirage/data.js';
import {restartState} from '../src/system/restart/index.js';

const fixture=filename=>JSON.parse(readFileSync(new URL('../src/story/presets/days/'+filename,import.meta.url),'utf8'));
const manifest=fixture('manifest.json');
const packs=manifest.files.map(fixture);
const state=()=>{
 const s=initialState();
 applyPresetImport(s,packs);
 s.day=1;s.clock='08:00';
 return s;
};
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const fakeStore=initial=>{let current=initial;return {get:()=>current,update:fn=>{const next=structuredClone(current);fn(next);current=next;}};};

test('2024-03-10 WeChat prehistory is visible at D01, grouped under the original date',()=>{
 const s=state(),group=s.content.conversations.wechat.find(c=>c.id==='group'),wang=s.content.conversations.wechat.find(c=>c.id==='wang');
 assert.equal(group.messages.filter(m=>m.sentDate==='2024-03-10').length,22);
 assert.equal(wang.messages.filter(m=>m.sentDate==='2024-03-10').length,3);
 assert.ok(group.messages.some(m=>m.from==='me'&&m.text.includes('换新手机')));
 assert.ok(group.messages.some(m=>m.from==='仔仔'&&m.text.includes('刷到')));
 assert.equal(visibleMessages(group).length,22);
 assert.equal(visibleMessages(wang).length,3);
 for(const name of ['胡枫','阿威','小辛','仔仔','傅隆生'])assert.ok(s.content.conversations.wechat.some(c=>c.name===name&&c.messages.length===0));
 assert.equal(s.content.conversations.mirage.length,0);
 assert.equal(s.content.conversations.messages.filter(c=>visibleMessages(c).length).length,4);
});

test('13 supplemental SMS and source messages validate, and only D01-D90 records load',()=>{
 assert.equal(packs.length,manifest.files.length);
 packs.forEach(p=>assert.equal(parsePresetPayload(p).length,1));
 const all=packs.filter(p=>p.channel==='messages').flatMap(p=>p.history.flatMap(h=>h.messages));
 assert.equal(all.filter(m=>m.id.startsWith('sms-extra-')).length,13);
 assert.equal(all.filter(m=>m.id.startsWith('sms-user-')).length,14);
 assert.ok(!all.some(m=>m.sentDate==='2025-09-17'));
 for(const p of packs.filter(p=>p.channel==='messages')){
  assert.ok(p.day>=1&&p.day<=90);
  for(const h of p.history){
   if(h.conversationName.startsWith('+'))assert.ok(h.conversationName.startsWith('+853'));
   for(const m of h.messages)assert.equal(m.appearance,p.day===1?undefined:'game-time');
  }
 }
});

test('D04 SMS does not leak early; at 11:22 it arrives with one notice, then survives reload',()=>{
 const store=fakeStore(state()),sender=store.get().content.conversations.messages.find(c=>c.name==='+853 6601 1000');
 assert.ok(sender);
 assert.ok(!visibleMessages(sender).some(m=>m.id==='sms-extra-001'));
 assert.ok(!smsRender({store},{route:'/',params:{}}).includes('本月流動數據用量'));
 store.update(s=>{s.day=4;s.clock='11:21';});
 assert.equal(new MessageDelivery(store).tick().some(m=>m.id==='sms-extra-001'),false);
 store.update(s=>s.clock='11:22');
 const delivery=new MessageDelivery(store);
 assert.equal(delivery.tick().filter(m=>m.id==='sms-extra-001').length,1);
 assert.equal(delivery.tick().filter(m=>m.id==='sms-extra-001').length,0);
 assert.equal(store.get().notifications.filter(n=>n.messageId==='sms-extra-001').length,1);
 assert.ok(visibleMessages(store.get().content.conversations.messages.find(c=>c.name==='+853 6601 1000')).some(m=>m.id==='sms-extra-001'));
 const reset=restartState(store.get());
 assert.equal(reset.content.conversations.messages.find(c=>c.name==='+853 6601 1000').messages.find(m=>m.id==='sms-extra-001').delivery,undefined);
});

test('iPhone SMS list says Macau, never shows future empty sender rows',()=>{
 const store=fakeStore(state());
 const atD01=nativeSmsRender({store},{route:'/',params:{}});
 assert.equal((atD01.match(/class="ios-msg-row"/g)||[]).length,4);
 assert.match(atD01,/<b>澳门<\/b>/);
 assert.doesNotMatch(atD01,/<b>内地<\/b>|SFEXPO|CAINIAO/);
 store.update(s=>{s.day=12;s.clock='09:16';});
 new MessageDelivery(store).tick();
 assert.doesNotMatch(nativeSmsRender({store},{route:'/',params:{}}),/SFEXPO/);
 store.update(s=>s.clock='09:17');
 new MessageDelivery(store).tick();
 const after=nativeSmsRender({store},{route:'/',params:{}});
 assert.match(after,/SFEXPO/);
 assert.match(after,/由於地址資料不完整/);
 assert.doesNotMatch(after,/<b>内地<\/b>|CAINIAO/);
});

test('one-click export includes manually authored messages, not player replies',()=>{
 const s=state();
 const c=s.content.conversations.wechat.find(c=>c.id==='wang');
 c.messages.push({id:'my-handwritten-line',from:'wang',text:'原来你还留着这个号码。',time:'09:00',sentDate:'2024-04-01',authored:true,kind:'text'});
 c.messages.push({id:'player-live-line',from:'me',text:'不可导出的真实玩家消息',time:'09:01',actual:true});
 const exported=exportPresetPacks(s);
 const d01=exported.find(p=>p.day===1&&p.channel==='wechat');
 assert.ok(d01.history.flatMap(h=>h.messages).some(m=>m.id==='my-handwritten-line'));
 assert.ok(!JSON.stringify(exported).includes('player-live-line'));
 assert.ok(exported.some(p=>p.channel==='messages'&&p.day===4));
});

test('Safari runs privately and uses the five requested saved sites',()=>{
 const c={store:fakeStore(state()),router:{open(){}},refresh(){}};
 const home=browserRender(c,{route:'/',params:{}});
 for(const name of ['GitHub','ChatGPT','临时邮箱','金光票务','网络服务'])assert.ok(home.includes(name));
 for(const id of ['github','chatgpt','tempmail','ticketing','network']){
  const html=browserRender(c,{route:'/page',params:{page:id}});
  assert.ok(html.includes(`/apps/browser/snapshots/${id}.png`),`${id} must show a bundled real webpage screenshot`);
  assert.doesNotMatch(html,/网页快照 · 实际网站的静态画面|在浏览器打开官网/);
  assert.doesNotMatch(html,/票务服务书签（网址待核实）|个人收藏 \/ PRIVATE BROWSING/);
  const png=readFileSync(new URL(`../public/apps/browser/snapshots/${id}.png`,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(png.byteLength>20_000,`${id} screenshot was not bundled`);
 }
 browserHandle('browser-open',{dataset:{page:'github'}},c,{route:'/',params:{}});
 assert.deepEqual(c.store.get().browserData.history,[]);
 assert.match(browserRender(c,{route:'/history',params:{}}),/暂无浏览记录/);
});

test('MIRAGE first login does not generate contacts, and old filler is cleaned safely',()=>{
 const storage=memory(),store=new PhoneStore(storage);
 initializeMirage(store);
 assert.equal(store.get().content.conversations.mirage.length,0);
 const old=structuredClone(store.get());
 old.content.conversations.mirage=[{id:'mc-0',name:'Isolde Mirage',messages:[]},{id:'my-contact',name:'自定义',messages:[],authored:true}];
 storage.setItem(KEY,JSON.stringify(old));
 const fresh=new PhoneStore(storage);
 assert.deepEqual(fresh.get().content.conversations.mirage.map(c=>c.name),['自定义']);
});
