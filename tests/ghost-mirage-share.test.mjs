import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {shareGhostToTai,ghostShareScriptLine,ghostShareReadyForControl,beginGhostShareControl,finishGhostShareControl,ghostShareSource} from '../src/services/story55/ghost-share.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {render as renderMirage,handle as handleMirage,submit as submitMirage} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {render as renderGhost} from '../src/apps/ghost/index.js';

function fixture(day=16,clock='08:20'){
 const s=initialState();activateStory55(s);s.day=day;s.clock=clock;s.unlocked=true;
 s.story55.completed={wallet:{day:6,clock:'15:00'}};
 s.story55.config={...s.story55.config,nodes:[]};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 s.nav={current:{appId:'mirage',route:'/chat/s55-ouroboros',params:{}},stack:[]};
 if(!s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros'))
  s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 return s;
}
const store=s=>({get:()=>s,update:fn=>fn(s)});
const chat=s=>s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
const deliverNpc=s=>{for(const m of chat(s).messages)if(m.schedule&&!m.delivery)m.delivery={day:s.day,clock:s.clock};};
const sendNext=s=>{const draft=scriptedDraft55(s,'mirage','s55-ouroboros');assert.ok(draft);sendScriptedDraft55(s,'mirage','s55-ouroboros',draft.text);return draft.text;};

test('shares a real authorized Ghost project only in D15-D24; offline does not create AI replies',()=>{
 const s=fixture();assert.equal(ghostShareSource(s,{projectId:'base'}).projectId,'base');
 delete s.story55.projects.base;assert.equal(ghostShareSource(s,{projectId:'base'}),null);
 s.story55.projects.base={authorized:true,batches:[]};s.day=14;
 assert.equal(ghostShareSource(s,{projectId:'base'}),null);s.day=15;s.clock='11:00';
 const reply=shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:1000});
 assert.equal(reply.accepted,false);assert.equal(reply.online,false);
 assert.equal(chat(s).messages.at(-1).kind,'ghost-project');
 assert.equal(chat(s).messages.at(-1).attachment.projectId,'base');
 assert.equal(s.story55.ghostShareTakeovers||0,0);
});

test('failed 50% check preserves first story; native Send and delayed NPC delivery are required',()=>{
 const s=fixture();
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>.95,now:10000}).accepted,false);
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10030}).duplicate,true);
 const yes=shareGhostToTai(s,{projectId:'base'},{random:()=>.1,now:13000});
 assert.equal(yes.script,'first');
 assert.equal(s.story55.ghostShareTakeovers||0,0);
 assert.equal(chat(s).messages.at(-1).text,'？');
 assert.ok(chat(s).messages.at(-1).schedule);
 assert.equal(ghostShareScriptLine(s).kind,'wait');
 assert.equal(visibleMessages(chat(s),s).some(m=>m.text==='？'),false);
 deliverNpc(s);
 assert.equal(sendNext(s),'我想驗證一下你是不是azathoth');
 deliverNpc(s);
 assert.equal(sendNext(s),'嫌低級，那倒是做做看');
 deliverNpc(s);
 assert.equal(sendNext(s),'為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？');
 assert.equal(ghostShareReadyForControl(s),true);
 assert.equal(s.story55.ghostShareTakeovers||0,0,'random win must not consume a takeover');
 assert.equal(beginGhostShareControl(s),true);
 assert.equal(beginGhostShareControl(s),false);
 assert.equal(s.story55.ghostShareTakeovers,1);
 assert.equal(finishGhostShareControl(s),true);
});

test('second exact dialogue and third-stage one decision per game day',()=>{
 const s=fixture();s.story55.ghostShareTakeovers=1;
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10000}).script,'second');
 deliverNpc(s);assert.equal(sendNext(s),'你的千面之神在召喚你');
 deliverNpc(s);assert.equal(sendNext(s),'你還沒有證明自己是不是azathoth，我還不信任你，我反而好奇，你為什麼對我感興趣');
 deliverNpc(s);assert.equal(ghostShareReadyForControl(s),true);
 assert.equal(beginGhostShareControl(s),true);finishGhostShareControl(s);
 assert.equal(s.story55.ghostShareTakeovers,2);
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>.8,now:20000}).script,'dailyNo');
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:25000}).script,null);
 s.day=17;s.clock='08:20';
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:27000}).script,'dailyYes');
 deliverNpc(s);assert.equal(sendNext(s),'謝囉');
 assert.equal(ghostShareReadyForControl(s),true);
});

test('MIRAGE renders share card and returns to the real GHOST project',()=>{
 const s=fixture();shareGhostToTai(s,{projectId:'base'},{random:()=>.99,now:10000});
 s.story55.d13={phase:'chat'};setMirageAuthenticated(true);
 try{
  const html=renderMirage({store:store(s)},{route:'/chat/s55-ouroboros'});
  assert.match(html,/mc-ghost-card/);assert.match(html,/data-action="mc-ghost-project"/);
  const calls=[],ctx={store:store(s),router:{open:x=>calls.push(x)}};
  handleMirage('mc-ghost-project',{dataset:{messageId:chat(s).messages.at(-1).id}},ctx,{route:'/chat/s55-ouroboros'});
  assert.equal(calls[0].appId,'ghost');
  assert.equal(calls[0].route,'/deployment');
 }finally{setMirageAuthenticated(false);}
});

test('Ghost shows share button on authorized project only within D15-D24',()=>{
 const s=fixture();
 assert.match(renderGhost({store:store(s)},{route:'/deployment',params:{project:'base'}}),/data-action="gh-share"/);
 s.day=25;
 assert.doesNotMatch(renderGhost({store:store(s)},{route:'/deployment',params:{project:'base'}}),/data-action="gh-share"/);
});

test('forbidden character name disappears without creating a normal MIRAGE message',()=>{
 const s=fixture(),before=chat(s).messages.length;setMirageAuthenticated(true);
 const original=globalThis.FormData;
 try{
  globalThis.FormData=class{get(n){return n==='text'?'陳熙泰':'';}};
  const input={value:'陳熙泰'};
  submitMirage({dataset:{form:'mc-send',id:'s55-ouroboros'},elements:{text:input}},{store:store(s)},{route:'/chat/s55-ouroboros'});
  assert.equal(input.value,'');
  assert.equal(chat(s).messages.length,before);
 }finally{globalThis.FormData=original;setMirageAuthenticated(false);}
});

test('native MessageDelivery releases NPC bubble only in the authenticated conversation and state survives reload',()=>{
 const s=fixture();
 const r=shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:1000});
 const id=r.cardId+'-tai-0';
 const delivery=new MessageDelivery(store(s));
 delivery.tick(30000,true);
 assert.equal(chat(s).messages.find(m=>m.id===id).delivery,undefined);
 setMirageAuthenticated(true);
 try{
  delivery.tick(31000,true);
  delivery.tick(31500,true);
  assert.ok(chat(s).messages.find(m=>m.id===id).delivery);
 }finally{setMirageAuthenticated(false);}
 const restored=structuredClone(s);
 assert.equal(restored.story55.ghostShareTakeovers||0,0);
 assert.equal(ghostShareScriptLine(restored).text,'我想驗證一下你是不是azathoth');
 assert.equal(restored.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id===id).length,1);
});
