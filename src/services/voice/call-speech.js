// One playable speech segment per actual conversational thought.
// Chinese punctuation already carries prosody in Speech 2.8. Do not inject an
// identical artificial pause after every sentence and then add breaths again.
export function composeCallSpeech(replies,{callPause=1.7}={}){
 const pause=Math.min(4,Math.max(.3,Number(callPause)||1.7));
 return replies.map(r=>String(r.speechText||r.text||'').trim())
  .filter(Boolean).join(' <#'+pause+'#> ');
}
