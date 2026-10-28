import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {render,handle,input,manifest} from '../src/apps/notes/index.js';
import {groupNotes} from '../src/apps/notes/features/list/index.js';
import {initialState} from '../src/services/storage.js';

const state=initialState(),ctx={store:{get:()=>state}};
test('Notes list recreates grouped white cards, centered title and bottom glass search',()=>{
 const html=render(ctx,{route:'/',params:{}});
 assert.equal(manifest.id,'notes');
 for(const value of ['备忘录','nt-list-header','nt-note-card','nt-list-bottom','nt-search-pill','nt-compose-button','data-action="notes-folders"'])assert.ok(html.includes(value),value);
 assert.match(html,/1 个备忘录/);
 assert.match(html,/留到下次/);
 assert.doesNotMatch(html,/83 个备忘录|网床 suhrib|黄顺煜/);
});
test('Notes editor has screenshot-style gold Done button and keyboard-following toolbar',()=>{
 const html=render(ctx,{route:'/edit',params:{noteId:'note-1'}});
 for(const value of ['nt-editor-back','nt-editor-combo','nt-finish-button','data-notes-title','data-notes-text','nt-editor-toolbar','notes-format','notes-checklist','notes-table','notes-attach','notes-sketch'])assert.ok(html.includes(value),value);
 assert.match(html,/留到下次/);
 assert.match(html,/那盤棋，改天接著下。/);
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
 assert.equal(live.content.notes[1].title,'留到下次');
});
test('Notes functions are maintained as independent subfolders',()=>{
 for(const feature of ['list','folders','editor','search','actions','attachments','sketch'])assert.ok(existsSync(new URL(`../src/apps/notes/features/${feature}/index.js`,import.meta.url)),feature);
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/src\/apps\/notes\/styles\.css/);
});
