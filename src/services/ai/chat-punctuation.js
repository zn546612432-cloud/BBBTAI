// Text-only style policy. Authored serious dialogue is edited at its source.
export function casualChatPunctuation(value,{tone='neutral'}={}){
 const text=String(value??'');
 if(tone==='serious'||tone==='danger')return text;
 const casual=text.replace(/。(?=\s*$)/u,'').replace(/。(?=[\p{L}\p{N}])/gu,' ');
 // Keep abbreviations, ellipses, paths, URLs and technical tokens.
 if(/(?:https?:\/\/|www\.|\/|\\|\b(?:Dr|Mr|Mrs|Ms|etc|e\.g|i\.e)\.$)/iu.test(casual)||/\b[A-Z]\.$/u.test(casual))return casual;
 return casual.replace(/(?<=[\p{L}])\.(?=\s*$)/u,'');
}
