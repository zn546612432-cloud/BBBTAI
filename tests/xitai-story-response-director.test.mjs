import test from 'node:test';
import assert from 'node:assert/strict';
import {planTaiStoryResponse,taiStoryResponsePrompt,tuneTaiStoryTurnPlan} from '../src/services/ai/story-response-director.js';
import {taiTurnShapePrompt,taiTurnNeedsMore,sampleTaiTurnPlan} from '../src/services/ai/conversation-shape-v12.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {captureTaiWorldbook} from '../src/services/ai/worldbook/index.js';

const utterance=text=>[{role:'user',content:text}];
const sense=(text,opts={})=>planTaiStoryResponse({messages:utterance(text),channel:'noapp',recognized:true,...opts});
function fixture(){
 const s=initialState();activateStory55(s);
 s.day=53;s.clock='23:30';s.story55.completed.recognition={day:33,clock:'12:00'};
 return s;
}

test('story concern is an intent, not an encyclopedia answer or fixed scene',()=>{
 assert.equal(sense('你觉得傅隆生会放过我吗？')?.intent,'fear');
 assert.equal(sense('我是不是害了熙旺？')?.intent,'guilt');
 assert.equal(sense('你是不是早就知道傅隆生的事情？')?.intent,'suspicion');
 assert.equal(sense('你觉得永利计划值得冒险吗？')?.intent,'judgment');
 for(const line of ['傅隆生是谁？','雇佣兵有多少人？','今天想吃炸鸡','别说了','你好吗？']){
  assert.equal(sense(line),null,line);
 }
 assert.equal(planTaiStoryResponse({messages:utterance('你觉得傅隆生会放过我吗？'),channel:'mirage',recognized:true}),null);
 assert.equal(planTaiStoryResponse({messages:utterance('你觉得傅隆生会放过我吗？'),channel:'noapp',recognized:false}),null);
});

test('program leaves unearned facts out; the existing canonical worldbook remains the only authority',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 let context={channel:'noapp',recognized:true,day:53,turnId:'scene:before',messages:utterance('你觉得傅隆生会放过我吗？')};
 let snap=captureTaiWorldbook(store,context);
 let dir=planTaiStoryResponse({...context,worldbookSnapshot:snap});
 assert(dir.hasLore);
 assert(dir.sourceIds.includes('story-lore:fu-longsheng'));
 const before=buildTaiPrompt({...context,worldbookSnapshot:snap,storyReplyDirection:dir});
 assert.match(before,/本輪劇情反應導演/);
 assert.match(before,/背行動清單|逐條復述資料/);
 assert.doesNotMatch(before,/熙蒙親口告訴熙泰，自己安排了兩百/);
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'s55-d53-tai-night-26',from:'me',day:53,kind:'text',actual:true,text:'兩百個人，還有一枚足以炸掉整棟樓的炸彈。'});
 context={...context,turnId:'scene:after'};
 snap=captureTaiWorldbook(store,context);
 assert.match(buildTaiPrompt({...context,worldbookSnapshot:snap}),/兩百個人/);
});

test('random quotas and forced guides yield to serious sourced moments without changing ordinary chat defaults',()=>{
 const sampled={target:5,guide:true,semicolonBurst:true,mode:'text',eligible:true};
 const dir=sense('你觉得傅隆生会放过我吗？');
 const altered=tuneTaiStoryTurnPlan(sampled,dir);
 assert.equal(altered.target,3);
 assert.equal(altered.guide,false);
 assert.equal(altered.semicolonBurst,false);
 assert.equal(altered.optionalBeats,true);
 assert.match(taiTurnShapePrompt(altered),/不是最低條數/);
 assert.equal(taiTurnNeedsMore({plan:altered,entries:[{text:'我不敢替他保證。'}],messages:utterance('你觉得傅隆生会放过我吗？')}),false);
 assert.equal(tuneTaiStoryTurnPlan(sampled,null),sampled);
 const ordinary=sampleTaiTurnPlan({random:()=>0,maxMessages:5,messages:utterance('今晚吃什么？')});
 assert.equal(ordinary.target,3);
 assert.equal(ordinary.optionalBeats,undefined);
});

test('source-less serious moment may express uncertainty, but cannot invent plot or player psychology',()=>{
 const dir=sense('你觉得熙旺怎么办？',{worldbookSnapshot:{entries:[]}});
 assert.equal(dir.hasLore,false);
 const p=taiStoryResponsePrompt(dir);
 assert.match(p,/沒有可靠的已解鎖證據/);
 assert.match(p,/不要固定/);
 assert.match(p,/不要每輪都替他下心理診斷/);
 assert.doesNotMatch(p,/你自己心裡不是已經有答案|兩百個人，炸彈/);
});
