import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {exportPresetPacks} from '../src/story/presets/io/export.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';

const parts=['04-extra','06-extra','07','08','09','10'];
const files=parts.map(part=>`D001/wechat-history-2024-${part}.json`);
const packs=files.map(file=>JSON.parse(readFileSync(new URL('../src/story/presets/days/'+file,import.meta.url),'utf8')));
const messages=()=>packs.flatMap(pack=>pack.history.flatMap(chat=>chat.messages.map(message=>({...message,chat:chat.conversationId}))));
const at=(chat,day,text)=>messages().find(m=>m.chat===chat&&m.sentDate==='2024-'+day&&m.text===text);
const time=m=>Date.parse(m.sentDate+'T'+m.time+':00Z');

test('July–October stories and earlier recovery scenes have valid unique historical IDs',()=>{
 const all=messages();
 assert.equal(all.length,156);
 assert.equal(new Set(all.map(m=>m.id)).size,all.length);
 assert.ok(all.every(m=>m.appearance==='immediate'&&m.sentDate.startsWith('2024-')));
 packs.forEach(pack=>assert.equal(parsePresetPayload(pack).length,1));
 assert.ok(at('group','07-20','一到寒暑假澳门人就特别多'));
 assert.ok(at('group','08-21','之前那个卖家被抓了，我在物色新的货源了'));
 assert.ok(at('group','09-10','我们换新据点了，一会发定位给你们，保持联系'));
 assert.ok(at('wang','10-01','其实我是不想待在澳门'));
 assert.ok(at('xiaoxin','07-08','别想，我们应该诈骗别人，而不是让别人诈骗自己'));
});

test('author-defined 30-minute, 3-hour, and 2-hour pauses are preserved',()=>{
 assert.equal(time(at('group','08-30','得带小辛去医生那'))-time(at('group','08-30','现在怎么样了情况')),30*60*1000);
 assert.equal(time(at('group','09-13','先走了'))-time(at('group','09-13','爱你哥')),3*60*60*1000);
 assert.equal(time(at('wang','10-01','群发？'))-time(at('wang','10-01','国庆快乐')),2*60*60*1000);
 assert.ok(time(at('xiaoxin','04-08','旺旺哥好点了吗？他怎么摔成这那样的好恐怖啊'))<Date.parse('2024-04-10T00:00:00Z'));
});

test('fictional dead link uses reserved .invalid and stays a plain text chat message',()=>{
 const link=at('hufeng','06-11','https://album-check.invalid/share/0611');
 assert.ok(link);
 assert.equal(new URL(link.text).hostname,'album-check.invalid');
 const s=initialState();applyPresetImport(s,packs);
 const html=renderWeChatChat(s,'hufeng');
 assert.match(html,/album-check\.invalid/);
 assert.doesNotMatch(html,/href="https:\/\/album-check\.invalid/);
});

test('importing extra months does not delete earlier story or player messages, and exports private chats',()=>{
 const s=initialState();
 const old=JSON.parse(readFileSync(new URL('../src/story/presets/days/D001/wechat-history-2024-03.json',import.meta.url),'utf8'));
 applyPresetImport(s,old);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'player-keeps-chat',from:'me',text:'这是玩家自己发的',time:'12:10',actual:true});
 applyPresetImport(s,packs);
 applyPresetImport(s,packs);
 assert.ok(group.messages.some(m=>m.id==='player-keeps-chat'&&m.actual));
 assert.equal(group.messages.filter(m=>m.id===at('group','08-30','得带小辛去医生那').id).length,1);
 assert.ok(group.messages.some(m=>m.text==='猫猫～'));
 const authored=group.messages.filter(m=>m.storyImported&&m.sentDate);
 assert.deepEqual(authored.map(m=>m.sentDate),[...authored.map(m=>m.sentDate)].sort());
 const exported=exportPresetPacks(s,{day:1}).flatMap(p=>p.history.flatMap(h=>h.messages));
 assert.ok(exported.some(m=>m.text==='我在开车先不说了'));
 assert.ok(exported.some(m=>m.text==='其实我是不想待在澳门'));
 assert.ok(!exported.some(m=>m.id==='player-keeps-chat'));
});
