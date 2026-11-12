// Background suspension for the one Story55-authorized virtual-phone takeover.
// The existing PhoneStore remains the only source of truth. We do not pause
// arbitrary GHOST orders, story clock events, or any other phone App.
const active=p=>p?.phase==='controlling'&&p.remote?.active===true;

function sharedOrder(s,p){
 const source=p.source,remote=p.remote;
 if(!source||!remote)return null;
 const id=remote.orderId||
  (source.type==='ghost-order'?source.orderId:null)||
  (source.type==='ghost-project'?s.story55?.projects?.[source.projectId]?.active:null);
 if(!id)return null;
 const o=s.ghost?.orders?.[id];
 if(!o||!['running','preview-win'].includes(o.status))return null;
 if(source.type==='ghost-order'&&source.orderId!==id)return null;
 if(source.type==='ghost-project'&&o.story55Project!==source.projectId)return null;
 return o;
}
// Both the app's 250ms poll and the world tick must honor this SAME pause.
export function isTaiRemoteOrderPaused(s,o){
 const p=s?.story55?.ghostShare;
 return !!(o&&active(p)&&Number.isFinite(p.remote.pausedAt)&&sharedOrder(s,p)?.id===o.id);
}
function shiftTimestamp(target,key,elapsed){
 if(Number.isFinite(target?.[key])&&target[key]>0)
  target[key]+=elapsed;
}
export function pauseTaiRemoteOnHide(s,now=Date.now()){
 const p=s?.story55?.ghostShare;
 if(!active(p)||!Number.isFinite(now)||Number.isFinite(p.remote.pausedAt))
  return false;
 p.remote.pausedAt=now;
 return true;
}
export function settleTaiRemotePause(s,now=Date.now()){
 const p=s?.story55?.ghostShare;
 if(!active(p)||!Number.isFinite(p.remote.pausedAt)||!Number.isFinite(now))
  return false;
 const elapsed=Math.max(0,now-p.remote.pausedAt);
 const o=sharedOrder(s,p);
 if(o){
  // Deadline is wall-clock-based in the original GHOST engine. Shift only
  // this running session's own timestamps to preserve its remaining time.
  shiftTimestamp(o,'deadline',elapsed);
  shiftTimestamp(o,'previewUntil',elapsed);
  shiftTimestamp(o,'startedAt',elapsed);
  if(o.board?.arcade)shiftTimestamp(o.board.arcade,'lockUntil',elapsed);
 }
 p.remote.pausedAt=null;
 return true;
}
export function resumeTaiRemoteOnShow(s,now=Date.now()){
 return settleTaiRemotePause(s,now);
}


// A small foreground-only timer used by the existing operator's animations.
// It is not a new storyline clock. On hidden tabs, Chrome may throttle or
// freeze timers; the remaining delay resumes when the SAME page is visible.
export function createTaiForegroundDelay(doc,{window:win=doc.defaultView,isPaused=()=>false}={}){
 const suspended=()=>doc.hidden||isPaused();
 function waitVisible(signal){
  signal?.throwIfAborted();
  if(!suspended())return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const cleanup=()=>{doc.removeEventListener('visibilitychange',onVisible);win?.removeEventListener('pageshow',onVisible);signal?.removeEventListener('abort',onAbort);};
   const onAbort=()=>{cleanup();reject(signal.reason);};
   const onVisible=()=>{
    if(!suspended()){cleanup();resolve();}
   };
   doc.addEventListener('visibilitychange',onVisible);
   win?.addEventListener('pageshow',onVisible);
   signal?.addEventListener('abort',onAbort,{once:true});
   onVisible();
  });
 }
 return async function foregroundDelay(ms,signal){
  let remaining=Math.max(0,Number(ms)||0);
  while(remaining>0){
   await waitVisible(signal);
   const start=Date.now();
   const elapsed=await new Promise((resolve,reject)=>{
    let done=false;
    let timer;
    const complete=()=>{
     if(done)return;
     done=true;
     clearTimeout(timer);
     doc.removeEventListener('visibilitychange',onHide);
     win?.removeEventListener('pagehide',onHide);
     signal?.removeEventListener('abort',onAbort);
     resolve(Math.max(0,Date.now()-start));
    };
    const onAbort=()=>{
     if(done)return;
     done=true;clearTimeout(timer);
     doc.removeEventListener('visibilitychange',onHide);
     win?.removeEventListener('pagehide',onHide);
     reject(signal.reason);
    };
    const onHide=()=>{if(suspended())complete();};
    doc.addEventListener('visibilitychange',onHide);
    win?.addEventListener('pagehide',onHide);
    signal?.addEventListener('abort',onAbort,{once:true});
    if(signal?.aborted){onAbort();return;}
    if(suspended())complete();
    else timer=setTimeout(complete,remaining);
   });
   remaining=Math.max(0,remaining-elapsed);
  }
  await waitVisible(signal);
 };
}
