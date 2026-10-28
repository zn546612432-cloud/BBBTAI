import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PhoneStore} from '../src/services/storage.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {dueProactiveRule,deliverRule,matchReplyRule,PresetConversationEngine} from '../src/story/presets/engine.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
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
 for(const part of ['预设回复','主动消息','模拟发送','导入 JSON','导出全部剧情'])assert.ok(html.includes(part),part);
 s.editor.presetId='wang-d57-night-answer';html=presetEditor(s);assert.ok(html.includes('data-preset-field="messages"'));
});
