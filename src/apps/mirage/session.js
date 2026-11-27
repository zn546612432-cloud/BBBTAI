// Volatile MIRAGE login state. Never write a reusable login token to the save.
let active=false;
export function isMirageAuthenticated(){return active;}
export function setMirageAuthenticated(value){active=Boolean(value);}

// One-use, in-memory entry intent for the confirmed native Ghost share.
// Ordinary app opens and reloads retain the existing login behavior.
let ghostShareEntry=false;
export function prepareMirageGhostShareEntry(){ghostShareEntry=true;}
export function consumeMirageGhostShareEntry(){
 const prepared=ghostShareEntry;ghostShareEntry=false;return prepared;
}

// One-use return from an accepted chess invitation to its originating Mirage
// conversation. Do not persist a reusable session token in the save.
let chessReturn=false;
export function prepareMirageChessReturnEntry(){chessReturn=true;}
export function consumeMirageChessReturnEntry(){
 const result=chessReturn;chessReturn=false;return result;
}

// Finished chess returns are terminal navigation, including older saved stacks.
export function isMirageChessReturn(s){
 const nav=s.nav,current=nav?.current;
 if(current?.appId!=='mirage')return false;
 if(current.route==='/chat/s55-ouroboros'&&current.params?.fromChess==='finished')return true;
 const previous=nav.stack?.at(-1);
 if(previous?.appId!=='chess'||!previous.route?.startsWith('/match/'))return false;
 const match=s.matches?.find(m=>m.id===previous.route.slice(7));
 return match?.status==='finished'&&match.closedAt!=null;
}
