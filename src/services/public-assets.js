// Builds copy native ES modules into the same tree as public assets. Deriving
// the base from this module also works inside Pages' versioned release folders.
export function publicAssetBase(moduleUrl=import.meta.url){
 const url=new URL('../../',moduleUrl);
 return /^https?:$/.test(url.protocol)?url.pathname:'/';
}

// Media viewed long after boot must remain reachable after a new Pages release.
export const stableAssetBase=base=>base.replace(/\/releases\/[^/]+\/$/,'/');
export function stablePublicAssetBase(moduleUrl=import.meta.url){return stableAssetBase(publicAssetBase(moduleUrl));}

// All public artwork and media use the site root; only executable modules,
// styles and vendor dependencies are pinned to a code release.
export const isStablePublicPath=path=>/^(?:apps|assets|icons|wallpapers)(?:\/|$)/.test(String(path).replace(/^\/+/,''));

export function publicAssetPath(path,{base=publicAssetBase()}={}){
 const prefix=(isStablePublicPath(path)?stableAssetBase(base):base).replace(/\/?$/,'/');
 let name=String(path||'').replace(/^\/+/, '');
 if(name.startsWith(prefix.slice(1)))name=name.slice(prefix.length-1);
 return prefix+name;
}


// Saved story assets can contain a previous Pages release's absolute URL.
// Pages replaces the releases/ directory on every deployment, so keep
// user-defined remote/data images as-is and rebase ONLY bundled local files.
export function rebaseBundledPublicAsset(source,{base=publicAssetBase(),origin=globalThis.location?.origin||new URL(import.meta.url).origin}={}){
 const value=String(source||'');
 if(!value||/^(?:data:|blob:|\/\/)/i.test(value))return value;
 // A saved absolute URL from this very Pages host is also a bundled asset.
 // Never rewrite other sites, even if their paths happen to look similar.
 if(/^https?:/i.test(value)){
  let url;try{url=new URL(value);}catch{return value;}
  if(url.origin!==origin)return value;
  return rebaseBundledPublicAsset(url.pathname+url.search+url.hash,{base,origin});
 }
 // Recognise legacy /apps/... paths and URLs from obsolete release folders.
 if(!/^(?:\/)?[a-zA-Z0-9_./-]+(?:[?#].*)?$/.test(value))return value;
 const match=value.match(/(?:^|\/)((?:apps|assets|icons|wallpapers)\/[a-zA-Z0-9_./-]+)(?=$|[?#])/);
 if(!match||match[1].split('/').includes('..'))return value;
 return publicAssetPath(match[1],{base});
}

// Migrate only complete bundled image/video references on save load/import.
// This covers stored chat photos, avatars, photo albums, notes and developer
// data without altering user text, third-party URLs or uploaded data images.
export function restoreSavedMediaPaths(state,options={}){
 const visit=value=>{
  if(typeof value==='string'){
   if(!/\.(?:png|jpe?g|webp|svg|gif|avif|ico|bmp|mp4|webm|mov)(?:[?#].*)?$/i.test(value))return value;
   return rebaseBundledPublicAsset(value,options);
  }
  if(value&&typeof value==='object')for(const key of Object.keys(value)){
   const previous=value[key],next=visit(previous);if(next!==previous)value[key]=next;
  }
  return value;
 };
 return visit(state);
}
