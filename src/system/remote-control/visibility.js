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
