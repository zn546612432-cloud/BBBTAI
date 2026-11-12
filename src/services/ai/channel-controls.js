// MIRAGE uses authored dialogue only. Old saves and developer toggles cannot
// re-enable generated replies; NoApp/phone/chess keep their existing AI paths.
export const mirageAIEnabled=()=>false;
export const mirageAIRevision=s=>Number.isSafeInteger(s?.developerSettings?.mirageAIRevision)?s.developerSettings.mirageAIRevision:0;
export function setMirageAIEnabled(store,enabled){
 store.update(s=>{
  const changed=s.developerSettings?.mirageAIReplies===true,revision=mirageAIRevision(s);
  s.developerSettings??={};
  s.developerSettings.mirageAIReplies=false;
  if(changed)s.developerSettings.mirageAIRevision=revision+1;
 });
}
