// One presentation policy for authored chat, AI replies and Moments.
// Canonical authored strings are still used for story gates, save migration,
// historical archives and editor exports. No player-entered free text is rewritten.
const seriousScene=/(?:^|[-:])(?:d55-(?:wang-last|briefing|departure|xiaoxin)|d53-(?:action-start|action-end)|ending|failure)(?:$|[-:])/u;
const awei=/^(?:阿威|awei)$/iu;
const known=/^(?:熙蒙|熙旺|胡[枫楓]|小辛|仔仔|熙泰|[陳陈]熙泰|傅隆生|me|wang|hufeng|xin|xiaoxin|zai|zaizai|tai|fulongsheng)$/iu;
export function casualChatPunctuation(value,{tone='neutral'}={}){
 const text=String(value??'');
 if(tone==='serious'||tone==='danger')return text;
 const casual=text.replace(/。(?=\s*$)/u,'').replace(/。(?=[\p{L}\p{N}])/gu,' ');
 if(/(?:https?:\/\/|www\.|\/|\\|\b(?:Dr|Mr|Mrs|Ms|etc|e\.g|i\.e)\.$)/iu.test(casual)||/\b[A-Z]\.$/u.test(casual))return casual;
 return casual.replace(/(?<=[\p{L}])\.(?=\s*$)/u,'');
}
function authored(m){
 return !!(m.story55||m.storyTag==='story55'||m.lifecycleId||Object.keys(m).some(k=>/^storyD\d{2}$/u.test(k)&&m[k]===true)||/^(?:s55-|d\d{2}-|wish-)/u.test(String(m.id||'')));
}
export function displayChatText(m,{channel,actor=m?.from}={}){
 const text=String(m?.text??'');
 if(!m||!['wechat','noapp','mirage'].includes(channel)||m.kind&&m.kind!=='text'||m.from==='system'||awei.test(actor)||awei.test(m.from))return text;
 if(m.sentDate&&m.sentDate<'2025-05-19')return text;
 if(m.from==='me'&&!authored(m))return text;
 if(channel==='wechat'&&!known.test(actor)&&!known.test(m.from))return text;
 if(seriousScene.test(String(m.id||'')))return text;
 return casualChatPunctuation(text,{tone:m.aiTone||m.tone});
}
export function displayPresetText(value,stage=''){
 const text=String(value??'');
 return seriousScene.test(String(stage||''))?text:casualChatPunctuation(text);
}
export function canonicalPresetSubmission(value,canonical,stage=''){
 const input=String(value??'').trim(),original=String(canonical??'').trim();
 return input===displayPresetText(original,stage)?original:input;
}
export function displayMomentText(value,author,{player=false}={}){
 return player||awei.test(author)?String(value??''):casualChatPunctuation(value);
}
