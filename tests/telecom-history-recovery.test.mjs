import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {defaultPhoneData,ensurePhoneData} from '../src/services/phone-data.js';
import {restorePreviousSMSHistory} from '../src/services/story55/telecom-history.js';
import {hydrateBuiltInPresets,loadCampaignSMS} from '../src/story/presets/catalog.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {render as smsUI} from '../src/apps/messages/index.js';
import {render as phoneUI} from '../src/apps/phone/replica.js';

const fetcher=async url=>{try{return {ok:true,json:async()=>JSON.parse(await readFile(new URL(url),'utf8'))};}catch{return {ok:false}}};
const storeFor=s=>({get:()=>s,update:fn=>fn(s)});

test('a new Story55 game retains all five shipped Macau call records across initialization',()=>{
 const s=initialState();
 assert.equal(s.content.phone.calls.length,5);
 assert.equal(s.content.phone.calls.every(x=>x.authored===true),true);
 activateStory55(s);
 assert.deepEqual(s.content.phone.calls.map(x=>x.id),defaultPhoneData().calls.map(x=>x.id));
 assert.match(phoneUI(storeFor(s)),/\+853 6XXX 0741/);
 assert.match(phoneUI(storeFor(s)),/\+853 6XXX 0509/);
 s.content.phone.calls.push({id:'private-call',name:'玩家新增通话',number:'123',day:'昨天'});
 activateStory55(s);
 assert.equal(s.content.phone.calls.length,5,'new run clears runtime calls only');
});

test('existing old save with accidentally cleared calls recovers once; edits and future deletion persist',()=>{
 const original=initialState();
 original.content.phone.calls=[];
 delete original.content.phone.historySeedVersion;
 const memory=new Map([[KEY,JSON.stringify(original)]]);
 const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const loaded=new PhoneStore(storage);
 assert.equal(loaded.get().content.phone.calls.length,5);
 assert.equal(loaded.get().content.phone.historySeedVersion,1);
 loaded.update(s=>{
  s.content.phone.calls[0].number='+853 6XXX 9999';
  s.content.phone.calls=s.content.phone.calls.filter(x=>x.id!=='macau-call-2');
  s.content.phone.calls.push({id:'custom',number:'+853 6000 1111',place:'澳门',day:'今天'});
 });
 const again=new PhoneStore(storage);
 assert.equal(again.get().content.phone.calls.length,5);
 assert.equal(again.get().content.phone.calls.find(x=>x.id==='macau-call-1').number,'+853 6XXX 9999');
 assert.equal(again.get().content.phone.calls.some(x=>x.id==='macau-call-2'),false);
 assert.equal(again.get().content.phone.calls.some(x=>x.id==='custom'),true);
 assert.equal(ensurePhoneData(again.get()),false);
});

test('custom old pre-D01 SMS migrate additively and never import the obsolete post-D01 story',()=>{
 const s=activateStory55(initialState());
 const old={content:{conversations:{messages:[
  {id:'old-custom',name:'澳门短信',messages:[
   {id:'old-sms',from:'bank',text:'2024年保存的短信',time:'10:00',sentDate:'2024-03-12'},
   {id:'old-future',from:'bank',text:'旧版90天主线',time:'10:00',sentDate:'2025-06-02'}
  ]}
 ]}}};
 const storage={getItem:k=>k==='ximeng-phone-v2'?JSON.stringify(old):null};
 assert.equal(restorePreviousSMSHistory(storage,s),true);
 const group=s.content.conversations.messages.find(x=>x.id==='old-custom');
 assert.ok(group.messages.some(x=>x.id==='old-sms'));
 assert.equal(group.messages.some(x=>x.id==='old-future'),false);
 group.messages[0].text='我的本地修改';
 assert.equal(restorePreviousSMSHistory(storage,s),false);
 assert.equal(group.messages[0].text,'我的本地修改');
});

test('D01 SMS appear even if all the WeChat history file requests fail',async()=>{
 const s=activateStory55(initialState());
 const smsOnly=async url=>{
  if(!String(url).includes('manifest.json')&&!String(url).includes('/messages.json'))return {ok:false};
  return fetcher(url);
 };
 await hydrateBuiltInPresets(storeFor(s),smsOnly);
 assert.equal(s.content.historicalWechat?.loaded,undefined);
 assert.equal(s.content.historicalSMS?.loaded,true);
 assert.equal(s.content.historicalSMS?.count,7);
 assert.equal(s.content.conversations.messages.length>=4,true);
 assert.match(smsUI({store:storeFor(s)},{route:'/',params:{}}),/司警|中國銀行|SJM|澳娱/);
});

test('one bad later-day SMS file cannot erase the pre-D01 archive',async()=>{
 const withOneBad=async url=>String(url).includes('D004/messages.json')?{ok:false}:fetcher(url);
 const packs=await loadCampaignSMS(withOneBad);
 assert.equal(packs.some(p=>p.day===1),true);
 assert.equal(packs.some(p=>p.day===4),false);
 const s=activateStory55(initialState());
 applyPresetImport(s,packs);
 assert.equal(s.content.conversations.messages.reduce((n,c)=>n+c.messages.filter(x=>x.id.startsWith('sms-user-')&&x.sentDate<'2025-05-19').length,0),7);
});

test('an intentionally deleted SMS thread is not recreated when presets load again',async()=>{
 const packs=await loadCampaignSMS(fetcher),s=activateStory55(initialState());
 s.content.deletedSmsConversationIds=['sms-85388895566'];
 applyPresetImport(s,packs);
 assert.equal(s.content.conversations.messages.some(c=>c.id==='sms-85388895566'),false);
 assert.equal(s.content.conversations.messages.some(c=>c.id==='sms-sjm'),true);
 applyPresetImport(s,packs);
 assert.equal(s.content.conversations.messages.some(c=>c.id==='sms-85388895566'),false);
});
