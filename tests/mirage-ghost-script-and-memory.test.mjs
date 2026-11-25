import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {ghostShareReadyForControl} from '../src/services/story55/ghost-share.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {projectTaiSharedWorkKnowledge} from '../src/services/ai/worldbook/shared-work-knowledge.js';
import {projectMirageTaiGlossary,projectTaiPlotGlossary} from '../src/services/ai/worldbook/plot-glossary.js';

const cid='s55-ouroboros';
const chat=s=>s.content.conversations.mirage.find(c=>c.id===cid);
const store=s=>({get:()=>s,update:fn=>fn(s)});

test('D19 after 那正好 delivers its authored response even when the delivery timer is recreated',()=>{
 const s=activateStory55(initialState());
 s.day=19;s.clock='08:09';s.unlocked=true;s.story55.activeScene=null;
 // This regression covers Ghost's approved fixed script, not unrelated scenes.
 s.story55.config.nodes=[];
 s.nav.current={appId:'mirage',route:'/chat/'+cid,params:{}};
 const c=chat(s)||(()=>{const row={id:cid,name:'Dr Ouroboros',messages:[]};s.content.conversations.mirage.push(row);return row;})();
 const cardId='s55-ghost-share-19-1';
 c.messages.push({id:cardId,kind:'ghost-project',from:'me',actual:true,day:19,time:'08:08',
  text:'[GHOST PROJECT]',attachment:{type:'ghost-project',projectId:'base',title:'Ouroboros’ Tear',percent:45}});
 s.story55.ghostShare={phase:'dialogue',script:'tear-19',index:0,pendingIds:[],cardId};
 const send=(expected,now)=>{
  const draft=scriptedDraft55(s,'mirage',cid,now);
  assert.equal(draft?.text,expected);
  sendScriptedDraft55(s,'mirage',cid,expected,now);
 };
 setMirageAuthenticated(true);
 try{
  send('忙嗎？',10000);
  const coffee=c.messages.find(m=>m.text==='在喝咖啡。');
  assert.equal(coffee?.schedule?.queuedAt,10000);
  let delivery=new MessageDelivery(store(s));
  delivery.tick(10000,true);
  assert.equal(coffee.delivery,undefined);
  delivery=new MessageDelivery(store(s)); // Safari re-created the timer
  delivery.tick(14500,true);
  assert.ok(coffee.delivery);
  send('那正好。',20000);
  const reply=c.messages.find(m=>m.text==='哪裡好了？');
  assert.equal(reply?.schedule?.queuedAt,20000);
  delivery=new MessageDelivery(store(s));
  delivery.tick(20000,true);
  assert.equal(reply.delivery,undefined);
  delivery=new MessageDelivery(store(s));
  delivery.tick(24500,true);
  assert.ok(reply.delivery,'the next authored response must not wait forever');
  assert.ok(visibleMessages(c,s).some(m=>m.text==='哪裡好了？'));
  assert.equal(c.messages.filter(m=>m.text==='哪裡好了？').length,1);
  send('反正你也沒事。',30000);
  delivery=new MessageDelivery(store(s));
  delivery.tick(34500,true);
  assert.ok(c.messages.find(m=>m.text==='……')?.delivery);
  assert.equal(ghostShareReadyForControl(s),true,'only after the approved final NPC line');
 }finally{setMirageAuthenticated(false);}
});

const snapshot=()=>({
 day:19,clock:'08:18',
 story55:{version:1,ended:false,completed:{}},
 content:{conversations:{mirage:[{id:cid,messages:[]}],noapp:[]}}
});
const shared=(s,id='card-45')=>chat(s).messages.push({
 id,kind:'ghost-project',from:'me',actual:true,day:19,time:'08:08',
 text:'[GHOST PROJECT]',attachment:{type:'ghost-project',projectId:'base',title:'Ouroboros’ Tear',percent:45}
});

test('Tai remembers only actual, previously shared Ghost work, not unreleased future status',()=>{
 const s=snapshot();shared(s);
 const entries=projectTaiSharedWorkKnowledge(s,{channel:'mirage',query:'你記得剛才的 GHOST 工程嗎'});
 assert.equal(entries.length,1);
 assert.match(entries[0].content,/Ouroboros’ Tear/);
 assert.match(entries[0].content,/45%/);
 assert.match(entries[0].content,/當時|快照/);
 assert.doesNotMatch(entries[0].content,/已完成100%|項目已成功/);
 assert.deepEqual(entries[0].sourceIds,['card-45']);
 assert.equal(projectTaiSharedWorkKnowledge(s,{channel:'mirage',query:'在喝咖啡？'}).length,1,
  'a recent shared card is also available during ordinary Mirage dialogue');
 const injected=projectMirageTaiGlossary(s,{channel:'mirage',recognized:false,messages:[{role:'user',content:'你還記得剛才的工程嗎？'}]});
 assert.ok(injected.some(x=>x.content.includes('45%')));
});

test('NoApp recalls an earlier genuinely shared work card only after recognition and on related topics',()=>{
 const s=snapshot();shared(s);
 assert.deepEqual(projectTaiSharedWorkKnowledge(s,{channel:'noapp',query:'你記得之前的 GHOST 嗎？'}),[]);
 s.story55.completed.recognition={day:19,clock:'08:15'};
 assert.equal(projectTaiSharedWorkKnowledge(s,{channel:'noapp',query:'昨晚分享給你的項目'}).length,1);
 assert.equal(projectTaiSharedWorkKnowledge(s,{channel:'noapp',query:'今天想吃什麼'}).length,0);
 assert.ok(projectTaiPlotGlossary(s,{channel:'noapp',recognized:true,messages:[{role:'user',content:'之前分享的GHOST呢？'}]})
  .some(x=>x.content.includes('45%')));
});

test('shared-work worldbook ignores unsent, forged and future-dated cards',()=>{
 const s=snapshot();
 shared(s,'valid');
 for(const [id,extra] of [
  ['not-sent',{actual:false}],['future',{day:20}],['not-player',{from:'s55-ouroboros'}],
  ['test-only',{testOnly:true}],['future-clock',{time:'23:00'}]
 ]){
  shared(s,id);Object.assign(chat(s).messages.at(-1),extra);
 }
 const known=projectTaiSharedWorkKnowledge(s,{channel:'mirage',query:'GHOST'});
 assert.deepEqual(known.flatMap(x=>x.sourceIds),['valid']);
});
