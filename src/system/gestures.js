import {releaseVelocity} from './pager.js';

const DEAD_ZONE=9;
const BLOCKED='input,textarea,select,[data-drag-message],.composer,.passcode-panel,#task-layer';
export const isNativeScrollTarget = target => !!target?.closest?.('[data-native-scroll]');
export function classifyGesture({dx,dy,home,locked,shade,top,bottom}){
 if(Math.max(Math.abs(dx),Math.abs(dy))<DEAD_ZONE)return null;
 if(shade&&Math.abs(dy)>Math.abs(dx))return 'shade';
 if(locked&&top&&dy>0&&Math.abs(dy)>Math.abs(dx))return 'shade';
 if(locked)return dy<0&&Math.abs(dy)>Math.abs(dx)?'unlock':null;
 if(bottom&&dy<0&&Math.abs(dy)>Math.abs(dx)*1.15)return home?'switcher':'home';
 if(home&&Math.abs(dx)>Math.abs(dy)*1.15)return 'pages';
 if((home||top)&&dy>0&&Math.abs(dy)>Math.abs(dx))return 'shade';
 return null;
}

// Safari and embedded iPhone browsers can cancel PointerEvents when scrolling begins.
// Prefer TouchEvents for fingers, retaining PointerEvents for a mouse or pen.
export function mountGestures(root,{state,page,shade,unlock,goHome=()=>{},switcher=()=>{}}){
 let drag=null,suppressClickUntil=0;
 const start=(x,y,id,source,target,time)=>{
  // A render can remove the original press target before its release bubbles
  // through the phone. A new press must never inherit that stale lock/page drag.
  if(drag)finish(drag.x,drag.y,drag.id,drag.source,time,true);
  if(target?.closest?.(BLOCKED)||isNativeScrollTarget(target))return;
  const s=state(),rect=root.getBoundingClientRect();
  drag={x,y,id,source,mode:null,...s,top:y-rect.top<115,bottom:rect.bottom-y<65,samples:[{x,t:time}]};
 };
 const move=(x,y,id,source,time,prevent)=>{
  if(!drag||drag.source!==source||drag.id!==id)return;
  const dx=x-drag.x,dy=y-drag.y;
  drag.samples.push({x,t:time});if(drag.samples.length>12)drag.samples.shift();
  if(!drag.mode)drag.mode=classifyGesture({dx,dy,...drag});
  if(!drag.mode)return;
  if(root.dataset)root.dataset.gestureActive='1';
  prevent();suppressClickUntil=Date.now()+500;
  if(drag.mode==='pages')page({dx,index:drag.page,settle:false});
  if(drag.mode==='shade')shade({progress:Math.max(0,Math.min(1,(drag.shade?1:0)+dy/root.clientHeight)),settle:false});
  if(drag.mode==='home')goHome({dy,settle:false});
  if(drag.mode==='unlock'){
   const cover=root.querySelector('.lock-screen');
   if(cover){cover.style.transform=`translateY(${Math.max(-220,dy*.65)}px)`;cover.style.opacity=String(Math.max(.2,1+dy/500));}
  }
 };
 const finish=(x,y,id,source,time,cancel=false)=>{
  if(!drag||drag.source!==source||drag.id!==id)return;
  const g=drag;drag=null;
  if(root.dataset)delete root.dataset.gestureActive;
  const dx=x-g.x,dy=y-g.y;
  if(g.mode==='pages')page({dx,velocity:cancel?0:releaseVelocity(g.samples,time),index:g.page,cancel,settle:true});
  if(g.mode==='shade')shade({progress:cancel?Number(g.shade):g.shade?Number(dy>-70):Number(dy>70),settle:true});
  if(g.mode==='home')goHome({dy,settle:true,complete:!cancel&&dy<-95,cancel});
  if(g.mode==='switcher'&&!cancel&&dy<-65)switcher();
  if(g.mode==='unlock'){
   if(!cancel&&dy<-60)unlock();
   else{const cover=root.querySelector('.lock-screen');if(cover){cover.style.transform='';cover.style.opacity='';}}
  }
 };

 root.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  if(e.pointerType==='touch'&&typeof window!=='undefined'&&'ontouchstart' in window)return;
  start(e.clientX,e.clientY,e.pointerId,'pointer',e.target,e.timeStamp);
  // Prevent native text/image dragging before it can steal the pointer stream.
  // We leave click events intact, and app inputs/scroll surfaces are excluded.
  if(drag&&(drag.locked||drag.home||drag.shade))e.preventDefault();
 },{capture:true});
 root.addEventListener('pointermove',e=>{
  if(drag?.source!=='pointer'||drag.id!==e.pointerId)return;
  move(e.clientX,e.clientY,e.pointerId,'pointer',e.timeStamp,()=>{
   if(!root.hasPointerCapture(e.pointerId))root.setPointerCapture(e.pointerId);
   e.preventDefault();
  });
 },{passive:false,capture:true});
 const finishPointer=(e,cancel=false)=>{
  finish(e.clientX,e.clientY,e.pointerId,'pointer',e.timeStamp,cancel);
  if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
 };
 root.addEventListener('pointerup',e=>finishPointer(e),{capture:true});
 root.addEventListener('pointercancel',e=>finishPointer(e,true),{capture:true});
 root.addEventListener('lostpointercapture',e=>finish(e.clientX,e.clientY,e.pointerId,'pointer',e.timeStamp,true),{capture:true});

 root.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  const finger=e.changedTouches[0];
  start(finger.clientX,finger.clientY,finger.identifier,'touch',e.target,e.timeStamp);
 },{passive:true,capture:true});
 root.addEventListener('touchmove',e=>{
  if(drag?.source!=='touch')return;
  const finger=[...e.changedTouches].find(t=>t.identifier===drag.id);
  if(finger)move(finger.clientX,finger.clientY,finger.identifier,'touch',e.timeStamp,()=>{if(e.cancelable)e.preventDefault();});
 },{passive:false,capture:true});
 const finishTouch=(e,cancel=false)=>{
  if(drag?.source!=='touch')return;
  const finger=[...e.changedTouches].find(t=>t.identifier===drag.id);
  if(finger)finish(finger.clientX,finger.clientY,finger.identifier,'touch',e.timeStamp,cancel);
 };
 root.addEventListener('touchend',e=>finishTouch(e),{capture:true});
 root.addEventListener('touchcancel',e=>finishTouch(e,true),{capture:true});
 // Finish even when the finger/mouse releases outside the phone or its original
 // target was detached by navigation. Duplicate releases are harmless.
 const doc=root.ownerDocument;
 doc?.addEventListener('pointerup',e=>finishPointer(e),{capture:true});
 doc?.addEventListener('pointercancel',e=>finishPointer(e,true),{capture:true});
 doc?.addEventListener('touchend',e=>finishTouch(e),{capture:true});
 doc?.addEventListener('touchcancel',e=>finishTouch(e,true),{capture:true});
 root.addEventListener('click',e=>{
  if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}
 },{capture:true});
}
