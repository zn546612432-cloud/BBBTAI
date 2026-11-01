// Opt-in developer testing; missing flags in existing saves mean OFF.
export const mirageAIEnabled=s=>s?.developerSettings?.mirageAIReplies===true;
export const mirageAIRevision=s=>Number.isSafeInteger(s?.developerSettings?.mirageAIRevision)?s.developerSettings.mirageAIRevision:0;
export function setMirageAIEnabled(store,enabled){
 store.update(s=>{
  const changed=mirageAIEnabled(s)!==!!enabled,revision=mirageAIRevision(s);
  s.developerSettings??={};
  s.developerSettings.mirageAIReplies=!!enabled;
  if(changed)s.developerSettings.mirageAIRevision=revision+1;
 });
}
