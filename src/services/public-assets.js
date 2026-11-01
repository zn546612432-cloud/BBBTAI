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


// Saved story assets can contain a previous Pages release's absolute URL.
// Pages replaces the releases/ directory on every deployment, so keep
// user-defined remote/data images as-is and rebase ONLY bundled local files.
export function rebaseBundledPublicAsset(source,{base=publicAssetBase()}={}){
 const value=String(source||'');
 if(!value||/^(?:data:|blob:)/i.test(value))return value;
 // A saved absolute URL from this very Pages host is also a bundled asset.
 // Never rewrite other sites, even if their paths happen to look similar.
 if(/^https?:/i.test(value)){
  const url=new URL(value);
  if(url.origin!==new URL(import.meta.url).origin)return value;
  return rebaseBundledPublicAsset(url.pathname+url.search+url.hash,{base});
 }
 // Recognise legacy /apps/... paths and URLs from obsolete release folders.
 const match=value.match(/(?:^|\/)(apps\/(?:wechat|mirage|browser|chess)\/[a-zA-Z0-9_./-]+|assets\/[a-zA-Z0-9_./-]+|icons\/[a-zA-Z0-9_./-]+|wallpapers\/[a-zA-Z0-9_./-]+)(?=$|[?#])/);
 if(!match||match[1].split('/').includes('..'))return value;
 return publicAssetPath(match[1],{base});
}
