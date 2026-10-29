import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PhoneStore,KEY,initialState} from '../src/services/storage.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {dueProactiveRule,deliverRule,deliverMissedScheduled,matchReplyRule,PresetConversationEngine} from '../src/story/presets/engine.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {tickWorld,TYPING_MINUTES_PER_MS} from '../src/system/time/clock.js';
import {presetEditor} from '../src/editor/presets/index.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const sample=()=>{
 const store=new PhoneStore(memory());
 const files=['D057/wechat.json','D058/wechat.json'];
 const packs=files.map(file=>JSON.parse(readFileSync(new URL(`../src/story/presets/days/${file}`,import.meta.url),'utf8')));
 store.update(s=>applyPresetImport(s,packs));
 return store;
};

test('03:00 schedule arrives once and disambiguates night versus morning',()=>{
 const store=sample();store.update(s=>{s.day=57;s.clock='03:00';});
 const event=dueProactiveRule(store.get());assert.equal(event?.id,'wang-d57-0300');
 store.update(s=>deliverRule(s,event));
 assert.deepEqual(store.get().content.conversations.wechat[0].messages.slice(-2).map(m=>m.text),['我明天要出去一趟。','你睡了吗？']);
 assert.equal(dueProactiveRule(store.get()),null);
 const context={day:57,clock:'03:15',channel:'wechat',conversationId:'wang',messages:['哥。','喜欢你！']};
 const night=matchReplyRule(store.get(),context).rule;
 assert.equal(night?.messages[0],'你怎么还没睡？');
 store.update(s=>deliverRule(s,night));
 assert.equal(matchReplyRule(store.get(),{...context,clock:'08:30'}).rule,null);
});

test('NPC proactive messages become unread until the actual chat is opened',()=>{
 const store=sample();store.update(s=>{s.day=57;s.clock='03:00';deliverRule(s,dueProactiveRule(s));});
 const s=store.get(),c=s.content.conversations.wechat.find(c=>c.id==='wang');
 assert.equal(c.unread,2);
 assert.equal(s.notifications.filter(n=>n.conversationId==='wang').length,1);
 assert.match(renderWeChatHome(s,'/'),/wx-chat-unread[^>]*>2<\/span>/);
 assert.match(renderWeChatHome(s,'/'),/wx-unread-badge/);
 store.update(s=>readConversationInState(s,'wechat','wang'));
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='wang').unread,0);
 assert.equal(store.get().notifications.filter(n=>n.conversationId==='wang').length,0);
 assert.doesNotMatch(renderWeChatHome(store.get(),'/'),/wx-chat-unread/);
});

test('an existing saved notification restores an old missing unread dot without re-sending',()=>{
 const storage=memory(),s=initialState();
 s.content.conversations.wechat.find(c=>c.id==='wang').messages.push({id:'preset-wang-d57-0300-57-0',from:'wang',text:'我明天要出去一趟。',time:'03:00',day:57,actual:true});
 s.notifications.push({id:'preset-notice-wang-d57-0300-57',title:'熙旺',body:'你睡了吗？',link:{appId:'wechat',route:'/chat/wang',params:{}}});
 storage.setItem(KEY,JSON.stringify(s));
 const store=new PhoneStore(storage);
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='wang').unread,1);
 assert.equal(store.get().notifications.length,1);
 store.update(state=>readConversationInState(state,'wechat','wang'));
 assert.equal(new PhoneStore(storage).get().content.conversations.wechat.find(c=>c.id==='wang').unread,0);
});

test('reply keywords can be valid every day at any hour or within an inclusive day range',()=>{
 const store=sample();store.update(s=>{
  const base=s.storyPresets.rules.find(r=>r.id==='wang-d58-fish');
  s.storyPresets.rules=[
   {...base,id:'always-food',day:10,dayScope:'any',requiresFlag:'',group:'',once:true,keywords:['西湖醋鱼'],messages:['好，买鱼。']},
   {...base,id:'week-food',day:15,dayScope:'range',startDay:15,endDay:21,requiresFlag:'',group:'',once:true,priority:120,keywords:['糖醋排骨'],from:'00:00',to:'23:59',messages:['带排骨。']}
  ];
 });
 const query=(day,clock,text)=>matchReplyRule(store.get(),{day,clock,channel:'wechat',conversationId:'wang',messages:[text]}).rule?.id;
 assert.equal(query(1,'00:00','西湖醋鱼'),'always-food');
 assert.equal(query(90,'23:59','想吃西湖醋鱼'),'always-food');
 assert.equal(query(14,'16:30','糖醋排骨'),undefined);
 assert.equal(query(15,'00:00','糖醋排骨'),'week-food');
 assert.equal(query(21,'23:59','糖醋排骨'),'week-food');
 assert.equal(query(22,'12:00','糖醋排骨'),undefined);
 const pack={format:'ximeng-preset-day-v1',day:10,channel:'wechat',label:'全年可用',history:[],rules:[store.get().storyPresets.rules[0]]};
 assert.equal(parsePresetPayload(pack)[0].rules[0].dayScope,'any');
});

test('multi-day scheduled messages catch up chronologically and preserve unread badges',()=>{
 const store=sample();store.update(s=>{
  const base=s.storyPresets.rules.find(r=>r.id==='wang-d57-0300');
  s.storyPresets.rules=[{...base,id:'three-day-morning',day:40,dayScope:'range',startDay:40,endDay:42,from:'09:00',to:'09:30',once:false,messages:['早上好。']}];
  s.day=43;s.clock='08:00';
  assert.deepEqual(deliverMissedScheduled(s,{day:39,clock:'23:00'}),['three-day-morning','three-day-morning','three-day-morning']);
 });
 const s=store.get(),c=s.content.conversations.wechat.find(c=>c.id==='wang');
 assert.deepEqual(c.messages.filter(m=>m.id.startsWith('preset-three-day-morning')).map(m=>m.day),[40,41,42]);
 assert.equal(c.unread,3);
 assert.equal(s.notifications.filter(n=>n.conversationId==='wang').length,3);
 store.update(s=>assert.deepEqual(deliverMissedScheduled(s,{day:39,clock:'23:00'}),[]));
});

test('developer jumping D01 → D90 backfills D57 without rewriting the current game date',()=>{
 const store=sample(),start={day:1,clock:'08:00'};
 store.update(s=>{s.day=90;s.clock='19:30';assert.deepEqual(deliverMissedScheduled(s,start),['wang-d57-0300']);});
 const s=store.get(),messages=s.content.conversations.wechat.find(c=>c.id==='wang').messages;
 assert.deepEqual(messages.slice(-2).map(m=>[m.day,m.time,m.sentDate]),[[57,'03:00','2025-07-14'],[57,'03:00','2025-07-14']]);
 assert.deepEqual(s.events.filter(e=>e.ruleId==='wang-d57-0300').map(e=>[e.day,e.clock]),[[57,'03:00']]);
 assert.equal(s.day,90);assert.equal(s.clock,'19:30');
 assert.equal(s.storyPresets.usedIds.filter(id=>id==='wang-d57-0300').length,1);
 assert.equal(s.storyPresets.usedIds.includes('wang-d58-afternoon'),false);
 store.update(next=>assert.deepEqual(deliverMissedScheduled(next,start),[]));
});

test('the engine reconciles a skipped D57 window and preserves conditional D58 silence',()=>{
 const store=sample(),engine=new PresetConversationEngine(store);
 store.update(s=>{s.day=57;s.clock='08:40';});engine.tick();
 assert.equal(store.get().events.filter(e=>e.ruleId==='wang-d57-0300').length,1);
 store.update(s=>{s.day=90;s.clock='12:00';});engine.tick();engine.tick();
 assert.equal(store.get().events.filter(e=>e.type==='story_proactive').length,1);
 engine.dispose();
});

test('morning response and conditional afternoon reply match authored time and keywords',()=>{
 const store=sample();store.update(s=>{s.day=57;s.clock='03:00';deliverRule(s,dueProactiveRule(s));});
 assert.equal(matchReplyRule(store.get(),{day:57,clock:'08:15',channel:'wechat',conversationId:'wang',messages:['早安']}).rule?.messages[0],'你醒了呀。');
 store.update(s=>{s.day=58;s.clock='16:30';});
 assert.equal(dueProactiveRule(store.get()),null);
 for(const message of ['哥。','今天想吃饭。','你回来了吗？'])sendMessage(store,{channel:'wechat',conversationId:'wang',text:message});
 const afternoon=dueProactiveRule(store.get());assert.equal(afternoon?.id,'wang-d58-afternoon');
 store.update(s=>deliverRule(s,afternoon));
 assert.equal(matchReplyRule(store.get(),{day:58,clock:'17:00',channel:'wechat',conversationId:'wang',messages:['西湖醋鱼！']}).rule?.id,'wang-d58-fish');
});

test('continuous messages trigger only one reply after latest message debounce',async()=>{
 const store=sample();store.update(s=>{s.day=57;s.clock='03:00';deliverRule(s,dueProactiveRule(s));s.clock='03:11';});
 const engine=new PresetConversationEngine(store,{settleMs:45});
 sendMessage(store,{channel:'wechat',conversationId:'wang',text:'啊。'});engine.onOutgoing('wechat','wang');
 await new Promise(resolve=>setTimeout(resolve,25));
 sendMessage(store,{channel:'wechat',conversationId:'wang',text:'哥，喜欢你！'});engine.onOutgoing('wechat','wang');
 await new Promise(resolve=>setTimeout(resolve,65));engine.dispose();
 assert.equal(store.get().events.filter(e=>e.type==='story_reply').length,1);
 assert.equal(store.get().content.conversations.wechat[0].messages.at(-1).text,'你怎么还没睡？');
});

test('typing speed stays two game minutes per real minute even while charging',()=>{
 assert.equal(TYPING_MINUTES_PER_MS*60000,2);
 const store=sample();store.update(s=>{s.day=57;s.clock='10:00';s.powerMode='charging';tickWorld(s,60000,{focused:true});});
 assert.equal(store.get().clock,'10:02');
});

test('developer editor exposes day, rule, simulation and import/export controls',()=>{
 const s=sample().get();let html=presetEditor(s);
 for(const part of ['预设回复','主动消息','模拟发送','导入 JSON','一键导出全部聊天预设'])assert.ok(html.includes(part),part);
 s.editor.presetId='wang-d57-night-answer';html=presetEditor(s);assert.ok(html.includes('data-preset-field="messages"'));
});
