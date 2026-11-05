// Stable change detector for in-save image captions (not a cryptographic ID).
export function photoSourceFingerprint(src){
 if(typeof src!=='string'||!src)return '';
 let h=2166136261;
 for(let i=0;i<src.length;i++)h=Math.imul(h^src.charCodeAt(i),16777619);
 return (h>>>0).toString(16)+'-'+src.length;
}
