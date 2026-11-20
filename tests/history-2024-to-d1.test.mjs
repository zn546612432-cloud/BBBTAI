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
 assert.ok(all.every(m=>m.appearance==='immediate'&&m.sentDate<='2025-05-13'));
 assert.equal(all.map(m=>m.sentDate).sort().at(-1),'2025-05-12');
 assert.equal(all.map(m=>m.sentDate).sort()[0],'2024-10-12');
 packs.forEach(pack=>assert.equal(parsePresetPayload(pack).length,1));
 assert.equal(exact('group','2024-12-24','圣诞夜惊魂！！！！').length,1);
 assert.equal(exact('hufeng','2025-05-13','蒙哥，我那台电脑开机只有黑屏了……').length,0);
 assert.equal(exact('group','2024-10-12','回来就来工房，门口那台电脑又蓝屏').length,0);
 assert.equal(exact('group','2024-10-12','你就不能先关心一下我吗？？？').length,1);
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


test('approved private-chat revisions replace only retired authored history, including old saves',()=>{
 const s=initialState();
 const old=[{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250109-001","from":"小辛","text":"蒙哥你说我练德语怎么记不住这些词"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250109-002","from":"me","text":"你上次不是说自己语言天赋一流"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250109-003","from":"小辛","text":"天才也是需要一个适应期的"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250109-004","from":"me","text":"适应了半年了"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250109-005","from":"小辛","text":"哈哈哈哈哈哈你说话好伤人"},{"conversationId":"awei","id":"wx-awei-20250219-001","from":"阿威","text":"蒙哥，上次你说的监控延迟还没好？"},{"conversationId":"awei","id":"wx-awei-20250219-002","from":"me","text":"好了，昨天改完了"},{"conversationId":"awei","id":"wx-awei-20250219-003","from":"阿威","text":"辛苦了"},{"conversationId":"awei","id":"wx-awei-20250219-004","from":"me","text":"记得请我喝奶茶"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250323-001","from":"小辛","text":"蒙哥帮我看个视频"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250323-002","from":"me","text":"你自己看"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250323-003","from":"小辛","text":"是我昨天训练那段！我觉得自己超帅"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250323-004","from":"me","text":"看到你摔倒的部分了"},{"conversationId":"xiaoxin","id":"wx-xiaoxin-20250323-005","from":"小辛","text":"那个不算啊啊啊啊"}];
 for(const row of old){
  const chat=s.content.conversations.wechat.find(c=>c.id===row.conversationId);
  chat.messages.push({id:row.id,from:row.from,text:row.text,storyImported:true,authored:true,sentDate:row.id.includes('20250109')?'2025-01-09':row.id.includes('20250219')?'2025-02-19':'2025-03-23',time:'12:00',day:1,kind:'text'});
 }
 const xin=s.content.conversations.wechat.find(c=>c.id==='xiaoxin');
 xin.messages.push({id:'player-kept',from:'me',text:'玩家发言',actual:true,time:'20:30',day:1});
 applyPresetImport(s,packs);applyPresetImport(s,packs);
 for(const row of old)assert.ok(!s.content.conversations.wechat.find(c=>c.id===row.conversationId).messages.some(m=>m.id===row.id));
 const expected=[{"cid":"xiaoxin","date":"2025-01-09","lines":[["小辛","累死了"],["小辛","德语的单词怎么那么难记"],["小辛","昨天背的今天就忘了"],["小辛","特别是一个桌子还要分阴性阳性"],["me","事已至此下一个多邻国吧"],["小辛","服了"],["小辛","不学了"]]},{"cid":"awei","date":"2025-02-19","lines":[["阿威","二哥监控现在能用了吗？"],["me","昨天就弄好了"],["me","你试一下"],["阿威","行，我晚点过去"],["阿威","OK"]]},{"cid":"xiaoxin","date":"2025-03-23","lines":[]}];
 for(const e of expected){
  const thread=s.content.conversations.wechat.find(c=>c.id===e.cid);
  assert.deepEqual(thread.messages.filter(m=>m.sentDate===e.date).map(m=>[m.from,m.text]),e.lines);
 }
 assert.equal(xin.messages.filter(m=>m.id==='player-kept').length,1);
});
