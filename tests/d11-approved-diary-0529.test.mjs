import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {MEETING_NOTE,D11_DIARY} from '../src/story/d11/diary.js';
import {entryFor,diaryDate} from '../src/story/diary/entries.js';
import {diaryView} from '../src/apps/schedule/features/diary/index.js';

const oldText=['今晚去了老地方。胡枫还在韩国，明晚落地。',
 '干爹前天回了澳门，住美景大厦。今晚烧烤时问起大家最近在忙什么。',
 '我提了汪杰那份五亿美元电子钱包的线索。现在还不能把话说满。',
 '三个月筹三千万。干爹要看我们做出的东西，不是听我吹。',
 '明天整理旧据点，哥晚上去机场接胡枫。'].join('\n');
const oldNote=(patch={})=>({
 id:'xm-note-d11-meeting',title:'5/29 · 备忘',text:oldText,authored:true,storyContent:true,
 createdDay:11,updatedDay:11,updatedClock:'22:00',...patch
});
const ready=()=>{
 const s=activateStory55(initialState());
 s.day=11;s.clock='22:00';s.story55.completed.return={day:11,clock:'11:00'};
 return s;
};

test('5/29 (D11) displays the approved complete prose in Schedule, not the old Notes summary',()=>{
 const s=ready();
 assert.equal(diaryDate(11),'2025-05-29');
 assert.equal(D11_DIARY.title,'老地方');
 assert.equal(D11_DIARY.availableAt,'22:00');
 assert.equal(MEETING_NOTE.text,D11_DIARY.body);
 const entry=entryFor(s,11);
 assert.equal(entry.body,MEETING_NOTE.text);
 assert.match(entry.body,/炭火燒得正旺，熱氣混著煙往臉上撲，熏得我有些喘不過氣。/);
 assert.match(entry.body,/五億美元的比特幣。/);
 assert.match(entry.body,/我特意帶了電腦，將之前贏下的十枚比特幣展示給乾爹看。/);
 assert.match(entry.body,/說來好笑，那一刻，我幾乎連自己都說服了。/);
 assert.equal(entry.body.endsWith('反正我只需要負責網絡上的事。'),true);
 assert.doesNotMatch(entry.body,/三个月筹三千万|現在還不能把話說滿|现在还不能把话说满|不是听我吹/);
 const view=diaryView(s,{route:'/',params:{day:'11'}});
 assert.match(view,/老地方/);
 assert.match(view,/五億美元的比特幣/);
});

test('D11 original 22:00 gate and the completed-return source scene stay unchanged',()=>{
 const s=ready();
 s.clock='21:59';assert.equal(entryFor(s,11),null);
 s.clock='22:00';assert.ok(entryFor(s,11));
 delete s.story55.completed.return;assert.equal(entryFor(s,11),null);
 s.story55.completed.return={day:11,clock:'11:00'};
 assert.ok(entryFor(s,11));
});

test('existing save: untouched old 5/29 note is archived and retired, never overrides new diary',()=>{
 const s=ready();
 s.content.notes.push(oldNote(),{id:'personal',title:'我自己的記錄',text:'很久沒有一起吃燒烤了',actual:true});
 tickStory55(s);
 assert.equal(s.content.notes.some(n=>n.id==='xm-note-d11-meeting'),false);
 assert.equal(s.content.notes.some(n=>n.id==='personal'),true);
 assert.equal(s.story55.d11MeetingNoteArchive.text,oldText,'the old authored note is recoverable');
 assert.equal(s.content.storyDiary?.['11'],undefined,'old default must not shadow approved prose');
 assert.equal(entryFor(s,11).body,MEETING_NOTE.text);
 tickStory55(s);
 assert.equal(s.content.notes.some(n=>n.id==='xm-note-d11-meeting'),false,'migration must not respawn old note');
 assert.equal(entryFor(s,11).body,MEETING_NOTE.text);
});

test('player edited D11 Notes migrate to diary with archived original; unrelated Notes and diary overrides survive',()=>{
 for(const edited of [oldNote({text:oldText+'\n自己加的話'}),oldNote({title:'我的 5/29'})]){
  const s=ready();
  s.content.notes.push(edited,{id:'personal',title:'我自己的筆記',text:'不要刪掉',actual:true});
  tickStory55(s);
  assert.equal(s.content.notes.some(n=>n.id===edited.id),false,'legacy entry moves to diary, not lost');
  assert.equal(s.story55.d11MeetingNoteArchive.text,edited.text);
  assert.equal(entryFor(s,11).body,edited.text);
  assert.equal(entryFor(s,11).title,edited.title==='5/29 · 备忘'?'老地方':edited.title);
  assert.equal(s.content.notes.find(n=>n.id==='personal')?.text,'不要刪掉');
 }
 const s=ready();
 s.content.storyDiary??={};
 s.content.storyDiary['11']={title:'我的版本',body:'我自己寫的日記'};
 s.content.notes.push(oldNote({text:'備忘錄自己寫的文字'}));
 tickStory55(s);
 assert.equal(entryFor(s,11).body,'我自己寫的日記');
 assert.equal(entryFor(s,11).title,'我的版本');
 assert.equal(s.story55.d11MeetingNoteArchive.text,'備忘錄自己寫的文字');
});
