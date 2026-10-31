// Only a per-tab testing override; never written into the save, exported, or
// used to unlock NoApp before D56.
export const FORCE_TAI_KEY='ximeng:test:force-xitai-online';
export function taiForcedOnline(){
 try{return sessionStorage.getItem(FORCE_TAI_KEY)==='1';}catch{return false;}
}
export function setTaiForcedOnline(value){
 try{if(value)sessionStorage.setItem(FORCE_TAI_KEY,'1');else sessionStorage.removeItem(FORCE_TAI_KEY);}catch{}
}
