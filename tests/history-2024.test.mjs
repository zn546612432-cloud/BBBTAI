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
import {renderWeChatChat,pictureSrc} from '../src/apps/wechat/components/chat-view.js';

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
 assert.equal(visibleMessages(group).filter(m=>m.sentDate==='2024-03-10').length,22);
 assert.equal(visibleMessages(wang).filter(m=>m.sentDate==='2024-03-10').length,3);
 for(const name of ['阿威','小辛','仔仔','傅隆生'])assert.ok(s.content.conversations.wechat.some(c=>c.name===name));
 assert.ok(s.content.conversations.wechat.find(c=>c.id==='xiaoxin').messages.length>30);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='hufeng').messages.length,6);
 assert.equal(s.content.conversations.mirage.length,0);
 assert.equal(s.content.conversations.messages.filter(c=>visibleMessages(c).length).length,4);
});

test('2024-03-11 group and Wang private history are present in correct order',()=>{
 const s=state(),group=s.content.conversations.wechat.find(c=>c.id==='group'),wang=s.content.conversations.wechat.find(c=>c.id==='wang');
 const dated=chat=>chat.messages.filter(m=>m.sentDate==='2024-03-11');
 assert.equal(dated(group).length,18);
 assert.equal(dated(wang).length,5);
 assert.ok(dated(group).every(m=>m.storyImported));
 assert.deepEqual(dated(group).map(m=>m.time).slice(0,4),['11:45','11:46','11:46','11:47']);
 assert.deepEqual(dated(wang).map(m=>m.time),['20:31','20:57','20:58','22:45','23:40']);
 assert.ok(group.messages.indexOf(dated(group)[0])>group.messages.findIndex(m=>m.sentDate==='2024-03-10'));
 assert.match(renderWeChatChat(s,'group'),/2024年3月11日 11:45/);
});

test('2024-03-12 group, Wang, and Hufeng private messages include two local stickers',()=>{
 const s=state(),chat=id=>s.content.conversations.wechat.find(c=>c.id===id);
 const dated=id=>chat(id).messages.filter(m=>m.sentDate==='2024-03-12');
 assert.equal(dated('group').length,19);
 assert.equal(dated('wang').length,2);
 assert.equal(dated('hufeng').length,2);
 assert.deepEqual(dated('group').filter(m=>m.kind==='image').map(m=>m.text),[
  '/apps/wechat/stickers/dog.svg','/apps/wechat/stickers/whitecat.webp'
 ]);
 assert.match(renderWeChatChat(s,'group'),/stickers\/dog.svg/);
 const pack=fixture('D001/wechat-20240312.json'),count=chat('group').messages.length;
 applyPresetImport(s,pack);
 assert.equal(chat('group').messages.length,count);
 const exported=exportPresetPacks(s,{day:1});
 const rows=exported.find(p=>p.channel==='wechat').history.find(h=>h.conversationId==='group').messages;
 assert.equal(rows.filter(m=>m.kind==='image').length,2);
 assert.ok(readFileSync(new URL('../public/apps/wechat/stickers/whitecat.webp',import.meta.url)).length>1500);
 assert.equal(pictureSrc('/apps/wechat/stickers/dog.svg','https://example.org/BBBTAI/releases/v1/src/apps/wechat/components/chat-view.js'),
  'https://example.org/BBBTAI/releases/v1/apps/wechat/stickers/dog.svg');
});

test('new March 11–12 history fills an existing save without erasing player chat or shifting later months',()=>{
 const s=initialState(),already=[fixture('D001/wechat.json'),fixture('D001/wechat-history-2024-03.json')];
 applyPresetImport(s,already);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'my-reply',from:'me',text:'我写的话还在',time:'23:00',actual:true});
 applyPresetImport(s,[fixture('D001/wechat-20240311.json'),fixture('D001/wechat-20240312.json')]);
 assert.ok(group.messages.some(m=>m.id==='my-reply'&&m.text==='我写的话还在'));
 const historical=group.messages.filter(m=>m.storyImported&&m.sentDate);
 assert.deepEqual(historical.map(m=>m.sentDate),[...historical.map(m=>m.sentDate)].sort());
 assert.equal(new Set(group.messages.map(m=>m.id)).size,group.messages.length);
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
