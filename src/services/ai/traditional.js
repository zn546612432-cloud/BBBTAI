// OpenCC handles phrase-level conversion (e.g. 頭髮 vs 發送). Use standard
// traditional glyphs (說、這裡), matching the author's dialogue spelling.
import {Converter} from 'opencc-js/cn2t';
let convert;
export function traditionalTaiText(value){
 const text=String(value??'');
 if(!/[\u3400-\u9fff]/u.test(text))return text;
 convert??=Converter({from:'cn',to:'tw'});
 // Character nickname 蒙蒙 is a proper name, not the weather adjective 濛濛.
 return convert(text).replace(/濛濛/g,'蒙蒙');
}
