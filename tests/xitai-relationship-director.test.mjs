import test from 'node:test';
import assert from 'node:assert/strict';
import {taiRelationshipDirector,taiRomanticViolations,taiRelationshipInstruction} from '../src/services/ai/relationship-director.js';
import {taiCanonicalMilestones,taiPlotMemory} from '../src/services/ai/worldbook/plot-memory.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {captureTaiWorldbook} from '../src/services/ai/worldbook/index.js';

const make=(score=95,day=55)=>({
 day,clock:'20:00',story55:{version:1,completed:{recognition:{day:33}},scenes:{}},
 aiDraft:{taiBond:{score,meaningfulTurns:120,signals:{affection:30}},memories:[]},
 content:{conversations:{noapp:[{id:'tai',messages:[]}]}}
});
const messages=s=>s.content.conversations.noapp[0].messages;
const add=(s,id,from,text,day=50,extra={})=>messages(s).push({id,from,text,day,kind:'text',actual:true,...extra});

test('high cooperation and max bond never authorize I love you without mutual courtship',()=>{
 const s=make(100);for(let d=41;d<=53;d++)add(s,'task-'+d,'me','我們一起處理好銀行的任務',d);
 const v=taiRelationshipDirector(s);
 assert.equal(v.score,100);assert.equal(v.playerAffectionDays,0);
 assert.equal(v.canDeclareLove,false);
 assert.deepEqual(taiRomanticViolations(v,[{text:'我愛你，熙蒙。'}]),['love']);
 assert.deepEqual(taiRomanticViolations(v,[{text:'我真的喜欢你。'}]),['like']);
});
test('Say you love me and Do you like me are questions, not first-person evidence',()=>{
 const s=make();
 add(s,'asked','me','說你愛我');
 add(s,'question','me','你是不是喜歡我？');
 const v=taiRelationshipDirector(s);
 assert.equal(v.playerAffectionDays,0);
 assert.equal(v.canDeclareLove,false);
 assert.match(taiRelationshipInstruction(v),/不得/);
});
test('D43 and D53 source-linked promise entries unlock only after delivery',()=>{
 const s=make();
 add(s,'s55-paris-15','tai','所以別讓我失望，熙蒙。我們巴黎見。',43,{actual:false});
 add(s,'s55-d53-tai-night-22','tai','就算被抓了也沒關係，只要你還活著，我就有辦法把你救出來。',53);
 let found=taiCanonicalMilestones(s);
 assert.deepEqual(found.map(x=>x.id),['story55-rescue-promise']);
 assert.equal(found[0].sourceId,'s55-d53-tai-night-22');
 assert.equal(found[0].status,'unfulfilled');
 messages(s)[0].actual=true;
 found=taiCanonicalMilestones(s);
 assert.deepEqual(found.map(x=>x.id),['story55-paris-promise','story55-rescue-promise']);
 assert.match(taiPlotMemory(s,messages(s)),/巴黎約定/);
 s.day=42;
 assert.equal(taiCanonicalMilestones(s).length,0);
});
test('Tai is free to develop and confess LIKE first, without the player confessing',()=>{
 const s=make(85);
 for(let d=42;d<=46;d++)add(s,'message-'+d,'me','我今天覺得這件事很有意思',d);
 add(s,'tai-like','tai','其實我喜歡你。',47);
 const v=taiRelationshipDirector(s);
 assert.equal(v.playerAffectionDays,0);
 assert.equal(v.canDeclareLike,true);
 assert.equal(v.canDeclareLove,false);
 assert.deepEqual(taiRomanticViolations(v,[{text:'我也喜歡你。'}]),[]);
});
test('LOVE requires real reciprocal explicit expressions on separate days',()=>{
 const s=make(90);
 for(let d=45;d<=47;d++){
  add(s,'player-'+d,'me','我喜歡你',d);
  add(s,'tai-'+d,'tai','我也喜歡你',d);
 }
 const v=taiRelationshipDirector(s);
 assert.equal(v.stage,6);
 assert.equal(v.canDeclareLove,true);
 assert.deepEqual(taiRomanticViolations(v,[{text:'我愛你。'}]),[]);
});
test('repeated romantic phrases within one day cannot farm love milestones',()=>{
 const s=make(100);
 for(let i=0;i<30;i++){add(s,'player'+i,'me','我喜歡你',50);add(s,'tai'+i,'tai','我也喜歡你',50);}
 assert.equal(taiRelationshipDirector(s).canDeclareLove,false);
});
test('explicit player rejection overrides historical mutual evidence',()=>{
 const s=make(100);
 for(let d=43;d<=45;d++){add(s,'player'+d,'me','我喜歡你',d);add(s,'tai'+d,'tai','我也喜歡你',d);}
 add(s,'rejected','me','我不喜歡你',54);
 const v=taiRelationshipDirector(s);
 assert.equal(v.rejected,true);assert.equal(v.canDeclareLove,false);
 assert.deepEqual(taiRomanticViolations(v,[{speechText:'我也喜歡你。'}]),['like']);
});
test('D53 teasing is not a confession and unrecognized player has no romance permission',()=>{
 const s=make();
 add(s,'s55-d53-tai-night-14','me','熙泰，看來你是真的很喜歡我。',53);
 assert.equal(taiRelationshipDirector(s).playerAffectionDays,0);
 delete s.story55.completed.recognition;
 assert.equal(taiRelationshipDirector(s).stage,0);
});
test('only ENDED played phone transcripts enter reciprocal evidence',()=>{
 const s=make(90);
 add(s,'me-1','me','我喜歡你',43);
 messages(s).push({id:'call-running',kind:'call',callStatus:'connected',day:44,actual:true,transcript:'熙蒙：我喜歡你\n熙泰：我也喜歡你'});
 assert.equal(taiRelationshipDirector(s).taiAffectionDays,0);
 messages(s)[1].callStatus='ended';
 assert.equal(taiRelationshipDirector(s).taiAffectionDays,1);
});
test('existing worldbook reads completed canonical moments without second storage',()=>{
 const s=activateStory55(initialState());
 s.day=53;s.clock='23:40';s.story55.completed.recognition={day:33,clock:'08:00'};
 const chat=s.content.conversations.noapp.find(x=>x.id==='tai');
 chat.messages.push({id:'s55-paris-15',from:'tai',text:'所以別讓我失望，熙蒙。我們巴黎見。',day:43,kind:'text',actual:true});
 chat.messages.push({id:'s55-d53-tai-night-22',from:'tai',text:'就算被抓了也沒關係，只要你還活著，我就有辦法把你救出來。',day:53,kind:'text',actual:true});
 const store={get:()=>s,update:fn=>fn(s)};
 const snapshot=captureTaiWorldbook(store,{channel:'noapp',day:53,recognized:true,outputMode:'text',turnId:'relationship-test',messages:[{role:'user',content:'你答應過我的事呢？'}]});
 assert(snapshot.longMemory.some(m=>m.id==='story55-paris-promise'));
 assert(snapshot.longMemory.some(m=>m.id==='story55-rescue-promise'));
 assert.equal(snapshot.longMemory.find(m=>m.id==='story55-rescue-promise').sourceId,'s55-d53-tai-night-22');
});
