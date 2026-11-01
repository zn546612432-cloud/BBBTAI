// Builds copy native ES modules into the same tree as public assets. Deriving
// the base from this module also works inside Pages' versioned release folders.
export function publicAssetBase(moduleUrl=import.meta.url){
 const url=new URL('../../',moduleUrl);
 return /^https?:$/.test(url.protocol)?url.pathname:'/';
}

export function publicAssetPath(path,{base=publicAssetBase()}={}){
 const prefix=base.replace(/\/?$/,'/');
 let name=String(path||'').replace(/^\/+/, '');
 if(name.startsWith(prefix.slice(1)))name=name.slice(prefix.length-1);
 return prefix+name;
}
