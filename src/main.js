import {isStory55} from './services/story55/state.js';
import {handleStory55Action,submitStory55Form} from './services/story55/controller.js';
import {currentScript55,sendScriptedDraft55} from './services/story55/scripted-chat.js';
import {advanceScene55,chatNodeLink55} from './services/story55/runtime.js';
import {tickFlowD03,flushFlowReply} from './services/story55/flow-d03.js';
import {openAvatarCropper} from './features/avatar-cropper/index.js';
import {restartState} from './system/restart/index.js';
import {advanceGhost,needsWorldTick} from './apps/ghost/state.js';
import {PhoneStore} from './services/storage.js';
import {WorldTickBatch} from './system/time/tick-batch.js';
import {mountCallEvents} from './apps/noapp/index.js';
import {mountHoldToTalk,startIncoming,callState,callAction,incomingCallBanner,maybeAdvanceCall} from './apps/noapp/voice-call.js';
import {PhoneRouter} from './services/router.js';
import {registry,appUnlocked} from './system/registry.js';
import {home,lock,appFrame,status,notifications,mountShell,notificationCard} from './system/shell.js';
import {LockScreen} from './system/lock.js';
import {toggleReminder} from './services/reminders.js';
import {processDemoReply,sendUnansweredChessReminders,dueChessReminders} from './services/invitations.js';
import {nextScheduledTaiInvite,deliverTaiChessInvite} from './services/chess-invites.js';
import {ensureMirageStory,WALLET_CHALLENGE_ID} from './apps/mirage/contacts-seed.js';
import {maybeSendProactive,isProactiveCallDue} from './services/ai/proactive.js';
import {MessageDelivery,isConversationOpen} from './services/messaging/delivery.js';
import {readNotification} from './services/messaging/read.js';
import {mountInteractions} from './apps/developer/index.js';
import {patchHTML} from './system/dom.js';
import {mountGestures} from './system/gestures.js';
import {mountViewport} from './system/viewport.js';
import {dragOffset,nearestPage,pageTarget} from './system/pager.js';
import {isNativeTabSwitch} from './system/navigation.js';
import {errorHaptic} from './system/haptics.js';
import {mountWeatherSwipe} from './apps/weather/replica.js';
import {createTaskSwitcher} from './system/task-switcher.js';
import {drainBattery,plugIn,unplug} from './system/power/battery.js';
import {advanceGameMinutes,tickWorld,isTaiConversation,setSleeping,dismissAlarm} from './system/time/clock.js';
import {chargingBlock,deathLocked,phoneBlocked,recoverPhone} from './system/power/story.js';
import {powerFullscreen} from './system/power/controls.js';
import {PresetConversationEngine,deliverMissedScheduled} from './story/presets/engine.js';
import {hydrateBuiltInPresets} from './story/presets/catalog.js';

const store=new PhoneStore();
// Migrate bookmarks saved by the retired 55-day calendar dialogue panels.
if(isStory55(store.get())){
 const legacy=loc=>loc?.appId==='calendar'&&loc.route==='/story55/scene';
 const nav=store.get().nav;
 if(legacy(nav.current)||nav.stack?.some(legacy))store.update(s=>{
  const normalize=loc=>legacy(loc)?chatNodeLink55(s,loc.params?.node||'intro'):loc;
  s.nav.current=normalize(s.nav.current);
  s.nav.stack=(s.nav.stack||[]).map(normalize);
 });
}
mountCallEvents({store});
try{await hydrateBuiltInPresets(store);}catch(error){console.error('内置剧情加载失败',error);}
// Resuming an older save must not require visiting developer tools to receive
// scheduled messages whose window has already passed.
try{store.update(s=>{deliverMissedScheduled(s,{day:1,clock:'00:00'});tickFlowD03(s);});}catch(error){console.error('消息时间线恢复失败',error);}
const router=new PhoneRouter(store,registry),lockscreen=new LockScreen();
const story55Review=isStory55(store.get())&&new URLSearchParams(location.search).get('panel')==='story55';
if(story55Review)store.update(s=>{s.unlocked=true;s.nav.current={appId:'editor',route:'/story55',params:{}};});
mountShell();
let shade=false,toastTimer,assetHandler=null,entryAnimation=false,lastNavigation=null,lastLocation=null,quietEditorUpdate=false,draggingHome=false,pagerBase=null,unlockingCover=false,swipeHomeReturn=null,islandExpanded=false,islandTimer=null,alarmSound=null,pendingNoticeId=null;
const delivery=new MessageDelivery(store);
const presets=new PresetConversationEngine(store);
const tasks=createTaskSwitcher({router,registry});
// Opening the display always requires a new unlock, without removing saved content.
if(store.get().unlocked&&!story55Review)store.update(s=>{s.unlocked=false;});
const $=q=>document.querySelector(q);
let noticeSwipeAnimating=false;
let seenNotices=new Set(store.get().notifications.map(n=>n.id));
let suppressNotificationClickUntil=0;
const showBanner=(notice,{duration=3700}={})=>{const node=$('#toast');if(!node)return;node.innerHTML=notificationCard(notice,store.get());node.dataset.noticeId=notice.id||'';node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.classList.remove('visible');node.dataset.noticeId='';},duration);};
const nonImmersive=/演示|下一阶段|开发者|暂未接入|尚未接入|尚未开放|后续功能阶段|剧情|游戏存档|仅本机模拟|DEMO|测试中/i;
const toast=message=>{
 const s=store.get(),body=String(message);
 if(s.nav.current.appId!=='editor'&&nonImmersive.test(body))return;
 const appId=s.nav.current.appId;
 showBanner({title:registry.get(appId)?.manifest.name||'iPhone',body,link:{appId}});
};
let imageOptions={maxEdge:1200,quality:.82,cropAspect:0};
const ctx=()=>({store,router,toast,refresh:render,pickImage(handler,options={}){assetHandler=handler;imageOptions={maxEdge:Math.min(1200,Math.max(250,options.maxEdge||1200)),quality:Math.min(.9,Math.max(.5,options.quality??.82)),cropAspect:Number(options.cropAspect)||0};const input=$('#asset-picker');input.value='';input.click();},download(){const blob=new Blob([JSON.stringify(store.get(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ximeng-phone-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}});
mountHoldToTalk($('#root'),ctx);
function setShade({progress,settle=true}){
 const layer=$('#shade-layer');layer.classList.toggle('is-present',progress>0);layer.classList.toggle('is-dragging',!settle);layer.style.setProperty('--shade-progress',String(progress));layer.setAttribute('aria-hidden',String(progress===0));layer.inert=progress===0;
 $('#screen-layer').inert=progress>0||phoneBlocked(store.get())||!!powerFullscreen(store.get());$('#phone').classList.toggle('notification-open',progress>0);
 if(settle)shade=progress===1;
}
function animateNavigation(previous,direction=1){
 const layer=$('#transition-layer');layer.replaceChildren();
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const current=$('#screen-layer').firstElementChild;
 if(swipeHomeReturn){
  const gesture=swipeHomeReturn;swipeHomeReturn=null;
  if(previous){
   previous.removeAttribute('id');previous.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
   previous.inert=true;layer.append(previous);
   previous.animate([
    {opacity:1,transform:`translateY(${-gesture*0.2}px) scale(${1-Math.min(gesture/650,.22)})`,borderRadius:'20px'},
    {opacity:0,transform:'translateY(-135px) scale(.36)',borderRadius:'34px'}
   ],{duration:310,easing:'cubic-bezier(.28,.65,.25,1)',fill:'forwards'}).finished.catch(()=>{}).finally(()=>previous.remove());
  }
  current?.animate([{opacity:.6,transform:'scale(1.06)'},{opacity:1,transform:'scale(1)'}],{duration:350,easing:'cubic-bezier(.2,.8,.2,1)'});
  return;
 }
 if(previous){previous.removeAttribute('id');previous.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));previous.inert=true;layer.append(previous);previous.querySelectorAll('[data-restore-scroll]').forEach(n=>{n.scrollTop=Number(n.dataset.restoreScroll);n.removeAttribute('data-restore-scroll');});previous.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:`translateY(${-direction*8}px) scale(.99)`}],{duration:230,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>previous.remove());}
 current?.animate([{opacity:0,transform:`translateY(${direction*14}px) scale(.985)`},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:270,easing:'cubic-bezier(.2,.75,.25,1)'});
}
function render(){
 if($('#phone').dataset.gestureActive==='1'&&!phoneBlocked(store.get()))return;
 if(draggingHome&&!phoneBlocked(store.get()))return;
 if(phoneBlocked(store.get()))draggingHome=false;
 const s=store.get(),current=s.nav.current,navigation=s.unlocked?JSON.stringify(current):'lock';
 const changed=lastNavigation!==null&&navigation!==lastNavigation,nativeTabSwitch=changed&&isNativeTabSwitch(lastLocation,current),screen=$('#screen-layer'),previous=changed&&!nativeTabSwitch?screen.firstElementChild?.cloneNode(true):null;
 if(previous){const nodes=screen.firstElementChild.querySelectorAll('.app-content,.chat-messages');previous.querySelectorAll('.app-content,.chat-messages').forEach((node,i)=>node.dataset.restoreScroll=String(nodes[i].scrollTop));}
 const oldScroll=$('#screen-layer #app-content')?.scrollTop,actorsOpen=$('.editor-actors')?.open;
 const messagePane=$('#screen-layer .chat-messages'),nearBottom=!messagePane||messagePane.scrollHeight-messagePane.clientHeight-messagePane.scrollTop<85;
 const oldKeys=new Set([...screen.querySelectorAll('.message-row[data-key]')].map(el=>el.dataset.key));
 $('#phone').classList.toggle('is-locked',!s.unlocked);$('#phone').classList.toggle('show-passcode',!s.unlocked&&lockscreen.stage!=='cover');
 $('#phone').classList.toggle('app-light-active',s.unlocked&&current.appId!=='home'&&!['mirage','ghost','noapp','weather'].includes(current.appId));
 const wallpaper=`url("${s.wallpaper}")`;if($('#wallpaper').style.backgroundImage!==wallpaper)$('#wallpaper').style.backgroundImage=wallpaper;
 patchHTML($('#status-layer'),status(s,{islandExpanded}));
 patchHTML($('#tai-call-banner-layer'),incomingCallBanner(s));
 $('#tai-call-banner-layer').inert=!s.unlocked||phoneBlocked(s);
 patchHTML($('#shade-layer'),notifications(s));
 if(s.deathPhase==='passcode'&&lockscreen.stage==='cover')lockscreen.open();
 const fullscreen=powerFullscreen(s,{passcode:s.deathPhase==='passcode'?lock(s,lockscreen.stage,lockscreen.digits):''}),overlay=$('#day-transition-layer');
 patchHTML(overlay,fullscreen);overlay.classList.toggle('is-visible',!!fullscreen);overlay.setAttribute('aria-hidden',String(!fullscreen));
 let body;
 if(['off','passcode'].includes(s.deathPhase))body='';
 else if(!s.unlocked)body=lock(s,lockscreen.stage,lockscreen.digits);
 else if(current.appId==='home')body=home(s);
 else{const app=registry.get(current.appId);if(current.appId==='mirage'&&lastLocation?.appId!=='mirage')app?.onEnter?.();body=app?appFrame(s,app,app.render(ctx(),current)):'<div class="empty">App 不可用</div>';}
 patchHTML(screen,body);
 const blocked=phoneBlocked(s)||!!fullscreen;
 $('#phone').classList.toggle('death-draining',s.deathPhase==='draining');
 for(const id of ['screen-layer','status-layer','shade-layer','task-layer','homebar'])$('#'+id).inert=blocked;
 if(blocked){document.activeElement?.closest('#screen-layer')&&document.activeElement.blur();$('#shade-layer').classList.remove('is-present');$('#task-layer').style.visibility='hidden';}else $('#task-layer').style.visibility='';
 if(s.unlocked&&current.appId!=='home')tasks.snapshot(current);
 if(navigation===lastNavigation&&actorsOpen&&$('.editor-actors'))$('.editor-actors').open=true;
 if(changed&&s.unlocked&&!nativeTabSwitch)animateNavigation(previous);
 if(nativeTabSwitch){const pane=screen.querySelector('.wx-scroll');if(pane)pane.scrollTop=0;}
 if(entryAnimation&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){screen.animate([{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:380,easing:'ease-out'});entryAnimation=false;}else if(entryAnimation)entryAnimation=false;
 if(navigation===lastNavigation&&oldScroll!==undefined&&$('#screen-layer #app-content'))$('#screen-layer #app-content').scrollTop=oldScroll;else router.restoreScroll();
 const nextPane=$('#screen-layer .chat-messages');
 if(nextPane){const added=[...nextPane.querySelectorAll('.message-row[data-key]')].filter(el=>!oldKeys.has(el.dataset.key));if(!changed&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)for(const row of added)row.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});if(changed||nearBottom)nextPane.scrollTop=nextPane.scrollHeight;}
 mountScriptedMirageDraft();
 mountStory55Incoming();
 lastNavigation=navigation;
 lastLocation={...current};
}
let pendingMirageType=null;
const completedStoryTyping=new WeakMap();
function mountScriptedMirageDraft(){
 const input=$('#screen-layer .composer input[data-story-type]');
 if(!input){
  if(pendingMirageType){clearInterval(pendingMirageType.timer);pendingMirageType=null;}
  return;
 }
 const identity=input.dataset.storyStage+':'+input.dataset.storyType;
 if(pendingMirageType?.identity===identity&&pendingMirageType.element===input)return;
 if(pendingMirageType)clearInterval(pendingMirageType.timer);
 const full=input.dataset.storyType;
 if(completedStoryTyping.get(input)===identity)return;
 // Do not overwrite text that the player has already started entering.
 if(input.value&&input.value!==full)return;
 input.value='';let offset=0;
 const step=()=>{
  if(!input.isConnected){clearInterval(pendingMirageType?.timer);pendingMirageType=null;return;}
  if(document.activeElement===input&&input.value!==full.slice(0,offset)){clearInterval(pendingMirageType?.timer);pendingMirageType=null;return;}
  input.value=full.slice(0,++offset);
  if(offset>=full.length){completedStoryTyping.set(input,identity);clearInterval(pendingMirageType.timer);pendingMirageType=null;}
 };
 pendingMirageType={identity,element:input,timer:setInterval(step,105)};
}
// Never reveal a Next button or automatically send the player's authored text.
// NPC lines arrive in the already-open native conversation, one at a time.
let pendingStory55Incoming=null;
function mountStory55Incoming(){
 const s=store.get(),loc=s.nav.current,channel=loc.appId;
 const conversationId=loc.route.startsWith('/chat/')?loc.route.slice(6):null;
 const line=s.unlocked&&conversationId?currentScript55(s,channel,conversationId):null;
 if(!line||line.kind==='me'||line.kind==='watch'){
  if(pendingStory55Incoming){clearTimeout(pendingStory55Incoming.timer);pendingStory55Incoming=null;}
  return;
 }
 const identity=[line.id,line.index,channel,conversationId].join(':');
 if(pendingStory55Incoming?.identity===identity)return;
 if(pendingStory55Incoming)clearTimeout(pendingStory55Incoming.timer);
 const time=line.kind==='system'?540:line.kind==='call'?800:Math.min(2200,900+line.text.length*18);
 const timer=setTimeout(()=>{
  pendingStory55Incoming=null;
  const current=store.get(),route=current.nav.current;
  if(!current.unlocked||route.appId!==channel||route.route!=='/chat/'+conversationId)return;
  const live=currentScript55(current,channel,conversationId);
  if(!live||live.id!==line.id||live.index!==line.index||live.kind==='me'||live.kind==='watch')return;
  try{store.update(next=>advanceScene55(next,line.id,{acceptCall:live.kind==='call'}));}
  catch(error){console.error('无法播放预设消息',error);}
 },time);
 pendingStory55Incoming={identity,timer};
}
function requestUnlock(link=null){
 if(phoneBlocked(store.get())||lockscreen.stage!=='cover'||unlockingCover)return;
 setShade({progress:0});
 const cover=$('.lock-screen');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!cover||reduced||typeof cover.animate!=='function'){lockscreen.open(link);render();return;}
 unlockingCover=true;
 const computed=getComputedStyle(cover);
 const startTransform=computed.transform==='none'?'translateY(0)':computed.transform;
 const animation=cover.animate([
  {transform:startTransform,opacity:Number(computed.opacity)||1},
  {transform:'translateY(-100%)',opacity:0}
 ],{duration:270,easing:'cubic-bezier(.3,.02,.3,1)',fill:'forwards'});
 animation.finished.catch(()=>{}).finally(()=>{
  animation.cancel();
  cover.style.transform='';
  cover.style.opacity='';
  unlockingCover=false;
  lockscreen.open(link);render();
 });
}
function enterDigit(key){
  const recovery=store.get().deathPhase==='passcode';
  if(phoneBlocked(store.get())&&!recovery)return;
  if(recovery&&key==='cancel'){lockscreen.reset();store.update(s=>{s.deathPhase='off';});return;}
  const result=lockscreen.key(key,recovery||store.get().deathPhase==='recovered'?'6180':'0816');
  if(result==='ignored')return;
  if(result==='restart'){render();return;}
  if(result==='cancelled'){pendingNoticeId=null;render();return;}
  // Preserve the keypad node so typing does not replay its entrance animation.
  const digitsRoot=recovery?$('#day-transition-layer'):$('#screen-layer');
  const dots=digitsRoot.querySelector('.passcode-dots');
  if(dots){dots.setAttribute('aria-label',`已输入 ${lockscreen.digits.length} 位密码`);dots.querySelectorAll('i').forEach((dot,i)=>dot.classList.toggle('filled',i<lockscreen.digits.length));}
  if(result==='error'){
    // iOS behaviour: no dialog or toast. The four dots shake sideways, the phone pulses,
    // then the dots empty and the keypad accepts a new attempt.
    digitsRoot.querySelector('.lock-screen')?.classList.add('lock-error');
    errorHaptic();
    setTimeout(()=>{lockscreen.retry();render();},520);
  }
  if(result==='unlocking'){
    digitsRoot.querySelector('.lock-screen')?.classList.add('lock-unlocking');
    setTimeout(()=>{
      if(recovery){const code=lockscreen.digits;lockscreen.reset();store.update(s=>recoverPhone(s,code));expandIsland();return;}
      if(phoneBlocked(store.get()))return;
      const link=lockscreen.pendingLink,noticeId=pendingNoticeId;pendingNoticeId=null;lockscreen.reset();setShade({progress:0});entryAnimation=true;
      store.update(s=>{s.unlocked=true;});
      if(link)router.open(link);
      if(noticeId)readNotification(store,noticeId);
    },260);
  }
}
function stopAlarmSound(){if(alarmSound){clearInterval(alarmSound);alarmSound=null;}}
function startAlarmSound(){
 if(alarmSound)return;
 const AudioContextType=window.AudioContext||window.webkitAudioContext;
 let audio=null;try{if(AudioContextType)audio=new AudioContextType();}catch{}
 const pulse=()=>{if(!store.get().alarmRinging){stopAlarmSound();audio?.close();return;}
  try{if(audio){audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.08,audio.currentTime+.04);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.30);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.32);}}catch{}
  navigator.vibrate?.([170,100,170]);
 };pulse();alarmSound=setInterval(pulse,1050);
}
function collapseIsland(delay=0){
 clearTimeout(islandTimer);
 if(delay){islandTimer=setTimeout(()=>collapseIsland(),delay);return;}
 islandExpanded=false;render();
}
function expandIsland(){
 if(phoneBlocked(store.get())||store.get().emergencyCharge||store.get().poweredOff)return;
 islandExpanded=true;render();collapseIsland(8000);
}
store.subscribe(()=>{const s=store.get();const added=s.notifications.filter(n=>!seenNotices.has(n.id));seenNotices=new Set(s.notifications.map(n=>n.id));if(!quietEditorUpdate&&!noticeSwipeAnimating)render();if(s.unlocked&&!phoneBlocked(s)&&added.length){const n=added.find(n=>!isConversationOpen(s,n.link?.appId,n.link?.route?.startsWith('/chat/')?n.link.route.slice(6):''));if(n&&n.type!=='tai-incoming-call')showBanner(n);}});render();
for(const type of ['click','dblclick','pointerdown','pointermove','pointerup','touchstart','touchmove','touchend','keydown','input','change','submit','contextmenu'])document.addEventListener(type,e=>{
 const s=store.get();if(!phoneBlocked(s))return;
 const recovery=s.deathPhase==='passcode',off=s.deathPhase==='off';
 if(recovery&&(e.target.closest?.('#day-transition-layer')||type==='keydown'))return;
 if(off&&(e.target.closest?.('[data-action="story-wake"]')||type==='keydown'&&['Enter',' '].includes(e.key)))return;
 if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();
},{capture:true,passive:false});
mountInteractions($('#root'),ctx());
mountWeatherSwipe($('#root'),ctx);
setInterval(()=>{if(lockscreen.stage==='restart'||deathLocked(store.get()))return;try{presets.tick();if(needsWorldTick(store.get()))store.update(s=>advanceGhost(s));delivery.tick(Date.now(),!document.hidden);const chessInvite=nextScheduledTaiInvite(store.get());if(chessInvite)store.update(s=>deliverTaiChessInvite(s,chessInvite));if(dueChessReminders(store.get()))store.update(s=>sendUnansweredChessReminders(s));const callCandidate=store.get();
 if(isProactiveCallDue(callCandidate)&&!['ringing','dialing','connected'].includes(callState().state)
    &&callCandidate.nav.current.appId!=='editor'){
  if(startIncoming(ctx(),'熙泰邀请你语音通话'))
   store.update(s=>s.events.push({type:'tai_proactive_call',day:s.day,clock:s.clock}));
 }
 if(!document.hidden&&callState().state==='connected')maybeAdvanceCall(ctx());
 if(!document.hidden&&!['ringing','dialing','connected'].includes(callState().state))void maybeSendProactive(store);}catch(err){toast(err.message||'消息未能保存');}},500);
// The page runs in foreground only; a backgrounded tab never skips story events.
let lastPowerTick=performance.now();
const worldTickBatch=new WorldTickBatch();
setInterval(()=>{
 const now=performance.now(),elapsed=Math.max(0,Math.min(2500,now-lastPowerTick));
 lastPowerTick=now;
 if(lockscreen.stage==='restart'||document.hidden||['off','passcode'].includes(store.get().deathPhase)||store.get().alarmRinging||store.get().emergencyCharge||store.get().poweredOff||store.get().nav.current.appId==='editor'&&!deathLocked(store.get())){worldTickBatch.reset();return;}
 const editing=document.activeElement?.matches?.('.composer input[name="text"],.composer textarea,[contenteditable="true"]')||false;
 const tickOptions={focused:editing,taiChat:isTaiConversation(store.get())};
 const tickElapsed=worldTickBatch.take(store.get(),elapsed,tickOptions);if(!tickElapsed)return;
 let outcome={};
 store.update(s=>{
  outcome=tickWorld(s,tickElapsed,tickOptions);
  drainBattery(s,tickElapsed);
  // Story release is time-gated even if MIRAGE was already open before 20:00.
  if((s.day>5||s.day===5&&s.clock>='20:00')&&!s.content.orders.some(o=>o.id===WALLET_CHALLENGE_ID))
   ensureMirageStory(s);
 });
 if(outcome.event==='alarm'){collapseIsland();startAlarmSound();}
 if(outcome.event==='emergency')collapseIsland();
 if(outcome.event==='death-start'||outcome.event==='death-off'){lockscreen.reset();cancelMessageHold();setShade({progress:0});collapseIsland();}
 if(outcome.event==='wake'){collapseIsland();lockscreen.reset();}
},800);
$('#root').addEventListener('click',async e=>{
 if(Date.now()<suppressNotificationClickUntil&&e.target.closest?.('.lock-notification,.shade-notification,#toast')){e.preventDefault();return;}
  const openedMessageMenu=$('#screen-layer .wx-message-menu:not([hidden])');
  if(openedMessageMenu&&!e.target.closest('.wx-message-menu,.wx-bubble'))openedMessageMenu.hidden=true;
  if(e.target.matches('.mc-login [data-mirage-account]')){registry.get('mirage')?.accountTap?.(e.target);return;}
  const target=e.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;
  try{
    if(action==='restart-cancel'&&lockscreen.stage==='restart'){lockscreen.open();render();return;}
    if(action==='restart-confirm'&&lockscreen.stage==='restart'){presets.dispose();delivery.waiting.clear();stopAlarmSound();store.replace(restartState(store.get()));location.reload();return;}
    if(action==='story-wake'&&store.get().deathPhase==='off'){lockscreen.open();store.update(s=>{s.deathPhase='passcode';});return;}
    if(action.startsWith('tasks-')){tasks.action(action,target.dataset.id);return;}
    if(action==='power-open'||action==='power-charge'){expandIsland();return;}
    if(action==='power-decline'){collapseIsland();return;}
    if(action==='power-plug'){if(chargingBlock(store.get())){toast('充电口进水，稍后再试。');collapseIsland();return;}let charged=false;store.update(s=>{charged=plugIn(s);});if(charged){lockscreen.reset();setShade({progress:0});}collapseIsland();return;}
    if(action==='power-unplug'){let ok=false;store.update(s=>{ok=unplug(s);});if(ok)collapseIsland(320);return;}
    if(action==='power-sleep'){collapseIsland();lockscreen.reset();store.update(s=>{setSleeping(s);});return;}
    if(action==='power-shutdown'){collapseIsland();store.update(s=>{s.poweredOff=true;s.unlocked=false;});return;}
    if(action==='power-dismiss-alarm'||action==='power-snooze'){stopAlarmSound();collapseIsland();store.update(s=>{dismissAlarm(s,{continueSleep:action==='power-snooze'});});return;}
    if(action==='tai-banner-accept'){
      if(callAction('tai-accept',ctx())){setShade({progress:0});router.open({appId:'noapp',route:'/call',params:{}});}
      return;
    }
    if(action==='tai-banner-decline'){callAction('tai-decline',ctx());return;}
    if(action==='home'&&shade){setShade({progress:0});return;}
    if(!store.get().unlocked){
      if(action==='close-shade'){setShade({progress:0});return;}
      if(action==='unlock'||action==='home'){if(lockscreen.stage==='cover'){pendingNoticeId=null;requestUnlock();}return;}
      if(action==='passcode-key'){enterDigit(target.dataset.key);return;}
      if(action==='notification'){const n=store.get().notifications.find(x=>x.id===target.dataset.id);if(!n)return;pendingNoticeId=n.id;requestUnlock(n.link||null);return;}
      return;
    }
    if(action==='home'){if(tasks.visible)tasks.hide();else if(store.get().nav.current.appId==='home')tasks.show(store.get().nav.current);else router.home();return;}
    if(action==='back'){router.back();return;}
    if(action==='open-app'){const id=target.dataset.app,m=registry.get(id)?.manifest;if(!m||!appUnlocked(id,store.get()))return toast('此 App 尚未开放');router.open({appId:id,route:m.defaultRoute||'/'});return;}
    if(action==='home-reminder-toggle'){toggleReminder(store,target.dataset.id);return;}
    if(action==='page'){store.update(s=>{s.homePage=Number(target.dataset.page);});return;}
    if(action==='lock'){lockscreen.reset();shade=false;store.update(s=>{s.unlocked=false;s.nav.current={appId:'home',route:'/',params:{}};s.nav.stack=[];});return;}
    if(action==='notify'||action==='island'){setShade({progress:shade?0:1});return;}
    if(action==='close-shade'){setShade({progress:0});return;}
    if(action==='notification'){
      const n=store.get().notifications.find(x=>x.id===target.dataset.id);if(!n)return;
      setShade({progress:0});
      if(n.type==='tai-incoming-call'&&callState().state==='ringing'){router.open({appId:'noapp',route:'/call',params:{}});return;}
      readNotification(store,n.id);
      if(n.type==='tai-incoming-call'||n.type==='tai-missed-call')router.open({appId:'noapp',route:'/chat/tai',params:{}});
      else if(n.link)router.open(n.link);
      return;
    }
    if(action==='banner-open'){
      const banner=$('#toast'),n=store.get().notifications.find(x=>x.id===banner?.dataset.noticeId);banner?.classList.remove('visible');
      if(n){
       if(n.type==='tai-incoming-call'&&callState().state==='ringing')router.open({appId:'noapp',route:'/call',params:{}});
       else{readNotification(store,n.id);if(n.link)router.open(n.link);}
      }
      return;
    }
    if(await handleStory55Action(action,target,ctx()))return;
    const app=registry.get(store.get().nav.current.appId);
    if(app?.handle)await app.handle(action,target,ctx(),store.get().nav.current);
    if(['mc-accept-bounty','mc-complete-bounty'].includes(action))store.update(s=>{advanceGameMinutes(s,action==='mc-complete-bounty'?60:30);});
  }catch(err){toast(err.message||'操作未完成');}
});
// WeChat message actions also open on a real long press (as well as tap/right-click).
let messageHoldTimer=null,messageHoldPoint=null;
const cancelMessageHold=()=>{clearTimeout(messageHoldTimer);messageHoldTimer=null;messageHoldPoint=null;};
$('#root').addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse')return;
  const bubble=e.target.closest('.app-wechat .wx-bubble');
  if(!bubble)return;
  cancelMessageHold();messageHoldPoint={x:e.clientX,y:e.clientY};
  messageHoldTimer=setTimeout(()=>{registry.get('wechat')?.openMessageMenu?.(bubble);messageHoldTimer=null;},530);
});
$('#root').addEventListener('pointermove',e=>{
  if(messageHoldPoint&&Math.hypot(e.clientX-messageHoldPoint.x,e.clientY-messageHoldPoint.y)>9)cancelMessageHold();
});
$('#root').addEventListener('pointerup',cancelMessageHold);
$('#root').addEventListener('pointercancel',cancelMessageHold);
$('#root').addEventListener('contextmenu',e=>{
  const bubble=e.target.closest('.app-wechat .wx-bubble');
  if(!bubble)return;
  e.preventDefault();cancelMessageHold();registry.get('wechat')?.openMessageMenu?.(bubble);
});
// Swipe left on a lock-screen or shade notification to dismiss; swipe up
// on the compact banner to hide it without marking the message read.
let noticeGesture=null;
const noticeStart=(target,x,y)=>{
 const node=target.closest?.('.lock-notification,.shade-notification,#toast');
 if(!node)return;
 noticeGesture={node,x,y,dragging:false};
};
const noticeMove=(x,y)=>{
 const item=noticeGesture;if(!item)return;
 const dx=x-item.x,dy=y-item.y;
 if(item.node.id==='toast'){
  if(dy<-8&&Math.abs(dy)>Math.abs(dx)){
   item.dragging=true;item.node.style.transition='none';
   item.node.style.transform='translate3d(0,'+Math.max(-105,dy)+'px,0)';
   item.node.style.opacity=String(Math.max(0.15,1+dy/140));
  }
  return;
 }
 if(dx< -8&&Math.abs(dx)>Math.abs(dy)*1.12){
  item.dragging=true;noticeSwipeAnimating=true;
  item.node.style.transition='none';
  item.node.style.transform='translate3d('+Math.max(-300,dx)+'px,0,0)';
  item.node.style.opacity=String(Math.max(0.12,1+dx/270));
 }
};
const noticeReset=item=>{
 item.node.style.transition='transform .22s ease,opacity .22s ease';
 item.node.style.transform='';
 item.node.style.opacity='';
 setTimeout(()=>{noticeSwipeAnimating=false;render();},230);
};
const noticeFinish=(x,y)=>{
 const item=noticeGesture;noticeGesture=null;if(!item)return;
 const dx=x-item.x,dy=y-item.y;
 if(item.node.id==='toast'&&dy< -42&&Math.abs(dy)>Math.abs(dx)){
  suppressNotificationClickUntil=Date.now()+550;
  clearTimeout(toastTimer);
  item.node.style.transition='transform .2s ease,opacity .2s ease';
  item.node.style.transform='translate3d(0,-120px,0)';
  item.node.style.opacity='0';
  setTimeout(()=>{
   item.node.classList.remove('visible');item.node.dataset.noticeId='';
   item.node.style.transform='';item.node.style.opacity='';item.node.style.transition='';
  },210);
  return;
 }
 if(item.node.id!=='toast'&&dx< -55&&Math.abs(dx)>Math.abs(dy)*1.15){
  suppressNotificationClickUntil=Date.now()+550;
  noticeSwipeAnimating=true;
  const id=item.node.dataset.id;
  item.node.style.transition='transform .24s cubic-bezier(.2,.85,.25,1),opacity .24s ease';
  item.node.style.transform='translate3d(-115%,0,0)';
  item.node.style.opacity='0';
  setTimeout(()=>{noticeSwipeAnimating=false;if(id)readNotification(store,id);else render();},245);
  return;
 }
 if(item.dragging)noticeReset(item);
};
$('#root').addEventListener('touchstart',e=>{if(e.touches.length===1)noticeStart(e.target,e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
$('#root').addEventListener('touchmove',e=>{if(noticeGesture&&e.touches[0])noticeMove(e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
$('#root').addEventListener('touchend',e=>{if(noticeGesture&&e.changedTouches[0])noticeFinish(e.changedTouches[0].clientX,e.changedTouches[0].clientY);},{passive:true});
$('#root').addEventListener('touchcancel',()=>{if(noticeGesture)noticeReset(noticeGesture);noticeGesture=null;},{passive:true});
$('#root').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')noticeStart(e.target,e.clientX,e.clientY);});
$('#root').addEventListener('pointermove',e=>{if(e.pointerType==='mouse')noticeMove(e.clientX,e.clientY);});
$('#root').addEventListener('pointerup',e=>{if(e.pointerType==='mouse')noticeFinish(e.clientX,e.clientY);});
$('#root').addEventListener('submit',e=>{if(!store.get().unlocked){e.preventDefault();return;}const app=registry.get(store.get().nav.current.appId);if(!app?.submit&&!e.target.dataset.form?.startsWith('s55-'))return;e.preventDefault();try{if(submitStory55Form(e.target,ctx()))return;
  if(e.target.dataset.storyScene){
   const channel=e.target.dataset.channel||store.get().nav.current.appId,conversationId=e.target.dataset.id,text=String(new FormData(e.target).get('text')||'');
   if(!conversationId)throw Error('预设聊天尚未选中联系人');
   const pending=currentScript55(store.get(),channel,conversationId);
   if(!pending||pending.kind!=='me'||text.trim()!==pending.text.trim())throw Error('请先发送输入框里的完整预设内容');
   // Clear before state-driven DOM patch, so the next authored line can type
   // immediately even if iOS keeps focus on the same input element.
   e.target.elements.text.value='';
   store.update(s=>sendScriptedDraft55(s,channel,conversationId,text));return;
  }
  const channel=e.target.dataset.channel,conversationId=e.target.dataset.id,hasText=String(new FormData(e.target).get('text')||'').trim().length>0;app.submit(e.target,ctx(),store.get().nav.current);if(e.target.dataset.form==='send-chat'&&channel&&conversationId&&hasText)presets.onOutgoing(channel,conversationId);}catch(err){toast(err.message);}});
$('#root').addEventListener('input',e=>{if(!store.get().unlocked)return;if(e.target.matches('.composer input[name="text"]')){try{quietEditorUpdate=true;store.update(s=>{s.drafts[e.target.form.dataset.id]=e.target.value;});}finally{quietEditorUpdate=false;}return;}const app=registry.get(store.get().nav.current.appId);if(!app?.input)return;try{quietEditorUpdate=true;app.input(e.target,ctx());}catch(err){toast(err.message);}finally{quietEditorUpdate=false;}});
$('#root').addEventListener('focusin',e=>{
  if(store.get().unlocked&&store.get().nav.current.appId==='wechat')registry.get('wechat')?.dismissEmojiForKeyboard?.(e.target);
});
$('#root').addEventListener('change',e=>{if(!store.get().unlocked)return;const app=registry.get(store.get().nav.current.appId);if(app?.change)try{quietEditorUpdate=!!app.isTextEdit?.(e.target);app.change(e.target,ctx(),store.get().nav.current);}catch(err){toast(err.message);}finally{quietEditorUpdate=false;}});
$('#asset-picker').addEventListener('change',async e=>{
 const file=e.target.files?.[0],handler=assetHandler,opts={...imageOptions};
 assetHandler=null;
 if(!file||!handler)return;
 try{
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15_000_000)throw Error('请选择小于 15MB 的 PNG、JPEG 或 WebP');
  const bitmap=await createImageBitmap(file);
  if(opts.cropAspect){
   openAvatarCropper({bitmap,aspect:opts.cropAspect,size:opts.maxEdge,quality:opts.quality,
    onSave:data=>{handler(data,file.name);toast('裁剪图片已保存');},
    onCancel:error=>{if(error)toast('无法保存裁剪图片：'+error.message);}});
  }else{
   const scale=Math.min(1,opts.maxEdge/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');
   canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   bitmap.close?.();
   handler(canvas.toDataURL('image/jpeg',opts.quality),file.name);
   toast('图片已保存到本机');
  }
 }catch(err){toast(err.message);}
});
mountViewport($('#phone'));
setShade({progress:0});
mountGestures($('#phone'),{
 state:()=>({home:store.get().unlocked&&store.get().nav.current.appId==='home',locked:!store.get().unlocked,shade,page:store.get().homePage||0}),
 page:({dx,velocity=0,cancel=false,settle})=>{
  const track=$('#screen-layer .home-track');
  if(!track){pagerBase=null;draggingHome=false;return;}
  const width=track.parentElement.clientWidth||1,count=track.children.length||1;
  // Start from where the track visually is, so grabbing it mid-animation does not jump.
  if(pagerBase===null)pagerBase=new DOMMatrix(getComputedStyle(track).transform).m41;
  const offset=dragOffset({base:pagerBase,dx,width,count});
  if(!settle){
   draggingHome=true;track.style.transition='none';track.style.transform=`translate3d(${offset}px,0,0)`;
   const dots=$('#screen-layer .page-dots');if(dots){const near=nearestPage(offset,width,count);dots.querySelectorAll('button').forEach((dot,i)=>dot.classList.toggle('active',i===near));}
   return;
  }
  const from=nearestPage(pagerBase,width,count),target=cancel?from:pageTarget({from,offset,velocity,width,count});
  pagerBase=null;draggingHome=false;track.style.transition='';
  store.update(s=>{s.homePage=target;});
  // Patching the inline transform and transition in one frame suppresses the CSS
  // transition in Safari. Animate from the actual finger release pixel position.
  const settled=$('#screen-layer .home-track');
  if(settled&&Math.abs(offset+target*width)>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   settled.animate([
    {transform:`translate3d(${offset}px,0,0)`},
    {transform:`translate3d(${-target*width}px,0,0)`}
   ],{duration:360,easing:'cubic-bezier(.2,.8,.22,1)'});
  }
 },
 shade:setShade,
 goHome:({dy,settle,complete=false})=>{
  const screen=$('#screen-layer'),status=$('#status-layer');
  if(!settle){
   const lift=Math.max(0,-dy),progress=Math.min(lift/360,1);
   screen.style.transition='none';screen.style.transform=`translate3d(0,${-lift*.18}px,0) scale(${1-progress*.22})`;
   screen.style.borderRadius=`${Math.round(progress*30)}px`;
   screen.style.boxShadow=`0 ${12+progress*15}px ${progress*46}px #0005`;
   screen.style.zIndex='3';
   status.style.opacity=String(1-progress*.6);
   return;
  }
  if(!complete){
   screen.style.transition='transform 280ms cubic-bezier(.2,.85,.2,1.18), border-radius 280ms ease, box-shadow 280ms ease';
   screen.style.transform='';screen.style.borderRadius='';screen.style.boxShadow='';screen.style.zIndex='';
   status.style.transition='opacity 260ms ease';status.style.opacity='';
   setTimeout(()=>{screen.style.transition='';status.style.transition='';},300);
   return;
  }
  screen.style.transition='';screen.style.transform='';screen.style.borderRadius='';screen.style.boxShadow='';screen.style.zIndex='';status.style.opacity='';
  if(dy<-195){tasks.show(store.get().nav.current);return;}
  swipeHomeReturn=Math.max(0,-dy);router.home();
 },
 switcher:()=>tasks.show(store.get().nav.current),
 unlock:()=>{if(lockscreen.stage==='cover')requestUnlock();}
});
document.addEventListener('keydown',e=>{
  if(store.get().deathPhase==='off'&&['Enter',' '].includes(e.key)){e.preventDefault();lockscreen.open();store.update(s=>{s.deathPhase='passcode';});return;}
  if(!store.get().unlocked){
    if(lockscreen.stage==='cover'&&['ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();requestUnlock();}
    else if(/^\d$/.test(e.key)||['Backspace','Escape'].includes(e.key)){e.preventDefault();enterDigit(e.key==='Backspace'?'erase':e.key==='Escape'?'cancel':e.key);}
    return;
  }
  if(e.key==='Escape'&&!e.target.closest('input,textarea,select'))shade?setShade({progress:0}):router.back();
});
// A local deterministic preview reply, never a real AI or server presence event.
setTimeout(()=>{processDemoReply(store);},2400);
