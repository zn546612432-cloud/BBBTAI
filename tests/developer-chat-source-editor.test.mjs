import test from 'node:test';
import assert from 'node:assert/strict';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
import {trackKey,tracksForDay,trackValues,saveTrackValues,trackEditReason} from '../src/story/d14-d24/editor-overrides.js';
import {makeChatBundle,previewChatImport,applyChatImport} from '../src/apps/developer/features/conversations/transfer.js';

const s0=()=>({day:14,clock:'08:00',editor:{chatScope:'story',chatDay:14},story55:{version:1,authoredDays:{},chatSceneEdits:{}},content:{conversations:{wechat:[{id:'wang',name:'熙旺',messages:[]},{id:'group',name:'狼崽團',messages:[]}],noapp:[],mirage:[],messages:[]}}});
test('D14–D24 source edits reuse the exact same lifecycle and stable message IDs',()=>{
 const s=s0(),scene=tracksForDay(14)[0],key=trackKey(scene),before=trackValues(s,scene);
 const edited=structuredClone(before);
 edited.lines[0].text+=' · 校稿';
 edited.at='11:33';
 saveTrackValues(s,key,edited);
 const d=D14_D24_TRACKS.find(x=>x.track.day===scene.day).track.defs.find(x=>x.id===scene.id);
 assert.equal(d.lines(s)[0].text,edited.lines[0].text);
 assert.equal(d.at(s),'11:33');
 assert.equal(d.id,scene.id);
 assert.equal(d.day,scene.day);
 assert.equal(d.channel,'wechat');
 assert.deepEqual(d.lines({...s,story55:{version:1}}),scene.lines);
});
test('played scenes never accept edited text or rewound time, even after export/import',()=>{
 const s=s0(),scene=tracksForDay(14)[0],key=trackKey(scene),edit=structuredClone(trackValues(s,scene));
 edit.lines[0].text+=' future';
 const bundle=makeChatBundle(s,{scope:'date'});
 const item=bundle.tracks.find(x=>x.key===key);
 item.lines[0].text+=' from import';
 s.story55.authoredDays.d14={[scene.id]:{started:true,index:1}};
 assert.match(trackEditReason(s,scene),/已開始/);
 assert.throws(()=>saveTrackValues(s,key,edit),/已開始/);
 const report=previewChatImport(s,bundle).report;
 assert.equal(report.tracksBlocked>=1,true);
 applyChatImport(s,bundle,{mode:'replace-conflicts'});
 assert.deepEqual(s.story55.chatSceneEdits,{});
});
test('portable JSON source tracks are scoped by date and imported on an untouched phone',()=>{
 const a=s0(),scene=tracksForDay(14)[0],key=trackKey(scene),edit=structuredClone(trackValues(a,scene));
 edit.lines[0].text='作者改過的問候';
 saveTrackValues(a,key,edit);
 const day=makeChatBundle(a,{scope:'date'});
 assert.ok(day.tracks.length>0);
 assert.ok(day.tracks.every(x=>x.key.startsWith('d14:')));
 const history=makeChatBundle(a,{scope:'history'});
 assert.deepEqual(history.tracks,[]);
 const restored=s0();
 applyChatImport(restored,day,{mode:'merge'});
 assert.equal(trackValues(restored,scene).lines[0].text,'作者改過的問候');
 const second=makeChatBundle(restored,{scope:'date'});
 assert.deepEqual(second.tracks,day.tracks);
});
test('validation preserves fixed speakers/line counts and rejects duplicate scene keys',()=>{
 const s=s0(),bundle=makeChatBundle(s,{scope:'date'}),invalid=structuredClone(bundle);
 invalid.tracks[0].lines[0].who='me';
 assert.throws(()=>previewChatImport(s,invalid),/發言人/);
 const duplicate=structuredClone(bundle);
 duplicate.tracks.push(structuredClone(duplicate.tracks[0]));
 assert.throws(()=>previewChatImport(s,duplicate),/重複/);
 assert.deepEqual(s.story55.chatSceneEdits,{});
});
