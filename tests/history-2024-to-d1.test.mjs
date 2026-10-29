import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';

const prefix='../src/story/presets/days/D001/';
const months=['2024-10-extra','2024-11','2024-12','2025-01','2025-02','2025-03','2025-04','2025-05'];
const file=name=>JSON.parse(readFileSync(new URL(prefix+name,import.meta.url),'utf8'));
const packs=months.map(m=>file('wechat-history-'+m+'.json'));
const all=packs.flatMap(pack=>pack.history.flatMap(h=>h.messages.map(m=>({...m,chat:h.conversationId}))));
const exact=(chat,date,text)=>all.filter(m=>m.chat===chat&&m.sentDate===date&&m.text===text);

test('October through D1-7 history uses valid unique IDs and stays in the past',()=>{
 const ids=all.map(m=>m.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(all.length>200,`expected substantial month-by-month history, got ${all.length}`);
 assert.ok(all.every(m=>m.appearance==='immediate'&&m.sentDate<='2025-05-12'));
 assert.equal(all.map(m=>m.sentDate).sort().at(-1),'2025-05-12');
 assert.equal(all.map(m=>m.sentDate).sort()[0],'2024-10-12');
 packs.forEach(pack=>assert.equal(parsePresetPayload(pack).length,1));
 assert.equal(exact('group','2024-12-24','圣诞夜惊魂！！！！').length,1);
 assert.equal(exact('wang','2025-01-21','澳大利亚').length,1);
 const manifest=JSON.parse(readFileSync(new URL(prefix+'../manifest.json',import.meta.url),'utf8'));
 for(const m of months)assert.ok(manifest.files.includes('D001/wechat-history-'+m+'.json'));
});

test('Fu Longsheng chat consists of precisely the one user-specified verification line',()=>{
 const messages=all.filter(m=>m.chat==='fulongsheng');
 assert.deepEqual(messages.map(({from,text,time,sentDate})=>({from,text,time,sentDate})),[{
  from:'me',text:'我通过了你的朋友验证请求，现在我们可以开始聊天了',time:'14:42',sentDate:'2025-04-01'
 }]);
 const s=initialState();applyPresetImport(s,packs);
 const conversation=s.content.conversations.wechat.find(c=>c.id==='fulongsheng');
 assert.equal(conversation.messages.length,1);
});

test('March 10 user URL replaces placeholder, never opens external links, migrates old saves',()=>{
 const first=file('wechat.json');
 const update=first.history.find(h=>h.conversationId==='group').messages.find(m=>m.id==='wx-group-20240310-019');
 assert.equal(update.text,'https://www.whatyi.con');
 const s=initialState();
 const old=structuredClone(first);
 old.history.find(h=>h.conversationId==='group').messages.find(m=>m.id===update.id).text='【小红书分享链接 · 待补】';
 applyPresetImport(s,old);
 applyPresetImport(s,first);
 const convo=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(convo.messages.find(m=>m.id===update.id).text,'https://www.whatyi.con');
 const html=renderWeChatChat(s,'group');
 assert.match(html,/whatyi\.con/);
 assert.doesNotMatch(html,/href="https:\/\/www\.whatyi\.con/);
 const editorMessage=convo.messages.find(m=>m.id===update.id);
 editorMessage.text='我自己编辑的内容';
 applyPresetImport(s,first);
 assert.equal(editorMessage.text,'我自己编辑的内容');
});

test('historical packs preserve existing player messages and private chats on repeat import',()=>{
 const s=initialState();
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'player-message-may',from:'me',text:'玩家自己的消息',time:'20:30',actual:true});
 applyPresetImport(s,packs);
 applyPresetImport(s,packs);
 assert.equal(group.messages.filter(m=>m.id==='player-message-may').length,1);
 assert.equal(group.messages.filter(m=>m.id==='wx-group-20250512-006').length,1);
 const history=group.messages.filter(m=>m.storyImported);
 assert.deepEqual(history.map(m=>m.sentDate),[...history.map(m=>m.sentDate)].sort());
});
