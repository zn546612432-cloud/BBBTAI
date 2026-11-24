import test from 'node:test';
import assert from 'node:assert/strict';
import {MIRAGE_TAI_PRESETS,mirageTaiReplyGuidance,mirageTaiForbiddenLine}
 from '../src/apps/mirage/features/ai-replies/presets.js';
import {OUROBOROS_DOSSIER_ID,OUROBOROS_DOSSIER_TITLE,OUROBOROS_DOSSIER_HEADING,ouroborosDossierHours,syncOuroborosDossier}
 from '../src/apps/notes/data/ouroboros.js';
import {ANONYMOUS_MIRAGE_WINDOWS_55} from '../src/services/story55/runtime.js';
import {projectMirageTaiGlossary} from '../src/services/ai/worldbook/plot-glossary.js';

const makeState=(day=16)=>({day,clock:'21:00',story55:{version:1,authoredNoteIds:[],completed:{}},
 content:{notes:[],conversations:{mirage:[]}}});

test('anonymous Mirage has at least 40 separate Tai-only situational anchors',()=>{
 assert.ok(MIRAGE_TAI_PRESETS.length>=40);
 assert.equal(new Set(MIRAGE_TAI_PRESETS.map(e=>e.id)).size,MIRAGE_TAI_PRESETS.length);
 for(const item of MIRAGE_TAI_PRESETS){
  assert.ok(item.cues instanceof RegExp,item.id);
  assert.ok(item.reply.length>=3,item.id);
  assert.equal(mirageTaiForbiddenLine(item.reply),false,item.id);
 }
 const scene=mirageTaiReplyGuidance({text:'我只是想跟你說說話',day:18});
 assert.match(scene,/只有熙泰回覆/);
 assert.match(scene,/匿名/);
 assert.match(scene,/D18/);
 assert.match(scene,/情境/);
 assert.doesNotMatch(scene,/熙蒙：/);
});

test('anonymous wording blacklist rejects apologies, login announcements and affected cliches',()=>{
 for(const value of ['抱歉','對不起','不好意思','我回來了','我做過的事，我認']){
  assert.equal(mirageTaiForbiddenLine(value),true,value);
 }
 for(const value of ['剛看到。什麼事？','你要說什麼？','沒急著走。你還想說什麼？']){
  assert.equal(mirageTaiForbiddenLine(value),false,value);
 }
});

test('Ouroboros suspected windows reuse the real shared anonymous presence table',()=>{
 const hours=ouroborosDossierHours(ANONYMOUS_MIRAGE_WINDOWS_55);
 assert.match(hours,/疑似上線時間/);
 for(const [from,to] of ANONYMOUS_MIRAGE_WINDOWS_55)
  assert.ok(hours.includes(from+'－'+to),from);
 assert.match(hours,/未必每天一樣/);
});

test('Dossier appears at D16, never at D15, and respects player deletion',()=>{
 const s=makeState(15);
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),false);
 assert.equal(s.content.notes.length,0);
 s.day=16;
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),true);
 const note=s.content.notes.find(n=>n.id===OUROBOROS_DOSSIER_ID);
 assert.equal(note?.title,OUROBOROS_DOSSIER_TITLE);
 assert.ok(note?.text.includes(OUROBOROS_DOSSIER_HEADING));
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),false);
 assert.equal(s.content.notes.length,1);
 s.content.notes=[];
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),false);
 assert.deepEqual(s.content.notes,[]);
});

test('pre-existing player-written Ouroboros dossier only receives an appended observation',()=>{
 const s=makeState(18);
 s.content.notes=[{id:'custom-note',title:'衔尾蛇资料',text:'私人線索：先不公開',actual:true}];
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),true);
 assert.equal(s.content.notes.length,1);
 assert.match(s.content.notes[0].text,/私人線索：先不公開/);
 assert.match(s.content.notes[0].text,/08:00－09:25/);
 assert.equal(syncOuroborosDossier(s,ANONYMOUS_MIRAGE_WINDOWS_55),false);
});

test('Mirage lore describes early identity without claiming later events have happened',()=>{
 const s=makeState(17);
 const entries=projectMirageTaiGlossary(s,{channel:'mirage',recognized:false,messages:[{role:'user',content:'你到底是誰？'}]});
 assert.ok(entries.length>=2);
 assert.match(entries.map(e=>e.content).join('\n'),/匿名|相認前|尚未/);
 const future=projectMirageTaiGlossary(s,{channel:'mirage',recognized:false,messages:[{role:'user',content:'Azathoth 的管理員？'}]});
 assert.doesNotMatch(future.map(e=>e.content).join('\n'),/D17 熙泰已告訴熙蒙/);
});
