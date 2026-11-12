// Existing Story55 D15+ uses the same AI gateway as NoApp when Tai is online.
// Older saves and other story versions stay opt-in; explicit OFF still wins.
export const mirageAIEnabled=s=>typeof s?.developerSettings?.mirageAIReplies==='boolean'
 ?s.developerSettings.mirageAIReplies
 :s?.story55?.version===1&&s.day>=15&&s.day<=55;
export const mirageAIRevision=s=>Number.isSafeInteger(s?.developerSettings?.mirageAIRevision)?s.developerSettings.mirageAIRevision:0;
export function setMirageAIEnabled(store,enabled){
 store.update(s=>{
  const changed=mirageAIEnabled(s)!==!!enabled,revision=mirageAIRevision(s);
  s.developerSettings??={};
  s.developerSettings.mirageAIReplies=!!enabled;
  if(changed)s.developerSettings.mirageAIRevision=revision+1;
 });
}
