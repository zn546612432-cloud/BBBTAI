import {publicAssetBase} from '../public-assets.js';
// The native-module build has no Vite environment. Resolve recordings against
// the deployed module tree, including preview and versioned Pages releases.
export function resolvePhoneAudioPath(path,{base=publicAssetBase(),origin=globalThis.location?.origin||'https://example.invalid'}={}){
 const src=String(path||'').trim();
 if(!src)throw Error('录音路径为空');
 if(/^https?:\/\//i.test(src))return src;
 if(!/^\/?(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.(mp3|wav|m4a|ogg)$/i.test(src)||src.split('/').some(part=>part==='.'||part==='..'))throw Error('录音路径格式无效');
 const prefix=(base.startsWith('/')?base:'/'+base).replace(/\/?$/,'/');
 let name=src.replace(/^\/+/, '');
 if(name.startsWith(prefix.slice(1)))name=name.slice(prefix.length-1);
 const repo=prefix.split('/').filter(Boolean)[0];
 if(repo&&name.startsWith(repo+'/assets/'))name=name.slice(repo.length+1);
 return new URL(prefix+name,origin).href;
}
