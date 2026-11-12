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
export function resumeTaiRemoteOnShow(s,now=Date.now()){
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


// A small foreground-only timer used by the existing operator's animations.
// It is not a new storyline clock. On hidden tabs, Chrome may throttle or
// freeze timers; the remaining delay resumes when the SAME page is visible.
export function createTaiForegroundDelay(doc){
 function waitVisible(){
  if(!doc.hidden)return Promise.resolve();
  return new Promise(resolve=>{
   const onVisible=()=>{
    if(!doc.hidden){doc.removeEventListener('visibilitychange',onVisible);resolve();}
   };
   doc.addEventListener('visibilitychange',onVisible);
   onVisible();
  });
 }
 return async function foregroundDelay(ms){
  let remaining=Math.max(0,Number(ms)||0);
  while(remaining>0){
   await waitVisible();
   const start=Date.now();
   const elapsed=await new Promise(resolve=>{
    let done=false;
    let timer;
    const complete=()=>{
     if(done)return;
     done=true;
     clearTimeout(timer);
     doc.removeEventListener('visibilitychange',onHide);
     resolve(Math.max(0,Date.now()-start));
    };
    const onHide=()=>{if(doc.hidden)complete();};
    doc.addEventListener('visibilitychange',onHide);
    if(doc.hidden)complete();
    else timer=setTimeout(complete,remaining);
   });
   remaining=Math.max(0,remaining-elapsed);
  }
  await waitVisible();
 };
}
