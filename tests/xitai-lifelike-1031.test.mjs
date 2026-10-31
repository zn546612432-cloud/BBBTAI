import {cropGeometry} from '../src/features/avatar-cropper/index.js';
import {pressFeedback,releaseFeedback} from '../src/system/feedback/index.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {taiPresence,clearTaiEngagement} from '../src/services/presence.js';
import {taiForcedOnline,setTaiForcedOnline} from '../src/services/ai/test-controls.js';
import {nextScheduledTaiInvite,deliverTaiChessInvite} from '../src/services/chess-invites.js';
import {deferInvitation,maybeInviteFromTaiChat} from '../src/services/invitations.js';
import {xitaiRelationshipContext} from '../src/services/ai/relationship-context.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {nextCallIdleEvent} from '../src/apps/noapp/voice-call.js';
import {isTaiFollowupDue} from '../src/services/ai/proactive.js';
import {prepareXitaiSpeech} from '../src/services/voice/voice-regex.js';

const stub=state=>({get:()=>state,update(fn){fn(state);}});
test('Chess invitation waits for real Xitai online status; force-online is session-only and D56-gated',()=>{
 const original=globalThis.sessionStorage,m=new Map();
 globalThis.sessionStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 try{
  clearTaiEngagement();
  const s=initialState();s.day=57;s.clock='11:00';
  assert.equal(taiPresence(s).status,'away');
  assert.equal(nextScheduledTaiInvite(s),null);
  setTaiForcedOnline(true);
  assert.equal(taiForcedOnline(),true);
  assert.equal(taiPresence(s).status,'online');
  assert.ok(nextScheduledTaiInvite(s));
  setTaiForcedOnline(false);
  assert.equal(taiPresence(s).status,'away');
  s.day=55;setTaiForcedOnline(true);
  assert.equal(taiPresence(s).status,'offline');
 }finally{clearTaiEngagement();if(original===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=original;}
});
test('Defer returns a real reply and never leaves the old actionable button unchanged',()=>{
 clearTaiEngagement();const s=initialState();s.day=56;s.clock='21:18';
 const store=stub(s);
 assert.equal(deliverTaiChessInvite(s,{index:0,day:56,clock:'21:17',text:'来一盘？'}),true);
 const invitation=s.invitations.find(i=>i.source==='story-invitation');
 assert.equal(invitation.status,'pending');
 deferInvitation(store,invitation.id);
 assert.equal(invitation.status,'deferred');
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 assert.equal(c.messages.filter(m=>m.id==='tai-deferred-ack-'+invitation.id).length,1);
 assert.ok(['啧。','好吧。'].includes(c.messages.at(-1).text));
 deferInvitation(store,invitation.id);
 assert.equal(c.messages.filter(m=>m.id==='tai-deferred-ack-'+invitation.id).length,1);
});
test('When Ximeng proposes chess, a deterministic chance can create a live invite (never while offline)',()=>{
 clearTaiEngagement();const s=initialState();s.day=60;s.clock='21:00';s.events=[];s.invitations=[];
 const store=stub(s),c=s.content.conversations.noapp.find(c=>c.id==='tai');
 let id='case-1';for(let i=0;i<100;i++){
  const trial='case-'+i,hash=[...trial].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,0);
  if(hash%100<48){id=trial;break;}
 }
 c.messages.push({id,from:'me',text:'我们来下国际象棋吗？',day:60,time:'21:00',actual:true});
 assert.equal(maybeInviteFromTaiChat(store,id),true);
 assert.equal(s.invitations.filter(i=>i.source==='story-invitation').length,1);
 assert.equal(c.messages.filter(m=>m.kind==='app_invitation').length>=1,true);
 assert.equal(maybeInviteFromTaiChat(store,id),false);
 s.clock='11:00';s.invitations=[];
 c.messages.push({id:'other',from:'me',text:'来一盘？',day:60,time:'11:00'});
 assert.equal(maybeInviteFromTaiChat(store,'other'),false);
});
test('Relationship scene includes canon and only genuine older NoApp statements',()=>{
 const s=initialState();s.day=62;s.clock='22:00';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 for(let i=0;i<22;i++)c.messages.push({id:'history'+i,from:'me',day:57,time:'19:00',actual:true,text:i===1?'我喜欢圣诞惊魂夜':'普通消息'+i});
 c.messages.push({id:'fresh',from:'me',day:62,time:'22:00',actual:true,text:'你不认识我了吗？'});
 const context=xitaiRelationshipContext(s,{mode:'text'});
 assert.match(context,/熙蒙/);
 assert.match(context,/不是陌生人/);
 assert.match(context,/D57 熙蒙：我喜欢圣诞惊魂夜/);
 assert.match(context,/不要以陌生人口吻/);
 assert.doesNotMatch(context,/私人微信中的密码/);
});
test('Original voice worldbook is used ONLY by call/voice prompts, not normal chat',()=>{
 const common={day:60,channel:'noapp'};
 const plain=buildTaiPrompt({...common,outputMode:'text'});
 const call=buildTaiPrompt({...common,outputMode:'call',scene:'正在通话',relationshipContext:'熙蒙刚说了晚安'});
 assert.doesNotMatch(plain,/语音世界书 3.0-若要大声嘶喊出爱的话/);
 assert.match(call,/语音世界书 3.0-若要大声嘶喊出爱的话/);
 assert.match(call,/熙蒙刚说了晚安/);
 assert.match(call,/正在通话/);
 assert.match(plain,/全部 mode=text/);
});
test('Call silence gently nudges once and closes only after prolonged silence',()=>{
 const call={state:'connected',busy:false,listening:false,lastTaiEndAt:10000,nudgeCount:0};
 assert.equal(nextCallIdleEvent(call,54000),'');
 assert.equal(nextCallIdleEvent(call,55000),'nudge');
 call.nudgeCount=1;call.lastTaiEndAt=55000;
 assert.equal(nextCallIdleEvent(call,177000),'');
 assert.equal(nextCallIdleEvent(call,180000),'closing');
 call.nudgeCount=2;assert.equal(nextCallIdleEvent(call,190000),'');
 call.state='ended';assert.equal(nextCallIdleEvent(call,200000),'');
});
test('A one-time follow-up is eligible when a proactive message is unanswered for hours',()=>{
 clearTaiEngagement();const s=initialState();s.day=60;s.clock='22:45';s.powerMode='idle';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'earlier',from:'tai',text:'今晚还下棋么',day:60,time:'19:00',actual:true,proactive:true});
 assert.equal(isTaiFollowupDue(s),true);
 c.messages.push({id:'answer',from:'me',text:'我在',day:60,time:'22:45',actual:true});
 assert.equal(isTaiFollowupDue(s),false);
});
test('Sparse MiniMax voice tags enrich long speech without exposing tags to plain chats',()=>{
 const words='我正准备把论文改完，可你突然不说话，我还以为你睡着了。其实你发来的那段代码我已经看过，后面还有些细节要聊，我希望你能听听我的意见，再决定要不要推翻整个架构。';
 const prepared=prepareXitaiSpeech(words,{tone:'soft',autoTags:true});
 assert.ok(prepared.characterCount>53);
 assert.ok(prepared.tagCount>=1&&prepared.tagCount<=4);
 assert.match(prepared.text,/\((breath|exhale|inhale)\)/);
});

test('Avatar crop stays within image boundaries at 1:1 and 16:9 ratios',()=>{
 const square=cropGeometry({imageWidth:1000,imageHeight:500,canvasWidth:512,canvasHeight:512,zoom:1,offsetX:99999,offsetY:500});
 assert.equal(square.width,1024);
 assert.equal(square.height,512);
 assert.equal(square.x,0);
 assert.equal(square.y,0);
 const center=cropGeometry({imageWidth:1000,imageHeight:500,canvasWidth:512,canvasHeight:512,zoom:1});
 assert.equal(center.x,-256);
 const wide=cropGeometry({imageWidth:2000,imageHeight:1200,canvasWidth:1200,canvasHeight:675,zoom:1,offsetX:-200,offsetY:100});
 assert.ok(wide.width>=1200&&wide.height>=675);
 assert.ok(wide.x<=0&&wide.x+wide.width>=1200);
 assert.ok(wide.y<=0&&wide.y+wide.height>=675);
});
test('Reusable recording feedback keeps pressed visuals without a vibration API',()=>{
 const set=new Set(),element={classList:{add:x=>set.add(x),remove:x=>set.delete(x)}};
 pressFeedback(element);
 assert.equal(set.has('is-pressed'),true);
 releaseFeedback(element,{cancel:true});
 assert.equal(set.has('is-pressed'),false);
});
