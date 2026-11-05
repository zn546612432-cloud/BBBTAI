// Real vision: send only the deliberately selected/current photo to DeepSeek
// Flash. Every network call requires the player's opt-in, existing BYOK key,
// a valid in-game phone-access grant, per-day budget and current photo match.
// Descriptions are cached in the save, NOT full image data or raw provider replies.
import {taiPhoneAccessGranted,callTaiPhoneTool} from './index.js';
import {describeTaiImage} from '../gateway.js';

export const VISION_MODEL='deepseek-flash';
export const VISION_DAILY_LIMIT=3;
const inFlight=new WeakMap();
const safeText=(v,n=500)=>typeof v==='string'?v.slice(0,n):'';
const localImage=/^data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=]+$/i;

export function fingerprintTaiPhoto(src){
 if(typeof src!=='string'||!src)return '';
 // Lightweight change detector: prevents using a cached caption after an
 // image has been replaced. Never interpreted as a security proof.
 let h=2166136261;
 for(let i=0;i<src.length;i++){h=Math.imul(h^src.charCodeAt(i),16777619);}
 return (h>>>0).toString(16)+'-'+src.length;
}

export function currentVisionPhoto(s,id){
 if(!taiPhoneAccessGranted(s)||!id||typeof id!=='string')return null;
 const check=callTaiPhoneTool(s,'inspect_photo',{photo_id:id});
 if(!check.ok)return null;
 return (Array.isArray(s.content?.photos)?s.content.photos:[]).find(x=>x.id===id)||null;
}

export function cachedTaiVision(s,id){
 const photo=currentVisionPhoto(s,id);
 const item=s.aiDraft?.phoneMcp?.visionCache?.[id];
 if(!photo||!item||item.fingerprint!==fingerprintTaiPhoto(photo.src)||item.model!==VISION_MODEL)return null;
 return item;
}

export function photoVisionDailyUsage(s){
 return (Array.isArray(s.aiDraft?.phoneMcp?.visionUsage)?s.aiDraft.phoneMcp.visionUsage:[])
  .filter(x=>x.day===s.day).length;
}

export function canAnalyzeTaiPhoto(s,id){
 if(!currentVisionPhoto(s,id))return {ok:false,error:'photo_not_available'};
 if(s.aiDraft?.phoneMcp?.visionEnabled!==true)return {ok:false,error:'vision_disabled'};
 if(cachedTaiVision(s,id))return {ok:true,cached:true};
 if(photoVisionDailyUsage(s)>=VISION_DAILY_LIMIT)return {ok:false,error:'daily_vision_limit'};
 return {ok:true,cached:false};
}

// Accept only images stored directly in this phone or fetched from this SAME
// site; no arbitrary remote URLs, imported data:// code, or image metadata
// embedded in the prompt. Provider receives no schedule, messages or save.
export async function taiVisionImageData(src,{fetcher=globalThis.fetch}={}){
 if(typeof src!=='string'||!src)throw Error('没有可识别的照片文件');
 if(localImage.test(src)){
  if(src.length>7_000_000)throw Error('照片太大，请先压缩到5MB以内');
  return src;
 }
 if(!globalThis.location||!/^\/?[a-z0-9._%/-]+\.(?:jpeg|jpg|png|webp|gif)(?:\?[^#]*)?$/i.test(src))
  throw Error('照片来源不是允许的本地图片');
 const url=new URL(src,globalThis.location.href);
 if(url.origin!==globalThis.location.origin)throw Error('不允许将外部图片URL送入视觉模型');
 const response=await fetcher(url.href,{credentials:'omit',cache:'force-cache'});
 if(!response.ok)throw Error('无法读取当前照片');
 const blob=await response.blob();
 if(!/^image\/(?:jpeg|png|webp|gif)$/i.test(blob.type)||blob.size>5_000_000)throw Error('照片格式或大小不支持');
 if(typeof FileReader==='undefined')throw Error('当前运行环境不支持图片文件读取');
 return await new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||''));
  reader.onerror=()=>reject(Error('照片读取失败'));
  reader.readAsDataURL(blob);
 });
}

export async function analyzeTaiPhonePhoto(store,id,{
 analyze=describeTaiImage,resolveImage=taiVisionImageData,now=Date.now
}={}){
 const start=store.get(),permission=canAnalyzeTaiPhoto(start,id);
 if(!permission.ok)return {ok:false,error:permission.error};
 if(permission.cached)return {ok:true,cached:true,data:cachedTaiVision(start,id)};
 const photo=currentVisionPhoto(start,id),fingerprint=fingerprintTaiPhoto(photo?.src);
 if(!fingerprint)return {ok:false,error:'photo_has_no_image'};
 const ongoing=inFlight.get(store);
 if(ongoing)return {ok:false,error:'vision_busy'};
 // Reserve an attempt before making a paid request. This prevents concurrent
 // calls and ensures one same-day failure cannot loop into unlimited charges.
 const attemptId='v'+now()+'-'+Math.random().toString(36).slice(2,9);
 store.update(s=>{
  s.aiDraft??={};s.aiDraft.phoneMcp??={};
  const p=s.aiDraft.phoneMcp;
  p.visionUsage=Array.isArray(p.visionUsage)?p.visionUsage:[];
  p.visionUsage.push({day:s.day,photoId:id,attemptId,model:VISION_MODEL});
  p.visionUsage=p.visionUsage.slice(-80);
 });
 const promise=(async()=>{
  try{
   const image=await resolveImage(photo.src);
   const raw=await analyze({dataUrl:image,authorLabel:safeText(photo.title,100)});
   const summary=safeText(raw?.summary,680).trim();
   if(!summary)throw Error('视觉模型没有返回有效图片描述');
   const current=store.get();
   if(current.day!==start.day||!canAnalyzeTaiPhoto(current,id).ok||
      fingerprintTaiPhoto(currentVisionPhoto(current,id)?.src)!==fingerprint)
    return {ok:false,error:'photo_changed_during_analysis'};
   const entry={fingerprint,model:VISION_MODEL,summary,
     visibleText:safeText(raw.visibleText,260),uncertainty:safeText(raw.uncertainty,200),
     description_source:'deepseek_flash_vision',day:start.day,analyzedAt:now()};
   store.update(s=>{
    s.aiDraft??={};s.aiDraft.phoneMcp??={};
    s.aiDraft.phoneMcp.visionCache??={};
    s.aiDraft.phoneMcp.visionCache[id]=entry;
   });
   return {ok:true,cached:false,data:entry};
  }catch(error){
   return {ok:false,error:safeText(error?.message||'视觉模型暂不可用',210)};
  }finally{inFlight.delete(store);}
 })();
 inFlight.set(store,promise);
 return promise;
}
