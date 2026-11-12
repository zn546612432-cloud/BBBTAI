// Visible, fail-closed virtual iPhone operator.
// Model/story requests are routed through the existing MCP JSON-RPC dispatcher.
// Only this same-page controller can inject the temporary live tool adapter.
// It drives native task-switcher + real Ghost buttons (never Ghost.finish()).
import {dispatchTaiPhoneMcp} from '../../services/ai/phone-mcp/protocol.js';
import {ghostShareReadyForControl,beginGhostShareControl,finishGhostShareControl,TAI_GHOST_THREAD,TAI_REMOTE_TYPED_LINE} from '../../services/story55/ghost-share.js';
import {deploymentReadiness,deployment} from '../../services/story55/projects.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
import {date55} from '../../services/story55/state.js';
import {interruptTaiRemoteSession} from './session.js';
import {solveLinkPipe} from './link-solver.js';
import {solveCipherTiles} from './cipher-solver.js';
import {veilPlan} from './veil-solver.js';
import {extractNextTap,extractLegacyChoice} from './extract-solver.js';
import {verifyNextToken} from './verify-solver.js';
import {createTaiLivePhoneTools} from './mcp.js';
import {taiRemoteCanOperateOrder,taiRemoteUpcomingProjectStepAllowed,TAI_REMOTE_GHOST_TYPES} from './policy.js';
import {isMirageAuthenticated,setMirageAuthenticated} from '../../apps/mirage/session.js';
import {pauseTaiRemoteOnHide,resumeTaiRemoteOnShow,createTaiForegroundDelay} from './visibility.js';

const isRunning=s=>s?.story55?.ghostShare?.phase==='controlling'&&s.story55.ghostShare.remote?.active===true;
const navLink=s=>s.nav?.current?.appId==='mirage'&&s.nav.current.route==='/chat/'+TAI_GHOST_THREAD;
const composerReady=doc=>isMirageAuthenticated()&&!!doc?.querySelector?.('#screen-layer .mc-composer input[name="text"]');
const eligibleOrder=taiRemoteCanOperateOrder;
function possibleLink(s){
 const source=s.story55?.ghostShare?.source;
 if(!source)return false;
 if(source.type==='ghost-order')return eligibleOrder(s,s.ghost?.orders?.[source.orderId]);
 if(source.type!=='ghost-project'||!s.story55.projects?.[source.projectId]?.authorized)return false;
 const running=deployment(s,source.projectId).active;
 if(running&&eligibleOrder(s,s.ghost?.orders?.[running]))return true;
 const ready=deploymentReadiness(s,source.projectId),project=s.story55.config?.projects?.find(p=>p.id===source.projectId);
 if(!ready.canStart||!project)return false;
 const batch=deployment(s,source.projectId).batches?.[ready.batch],
  step=project.steps.findIndex((_,i)=>!batch?.steps?.[i]);
 return taiRemoteUpcomingProjectStepAllowed(s,project.steps[step],source.projectId);
}

// One safe reconciliation for browser reloads or abandoned phone tabs.
// Do not replay the animation, double-settle a GHOST order, or erase history.
export function recoverTaiRemoteSession(store){
 const old=store.get().story55?.ghostShare;
 if(old?.phase!=='controlling'&&!old?.remote?.active)return false;
 store.update(s=>{
  interruptTaiRemoteSession(s);
 });
 return true;
}

export function createTaiRemoteController({store,router,tasks,toast=()=>{},refresh=()=>{},document:doc=globalThis.document,window:win=doc.defaultView??globalThis.window,submitMirageForm=null}){
 const live=createTaiLivePhoneTools({store,router,tasks,document:doc});
 let busy=false,queued=false,callId=0,cursor=null,sessionToken=null,cancellation=null;
 // Visibility is a pause, NOT an interruption: keep the same in-memory
 // controller and let GHOST's existing board/deadline resume on foreground.
 function visibility(hidden){
  if(!isRunning(store.get()))return;
  const paused=Number.isFinite(store.get().story55.ghostShare.remote.pausedAt);
  if(hidden===paused)return; // repeated lifecycle events do not rewrite saves
  if(hidden){
   store.update(s=>pauseTaiRemoteOnHide(s));
  }else{
   store.update(s=>resumeTaiRemoteOnShow(s));
  }
 }
 // Registered before main's later battery/pageshow listeners. pagehide is
 // also a pause when WebKit has not updated document.hidden yet; BFCache
 // pageshow resumes the same in-memory operator rather than interrupting it.
 doc.addEventListener('visibilitychange',()=>visibility(doc.hidden));
 win?.addEventListener('pagehide',()=>visibility(true));
 win?.addEventListener('pageshow',()=>visibility(doc.hidden));
 const foregroundDelay=createTaiForegroundDelay(doc,{window:win,
  isPaused:()=>Number.isFinite(store.get().story55?.ghostShare?.remote?.pausedAt)});
 const delay=ms=>foregroundDelay(ms,cancellation?.signal);
 function tool(name,args={}){
  const result=dispatchTaiPhoneMcp(store.get(),{
   jsonrpc:'2.0',id:++callId,method:'tools/call',
   params:{name,arguments:args}
  },{liveTools:live})?.result?.structuredContent;
  if(!result?.ok)throw Error(result?.error||'remote_tool_error');
  return result.data;
 }
 function valid(){
  const s=store.get();
  return !cancellation?.signal.aborted&&isRunning(s)&&
   s.story55?.ghostShare?.remote?.token===sessionToken;
 }
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
 async function tapVisual(index,action='gh-pipe'){
  if(!['gh-pipe','gh-tile'].includes(action))throw Error('remote_action_not_allowed');
  const btn=doc.querySelector('#screen-layer [data-action="'+action+'"][data-index="'+index+'"]');
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
  tool(action==='gh-pipe'?'remote_rotate_pipe':'remote_tap_cipher_tile',{index});
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
  // The focused composer may be repatched by the normal phone runtime while
  // letters animate; ensure its final DOM value matches the exact draft when
  // the native form snapshots FormData for SEND.
  input.value=TAI_REMOTE_TYPED_LINE;
  // A browser-generated form-submit event is indistinguishable from a human
  // submit to the exclusive-control guard. Use the *existing* MIRAGE submit
  // method as the execution channel, while the visible fingertip presses SEND.
  // Never write an outgoing bubble or change a project from this controller.
  if(typeof submitMirageForm!=='function')throw Error('mirage_submit_not_wired');
  const value=String(new FormData(form).get('text')||'');
  if(value!==TAI_REMOTE_TYPED_LINE)throw Error('mirage_remote_text_not_ready');
  submitMirageForm(form);
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
  let id=selectedOrderId(store.get());
  await showTasks();
  assertRunning();
  if(source.type==='ghost-project'){
   tool('remote_open_ghost',{route:'/deployment'});
   await delay(330);assertRunning();
   id=selectedOrderId(store.get());
   if(!id||!eligibleOrder(store.get(),store.get().ghost?.orders?.[id])){
    tool('remote_press_ghost',{action:'s55-run-step'});
    await delay(380);assertRunning();
    id=selectedOrderId(store.get());
   }
   if(!id)throw Error('link_order_not_created');
   tool('remote_open_ghost',{route:'/contract'});
  }else tool('remote_open_ghost',{route:'/contract'});
  await delay(320);assertRunning();
  id=selectedOrderId(store.get());
  const existing=store.get().ghost?.orders?.[id];
  if(!eligibleOrder(store.get(),existing))
   throw Error(existing?.type==='strike'?'strike_legacy_not_controllable':'remote_order_not_allowed');
  if(existing.status==='running'){
   // Mid-run share: never regenerate board, attempts or deadline.
   tool('remote_open_ghost',{route:'/run'});
  }else{
   tool('remote_press_ghost',{action:'gh-start'});
  }
  await delay(350);assertRunning();
  const run=store.get().ghost?.orders?.[id];
  if(!run||!TAI_REMOTE_GHOST_TYPES.includes(run.type))throw Error('unsupported_ghost_order');
  const target=tool(run.type==='route'?'remote_read_link':
    run.type==='cipher'?'remote_read_cipher':
    run.type==='veil'?'remote_read_veil':
    run.type==='extract'?'remote_read_extract':
    run.type==='strike'?'remote_read_strike':'remote_read_verify');
  if(target.status!=='running'||!(run.type==='route'?
      target.board?.masks?.length:run.type==='cipher'?
      target.board?.tiles?.length:run.type==='veil'?
      (target.board?.kind==='veil'||target.board?.kind==='legacy-keypad'):
      run.type==='extract'?
      (target.board?.kind==='extract'||target.board?.kind==='legacy-fingerprint'):
      run.type==='strike'?target.board?.kind==='strike':
      target.board?.target?.length===4&&target.board?.tokens?.length===4))
   throw Error('ghost_board_not_running');
  moveStage('running',target.orderId);
  return target.orderId;
 }
 async function tapVeilVisual(direction,delayMs){
  assertRunning();
  const action='gh-arcade-step';
  // Each tap queries the freshly rendered button. The Ghost timer can repaint.
  const button=doc.querySelector('#screen-layer [data-action="'+action+'"][data-value="'+direction+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!button||!button.isConnected||button.disabled||!phone||!pointer)
   throw Error('veil_direction_button_not_visible');
  const frame=phone.getBoundingClientRect(),box=button.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible');
  await delay(Math.min(145,Math.max(65,delayMs*.4)));
  assertRunning();
  pointer.classList.add('is-tapping');
  const result=tool('remote_step_veil',{direction});
  pointer.classList.remove('is-tapping');
  await delay(Math.max(45,delayMs-145));
  return result;
 }
 async function pressVeilKey(key){
  assertRunning();
  const button=doc.querySelector('#screen-layer [data-action="gh-key"][data-key="'+key+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!button||!button.isConnected||button.disabled||!phone||!pointer)
   throw Error('veil_legacy_key_not_visible');
  const frame=phone.getBoundingClientRect(),box=button.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible','is-tapping');
  await delay(65);
  assertRunning();
  tool('remote_press_veil_key',{key});
  pointer.classList.remove('is-tapping');
  await delay(95);
 }
 async function solveVeil(id){
  let stalls=0;
  // A changing scanner is re-evaluated after EVERY acknowledged native move.
  // 160 is a fail-closed total limit; the theoretical state graph has 75 nodes.
  for(let count=0;count<160;count++){
   assertRunning();
   const current=tool('remote_read_veil');
   if(current.orderId!==id)throw Error('veil_order_changed');
   if(current.status==='success'||current.status==='paid')return;
   if(current.status!=='running'||!current.board)throw Error('veil_run_not_active');
   const board=current.board,deadline=current.deadline;
   if(board.kind==='legacy-keypad'){
    const remaining=board.code.slice(board.input.length);
    if(!board.code.startsWith(board.input)||!remaining.length)throw Error('veil_legacy_input_mismatch');
    if(Number.isFinite(deadline)&&deadline-Date.now()<remaining.length*170+650)
     throw Error('veil_insufficient_time');
    const before=board.input,round=board.round;
    await pressVeilKey(remaining[0]);
    const next=tool('remote_read_veil');
    if(next.status==='success'||next.status==='paid')return;
    if(next.status!=='running'||next.board?.kind!=='legacy-keypad')
     throw Error('veil_legacy_stage_changed');
    const moved=next.board.round>round||next.board.input!==before;
    stalls=moved?0:stalls+1;
   }else if(board.kind==='veil'){
    const plan=veilPlan(board);
    if(!plan)throw Error('veil_path_unreachable');
    if(!plan.length)throw Error('veil_exit_not_settled');
    const remaining=Number.isFinite(deadline)?deadline-Date.now():Infinity;
    const minMs=plan.length*140+650;
    if(remaining<minMs)throw Error('veil_insufficient_time');
    const period=Number.isFinite(remaining)?
     Math.min(450,Math.max(140,(remaining-650)/plan.length-80)):350;
    const oldSteps=board.steps;
    await tapVeilVisual(plan[0],period);
    let next=tool('remote_read_veil'),ack=next.status!=='running'||next.board?.steps>oldSteps;
    // The original Ghost store should acknowledge synchronously; tolerate
    // a queued render while avoiding double-clicks on a stale board.
    for(let i=0;i<7&&!ack;i++){
     await delay(65);assertRunning();
     next=tool('remote_read_veil');
     ack=next.status!=='running'||next.board?.steps>oldSteps;
    }
    stalls=ack?0:stalls+1;
    if(ack&&next.board?.kind==='veil'&&next.board.heat>board.heat)
     throw Error('veil_scanner_caught_operator');
   }else throw Error('veil_unknown_board');
   if(stalls>=3)throw Error('veil_three_stalled_inputs');
  }
  throw Error('veil_max_steps_exceeded');
 }
 async function tapExtractVisual(index,legacy=false){
  assertRunning();
  const action=legacy?'gh-match':'gh-arcade-tap';
  const attribute=legacy?'data-index':'data-value';
  // Do not hold a stale DOM element: GHOST tick can replace the screen.
  const button=doc.querySelector('#screen-layer [data-action="'+action+'"]['+attribute+'="'+index+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!button||button.disabled||!button.isConnected||!phone||!pointer)
   throw Error('extract_button_not_visible');
  const frame=phone.getBoundingClientRect(),box=button.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible');
  await delay(135);
  assertRunning();
  pointer.classList.add('is-tapping');
  tool(legacy?'remote_choose_extract_legacy':'remote_tap_extract',{index});
  pointer.classList.remove('is-tapping');
  await delay(190);
 }
 async function solveExtract(id){
  // A physical-memory strategy: remember only GHOST faces that were displayed.
  // No direct board.cards lookup and no scripted completion call.
  let known={},stalls=0;
  for(let count=0;count<80;count++){
   assertRunning();
   const current=tool('remote_read_extract');
   if(current.orderId!==id)throw Error('extract_order_changed');
   if(['success','paid'].includes(current.status))return;
   if(current.status!=='running'||!current.board)throw Error('extract_run_not_active');
   const board=current.board,deadline=current.deadline;
   if(board.kind==='legacy-fingerprint'){
    const index=extractLegacyChoice(board);
    if(index===null)throw Error('extract_legacy_fingerprint_not_found');
    if(Number.isFinite(deadline)&&deadline-Date.now()<600)
     throw Error('extract_insufficient_time');
    const before=store.get().ghost?.orders?.[id]?.moves||0;
    await tapExtractVisual(index,true);
    const after=tool('remote_read_extract');
    if(['success','paid'].includes(after.status))return;
    stalls=store.get().ghost.orders[id].moves>before?0:stalls+1;
   }else if(board.kind==='extract'){
    const plan=extractNextTap(board,known);
    if(!plan)throw Error('extract_memory_plan_invalid');
    known=plan.known;
    if(plan.done)throw Error('extract_settlement_pending');
    if(plan.waitUntil!==undefined){
     // Two mismatched cards stay face-up for 720ms. Learn their symbols,
     // then allow the original GHOST tick to turn them back over.
     await delay(Math.max(75,Math.min(230,plan.waitUntil-Date.now()+30)));
     continue;
    }
    const unseen=board.cardCount-board.matched.length;
    if(Number.isFinite(deadline)&&deadline-Date.now()<unseen*185+700)
     throw Error('extract_insufficient_time');
    const before=store.get().ghost?.orders?.[id]?.moves||0;
    await tapExtractVisual(plan.index);
    const after=tool('remote_read_extract');
    if(['success','paid'].includes(after.status))return;
    stalls=store.get().ghost.orders[id].moves>before?0:stalls+1;
    if(after.board?.kind==='extract'){
     const learned=extractNextTap(after.board,known);
     if(!learned)throw Error('extract_visible_memory_invalid');
     known=learned.known;
    }
   }else throw Error('extract_unknown_board');
   if(stalls>=3)throw Error('extract_three_stalled_clicks');
  }
  throw Error('extract_max_taps_exceeded');
 }
 async function tapStrikeVisual(target){
  assertRunning();
  const button=doc.querySelector('#screen-layer [data-action="gh-arcade-tap"][data-value="'+target+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!button||!button.isConnected||button.disabled||!phone||!pointer)
   throw Error('strike_target_not_visible');
  const frame=phone.getBoundingClientRect(),box=button.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible');
  await delay(180);assertRunning();
  pointer.classList.add('is-tapping');
  await delay(90);assertRunning();
  tool('remote_tap_strike',{index:target});
  pointer.classList.remove('is-tapping');
  await delay(285);
 }
 async function solveStrike(id){
  let stalls=0;
  for(let i=0;i<20;i++){
   assertRunning();
   const current=tool('remote_read_strike');
   if(current.orderId!==id)throw Error('strike_order_changed');
   if(['success','paid'].includes(current.status))return;
   if(current.status!=='running'||current.board?.kind!=='strike')
    throw Error('strike_run_not_active');
   const board=current.board;
   if(board.misses>=board.maxMisses)throw Error('strike_run_failed');
   const remainingHits=board.goal-board.hits;
   if(remainingHits<=0)throw Error('strike_settlement_pending');
   if(!Number.isFinite(current.deadline)||
      current.deadline-Date.now()<remainingHits*900+1500)
    throw Error('strike_insufficient_time');
   const lastHits=board.hits,lastMisses=board.misses,lastTarget=board.target;
   await tapStrikeVisual(lastTarget);
   let next=tool('remote_read_strike');
   if(next.orderId!==id)throw Error('strike_order_changed');
   if(next.board&&next.board.misses>lastMisses)
    throw Error('strike_miss_detected');
   if(['success','paid'].includes(next.status)){
    if(next.board?.hits!==lastHits+1)throw Error('strike_win_unverified');
    return;
   }
   let progressed=next.status==='running'&&next.board?.hits===lastHits+1&&
    next.board.target!==lastTarget;
   for(let j=0;j<5&&!progressed;j++){
    await delay(65);assertRunning();
    next=tool('remote_read_strike');
    if(next.board?.misses>lastMisses)throw Error('strike_miss_detected');
    if(['success','paid'].includes(next.status)){
     if(next.board?.hits!==lastHits+1)throw Error('strike_win_unverified');
     return;
    }
    progressed=next.status==='running'&&next.board?.hits===lastHits+1&&
     next.board.target!==lastTarget;
   }
   stalls=progressed?0:stalls+1;
   if(stalls>=3)throw Error('strike_no_progress');
  }
  throw Error('strike_tap_limit');
 }
 async function tapVerifyVisual(index){
  assertRunning();
  // Every press targets a newly queried DOM button. Timer redraws can
  // replace the previous button; the native Ghost handler owns all progress.
  const button=doc.querySelector('#screen-layer [data-action="gh-verify-token"][data-index="'+index+'"]');
  const phone=doc.querySelector('#phone'),pointer=finger();
  if(!button||button.disabled||!button.isConnected||!phone||!pointer)
   throw Error('verify_button_not_visible');
  const frame=phone.getBoundingClientRect(),box=button.getBoundingClientRect();
  pointer.style.left=(box.left+box.width/2-frame.left)+'px';
  pointer.style.top=(box.top+box.height/2-frame.top)+'px';
  pointer.classList.add('is-visible');
  await delay(190);assertRunning();
  pointer.classList.add('is-tapping');
  await delay(85);assertRunning();
  tool('remote_tap_verify_token',{index});
  pointer.classList.remove('is-tapping');
  await delay(225);
 }
 async function solveVerify(id){
  let stalls=0;
  for(let n=0;n<16;n++){
   assertRunning();
   const current=tool('remote_read_verify');
   if(current.orderId!==id)throw Error('verify_order_changed');
   if(['success','paid'].includes(current.status))return;
   if(current.status!=='running')throw Error('verify_run_not_active');
   const plan=verifyNextToken(current.board);
   if(!plan||plan.done)throw Error('verify_board_invalid');
   const left=current.board.target.length-plan.progress;
   if(Number.isFinite(current.deadline)&&current.deadline-Date.now()<left*600+850)
    throw Error('verify_insufficient_time');
   const before=store.get().ghost?.orders?.[id];
   const moves=before?.moves||0,errors=before?.errors||0;
   await tapVerifyVisual(plan.index);
   let next=tool('remote_read_verify');
   if(next.orderId!==id)throw Error('verify_order_changed');
   if(store.get().ghost.orders[id].errors!==errors)
    throw Error('verify_wrong_token');
   let progressed=store.get().ghost.orders[id].moves===moves+1&&
    (next.status==='success'||next.board?.input?.length===plan.progress+1);
   for(let k=0;k<4&&!progressed;k++){
    await delay(65);assertRunning();
    next=tool('remote_read_verify');
    if(store.get().ghost.orders[id].errors!==errors)
     throw Error('verify_wrong_token');
    progressed=store.get().ghost.orders[id].moves===moves+1&&
     (next.status==='success'||next.board?.input?.length===plan.progress+1);
   }
   if(!progressed)stalls++;
   else stalls=0;
   if(stalls>=3)throw Error('verify_three_stalled_taps');
   if(next.status==='success')return;
   if(progressed){
    const after=verifyNextToken(next.board);
    if(!after||after.progress!==plan.progress+1)
     throw Error('verify_progress_corrupt');
   }
  }
  throw Error('verify_tap_limit');
 }
 async function solve(id){
  const run=store.get().ghost.orders[id],initial=run?.board;
  if(run?.type==='route'){
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
  }else if(run?.type==='cipher'){
   for(let step=0;step<12;step++){
    assertRunning();
    const current=tool('remote_read_cipher');
    if(current.orderId!==id)throw Error('cipher_order_changed');
    if(['success','paid'].includes(current.status))break;
    const board=current.board;
    if(current.status!=='running'||!board)throw Error('cipher_run_not_active');
    // Clicking the selected tile again uses Ghost's own no-op swap to
    // release the selection, without rewriting any tile or selection field.
    if(board.selected!==null){
     if(!Number.isInteger(board.selected)||board.selected<0||board.selected>8)
      throw Error('cipher_selection_invalid');
     await tapVisual(board.selected,'gh-tile');
     const cleared=store.get().ghost?.orders?.[id]?.board;
     if(cleared?.selected!==null||cleared.tiles.some((x,i)=>x!==board.tiles[i]))
      throw Error('cipher_selection_not_cleared');
     continue;
    }
    const plan=solveCipherTiles(board);
    if(!plan?.length)throw Error('cipher_solution_not_found');
    const {first,second}=plan[0],expected=[...board.tiles];
    [expected[first],expected[second]]=[expected[second],expected[first]];
    await tapVisual(first,'gh-tile');
    assertRunning();
    await tapVisual(second,'gh-tile');
    const after=store.get().ghost?.orders?.[id]?.board;
    if(after?.selected!==null||after.tiles.some((x,i)=>x!==expected[i]))
     throw Error('cipher_swap_not_acknowledged');
   }
  }else if(run?.type==='veil'){
   await solveVeil(id);
  }else if(run?.type==='extract'){
   await solveExtract(id);
  }else if(run?.type==='strike'){
   await solveStrike(id);
  }else if(run?.type==='verify'){
   await solveVerify(id);
  }else throw Error('unsupported_ghost_order');
  // The original GHOST handlers own success and settlement (LINK also
  // requires a preview delay). The operator must never call finish().
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
  if(origin&&s.unlocked&&!s.poweredOff&&s.nav.current.appId==='ghost'){
   // A forced takeover temporarily leaves the authenticated MIRAGE chat.
   // Returning to that same chat must not strand the user at its login
   // screen; ordinary voluntary app entries still use onEnter logout.
   const authenticated=isMirageAuthenticated()&&origin.appId==='mirage';
   router.open(origin);
   if(authenticated){
    setMirageAuthenticated(true);
    refresh();
   }
  }
 }
 async function start(){
  if(busy||!ghostShareReadyForControl(store.get())||!navLink(store.get())||
   !store.get().unlocked||doc.hidden||!composerReady(doc))return;
  busy=true;
  cancellation=new AbortController();
  const s=store.get(),source=s.story55.ghostShare.source;
  if(!possibleLink(s)){
   store.update(next=>{if(next.story55?.ghostShare?.phase==='ready-control')
    next.story55.ghostShare.phase='unavailable';});
   busy=false;return;
  }
  try{
   const origin=structuredClone(s.nav.current);
   sessionToken=s.story55.ghostShare.cardId+':'+Date.now().toString(36);
   let begun=false;
   store.update(next=>{
    begun=beginGhostShareControl(next);
    if(!begun)return;
    next.story55.ghostShare.remote={
     active:true,stage:'typing',origin,authorizedDay:next.day,
     warningShown:false,orderId:null,token:sessionToken
    };
   });
   if(!begun)return;
   await typeRemote();
   const id=await openAndStart();
   const success=await solve(id);
   if(!success)throw Error('link_not_completed');
   tool('remote_release');
  }catch(error){
   console.warn('[TAI remote session]',error?.message||error);
   if(isRunning(store.get())&&store.get().story55?.ghostShare?.remote?.token===sessionToken){
    try{tool('remote_release');}catch{
     store.update(next=>{
      const p=next.story55?.ghostShare;
      if(p?.phase==='controlling'){finishGhostShareControl(next);p.remote.active=false;}
     });
    }
   }
   // A dropped connection never claims the LINK puzzle was completed.
   if(!cancellation?.signal.aborted&&!['strike_insufficient_time','strike_legacy_not_controllable'].includes(error?.message))toast('遠端連線已中斷');
  }finally{
   if(cancellation?.signal.aborted){cursor?.remove();cursor=null;if(tasks.visible)tasks.hide();}
   else if(!isRunning(store.get())||store.get().story55?.ghostShare?.remote?.token===sessionToken)close();
   sessionToken=null;cancellation=null;busy=false;sync();
  }
 }
 function sync(){
  const current=store.get().story55?.ghostShare;
  if(busy&&(current?.remote?.token!==sessionToken||current?.phase==='interrupted'))cancellation?.abort();
  if(queued||busy||!ghostShareReadyForControl(store.get())||!navLink(store.get())||
   !store.get().unlocked||doc.hidden||!composerReady(doc))return;
  queued=true;
  queueMicrotask(()=>{queued=false;void start();});
 }
 return {sync,get busy(){return busy;},tools:live};
}
