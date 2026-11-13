import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D14_D24_CONTENT} from '../src/story/d14-d24/definition.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
import {D17_INVITATION_LINES} from '../src/story/d17/content.js';
import {entryFor,allDiaryDays} from '../src/story/diary/entries.js';
import {withMirageSessionDividers} from '../src/apps/mirage/index.js';

const state=()=>activateStory55(initialState());

test('D17 bank follow-up uses existing WeChat track with seven authorized turns at 21:40',()=>{
 const s=D14_D24_CONTENT.wechat.find(x=>x.day===17&&x.id==='bank-followup');
 assert.ok(s);
 assert.equal(s.chat,'hufeng');
 assert.equal(s.at,'21:40');
 assert.deepEqual(s.lines.map(x=>x.who),['胡枫','me','胡枫','me','胡枫','me','胡枫']);
 assert.equal(s.lines[1].text,'看了。你確定那家公司跟汪傑有關係？');
 assert.equal(s.lines[4].text,'對。而且有幾筆資金的時間也對不上。');
 const track=D14_D24_TRACKS.find(x=>x.track.day===17).track;
 assert.ok(track.defs.some(x=>x.id==='bank-followup'));
});

test('Only the independent D17 Ouroboros laugh is removed, with neighboring lines preserved',()=>{
 assert.equal(D17_INVITATION_LINES.filter(x=>x[1]==='呵呵……').length,0);
 const before=D17_INVITATION_LINES.findIndex(x=>x[1]==='你先證明你真的是管理員。');
 assert.deepEqual(D17_INVITATION_LINES[before+1],['ouroboros','等你把程序部署完，我會讓你親眼看看。']);
 assert.ok(D17_INVITATION_LINES.some(x=>x[1]==='呵。'));
});

test('D14 diary is available; D15 and D17 diaries wait for their source events',()=>{
 const s=state();
 s.day=14;
 assert.equal(entryFor(s,14).title,'最近有點忙');
 assert.equal(entryFor(s,15),null);
 s.day=15;
 assert.ok(!allDiaryDays(s).includes(15));
 s.story55.completed.loan={day:15,clock:'17:00'};
 assert.equal(entryFor(s,15).title,'奇怪的人');
 assert.match(entryFor(s,15).body,/一百萬美元/);
 s.day=17;
 s.clock='21:40';
 assert.equal(entryFor(s,17),null);
 const track=D14_D24_TRACKS.find(x=>x.track.day===17).track;
 const progress=track.ensure(s);
 for(const def of track.defs)if(def.id!=='bank-followup')progress[def.id].completed=true;
 const store={get:()=>s,update:fn=>fn(s)};
 let time=Date.now();
 for(let i=0;i<30&&!progress['bank-followup'].completed;i++){
  track.tick(s,time+=3000);
  const draft=track.draft(s,'hufeng');
  if(draft)assert.equal(track.send(store,'hufeng',draft.text,time+=3000).handled,true);
 }
 assert.equal(progress['bank-followup'].completed,true,'actual lifecycle finishes the approved bank dialogue');
 assert.equal(s.story55.authoredDays?.d17?.['bank-followup']?.completed,true);
 assert.equal(entryFor(s,17).title,'下雨了');
 assert.match(entryFor(s,17).body,/資料有些地方對不上/);
 assert.equal(entryFor(s,19),null);
});

test('Diary editor override remains usable before the authored source event',()=>{
 const s=state();s.day=15;
 s.content.storyDiary??={};
 s.content.storyDiary['15']={title:'自己的日程',body:'自行記錄'};
 assert.equal(entryFor(s,15).body,'自行記錄');
});

test('Mirage new-session separators are display-only, one for each message date',()=>{
 const s=state();s.day=17;
 const original=[
  {id:'one',from:'ouroboros',text:'你好',sentDate:'2025-06-02',time:'22:00'},
  {id:'two',from:'me',text:'收到',sentDate:'2025-06-02',time:'22:01'},
  {id:'three',from:'ouroboros',text:'又見面了',sentDate:'2025-06-03',time:'09:00'}
 ];
 const copy=structuredClone(original);
 const rendered=withMirageSessionDividers(original,s);
 assert.deepEqual(original,copy);
 assert.deepEqual(rendered.filter(x=>x.kind==='divider').map(x=>x.text),['── NEW SESSION ──','── NEW SESSION ──']);
 assert.deepEqual(rendered.filter(x=>x.kind!=='divider').map(x=>x.id),['one','two','three']);
 assert.deepEqual(withMirageSessionDividers([],s),[]);
});

test('Mirage must not duplicate a persisted NEW SESSION marker',()=>{
 const s=state();s.day=17;
 const rows=[
  {id:'old',kind:'divider',from:'system',text:'── NEW SESSION ──',sentDate:'2025-06-02',time:'08:00'},
  {id:'a',from:'ouroboros',text:'保留原話',sentDate:'2025-06-02',time:'08:01'}
 ];
 const result=withMirageSessionDividers(rows,s);
 assert.equal(result.filter(x=>x.text==='── NEW SESSION ──').length,1);
 assert.equal(result.filter(x=>x.id==='a').length,1);
});

test('D13 story-owned intrusion session marker survives even after same-day chat',()=>{
 const s=state();s.day=13;
 const items=[
  {id:'earlier',from:'ouroboros',text:'前面的訊息',day:13,sentDate:'2025-05-31',time:'20:00'},
  {id:'s55-intrusion-divider',kind:'divider',from:'system',text:'── NEW SESSION ──',systemOwned:true,day:13,sentDate:'2025-05-31',time:'22:30'},
  {id:'intrusion',from:'ouroboros',text:'入侵之後',day:13,sentDate:'2025-05-31',time:'22:31'}
 ];
 const result=withMirageSessionDividers(items,s);
 assert.deepEqual(result.map(x=>x.id),['mirage-session-2025-05-31','earlier','s55-intrusion-divider','intrusion']);
 assert.equal(result.find(x=>x.id==='s55-intrusion-divider'),items[1],'system-owned marker is not replaced');
 assert.equal(result.filter(x=>x.kind==='divider').length,2,'different-purpose divider is retained');
 assert.deepEqual(items.map(x=>x.id),['earlier','s55-intrusion-divider','intrusion'],'persisted records are untouched');
});

test('D13 system-owned marker at first message of the day is not duplicated',()=>{
 const s=state();s.day=13;
 const items=[
  {id:'s55-intrusion-divider',kind:'divider',from:'system',text:'── NEW SESSION ──',systemOwned:true,day:13,sentDate:'2025-05-31',time:'22:30'},
  {id:'intrusion',from:'ouroboros',text:'回來了',day:13,sentDate:'2025-05-31',time:'22:31'}
 ];
 const result=withMirageSessionDividers(items,s);
 assert.deepEqual(result.map(x=>x.id),items.map(x=>x.id));
});
