import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';
import {previewPresetImport,applyPresetImport} from '../src/story/presets/io/import.js';
import {exportPresetPacks,serializePresetExport} from '../src/story/presets/io/export.js';
import {loadBuiltInPresets,hydrateBuiltInPresets} from '../src/story/presets/catalog.js';

const fixture=name=>JSON.parse(readFileSync(new URL(`../src/story/presets/days/${name}`,import.meta.url),'utf8'));
const source=()=>[fixture('D057/wechat.json'),fixture('D058/wechat.json')];
const state=()=>initialState();

test('single file, bundle and arrays validate correctly',()=>{
 const packs=source();
 assert.equal(parsePresetPayload(packs[0]).length,1);
 assert.equal(parsePresetPayload({format:'ximeng-preset-bundle-v1',packs}).length,2);
 assert.throws(()=>parsePresetPayload('{invalid'),/JSON/);
 assert.throws(()=>parsePresetPayload({...packs[0],day:91}),/日期|游戏日/);
 assert.throws(()=>parsePresetPayload({...packs[0],rules:[packs[0].rules[0],packs[0].rules[0]]}),/重复/);
 assert.throws(()=>parsePresetPayload({format:'ximeng-preset-bundle-v1',packs:[packs[0],packs[0]]}),/重复/);
 const invalid=structuredClone(packs[0]);invalid.rules[0].from='25:00';
 assert.throws(()=>parsePresetPayload(invalid),/时间/);
});

test('preview is nonmutating and merge preserves local rules, existing history and used-once progress',()=>{
 const s=state(),packs=source();
 s.storyPresets.rules.push({...structuredClone(packs[0].rules[0]),messages:['我已手动修改']});
 s.storyPresets.usedIds.push('wang-d57-0300');s.storyPresets.flags.push('wang-overnight-await');
 s.content.conversations.wechat[0].messages.push({id:'live-player',from:'me',text:'真的吗？',time:'03:00',actual:true});
 const before=JSON.stringify(s),report=previewPresetImport(s,packs);
 assert.equal(JSON.stringify(s),before);assert.equal(report.rulesConflict,1);assert.equal(report.rulesNew,6);
 applyPresetImport(s,packs,{mode:'merge'});
 assert.equal(s.storyPresets.rules.find(r=>r.id==='wang-d57-0300').messages[0],'我已手动修改');
 assert.equal(s.storyPresets.usedIds[0],'wang-d57-0300');assert.equal(s.storyPresets.flags[0],'wang-overnight-await');
 assert.ok(s.content.conversations.wechat[0].messages.some(m=>m.id==='live-player'));
 applyPresetImport(s,packs,{mode:'merge'});
 assert.equal(s.storyPresets.rules.length,7,'repeating an import is idempotent');
});

test('replace-conflicts replaces only authored rule while retaining live messages and execution flags',()=>{
 const s=state(),packs=source();applyPresetImport(s,packs);
 s.storyPresets.rules[0].title='changed';s.storyPresets.usedIds=['wang-d57-0300'];
 s.content.conversations.wechat[0].messages.push({id:'player-keep',from:'me',text:'哥',time:'11:00',actual:true});
 applyPresetImport(s,packs,{mode:'replace-conflicts'});
 assert.equal(s.storyPresets.rules[0].title,'凌晨三点 · 熙旺出门前');
 assert.deepEqual(s.storyPresets.usedIds,['wang-d57-0300']);
 assert.ok(s.content.conversations.wechat[0].messages.some(m=>m.id==='player-keep'));
});

test('historical dialogue imports by stable ID without replacing live messages, and exports scripted messages only',()=>{
 const s=state(),packs=source(),pack=structuredClone(packs[0]);
 pack.history=[{conversationId:'wang',conversationName:'熙旺',messages:[
  {id:'story-h1',from:'wang',text:'今天路过书店。',time:'12:08',sentDate:'2024-03-10'},
  {id:'story-h2',from:'me',text:'给我带书！',time:'12:09'}
 ]}];
 const chat=s.content.conversations.wechat[0];chat.messages.push({id:'player-untouchable',from:'me',text:'我的真消息',time:'12:10',actual:true});
 applyPresetImport(s,pack);applyPresetImport(s,pack,{mode:'replace-conflicts'});
 assert.equal(chat.messages.length,5,'two demo, one real and two imported history entries');
 const imported=s.content.conversations.wechat[0].messages.filter(m=>m.storyImported);
 assert.deepEqual(imported.map(m=>m.id),['story-h1','story-h2']);
 const result=serializePresetExport(s,{day:57});
 assert.ok(result.includes('story-h1'));assert.ok(result.includes('story-h2'));
 assert.ok(!result.includes('player-untouchable'));
 assert.equal(parsePresetPayload(result).length,1);
});

test('editor deleted rule tombstone prevents fixture resurrection until explicit reimport',()=>{
 const s=state(),p=source()[0];
 s.storyPresets.deletedRuleIds=['wang-d57-0300'];
 applyPresetImport(s,p,{mode:'merge'});
 assert.ok(!s.storyPresets.rules.some(r=>r.id==='wang-d57-0300'));
 applyPresetImport(s,p,{mode:'merge',restoreDeleted:true});
 assert.ok(s.storyPresets.rules.some(r=>r.id==='wang-d57-0300'));
 assert.deepEqual(s.storyPresets.deletedRuleIds,[]);
});

test('builtin catalog fetch path and hydration are idempotent',async()=>{
 const fixtures=new Map([['manifest.json',fixture('manifest.json')],['D057/wechat.json',source()[0]],['D058/wechat.json',source()[1]]]);
 const fetched=[];const fetcher=async url=>{const key=String(url).split('/days/')[1];fetched.push(key);return {ok:fixtures.has(key),json:async()=>fixtures.get(key)};};
 assert.equal((await loadBuiltInPresets(fetcher)).length,2);
 const s=state(),store={get:()=>s,update:fn=>fn(s)};
 await hydrateBuiltInPresets(store,fetcher);await hydrateBuiltInPresets(store,fetcher);
 assert.equal(s.storyPresets.rules.length,7);assert.ok(fetched.includes('manifest.json'));
 assert.equal(exportPresetPacks(s,{day:57}).length,1);
});
