// One reconciliation for reloads and live backup/snapshot replacement.
// Settle only paused timestamps; keep the board, history, counters and ledger.
import {settleTaiRemotePause} from './visibility.js';
export function interruptTaiRemoteSession(s,now=Date.now()){
 const p=s?.story55?.ghostShare;
 if(p?.phase!=='controlling'&&!p?.remote?.active)return false;
 settleTaiRemotePause(s,now);
 p.phase='interrupted';
 p.remote??={};
 p.remote.active=false;
 p.remote.stage='ended';
 return true;
}
