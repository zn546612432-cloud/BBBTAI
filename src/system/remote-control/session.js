// One reconciliation for reloads and live backup/snapshot replacement.
// Leave the original order, message history, counters and ledger untouched.
export function interruptTaiRemoteSession(s){
 const p=s?.story55?.ghostShare;
 if(p?.phase!=='controlling'&&!p?.remote?.active)return false;
 p.phase='interrupted';
 p.remote??={};
 p.remote.active=false;
 p.remote.stage='ended';
 p.remote.pausedAt=null;
 return true;
}
