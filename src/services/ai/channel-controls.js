// Re-enable anonymous free chat only in the Story55 Mirage phase. Fixed
// scripted lines, chess and recognition still have separate native gates.
// Legacy developer toggles remain retired and do not override story access.
export const mirageAIEnabled=s=>s?.story55?.version===1&&s.day>=14&&s.day<=34&&!s.story55?.ended&&!s.story55?.completed?.recognition;
export const mirageAIRevision=s=>Number.isSafeInteger(s?.developerSettings?.mirageAIRevision)?s.developerSettings.mirageAIRevision:0;
export function setMirageAIEnabled(store,enabled){
 store.update(s=>{
  const changed=s.developerSettings?.mirageAIReplies===true,revision=mirageAIRevision(s);
  s.developerSettings??={};
  s.developerSettings.mirageAIReplies=false;
  if(changed)s.developerSettings.mirageAIRevision=revision+1;
 });
}
