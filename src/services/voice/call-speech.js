// One iOS playback, with explicit audible silence at thought/sentence boundaries.
export function composeCallSpeech(replies,{callPause=1.2}={}){
 const pause=Math.min(4,Math.max(.3,Number(callPause)||1.2));
 const sentencePause=Math.max(.25,Math.round(pause*.45*100)/100);
 return replies.map(r=>String(r.speechText||r.text||'').trim()
  .replace(/([。！？!?])([”」』"]?)(?!\s*(?:<#|$))/g,`$1$2<#${sentencePause}#>`))
  .filter(Boolean).join(` <#${pause}#> `);
}
