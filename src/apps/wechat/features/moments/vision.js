import {taiCloudCall,isTaiCloudHost} from '../../../../services/ai/supabase-gateway.js';
// Only the photo explicitly attached to a public player post is eligible.
export const momentPhoto=p=>p?.playerPublished===true&&p.author==='熙蒙'&&p.privacy==='public'&&typeof p.media?.[0]==='string'&&p.media[0].length<=2_400_000&&/^data:image\/(?:jpeg|png|webp);base64,/.test(p.media[0])?p.media[0]:'';
export async function momentPhotoKey(image){
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(image));
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function requestMomentVision(image){
 let result;
 if(isTaiCloudHost())result=await taiCloudCall('moments_vision',{image});
 else{
  const r=await fetch('/api/ai/moments-vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:AbortSignal.timeout(35000)});
  if(!r.ok)throw Error('Moments vision unavailable');
  result=await r.json();
 }
 return typeof result?.description==='string'?result.description.trim().slice(0,400):'';
}
