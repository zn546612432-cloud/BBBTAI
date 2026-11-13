import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {shareGhostToTai,ghostShareScriptLine,ghostShareReadyForControl,beginGhostShareControl,finishGhostShareControl,ghostShareSource,resolveGhostShare,expireGhostShare,TAI_REMOTE_TYPED_LINE} from '../src/services/story55/ghost-share.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {render as renderMirage,handle as handleMirage,submit as submitMirage,onEnter as enterMirage} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {render as renderGhost,handle as handleGhost} from '../src/apps/ghost/index.js';

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

test('first takeover is guaranteed; native Send and delayed NPC delivery are required',()=>{
 const s=fixture();
 const yes=shareGhostToTai(s,{projectId:'base'},{random:()=>.99,now:10000});
 assert.equal(yes.accepted,true);
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10030}).duplicate,true);
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
 assert.equal(s.story55.ghostShareTakeovers||0,0,'agreement must not consume a takeover');
 assert.equal(beginGhostShareControl(s),true);
 assert.equal(beginGhostShareControl(s),false);
 assert.equal(s.story55.ghostShareTakeovers,1);
 assert.equal(finishGhostShareControl(s),true);
});

test('second exact dialogue and third-stage one decision per game day',()=>{
 const s=fixture();s.story55.ghostShareTakeovers=1;
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>.99,now:10000}).script,'second');
 deliverNpc(s);assert.equal(sendNext(s),'你的千面之神在召喚你');
 deliverNpc(s);assert.equal(sendNext(s),'你還沒有證明自己是不是azathoth，我還不信任你，我反而好奇，你為什麼對我感興趣');
 deliverNpc(s);assert.equal(ghostShareReadyForControl(s),true);
 assert.equal(beginGhostShareControl(s),true);finishGhostShareControl(s);
 assert.equal(s.story55.ghostShareTakeovers,2);
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>.8,now:20000}).script,'dailyNo');
 deliverNpc(s);
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>{throw Error('must not reroll');},now:25000}).script,'dailyNo');
 deliverNpc(s);
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
  handleMirage('mc-ghost-project',{dataset:{messageId:chat(s).messages.find(m=>m.kind==='ghost-project').id}},ctx,{route:'/chat/s55-ouroboros'});
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

test('anonymous MIRAGE spoiler Send silently clears input/draft without messages, notifications or requests',()=>{
 const original=globalThis.FormData,oldFetch=globalThis.fetch;
 setMirageAuthenticated(true);
 globalThis.fetch=()=>assert.fail('spoiler input cannot request AI');
 try{
  for(const day of [6,16,24,30])for(const text of ['陳熙泰','熙 泰','我是你哥','我是你的親哥哥','三胞胎','我們是兄弟']){
   const s=fixture(day);s.drafts={'s55-ouroboros':text};
   const input={value:text},before=structuredClone({messages:chat(s).messages,events:s.events,notifications:s.notifications});
   globalThis.FormData=class{get(n){return n==='text'?text:'';}};
   submitMirage({dataset:{form:'mc-send',id:'s55-ouroboros'},elements:{text:input}},
    {store:store(s),toast:()=>assert.fail('spoiler input must be silent')},s.nav.current);
   assert.equal(input.value,'');assert.equal(s.drafts['s55-ouroboros'],undefined);
   assert.deepEqual({messages:chat(s).messages,events:s.events,notifications:s.notifications},before);
  }
 }finally{globalThis.FormData=original;globalThis.fetch=oldFetch;setMirageAuthenticated(false);}
});

test('spoiler gate respects recognition and only targets the anonymous MIRAGE contact',async()=>{
 const {blocksAnonymousMirageInput}=await import('../src/services/story55/mirage-input.js');
 const s=fixture();
 assert.equal(blocksAnonymousMirageInput(s,'s55-ouroboros','我哥今晚回來'),false);
 assert.equal(blocksAnonymousMirageInput(s,'s55-ouroboros','我是你哥'),true);
 assert.equal(blocksAnonymousMirageInput(s,'other-contact','我是你哥'),false);
 s.story55.completed.recognition={day:30,clock:'20:00'};
 assert.equal(blocksAnonymousMirageInput(s,'s55-ouroboros','熙泰，我是你哥'),false);
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
  delivery.tick(34000,true);
  assert.ok(chat(s).messages.find(m=>m.id===id).delivery);
 }finally{setMirageAuthenticated(false);}
 const restored=structuredClone(s);
 assert.equal(restored.story55.ghostShareTakeovers||0,0);
 assert.equal(ghostShareScriptLine(restored).text,'我想驗證一下你是不是azathoth');
 assert.equal(restored.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id===id).length,1);
});

test('first takeover uses the native MIRAGE Send path, displays Xi Meng as sender and never triggers scripted AI',()=>{
 const s=fixture(),reply=shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10000});
 assert.equal(reply.script,'first');
 deliverNpc(s);sendNext(s);
 deliverNpc(s);sendNext(s);
 deliverNpc(s);sendNext(s);
 assert.equal(ghostShareReadyForControl(s),true);
 assert.equal(beginGhostShareControl(s),true);
 s.story55.ghostShare.remote={active:true,stage:'typing',authorizedDay:16,warningShown:false};
 s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};
 const original=globalThis.FormData;
 setMirageAuthenticated(true);
 try{
  globalThis.FormData=class {get(name){return name==='text'?TAI_REMOTE_TYPED_LINE:'';}};
  const input={value:TAI_REMOTE_TYPED_LINE},form={dataset:{form:'mc-send',id:'s55-ouroboros'},elements:{text:input}};
  const ctx={store:store(s),toast:()=>{}};
  const before=chat(s).messages.length;
  submitMirage(form,ctx,{route:'/chat/s55-ouroboros'});
  assert.equal(input.value,'','the native form clears after SEND');
  assert.equal(chat(s).messages.length,before+1);
  const outgoing=chat(s).messages.at(-1);
  assert.equal(outgoing.id,reply.cardId+'-remote-typing');
  assert.equal(outgoing.from,'me','Tai has used Xi Meng\'s signed-in account');
  assert.equal(outgoing.text,TAI_REMOTE_TYPED_LINE);
  assert.equal(s.story55.ghostShare.remote.stage,'sent');
  assert.equal(s.events.filter(e=>e.type==='message_sent'&&e.messageId===outgoing.id).length,1);
  assert.match(renderMirage({store:store(s)},{route:'/chat/s55-ouroboros'}),/閉嘴吧，熙蒙，現在我來操控你的手機/);
  const rendered=renderMirage({store:store(s)},{route:'/chat/s55-ouroboros'});
  assert.match(rendered,new RegExp('mc-clear-row message-row is-mine mine[^>]*data-key="message-'+outgoing.id+'"'));
  // A second synthetic SEND cannot duplicate the bubble or produce a new NPC answer.
  submitMirage(form,ctx,{route:'/chat/s55-ouroboros'});
  assert.equal(chat(s).messages.filter(m=>m.id===outgoing.id).length,1);
  assert.equal(chat(s).messages.length,before+1);
 }finally{globalThis.FormData=original;setMirageAuthenticated(false);}
});

test('remote takeover removes wait-only input disabling while exclusive control owns the phone',()=>{
 const s=fixture();
 shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10000});
 deliverNpc(s);sendNext(s);
 deliverNpc(s);sendNext(s);
 deliverNpc(s);sendNext(s);
 assert.equal(ghostShareReadyForControl(s),true);
 assert.equal(ghostShareScriptLine(s)?.kind,'wait','before takeover player is still waiting');
 beginGhostShareControl(s);
 s.story55.ghostShare.remote={active:true,stage:'typing',authorizedDay:16};
 assert.equal(ghostShareScriptLine(s),null,'remote control must not disable native composer');
 s.story55.d13={phase:'chat'};
 s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};
 setMirageAuthenticated(true);
 try{
  const html=renderMirage({store:store(s)},{route:'/chat/s55-ouroboros'});
  const nativeForm=html.match(/<form class="mc-composer[\s\S]*?<\/form>/)?.[0]||'';
  assert.ok(nativeForm.includes('name="text"'));
  assert.doesNotMatch(nativeForm,/<input[^>]*\sdisabled(?:\s|>)/,'HTML FormData must include the input while Tai types');
 }finally{setMirageAuthenticated(false);}
});

test('share icon asks Yes or No before creating a MIRAGE card on the existing project screen',()=>{
 const s=fixture();s.nav.current={appId:'ghost',route:'/deployment',params:{project:'base'}};
 const loc={appId:'ghost',route:'/deployment',params:{project:'base'}};
 const navigated=[],ctx={store:store(s),router:{open:entry=>navigated.push(entry)},refresh(){}};
 const count=()=>chat(s).messages.filter(m=>m.kind==='ghost-project').length;
 const original=count();
 handleGhost('gh-share',{dataset:{}},ctx,loc);
 assert.equal(count(),original,'tap alone must not transmit');
 assert.match(renderGhost(ctx,loc),/是否分享到 MIRAGE？/);
 assert.match(renderGhost(ctx,loc),/data-action="gh-share-yes"/);
 assert.match(renderGhost(ctx,loc),/data-action="gh-share-no"/);
 handleGhost('gh-share-no',{dataset:{}},ctx,loc);
 assert.equal(count(),original);
 assert.doesNotMatch(renderGhost(ctx,loc),/是否分享到 MIRAGE？/);
 assert.equal(navigated.length,0,'No must not change app');
 handleGhost('gh-share',{dataset:{}},ctx,loc);
 handleGhost('gh-share-yes',{dataset:{}},ctx,loc);
 assert.equal(count(),original+1,'Yes must create exactly one original share card');
 assert.equal(navigated.length,1);
 assert.equal(navigated[0].appId,'mirage');
 assert.equal(navigated[0].route,'/chat/s55-ouroboros');
 enterMirage();
 const html=renderMirage(ctx,navigated[0]);
 assert.doesNotMatch(html,/data-form="mc-login"/);
 assert.match(html,/mc-composer/);
 assert.match(html,/mc-ghost-card/);
 enterMirage(); // The one-use handoff cannot bypass an ordinary later login.
 assert.match(renderMirage(ctx,navigated[0]),/data-form="mc-login"/);
});

for(const count of [2,3])test(`online rejection always responds without consuming takeover ${count}`,()=>{
 const s=fixture();s.story55.ghostShareTakeovers=count;
 const result=shareGhostToTai(s,{projectId:'base'},{random:()=>.99});
 assert.equal(result.script,'dailyNo');assert.equal(result.accepted,false);
 const replies=chat(s).messages.filter(m=>m.id.startsWith(result.cardId+'-tai-'));
 assert.deepEqual(replies.map(m=>m.text),['你真的會寫代碼嗎？','我很忙，你自己處理']);
 assert.ok(replies[0].schedule.seconds>=2.5);
 assert.ok(Math.abs(replies[1].schedule.seconds-replies[0].schedule.seconds-2.2)<1e-9,
  'consecutive replies use the existing 2.2 second pause without a second reading delay');
 assert.equal(ghostShareReadyForControl(s),false);
 assert.equal(s.story55.ghostShareTakeovers,count);
});

test('offline share survives reload, resumes once on existing story tick, and keeps original card',()=>{
 const s=fixture(16,'11:00');
 const result=shareGhostToTai(s,{projectId:'base'},{random:()=>{throw Error('offline cannot roll');}});
 assert.equal(result.pending,true);assert.equal(s.story55.ghostShare.phase,'awaiting-online');
 const restored=structuredClone(s);assert.equal(resolveGhostShare(restored),null);
 restored.clock='12:00';
 assert.equal(resolveGhostShare(restored,{random:()=>{throw Error('first takeover cannot roll');}}).script,'first');
 assert.equal(resolveGhostShare(restored,{random:()=>{throw Error('must not reroll');}}),null);
 assert.equal(chat(restored).messages.filter(m=>m.kind==='ghost-project').length,1);
 assert.equal(chat(restored).messages.filter(m=>m.id===result.cardId+'-tai-0').length,1);
 assert.equal(restored.story55.ghostShareTakeovers||0,0);
});

test('old unanswered share is repaired once; expired offline shares cannot take over',()=>{
 const s=fixture(16,'11:00');shareGhostToTai(s,{projectId:'base'});
 s.story55.ghostShare.phase='idle';s.clock='12:00';
 assert.equal(resolveGhostShare(s,{random:()=>.99}).script,'first');
 assert.equal(resolveGhostShare(s),null);
 const late=fixture(24,'23:30');shareGhostToTai(late,{projectId:'base'});
 late.day=25;assert.equal(expireGhostShare(late),true);
 assert.equal(resolveGhostShare(late),null);assert.equal(late.story55.ghostShare.phase,'expired');
});

for(const count of [0,1])test(`expired source cannot bypass validation during guaranteed takeover ${count+1}`,()=>{
 const s=fixture(16,'11:00');shareGhostToTai(s,{projectId:'base'});
 s.story55.ghostShareTakeovers=count;
 delete s.story55.projects.base;s.clock='12:00';
 assert.equal(resolveGhostShare(s,{random:()=>{throw Error('invalid source cannot roll');}}).script,'dailyNo');
 assert.equal(ghostShareReadyForControl(s),false);
});

for(const count of [0,1])test(`guaranteed takeover ${count+1} ignores old daily refusal without using randomness`,()=>{
 const s=fixture();s.story55.ghostShareTakeovers=count;
 s.story55.ghostShareDaily={day:s.day,accepted:false,cardId:'old-refusal'};
 const reply=shareGhostToTai(s,{projectId:'base'},{random:()=>{throw Error('first two cannot roll');}});
 assert.equal(reply.accepted,true);
 assert.equal(reply.script,count===0?'first':'second');
 assert.equal(s.story55.ghostShareTakeovers,count);
 assert.equal(s.story55.ghostShareDaily.cardId,'old-refusal');
});

for(const count of [0,1])test(`saved refusal preserves history and allows guaranteed takeover ${count+1} on retry`,()=>{
 const s=fixture(16,'11:00');s.story55.ghostShareTakeovers=count;
 shareGhostToTai(s,{projectId:'base'},{now:10000});
 delete s.story55.projects.base;s.clock='12:00';
 assert.equal(resolveGhostShare(s).script,'dailyNo');
 deliverNpc(s);
 const restored=structuredClone(s),history=structuredClone(chat(restored).messages);
 restored.story55.projects.base={authorized:true,batches:[],active:null};
 const reply=shareGhostToTai(restored,{projectId:'base'},{
  random:()=>{throw Error('retry before two takeovers cannot roll');},now:20000
 });
 assert.equal(reply.accepted,true);
 assert.equal(reply.script,count===0?'first':'second');
 assert.deepEqual(chat(restored).messages.slice(0,history.length),history);
 assert.equal(restored.story55.ghostShareTakeovers,count);
});

for(const roll of [0,.499999,.5,.999999])test(`third-stage acceptance retains 50% boundary for roll ${roll}`,()=>{
 const s=fixture();s.story55.ghostShareTakeovers=2;
 let rolls=0;
 const reply=shareGhostToTai(s,{projectId:'base'},{random:()=>{rolls++;return roll;}});
 assert.equal(reply.accepted,roll<.5);
 assert.equal(reply.script,roll<.5?'dailyYes':'dailyNo');
 assert.equal(rolls,1);
 assert.equal(s.story55.ghostShareDaily.accepted,roll<.5);
 assert.equal(s.story55.ghostShareDaily.day,s.day);
 assert.equal(s.story55.ghostShareTakeovers,2);
});
