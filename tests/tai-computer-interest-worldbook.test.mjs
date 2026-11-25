import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {readWorldbook,ensureWorldbook,defaultWorldbook} from '../src/services/ai/worldbook/format.js';
import {computerInterestEvents,TAI_COMPUTER_WORLDBOOK} from '../src/services/ai/worldbook/interests/computer.js';
import {captureTaiWorldbook,taiWorldbookPrompt} from '../src/services/ai/worldbook/index.js';

const user=content=>({role:'user',content});
const assistant=content=>({role:'assistant',content});
const ids=s=>s.entries.filter(e=>e.id.startsWith('tai-computer')).map(e=>e.id);
const events=msgs=>computerInterestEvents(msgs);
function make(){
 const s=activateStory55(initialState());
 s.day=16;s.clock='22:10';
 return {s,store:{get:()=>s,update:fn=>fn(s)}};
}
test('the computer book is visible and has 24 independent Tai-only expression entries',()=>{
 const world=defaultWorldbook();
 const book=world.books.find(b=>b.id==='tai-computer');
 assert.equal(book.name,'熙泰 · 計算機興趣語料庫');
 assert.equal(book.entries.length,25);
 assert.equal(TAI_COMPUTER_WORLDBOOK.length,25);
 assert.equal(book.entries.filter(e=>e.id.startsWith('tai-computer-cs')).length,24);
 assert.ok(book.entries.every(e=>!e.constant&&!e.key.length&&e.phase==='expression'));
 assert.ok(book.entries.every(e=>e.events.every(ev=>ev.startsWith('interest:computer'))));
 assert.ok(book.entries.every(e=>e.channels.includes('mirage')&&e.channels.includes('noapp')));
 assert.ok(book.entries.every(e=>!e.content.includes('熙蒙：')));
 assert.ok(book.entries.some(e=>e.content.includes('只不過是隨口說說罷了。')));
 assert.ok(book.entries.some(e=>e.content.includes('提交訊息不要只寫 fix')));
});

test('only real player language triggers narrowly selected computer topics',()=>{
 const cases=[
  ['我的 bug 一直報錯','cs03'],
  ['為什麼密碼學可以公開演算法','cs06'],
  ['AI 的幻覺太嚴重了','cs08'],
  ['你怎麼看人工智能','cs07'],
  ['Python 的並發有競態','cs18'],
  ['GitHub 上的開源項目','cs13'],
  ['為什麼程序一直閃退','cs19'],
  ['我有一個新的技術方案，你覺得可行嗎','cs21']
 ];
 for(const [text,id] of cases){
  const result=events([user(text)]);
  assert.ok(result.includes('interest:computer'),text);
  assert.ok(result.includes('interest:computer:'+id),text+' / '+result.join(','));
 }
 for(const text of ['你在嗎','我買了一件咖啡色外套','今天天氣很好','我想喝咖啡','你好能說','GHOST 今天交給你了'])
  assert.deepEqual(events([user(text)]),[],text);
 assert.deepEqual(events([assistant('我剛剛讀了演算法'),user('嗯，你還在嗎')]),[],
  'AI output alone must not trigger the player-only interest book');
 assert.deepEqual(events([user('[遊戲系統事件：玩家完成算法關卡]')]),[]);
});

test('two natural follow-ups stay on the selected topic, new subjects leave it',()=>{
 const conversation=[user('你覺得二分搜尋算法怎麼樣'),assistant('很漂亮。'),user('那為什麼？')];
 assert.ok(events(conversation).includes('interest:computer:cs05'));
 const continued=[...conversation,assistant('每次排除一半。'),user('再說詳細一點')];
 assert.ok(events(continued).includes('interest:computer:cs05'));
 const changed=[...continued,user('今晚吃什麼？')];
 assert.deepEqual(events(changed),[]);
 assert.deepEqual(events([user('你喜歡算法嗎'),user('換個話題')]),[]);
});

test('你好能說 invokes the confirmed Tai-only line only after a real technical discussion',()=>{
 const topic=[user('加密算法到底難在哪裡'),assistant('密鑰管理也很重要。'),user('你好能說')];
 assert.ok(events(topic).includes('interest:computer:cs24'));
 const s=make(),snapshot=captureTaiWorldbook(s.store,{
  channel:'mirage',recognized:false,day:16,turnId:'computer-remark-1',messages:topic
 });
 assert.ok(ids(snapshot).includes('tai-computer-cs24'));
 assert.match(taiWorldbookPrompt({worldbookSnapshot:snapshot}),/只不過是隨口說說罷了/);
 assert.deepEqual(events([user('今天剛喝了咖啡'),assistant('還不錯。'),user('你好能說')]),[]);
});

test('MIRAGE and recognized NoApp use the same activated existing worldbook, not a global injection',()=>{
 const a=make(),one=captureTaiWorldbook(a.store,{channel:'mirage',recognized:false,day:16,turnId:'interest-t1',messages:[user('你會寫 Git 版本控制嗎？')]});
 assert.ok(ids(one).includes('tai-computer-core'));
 assert.ok(ids(one).includes('tai-computer-cs14'));
 assert.ok(taiWorldbookPrompt({worldbookSnapshot:one}).includes('提交訊息不要只寫 fix'));
 const quiet=captureTaiWorldbook(a.store,{channel:'mirage',recognized:false,day:16,turnId:'interest-t2',messages:[user('早安，天氣怎麼樣？')]});
 assert.deepEqual(ids(quiet),[],'irrelevant turns should not send the computer worldbook');
 const b=make(),two=captureTaiWorldbook(b.store,{channel:'noapp',recognized:true,day:16,turnId:'interest-noapp',messages:[user('你喜歡 Linux 內核嗎')]});
 assert.ok(ids(two).includes('tai-computer-cs12'));
 assert.ok(!ids(two).includes('tai-computer-cs14'));
});

test('old saves gain the new book without losing custom entries, runtime, or disabling choices',()=>{
 const s=initialState();
 const w=defaultWorldbook(),entry=w.books[0].entries.find(e=>e.id==='technical-interest');
 entry.content='玩家自訂的技術偏好';
 w.books=w.books.filter(b=>b.id!=='tai-computer');
 w.runtime.noapp={cursor:7,effects:{old:1},snapshot:{entries:[]}};
 s.aiDraft.worldbook=w;
 const next=readWorldbook(s);
 assert.equal(next.books.filter(b=>b.id==='tai-computer').length,1);
 assert.equal(next.books[0].entries.find(e=>e.id==='technical-interest').content,'玩家自訂的技術偏好');
 assert.equal(next.runtime.noapp.cursor,7);
 assert.equal(next.runtime.noapp.effects.old,1);
 assert.equal(ensureWorldbook(s).books.filter(b=>b.id==='tai-computer').length,1);
 s.aiDraft.worldbook.books.find(b=>b.id==='tai-computer').enabled=false;
 assert.equal(readWorldbook(s).books.find(b=>b.id==='tai-computer').enabled,false,
  'worldbook editor toggle is respected, never overwritten by migration');
});
