import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55} from '../src/services/story55/runtime.js';
import {nodeStatus,completed,date55,story55ChargeGate,timedStoryPaused,pendingTimedStoryEvent} from '../src/services/story55/state.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes,tickWorld} from '../src/system/time/clock.js';
import {settlePhoneBackground} from '../src/system/runtime/controller.js';
import {visibleMessages} from '../src/services/messaging/delivery.js';
import {D41_CALL,D42_CALL,RETIRED_SCENES} from '../src/story/d34-d42/definition.js';
import {d41CallDue,d42CallDue,playScriptedCallSequence,maybeStartD41Call,maybeStartD42Call,callAction,callState,callView,scriptedCallDraft,submitCall} from '../src/apps/noapp/voice-call.js';
import {D41_CHESS_INVITATION,offerD41ChessInvitation,receiveInvitation,deferInvitation} from '../src/services/invitations.js';
import {playMove,postMatchMessage,resignChessMatch} from '../src/services/chess.js';
import {advanceD41Chess,completeD41ChessCue,sendD41ChessDraft,d41ChessDraft} from '../src/services/chess-scripted.js';
import {D41_CHESS_CUES,D41_CHESS_DRAFT} from '../src/story/d34-d42/d41-chess.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';

function phone(day,clock){const s=initialState();activateStory55(s);rebuildStory55AtDay(s,day,clock);return s;}
function finish(s,id,chat,channel='wechat'){while(!completed(s,id)){
 const next=sceneLines(s,id)[scene55(s,id).index];
 if(next[0]==='me')sendScriptedDraft55(s,channel,chat,next[1]);
 else advanceScene55(s,id);
}}
test('D34 is recognition-dependent, optional and expires; D39 requires actual delivery',()=>{
 const s=phone(34,'14:00');
 delete s.story55.completed.recognition;
 assert.equal(nodeStatus(s,'d34-wang').state,'locked');
 s.day=37;s.story55.completed.recognition={day:37,clock:'14:00'};
 assert.equal(nodeStatus(s,'d34-wang').state,'ready');
 advanceScene55(s,'d34-wang');assert.equal(s.story55.activeScene,null);
 s.day=39;s.clock='16:48';assert.equal(nodeStatus(s,'d34-wang').state,'locked');
 assert.equal(nodeStatus(s,'d39-wang').state,'locked');
 tickStory55(s);assert.equal(nodeStatus(s,'d39-wang').state,'ready');
 assert.equal(s.story55.config.nodes.some(n=>n.day===40&&n.channel==='wechat'),false);
});
test('D41 23:30 and next calendar day 02:00 use native send and shared overnight clock',()=>{
 const s=phone(41,'23:29'),group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(nodeStatus(s,'d41-opening').state,'locked');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,100);assert.equal(s.clock,'23:30');
 assert.equal(timedStoryPaused(s),true);const battery=s.batteryPercent;
 advanceGameMinutes(s,100);assert.equal(s.clock,'23:30');assert.equal(s.batteryPercent,battery);
 finish(s,'d41-opening','group');
 assert.equal(group.messages.find(m=>m.id==='s55-d41-opening-0').time,'23:30');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,149);assert.equal(s.clock,'23:40');
 assert.equal(pendingTimedStoryEvent(s).id,D41_CALL.id);
 s.story55.scriptedCallCompleted={[D41_CALL.id]:true};
 assert.equal(timedStoryPaused(s),true); // voice completed, chess still outstanding
 s.matches.push({invitationId:D41_CHESS_INVITATION,status:'finished'});
 advanceGameMinutes(s,139);assert.equal(s.day,41);assert.equal(s.clock,'01:59');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,100);assert.equal(s.clock,'02:00');assert.equal(nodeStatus(s,'show').state,'ready');
 assert.equal(timedStoryPaused(s),true);
 finish(s,'show','group');
 const messages=visibleMessages(group,s).filter(m=>m.id.startsWith('s55-d42-celebration-'));
 assert.equal(messages.length,9);assert.equal(messages[0].time,'02:00');assert.equal(messages[0].sentDate,date55(42));
 assert.equal(messages[5].kind,'image');assert.equal(messages[5].from,'me');
 assert.equal(story55ChargeGate(s),null);
});
test('D42 morning call is due once at 09:25 and unconfirmed later scenes have no copy',()=>{
 const s=phone(42,'09:24');assert.equal(completed(s,'show'),true);assert.equal(d42CallDue(s),false);
 s.clock='09:25';assert.equal(d42CallDue(s),true);s.story55.d42CallTriggered=true;assert.equal(d42CallDue(s),true);
 s.story55.scriptedCallCompleted={[D42_CALL.id]:true};assert.equal(d42CallDue(s),false);
 for(const id of RETIRED_SCENES){assert.equal(sceneLines(s,id).length,0);assert.equal(nodeStatus(s,id).state,'locked');}
});
test('D42 preset plays the three exact lines in order with two 2500ms post-playback gaps; hangup cancels',async()=>{
 const events=[];let active=true;
 const opts={current:()=>active,synthesize:async text=>text,play:async(clip,text)=>{assert.equal(clip,text);events.push(text);return 'completed';},wait:async ms=>events.push(ms)};
 await playScriptedCallSequence(D42_CALL,opts);
 assert.deepEqual(events,[D42_CALL.lines[0],2500,D42_CALL.lines[1],2500,D42_CALL.lines[2]]);
 events.length=0;await playScriptedCallSequence(D42_CALL,{...opts,wait:async ms=>{events.push(ms);active=false;}});
 assert.deepEqual(events,[D42_CALL.lines[0],2500]);
});
test('D41 preset call is due at 23:40 independently of group replies; invitation opens the authored cinematic game',()=>{
 const s=phone(41,'23:30');
 assert.equal(d41CallDue(s),false);
 s.clock='23:39';assert.equal(d41CallDue(s),false);
 s.clock='23:40';assert.equal(d41CallDue(s),true);
 assert.equal(completed(s,'d41-opening'),false);
 assert.deepEqual(D41_CALL.steps.map(step=>step[0]),['tai','me','me','tai','tai','invite','tai']);
 s.story55.d41CallTriggered=true;assert.equal(d41CallDue(s),true);
 assert.equal(offerD41ChessInvitation(s),true);assert.equal(offerD41ChessInvitation(s),false);
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 const card=c.messages.find(m=>m.id==='s55-chess-card-d41');
 assert.equal(card.kind,'app_invitation');assert.equal(card.invitationId,D41_CHESS_INVITATION);
 const store={get:()=>s,update:fn=>fn(s)};
 const size=c.messages.length;deferInvitation(store,D41_CHESS_INVITATION);assert.equal(c.messages.length,size);
 const matchId=receiveInvitation(store,D41_CHESS_INVITATION),match=s.matches.find(m=>m.id===matchId);
 assert.deepEqual(match.chat,[]);assert.equal(!!match.lesson,false);
 assert.equal(postMatchMessage(store,matchId,'試試'),false);
 assert.equal(playMove(store,matchId,'e2','e4'),null);
 assert.equal(resignChessMatch(store,matchId),false);
 assert.equal(advanceD41Chess(store,matchId),true);
 assert.equal(match.history[0].san,'d4');
 assert.equal(match.chat[0].text,D41_CHESS_CUES[1]);
 assert.equal(receiveInvitation(store,D41_CHESS_INVITATION),matchId);
});
test('D41 incoming call is retained through a locked screen and recovered after an interrupted ringing session',()=>{
 const s=phone(41,'23:39');finish(s,'d41-opening','group');s.unlocked=false;
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open(){}}};
 advanceGameMinutes(s,201);assert.equal(s.clock,'23:40');
 assert.equal(d41CallDue(s),true);
 assert.equal(maybeStartD41Call(ctx),false);assert.equal(s.story55.d41CallTriggered,undefined);
 s.unlocked=true;
 s.story55.d41CallTriggered=true;s.notifications.push({id:'stale-d41',type:'tai-incoming-call',scriptedCallId:D41_CALL.id});
 assert.equal(maybeStartD41Call(ctx),true);assert.equal(callState().state,'ringing');
 assert.equal(s.notifications.filter(n=>n.type==='tai-incoming-call').length,1);
 assert.equal(maybeStartD41Call(ctx),false);
 callAction('tai-decline',ctx);
 assert.equal(maybeStartD41Call(ctx),false);
 assert.equal(d41CallDue(s),true); // retry remains pending after decline
});
test('D42 checkpoints clip fast-forward and background elapsed time; completing each native chat releases the clock',()=>{
 const s=phone(42,'09:24');s.unlocked=true;
 advanceGameMinutes(s,100);assert.equal(s.clock,'09:25');assert.equal(timedStoryPaused(s),true);
 const battery=s.batteryPercent;tickWorld(s,300000);assert.equal(s.clock,'09:25');assert.equal(s.batteryPercent,battery);
 s.story55.scriptedCallCompleted={[D42_CALL.id]:true};
 advanceGameMinutes(s,600);assert.equal(s.clock,'14:30');
 for(const [id,clock] of [['d42-operation-1','14:30'],['d42-operation-2','14:35'],['d42-operation-3','15:05'],['target','15:50'],['d42-group','16:30']]){
  assert.equal(s.clock,clock);assert.equal(timedStoryPaused(s),true);assert.equal(pendingTimedStoryEvent(s).id,id);
  settlePhoneBackground(s,60000);assert.equal(s.clock,clock);
  finish(s,id,id==='d42-group'?'group':'tai',id==='d42-group'?'wechat':'noapp');
  assert.equal(timedStoryPaused(s),false);advanceGameMinutes(s,600);
 }
});
test('D42 NoApp action, group and Zai private, then D43 Xin private retain time gates and native Send',()=>{
 const s=phone(42,'10:05');
 assert.equal(nodeStatus(s,'d42-wang').state,'locked');
 s.clock='10:06';finish(s,'d42-wang','wang');
 for(const [id,time,before] of [['d42-operation-1','14:30','14:29'],['d42-operation-2','14:35','14:34'],['d42-operation-3','15:05','15:04'],['target','15:50','15:49']]){
  s.clock=before;assert.equal(nodeStatus(s,id).state,'locked',id);
  s.clock=time;assert.equal(nodeStatus(s,id).state,'ready',id);
  finish(s,id,'tai','noapp');
 }
 s.clock='16:29';assert.equal(nodeStatus(s,'d42-group').state,'locked');
 s.clock='16:30';assert.equal(nodeStatus(s,'d42-zai').state,'locked');
 finish(s,'d42-group','group');finish(s,'d42-zai','zaizai');
 s.day=43;s.clock='09:39';assert.equal(nodeStatus(s,'d43-xin').state,'locked');
 s.clock='09:40';finish(s,'d43-xin','xiaoxin');
 assert.equal(completed(s,'d43-xin'),true);
});
test('D41 real call accepts only the two preset player sends and plays through the chess invitation without AI generation',async()=>{
 const s=phone(41,'23:40');s.unlocked=true;
 const old=Object.fromEntries(['Audio','fetch','sessionStorage','FormData'].map(k=>[k,globalThis[k]]));
 let audio,submitted='',route;const synthesized=[];
 class FakeAudio{
  constructor(){audio=this;this.src='';this.paused=true;this.listeners=new Map();}
  addEventListener(n,cb){const set=this.listeners.get(n)||new Set();set.add(cb);this.listeners.set(n,set);}
  removeEventListener(n,cb){this.listeners.get(n)?.delete(cb);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}
 }
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open(r){route=r;}},toast(){}};
 const waitFor=async check=>{for(let i=0;i<500;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Scripted call timed out');};
 try{
  globalThis.Audio=FakeAudio;
  globalThis.sessionStorage={getItem:k=>k===BYOK_SESSION?JSON.stringify({minimax:'test-minimax',region:'cn'}):null};
  globalThis.fetch=async(url,init)=>{assert.match(String(url),/t2a_v2/);synthesized.push(JSON.parse(init.body).text);return Response.json({base_resp:{status_code:0},data:{audio:'494433'}});};
  globalThis.FormData=class{get(){return submitted;}};
  assert.equal(maybeStartD41Call(ctx),true);callAction('tai-accept',ctx);
  await waitFor(()=>audio?.src?.startsWith('blob:')&&!audio.paused);audio.finish();
  await waitFor(()=>scriptedCallDraft()===D41_CALL.steps[1][1]);
  assert.match(callView(s),/readonly/);
  const form={dataset:{form:'tai-call-turn'}};
  submitted='arbitrary';submitCall(form,ctx);assert.equal(callState().turnCount,1);
  submitted=D41_CALL.steps[1][1];submitCall(form,ctx);
  await waitFor(()=>scriptedCallDraft()===D41_CALL.steps[2][1]);
  submitted=D41_CALL.steps[2][1];submitCall(form,ctx);
  await waitFor(()=>!audio.paused);audio.finish();
  await waitFor(()=>!audio.paused);audio.finish();
  await waitFor(()=>s.invitations.some(i=>i.id===D41_CHESS_INVITATION));
  assert.match(callView(s),/tai-scripted-chess/);callAction('tai-scripted-chess',ctx);
  assert.equal(route.appId,'chess');assert.equal(route.params.invitationId,D41_CHESS_INVITATION);
  await waitFor(()=>!audio.paused);audio.finish();
  await waitFor(()=>callState().turnCount===6);
  assert.equal(synthesized.length,4);
  assert.equal(s.story55.scriptedCallCompleted[D41_CALL.id],true);
  finish(s,'d41-opening','group');
  const matchId=receiveInvitation(ctx.store,D41_CHESS_INVITATION);
  assert.equal(timedStoryPaused(s),true);
  assert.equal(resignChessMatch(ctx.store,matchId),false);
  const match=s.matches.find(m=>m.id===matchId);
  while(!d41ChessDraft(match)){
   if(match.d41Script.pendingVoice)completeD41ChessCue(ctx.store,matchId,match.d41Script.pendingVoice);
   else assert.equal(advanceD41Chess(ctx.store,matchId),true);
  }
  assert.equal(timedStoryPaused(s),true);
  assert.equal(sendD41ChessDraft(ctx.store,matchId,D41_CHESS_DRAFT),true);
  assert.equal(timedStoryPaused(s),true,'final voice is still pending');
  completeD41ChessCue(ctx.store,matchId,37);assert.equal(timedStoryPaused(s),false);
 }finally{callAction('tai-hangup',ctx);for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('D42 voice failure cannot permanently lock a mandatory call; read all three exact lines before clock resumes',async()=>{
 const s=phone(42,'09:25');s.unlocked=true;
 const old=Object.fromEntries(['Audio','fetch','sessionStorage'].map(k=>[k,globalThis[k]]));
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open(){}}};
 try{
  globalThis.Audio=class{constructor(){this.src='';this.paused=true;}play(){return Promise.resolve();}pause(){}};
  globalThis.sessionStorage={getItem:k=>k===BYOK_SESSION?JSON.stringify({minimax:'test-minimax',region:'cn'}):null};
  globalThis.fetch=async()=>{throw Error('offline');};
  assert.equal(maybeStartD42Call(ctx),true);callAction('tai-accept',ctx);
  for(const line of D42_CALL.lines){
   for(let i=0;i<100&&!callView(s).includes('tai-scripted-next');i++)await new Promise(r=>setTimeout(r,10));
   assert.match(callView(s),/tai-scripted-next/);assert.ok(callView(s).includes(line));
   assert.equal(timedStoryPaused(s),true);callAction('tai-scripted-next',ctx);
  }
  assert.equal(s.story55.scriptedCallCompleted[D42_CALL.id],true);
  assert.equal(timedStoryPaused(s),false);assert.equal(callState().state,'ended');
 }finally{callAction('tai-hangup',ctx);for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
