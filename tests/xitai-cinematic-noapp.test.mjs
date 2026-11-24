import test from 'node:test';
import assert from 'node:assert/strict';
import {XITAI_CINEMATIC_NOAPP_LINES} from '../src/apps/noapp/features/cinematic-dialogue/lines.js';
import {selectNoAppCinematicDialogue,noAppCinematicDirection}
 from '../src/apps/noapp/features/cinematic-dialogue/index.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {taiRelationshipDirector} from '../src/services/ai/relationship-director.js';

const low={stage:1,canDeclareLike:false,canDeclareLove:false,rejected:false,crisis:false};
const r4={...low,stage:4,canDeclareLike:true};
const r6={...r4,stage:6,canDeclareLove:true};
const user=text=>[{role:'user',content:text}];
const choose=(text,relationshipPlan=r6,more={})=>selectNoAppCinematicDialogue({
 channel:'noapp',recognized:true,relationshipPlan,messages:user(text),
 macauClock:'06:35',londonClock:'22:35',...more
});

test('all sixty approved Tai-only passages are retained without adding Xi Meng dialogue',()=>{
 const c=XITAI_CINEMATIC_NOAPP_LINES;
 assert.equal(c.length,60);
 assert.deepEqual(c.map(x=>Number(x.id)),Array.from({length:60},(_,i)=>i+1));
 assert.ok(c.every(x=>x.stage>=1&&x.stage<=6&&x.lines.length>=2));
 assert.ok(c.every(x=>x.lines.every(t=>typeof t==='string'&&t.trim()===t&&t.length>0)));
 assert.equal(c.find(x=>x.id==='04').lines[1],'你長大的那些年，他都在。');
 assert.equal(c.find(x=>x.id==='10').lines.at(-1),'你知道嗎？自從認識你，這個習慣就越來越沒用了。');
 assert.equal(c.find(x=>x.id==='23').lines.at(-1),'我又不是只有聊程式的時候才認真聽。');
 assert.equal(c.find(x=>x.id==='58').lines.at(-2),'我愛你，熙蒙。');
 assert.equal(c.find(x=>x.id==='59').lines[1],'那時候我們都還太小。沒有人問過我願不願意。');
 assert.ok(c.every(x=>x.lines.every(t=>!/抱歉|我回來了|我做過的事，我認/.test(t))));
});

test('NoApp only: anonymous Mirage, Chess, or unrecognized actor cannot inherit passages',()=>{
 for(const channel of ['mirage','chess'])
  assert.equal(noAppCinematicDirection({channel,recognized:true,relationshipPlan:r6,messages:user('我愛你')}),'');
 assert.equal(noAppCinematicDirection({channel:'noapp',recognized:false,relationshipPlan:r6,messages:user('我愛你')}),'');
 assert.equal(selectNoAppCinematicDialogue({channel:'noapp',recognized:true,messages:user('我愛你')}),null);
});

test('stage limits protect the original R1–R6 romance permissions',()=>{
 assert.equal(choose('你喜歡我嗎？',low),null);
 assert.equal(choose('你喜歡我嗎？',r4)?.id,'25');
 assert.equal(choose('我愛你',r4),null);
 assert.equal(choose('我愛你',r6)?.id,'58');
 assert.equal(choose('你愛我嗎？',r6)?.id,'25'=== '58'?'58':undefined);
 assert.equal(choose('你能說你愛我嗎？',r6),null);
 assert.equal(choose('我愛你',{...r6,canDeclareLove:false}),null);
 assert.equal(choose('你喜歡我嗎？',{...r4,rejected:true}),null);
 assert.equal(choose('你很傲慢',low)?.id,undefined);
 assert.equal(choose('你很傲慢',r4)?.id,'12');
});

test('sensitive, time-specific and invented-commitment passages stay behind evidence gates',()=>{
 assert.equal(choose('我怕失去聯絡',r6)?.id,undefined,'never invent meal debt');
 assert.equal(choose('我怕失去聯絡',r6,{messages:[{role:'user',content:'我欠你一頓飯'},{role:'user',content:'我怕失去聯絡'}]})?.id,'18');
 assert.equal(choose('你在哪個時區',r6,{londonClock:'14:35'})?.id,undefined);
 assert.equal(choose('我想聊時差',r6,{londonClock:'22:35',macauClock:'06:35'})?.id,'13');
 assert.equal(choose('我想聊時差',r6,{londonClock:'22:35',macauClock:'18:35'}),null);
 assert.equal(choose('我會不會死',r6),null);
 assert.equal(choose('我會不會死',{...r6,crisis:true})?.id,'42');
 assert.equal(choose('睡不著了',r6,{londonClock:'14:35'})?.id,'37'=== '60'?'60':undefined);
});

test('repeat detection removes an already-delivered literary passage, without creating plot history',()=>{
 const r=choose('你喜歡我嗎？',r4);
 assert.equal(r?.id,'25');
 const replay=selectNoAppCinematicDialogue({channel:'noapp',recognized:true,
  relationshipPlan:r4,messages:[{role:'assistant',content:r.lines.join('\n')},{role:'user',content:'你喜歡我嗎？'}]});
 assert.equal(replay,null);
});

test('NoApp text, voice and call model prompts receive relevant approved text and not future romance',()=>{
 const make=(relationshipPlan,query,mode='text')=>buildTaiPrompt({
  channel:'noapp',recognized:true,day:47,outputMode:mode,relationshipPlan,
  macauClock:'06:35',londonClock:'22:35',messages:user(query),memories:[]
 });
 for(const mode of ['text','voice','call']){
  const p=make(r4,'你喜歡我嗎？',mode);
  assert.match(p,/本輪話題可能適合的作者定稿/);
  assert.match(p,/我以為我已經表現得夠明顯了/);
  assert.doesNotMatch(p,/我愛你，熙蒙/);
 }
 const r1=make(low,'你喜歡我嗎？');
 assert.doesNotMatch(r1,/我以為我已經表現得夠明顯了/);
 const mirage=buildTaiPrompt({channel:'mirage',recognized:false,day:17,
  messages:user('你喜歡我嗎？'),relationshipPlan:r6});
 assert.doesNotMatch(mirage,/本輪話題可能適合的作者定稿/);
});

test('canonical relationship director remains the only authority for stage and love',()=>{
 const s={day:43,story55:{version:1,completed:{recognition:{day:33}}},aiDraft:{taiBond:{score:99}},
  content:{conversations:{noapp:[{id:'tai',messages:[]}]}}};
 const plan=taiRelationshipDirector(s,{input:'我愛你'});
 assert.equal(plan.canDeclareLove,false);
 const p=noAppCinematicDirection({channel:'noapp',recognized:true,relationshipPlan:plan,messages:user('我愛你')});
 assert.doesNotMatch(p,/我愛你，熙蒙/);
 assert.match(p,/R1–R6/);
});
