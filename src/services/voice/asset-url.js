// Resolve user-authored public audio from the Vite Pages base, not the JS chunk.
export function resolvePhoneAudioPath(path,{base=import.meta.env?.BASE_URL||'/',origin=globalThis.location?.origin||'https://example.invalid'}={}){
 const src=String(path||'').trim();
 if(!src)throw Error('录音路径为空');
 if(/^https?:\/\//i.test(src))return src;
 if(!/^\/?(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.(mp3|wav|m4a|ogg)$/i.test(src)||src.replace(/^\/+/, '').split('/').some(part=>part==='.'||part==='..'))throw Error('录音路径格式无效');
 const prefix=(base.startsWith('/')?base:'/'+base).replace(/\/?$/,'/');
 let name=src.replace(/^\/+/, '');
 if(name.startsWith(prefix.slice(1)))name=name.slice(prefix.length-1);
 const repo=prefix.split('/').filter(Boolean)[0];
 if(repo&&name.startsWith(repo+'/assets/'))name=name.slice(repo.length+1);
 return new URL(prefix+name,origin).href;
}
