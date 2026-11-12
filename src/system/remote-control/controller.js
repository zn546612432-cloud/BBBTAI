// Visible, fail-closed virtual iPhone operator.
// Model/story requests are routed through the existing MCP JSON-RPC dispatcher.
// Only this same-page controller can inject the temporary live tool adapter.
// It drives native task-switcher + real Ghost buttons (never Ghost.finish()).
import {dispatchTaiPhoneMcp} from '../../services/ai/phone-mcp/protocol.js';
import {ghostShareReadyForControl,beginGhostShareControl,finishGhostShareControl,TAI_GHOST_THREAD,TAI_REMOTE_TYPED_LINE} from '../../services/story55/ghost-share.js';
import {deploymentReadiness,deployment} from '../../services/story55/projects.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
import {date55} from '../../services/story55/state.js';
import {pipeSolved} from '../../apps/ghost/games/pipe-network.js';
import {solveLinkPipe} from './link-solver.js';
import {createTaiLivePhoneTools} from './mcp.js';
import {isMirageAuthenticated} from '../../apps/mirage/session.js';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const isRunning=s=>s?.story55?.ghostShare?.phase==='controlling'&&s.story55.ghostShare.remote?.active===true;
const navLink=s=>s.nav?.current?.appId==='mirage'&&s.nav.current.route==='/chat/'+TAI_GHOST_THREAD;
const composerReady=doc=>isMirageAuthenticated()&&!!doc?.querySelector?.('#screen-layer .mc-composer input[name="text"]');
const eligibleOrder=o=>o?.type==='route'&&['authorized','failed','running'].includes(o.status)&&
 (!o.requiresKeyEntry||o.keyVerified);
function possibleLink(s){
 const source=s.story55?.ghostShare?.source;
 if(!source)return false;
 if(source.type==='ghost-order')return eligibleOrder(s.ghost?.orders?.[source.orderId]);
 if(source.type!=='ghost-project'||!s.story55.projects?.[source.projectId]?.authorized)return false;
 const running=deployment(s,source.projectId).active;
 if(running&&eligibleOrder(s.ghost?.orders?.[running]))return true;
 const ready=deploymentReadiness(s,source.projectId),project=s.story55.config?.projects?.find(p=>p.id===source.projectId);
 if(!ready.canStart||!project)return false;
 const batch=deployment(s,source.projectId).batches?.[ready.batch],
  step=project.steps.findIndex((_,i)=>!batch?.steps?.[i]);
 return project.steps[step]==='route';
}

// One safe reconciliation for browser reloads or abandoned phone tabs.
// Do not replay the animation, double-settle a GHOST order, or erase history.
export function recoverTaiRemoteSession(store){
 const old=store.get().story55?.ghostShare;
 if(old?.phase!=='controlling'&&!old?.remote?.active)return false;
 store.update(s=>{
  const p=s.story55?.ghostShare;
  if(!p)return;
  p.phase='interrupted';
  p.remote??={};
  p.remote.active=false;
  p.remote.stage='ended';
 });
 return true;
}

export function createTaiRemoteController({store,router,tasks,toast=()=>{},document:doc=globalThis.document}){
 const live=createTaiLivePhoneTools({store,router,tasks,document:doc});
 let busy=false,queued=false,callId=0,cursor=null;
 function tool(name,args={}){
  const result=dispatchTaiPhoneMcp(store.get(),{
   jsonrpc:'2.0',id:++callId,method:'tools/call',
   params:{name,arguments:args}
  },{liveTools:live})?.result?.structuredContent;
  if(!result?.ok)throw Error(result?.error||'remote_tool_error');
  return result.data;
 }
 function valid(){return isRunning(store.get())&&!doc.hidden;}
 function assertRunning(){if(!valid())throw Error('remote_session_interrupted');}
 function moveStage(stage,orderId){
  store.update(s=>{
   const p=s.story55?.ghostShare;
   if(p?.phase==='controlling'&&p.remote?.active){
    p.remote.stage=stage;
    if(orderId)p.remote.orderId=orderId;
   }
  });
 }
 function hintOnce(){
  const s=store.get();
  if(!isRunning(s)||s.story55.ghostShare.remote.warningShown)return;
  store.update(next=>{
   const p=next.story55?.ghostShare;
   if(!p?.remote?.active||p.remote.warningShown)return;
   p.remote.warningShown=true;
   appendAuthoredPhoneMessage(next,{
    channel:'mirage',conversationId:TAI_GHOST_THREAD,
    messageId:p.cardId+'-remote-warning',from:TAI_GHOST_THREAD,text:'別亂動。',
    storyTag:'story55',day:next.day,clock:next.clock,
    sentDate:date55(next.day),notify:true
   });
  });
 }
 // Trusted player events are stopped before native Ghost handlers see them.
 // Programmatic .click() is untrusted and remains subject to the same handlers.
 const blockUser=e=>{
  if(!e.isTrusted||!isRunning(store.get()))return;
  const phone=e.target?.closest?.('#phone');
  if(!phone&&e.type!=='keydown')return;
  if(e.cancelable)e.preventDefault();
  e.stopImmediatePropagation();
  hintOnce();
 };
 for(const type of ['pointerdown','touchstart','mousedown','click','dblclick','keydown','submit'])
  doc.addEventListener(type,blockUser,{capture:true,passive:false});
 function finger(){
  const phone=doc.querySelector('#phone');
  if(!phone)return null;
  if(cursor?.isConnected)return cursor;
  cursor=doc.createElement('span');
  cursor.className='tai-remote-finger';
  cursor.setAttribute('aria-hidden','true');
  phone.append(cursor);
  return cursor;
 }
 async function tapVisual(index){
  const btn=doc.querySelector('#screen-layer [data-action="gh-pipe"][data-index="'+index+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!btn||!phone||!pointer)throw Error('pipe_button_not_visible');
  const frame=phone.getBoundingClientRect(),box=btn.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible');
  await delay(220);
  assertRunning();
  pointer.classList.add('is-tapping');
  await delay(120);
  assertRunning();
  tool('remote_rotate_pipe',{index});
  pointer.classList.remove('is-tapping');
  await delay(360);
 }
 async function typeRemote(){
  const p=store.get().story55?.ghostShare;
  if(p?.script!=='first')return;
  const selector='#screen-layer .mc-composer input[name="text"]';
  for(let i=1;i<=TAI_REMOTE_TYPED_LINE.length;i++){
   assertRunning();
   const input=doc.querySelector(selector);
   if(!input||!input.isConnected)throw Error('mirage_composer_not_visible');
   input.readOnly=true;
   input.value=TAI_REMOTE_TYPED_LINE.slice(0,i);
   await delay(73);
  }
  assertRunning();
  const input=doc.querySelector(selector),form=input?.form;
  const sendButton=form?.querySelector('button[type="submit"]');
  if(!form?.isConnected||!sendButton||sendButton.disabled)
   throw Error('mirage_send_not_available');
  // Tai is typing on Xi Meng's phone: the existing MIRAGE SEND button is
  // actually pressed, then the normal app submit route writes a 'me' bubble.
  // Never forge an NPC reply or bypass the native message pipeline.
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(phone&&pointer){
   const frame=phone.getBoundingClientRect(),box=sendButton.getBoundingClientRect();
   pointer.style.left=(box.left+box.width/2-frame.left)+'px';
   pointer.style.top=(box.top+box.height/2-frame.top)+'px';
   pointer.classList.add('is-visible','is-tapping');
  }
  sendButton.click();
  // main.js delegates submit asynchronously; wait for the canonical
  // outgoing-message acknowledgment before swiping to the background.
  for(let i=0;i<35;i++){
   assertRunning();
   const next=store.get().story55?.ghostShare;
   if(next?.remote?.stage==='sent')break;
   await delay(80);
  }
  if(store.get().story55?.ghostShare?.remote?.stage!=='sent')
   throw Error('mirage_takeover_send_failed');
  pointer?.classList.remove('is-tapping');
  await delay(450);
 }
 async function showTasks(){
  assertRunning();
  tool('remote_show_tasks');
  await delay(300);
  const ghostCard=doc.querySelector('#task-layer .task-card[data-task="ghost"]');
  ghostCard?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});
  await delay(460);
  assertRunning();
 }
 function selectedOrderId(s){
  const p=s.story55.ghostShare,source=p.source;
  return source.type==='ghost-order'?source.orderId:deployment(s,source.projectId)?.active;
 }
 async function openAndStart(){
  const source=store.get().story55.ghostShare.source;
  await showTasks();
  assertRunning();
  if(source.type==='ghost-project'){
   tool('remote_open_ghost',{route:'/deployment'});
   await delay(330);assertRunning();
   let id=selectedOrderId(store.get());
   if(!id||!eligibleOrder(store.get().ghost?.orders?.[id])){
    tool('remote_press_ghost',{action:'s55-run-step'});
    await delay(380);assertRunning();
    id=selectedOrderId(store.get());
   }
   if(!id)throw Error('link_order_not_created');
   tool('remote_open_ghost',{route:'/contract'});
  }else tool('remote_open_ghost',{route:'/contract'});
  await delay(320);assertRunning();
  tool('remote_press_ghost',{action:'gh-start'});
  await delay(350);assertRunning();
  const target=tool('remote_read_link');
  if(target.status!=='running'||!target.board?.masks?.length)throw Error('link_board_not_running');
  moveStage('running',target.orderId);
  return target.orderId;
 }
 async function solve(id){
  const initial=store.get().ghost.orders[id]?.board;
  const plan=solveLinkPipe(initial);
  if(!plan)throw Error('link_solution_not_found');
  for(const item of plan){
   for(let turn=0;turn<item.turns;turn++){
    assertRunning();
    const o=store.get().ghost?.orders?.[id];
    if(!o||o.status!=='running')break;
    await tapVisual(item.index);
   }
  }
  // Original GHOST tick completes preview-win after three real seconds;
  // the runner never calls finish() or posts a reward.
  for(let i=0;i<36;i++){
   assertRunning();
   const o=store.get().ghost?.orders?.[id];
   if(['success','paid','settling'].includes(o?.status))return true;
   if(!o||!['preview-win','running'].includes(o.status))throw Error('link_run_ended_unsuccessfully');
   await delay(250);
  }
  throw Error('link_completion_timeout');
 }
 function close(){
  cursor?.remove();cursor=null;
  if(tasks.visible)tasks.hide();
  const s=store.get();
  const origin=s.story55?.ghostShare?.remote?.origin;
  if(origin&&s.unlocked&&!s.poweredOff&&s.nav.current.appId==='ghost')
   router.open(origin);
 }
 async function start(){
  if(busy||!ghostShareReadyForControl(store.get())||!navLink(store.get())||
   !store.get().unlocked||doc.hidden||!composerReady(doc))return;
  busy=true;
  const s=store.get(),source=s.story55.ghostShare.source;
  if(!possibleLink(s)){
   store.update(next=>{if(next.story55?.ghostShare?.phase==='ready-control')
    next.story55.ghostShare.phase='unavailable';});
   busy=false;return;
  }
  try{
   const origin=structuredClone(s.nav.current);
   let begun=false;
   store.update(next=>{
    begun=beginGhostShareControl(next);
    if(!begun)return;
    next.story55.ghostShare.remote={
     active:true,stage:'typing',origin,authorizedDay:next.day,
     warningShown:false,orderId:null
    };
   });
   if(!begun)return;
   await typeRemote();
   const id=await openAndStart();
   const success=await solve(id);
   if(!success)throw Error('link_not_completed');
   tool('remote_release');
  }catch(error){
   if(isRunning(store.get())){
    try{tool('remote_release');}catch{
     store.update(next=>{
      const p=next.story55?.ghostShare;
      if(p?.phase==='controlling'){finishGhostShareControl(next);p.remote.active=false;}
     });
    }
   }
   // A dropped connection never claims the LINK puzzle was completed.
   toast('遠端連線已中斷');
  }finally{
   close();busy=false;
  }
 }
 function sync(){
  if(queued||busy||!ghostShareReadyForControl(store.get())||!navLink(store.get())||
   !store.get().unlocked||doc.hidden||!composerReady(doc))return;
  queued=true;
  queueMicrotask(()=>{queued=false;void start();});
 }
 return {sync,get busy(){return busy;},tools:live};
}
