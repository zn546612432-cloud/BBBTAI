import {cloudRequest} from './api.js';
import {loadClip,saveClip,setRemoteClipLoader} from '../../voice/audio-store.js';

const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function snapshotVoiceMedia(state,player,known={}){
 const media={};let missing=0;
 const ids=new Set(Object.values(state.content?.conversations||{}).flatMap(chats=>chats.flatMap(c=>c.messages||[])).map(m=>m.audioId).filter(id=>typeof id==='string'&&id.length<250));
 for(const id of ids){
  if(known[id]?.path?.startsWith(player+'/')){media[id]=known[id];continue;}
  let blob;try{blob=await loadClip(id,{localOnly:true});}catch{}
  if(!blob?.size){missing++;continue;}
  const hash=await digest(await blob.arrayBuffer()),path=player+'/'+hash;
  try{await cloudRequest('/storage/v1/object/phone-saves/'+path,{method:'POST',body:blob,
   headers:{'Content-Type':blob.type||'audio/mpeg','x-upsert':'false'},timeout:20000,expectedPlayer:player});}
  catch(error){if(error.status!==409&&!['Duplicate','KeyAlreadyExists'].includes(error.code)){missing++;continue;}}
  media[id]={path,type:blob.type||'audio/mpeg'};
 }
 return {media,missing};
}
export function useCloudVoiceMedia(player,manifest={}){
 setRemoteClipLoader(async id=>{
  const item=manifest[id];if(!item?.path?.startsWith(player+'/')||!new RegExp('^'+player+'/[a-f0-9]{64}$').test(item.path))return null;
  const response=await cloudRequest('/storage/v1/object/authenticated/phone-saves/'+item.path,{timeout:20000,expectedPlayer:player});
  const blob=await response.blob();if(!blob.size||blob.size>4000000)return null;
  await saveClip(id,blob);return blob;
 });
}
