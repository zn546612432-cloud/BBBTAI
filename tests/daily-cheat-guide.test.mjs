import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {ensureAuthoredNotes} from '../src/apps/notes/data/seed.js';
import {render as notesRender,handle as notesHandle} from '../src/apps/notes/index.js';
import {render as browserRender,handle as browserHandle} from '../src/apps/browser/index.js';
import {dailyGuide,renderCheatGuide,isGuideUrl} from '../src/apps/browser/features/cheat-guide/index.js';
import {GUIDE_NOTE_ID,GUIDE_URL} from '../src/apps/browser/features/cheat-guide/content.js';
import {chargingBlock,shortChargeBlock} from '../src/system/power/story.js';

const fresh=()=>activateStory55(initialState());
test('new and previously seeded saves contain a single clickable one-URL note',()=>{
 const s=fresh(),note=s.content.notes.find(n=>n.id===GUIDE_NOTE_ID);
 assert.equal(note.title,'作弊代碼');assert.equal(note.text,GUIDE_URL);
 s.content.notes=s.content.notes.filter(n=>n.id!==GUIDE_NOTE_ID);delete s.content.cheatGuideSeedVersion;
 s.content.notes.push({id:'private',title:'private',text:'keep'});
 assert.equal(ensureAuthoredNotes(s),true);assert.equal(ensureAuthoredNotes(s),false);
 assert.equal(s.content.notes.filter(n=>n.id===GUIDE_NOTE_ID).length,1);
 assert.equal(s.content.notes.find(n=>n.id==='private').text,'keep');
 const opened=[],ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:loc=>opened.push(loc),back:()=>opened.push('back')}};
 const html=notesRender(ctx,{route:'/edit',params:{noteId:GUIDE_NOTE_ID}});
 assert.match(html,/data-action="notes-cheat-guide">https:\/\/cheatcode.invalid<\/button>/);
 notesHandle('notes-cheat-guide',{},ctx,{route:'/edit',params:{noteId:GUIDE_NOTE_ID}});
 const loc=opened.at(-1);assert.equal(loc.appId,'browser');assert.equal(loc.params.page,'cheat-guide');
 assert.match(browserRender(ctx,loc),/DAY 01/);assert.match(browserRender(ctx,loc),/cheatcode\.invalid/);
 browserHandle('browser-back',{},ctx,loc);assert.equal(opened.at(-1),'back');
 assert.ok(isGuideUrl(GUIDE_URL));assert.ok(isGuideUrl('cheatcode.invalid/'));assert.ok(!isGuideUrl(`${GUIDE_URL}/D55`));
});
test('guide always uses current date, never shows future triggers, and has precise egg actions',()=>{
 const s=fresh();let html=renderCheatGuide(s);
 assert.match(html,/2025\.05\.19/);assert.match(html,/12:00/);assert.match(html,/連續發送三條/);
 assert.doesNotMatch(html,/Ouroboros|22:16|錢包競賽|DAY 24/);
 s.day=4;html=renderCheatGuide(s);assert.match(html,/17:45–18:30/);assert.match(html,/看見了/);assert.doesNotMatch(html,/DAY 01|鍵盤心願/);
 for(let d=1;d<=55;d++){s.day=d;const before=JSON.stringify(s);const guide=dailyGuide(s);assert.equal(guide.day,d);assert.equal(JSON.stringify(s),before);assert.match(renderCheatGuide(s),new RegExp(`DAY ${String(d).padStart(2,'0')}`));}
});
test('charge availability is read directly from the unified gates and D24 has the real upgrade requirement',()=>{
 const s=fresh();s.day=24;s.clock='09:55';const guide=dailyGuide(s);
 assert.ok(guide.required.some(x=>x.copy.includes('US$100,000')));
 assert.ok(guide.required.some(x=>x.copy.includes('21:06')));
 assert.ok(guide.charge.some(x=>x.copy===`短充：${shortChargeBlock(s)?'暫不可用':'可用'}`));
 assert.ok(guide.charge.some(x=>x.copy===`長充：${chargingBlock(s)?'暫不可用':'可用'}`));
 assert.doesNotMatch(renderCheatGuide(s),/10:26|DAY 25/);
});
