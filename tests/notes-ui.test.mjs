import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {render,handle,input,manifest} from '../src/apps/notes/index.js';
import {groupNotes} from '../src/apps/notes/features/list/index.js';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {isNoteUnlocked,lockNote,tryUnlockNote,showUnlockDialog,prepareLockedNote} from '../src/apps/notes/features/lock/index.js';

const state=initialState(),ctx={store:{get:()=>state}};
test('Notes list recreates grouped white cards, centered title and bottom glass search',()=>{
 const html=render(ctx,{route:'/',params:{}});
 assert.equal(manifest.id,'notes');
 for(const value of ['备忘录','nt-list-header','nt-note-card','nt-list-bottom','nt-search-pill','nt-compose-button','data-action="notes-folders"'])assert.ok(html.includes(value),value);
 assert.match(html,/4 个备忘录/);
 for(const title of ['账号','账','备查','7f_0a'])assert.ok(html.includes(title));
 assert.ok(html.includes('已锁定'));
 assert.doesNotMatch(html,/Tmp!1_Dust88|Relay01!Cold|HK01_taipa/);
 assert.doesNotMatch(html,/83 个备忘录|网床 suhrib|黄顺煜/);
});
test('Notes editor has screenshot-style gold Done button and keyboard-following toolbar',()=>{
 const html=render(ctx,{route:'/edit',params:{noteId:'xm-note-ledger'}});
 for(const value of ['nt-editor-back','nt-editor-combo','nt-finish-button','data-notes-title','data-notes-text','nt-editor-toolbar','notes-format','notes-checklist','notes-table','notes-attach','notes-sketch'])assert.ok(html.includes(value),value);
 assert.match(html,/账/);
 assert.match(html,/氹仔房 3个月预付/);
 assert.doesNotMatch(html,/保存笔记|note-form/);
 const css=readFileSync(new URL('../src/apps/notes/styles.css',import.meta.url),'utf8');
 assert.match(css,/padding-top:calc\(60px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/\.keyboard-open \.nt-editor-toolbar\{margin-bottom:7px\}/);
});
test('Notes groups are based on real note data, and pinned notes move to the first section',()=>{
 const notes=[{id:'a',title:'今天',updatedDay:56},{id:'b',title:'较早',updatedDay:47},{id:'c',title:'置顶',pinned:true,updatedDay:1}];
 const groups=groupNotes(notes,{day:56});
 assert.deepEqual(groups.map(g=>g.title),['置顶','今天','过去30天']);
 assert.equal(groups[0].notes[0].id,'c');
});
test('creating and typing in a note updates only its stored title and body',()=>{
 const live=initialState(),opened=[];
 const context={store:{get:()=>live,update:fn=>fn(live)},router:{open:link=>{live.nav.current=link;opened.push(link);},back:()=>{}},refresh:()=>{}};
 handle('new-note',{},context,{route:'/'});
 assert.equal(opened[0].route,'/edit');
 const id=opened[0].params.noteId;
 assert.ok(live.content.notes.some(note=>note.id===id));
 input({matches:selector=>selector.includes('[data-notes-title]'),closest:()=>({dataset:{id}}),value:'我的新笔记'},context);
 input({matches:selector=>selector.includes('[data-notes-text]'),closest:()=>({dataset:{id}}),value:'写给熙泰的备忘'},context);
 assert.equal(live.content.notes.find(n=>n.id===id).title,'我的新笔记');
 assert.equal(live.content.notes.find(n=>n.id===id).text,'写给熙泰的备忘');
 assert.equal(live.content.notes.find(n=>n.id==='xm-note-ledger').title,'账');
});
test('locked Notes never expose their body in the list, locked view or search index',()=>{
 const s=initialState(),locked=s.content.notes.find(n=>n.id==='xm-note-credentials'),ctx={store:{get:()=>s},refresh(){}};
 assert.ok(locked?.locked);
 const list=render(ctx,{route:'/'});
 assert.match(list,/已锁定/);
 assert.doesNotMatch(list,/xm-0x7f-tmp1|nightbus_203|Relay02!Cold/);
 prepareLockedNote(locked.id);
 const view=render(ctx,{route:'/locked',params:{noteId:locked.id}});
 assert.match(view,/此备忘录已锁定。|查看备忘录/);
 assert.doesNotMatch(view,/xm-0x7f-tmp1/);
 assert.doesNotMatch(render(ctx,{route:'/edit',params:{noteId:locked.id}}),/HK01_taipa!77/);
});
test('three bad passwords reveal only the hint 幻影, success unlocks until re-locked',()=>{
 const id='xm-note-credentials',s=initialState(),ctx={store:{get:()=>s},refresh(){}};
 prepareLockedNote(id);showUnlockDialog(id);
 for(let n=1;n<=3;n++){
  assert.equal(tryUnlockNote(id,'wrong'),false);
  const locked=render(ctx,{route:'/locked',params:{noteId:id}});
  assert.match(locked,/该密码不正确/);
  assert.equal(locked.includes('提示：幻影'),n>=3);
  assert.doesNotMatch(locked,/Tmp!1_Dust88/);
 }
 assert.equal(tryUnlockNote(id,'nyarlathotep'),true);
 assert.equal(isNoteUnlocked(id),true);
 assert.match(render(ctx,{route:'/edit',params:{noteId:id}}),/Tmp!1_Dust88/);
 lockNote(id);
 assert.equal(isNoteUnlocked(id),false);
 assert.doesNotMatch(render(ctx,{route:'/edit',params:{noteId:id}}),/Tmp!1_Dust88/);
});
test('opening an encrypted note goes through the locked page, not the text editor',()=>{
 const live=initialState(),opened=[];
 const context={store:{get:()=>live},router:{open:link=>opened.push(link)}};
 handle('open-note',{dataset:{id:'xm-note-credentials'}},context,{route:'/'});
 assert.equal(opened.at(-1).route,'/locked');
 handle('open-note',{dataset:{id:'xm-note-links'}},context,{route:'/'});
 assert.equal(opened.at(-1).route,'/edit');
});
test('updating an older save installs missing historical Notes once without erasing player notes',()=>{
 const saved=initialState();
 saved.content.notes=[
  {id:'note-1',title:'留到下次',text:'那盤棋，改天接著下。',demo:true},
  {id:'player-note',title:'自己写的',text:'保留这段',actual:true}
 ];
 delete saved.content.notesSeedVersion;
 const values=new Map([[KEY,JSON.stringify(saved)]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const first=new PhoneStore(storage).get().content.notes;
 assert.equal(first.length,5);
 assert.ok(first.some(n=>n.id==='player-note'&&n.text==='保留这段'));
 assert.ok(!first.some(n=>n.id==='note-1'));
 assert.equal(first.filter(n=>n.id==='xm-note-credentials').length,1);
 const second=new PhoneStore(storage).get().content.notes;
 assert.equal(second.length,5);
});
test('Notes functions are maintained as independent subfolders',()=>{
 for(const feature of ['list','folders','editor','search','actions','attachments','sketch','lock'])assert.ok(existsSync(new URL(`../src/apps/notes/features/${feature}/index.js`,import.meta.url)),feature);
 assert.ok(existsSync(new URL('../src/apps/notes/data/seed.js',import.meta.url)));
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/src\/apps\/notes\/styles\.css/);
});
