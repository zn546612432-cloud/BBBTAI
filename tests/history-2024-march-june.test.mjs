import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {applyPresetImport} from '../src/story/presets/io/import.js';
import {exportPresetPacks} from '../src/story/presets/io/export.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';

const months=['03','04','05','06'];
const packs=months.map(month=>JSON.parse(readFileSync(new URL(`../src/story/presets/days/D001/wechat-history-2024-${month}.json`,import.meta.url),'utf8')));
const media=JSON.parse(readFileSync(new URL('../src/story/assets/history-2024-mar-jun.media.json',import.meta.url),'utf8'));
const rows=()=>packs.flatMap(p=>p.history.flatMap(h=>h.messages.map(m=>({...m,conversationId:h.conversationId}))));
const find=(conversationId,text)=>rows().find(m=>m.conversationId===conversationId&&m.text===text);
const minute=x=>Number(x.time.slice(0,2))*60+Number(x.time.slice(3));
const epoch=x=>Date.parse(`${x.sentDate}T${x.time}:00Z`);

test('four separate 2024-history packs validate and use unique stable IDs',()=>{
 assert.equal(packs.length,4);
 packs.forEach(p=>assert.equal(parsePresetPayload(p).length,1));
 const all=rows();
 assert.equal(all.length,138);
 assert.equal(all.filter(x=>x.conversationId==='group').length,101);
 assert.equal(all.filter(x=>x.conversationId==='wang').length,37);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.ok(all.every(x=>x.sentDate.startsWith('2024-')&&x.appearance==='immediate'));
 assert.ok(media.assets.every(asset=>all.some(x=>x.assetId===asset.id)));
});

test('author-specified relative times and date boundary are exact',()=>{
 assert.equal(minute(find('group','你们走了？那我自己吃吧'))-minute(find('group','我到门口找你们')),15);
 assert.equal(minute(find('group','我买了烧麦你吃不吃？@阿威？'))-minute(find('group','你们走了？那我自己吃吧')),20);
 assert.equal(minute(find('wang','怎么了蒙蒙'))-minute(find('wang','哥哥～～')),30);
 assert.equal(epoch(find('group','好玩，下次带你来'))-epoch(find('group','@胡枫韩国好玩吗？')),3*60*60*1000);
 assert.equal(find('group','好玩，下次带你来').sentDate,'2024-05-11');
 assert.equal(minute(find('group','翻完聊天记录笑死了'))-minute(find('group','滚蛋')),30);
});

test('media IDs survive importing, idempotent reimport, and author export',()=>{
 const s=initialState();
 applyPresetImport(s,packs);
 applyPresetImport(s,packs);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 const photo=group.messages.find(m=>m.assetId==='wx-media-20240324-awei-arm');
 assert.ok(photo);
 assert.equal(group.messages.filter(m=>m.id===photo.id).length,1);
 const exported=exportPresetPacks(s,{day:1});
 const photoOut=exported.flatMap(p=>p.history.flatMap(h=>h.messages)).find(m=>m.id===photo.id);
 assert.equal(photoOut.assetId,photo.assetId);
});

test('invalid historical asset IDs are rejected',()=>{
 const p=structuredClone(packs[0]);
 p.history[0].messages[0].assetId='../not-an-asset';
 assert.throws(()=>parsePresetPayload(p),/素材编号/);
});

test('all five historical media have working-format direct links and no unfinished placeholders',()=>{
 const ids=new Set(rows().filter(m=>m.assetId).map(m=>m.assetId));
 assert.equal(ids.size,5);
 for(const asset of media.assets){
  assert.ok(ids.has(asset.id));
  assert.ok(asset.title.length>1);
  assert.match(asset.sourceUrl,/^https:\/\//);
  assert.match(asset.directUrl,/^https:\/\//);
  assert.doesNotMatch(JSON.stringify(asset),/待补|待接入|user-to-supply|selection-needed|needs-import/);
  if(asset.kind==='video'){
   assert.match(asset.directUrl,/\.mp4$/);
   assert.match(asset.posterUrl,/^https:\/\//);
  }else assert.match(asset.directUrl,/\.jpe?g(?:\?|$)/);
 }
 assert.ok(rows().filter(m=>m.assetId).every(m=>!/(待补|待接入)/.test(m.text)));
});

test('historical media are real image and video bubbles inside WeChat',()=>{
 const s=initialState();
 applyPresetImport(s,packs);
 const html=renderWeChatChat(s,'group');
 assert.equal((html.match(/wx-shared-video-player/g)||[]).length,3);
 assert.equal((html.match(/class="wx-shared-photo"/g)||[]).length,2);
 for(const asset of media.assets){
  assert.ok(html.includes(asset.directUrl.replaceAll('&','&amp;'))||html.includes(asset.directUrl));
  assert.ok(html.includes(asset.sourceUrl));
 }
 assert.doesNotMatch(html,/待补|待接入/);
});
