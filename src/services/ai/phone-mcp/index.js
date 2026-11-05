// Chen Xitai's deliberately narrow, read-only virtual-phone tool set.
// This module receives the actual CURRENT save and never reads window/localStorage,
// raw save exports, the schedule app, future story scripts or developer drafts.
import {visibleMessages} from '../../messaging/delivery.js';
import {dateParts} from '../../calendar.js';
import {photoSourceFingerprint} from './source-key.js';

export const PHONE_MCP_VERSION='ximeng-phone-tools/1';
export const PHONE_MCP_CHANNELS=Object.freeze(['wechat','messages','mirage','noapp']);
export const PHONE_MCP_TOOLS=Object.freeze([
 {name:'list_conversations',description:'List available chat threads without reading message text',inputSchema:{type:'object',properties:{channel:{type:'string',enum:PHONE_MCP_CHANNELS}},additionalProperties:false}},
 {name:'search_messages',description:'Search delivered past chat messages using a relevant word or name, never future messages',inputSchema:{type:'object',properties:{query:{type:'string',minLength:1,maxLength:40},channel:{type:'string',enum:PHONE_MCP_CHANNELS},limit:{type:'integer',minimum:1,maximum:8}},required:['query'],additionalProperties:false}},
 {name:'read_conversation',description:'Read recent delivered past messages in one authorized conversation',inputSchema:{type:'object',properties:{channel:{type:'string',enum:PHONE_MCP_CHANNELS},conversation_id:{type:'string',minLength:1,maxLength:80},limit:{type:'integer',minimum:1,maximum:12}},required:['channel','conversation_id'],additionalProperties:false}},
 {name:'check_new_messages',description:'See a small number of the latest already-delivered messages',inputSchema:{type:'object',properties:{limit:{type:'integer',minimum:1,maximum:8}},additionalProperties:false}},
 {name:'list_photos',description:'List visible photo IDs and user-authored titles, not raw image bytes',inputSchema:{type:'object',properties:{limit:{type:'integer',minimum:1,maximum:12}},additionalProperties:false}},
 {name:'inspect_photo',description:'Read existing authored photo metadata; do not infer visual content without a vision model',inputSchema:{type:'object',properties:{photo_id:{type:'string',minLength:1,maxLength:120}},required:['photo_id'],additionalProperties:false}}
]);

const bounded=(number,defaultValue,max)=>Number.isInteger(number)?Math.max(1,Math.min(max,number)):defaultValue;
const text=(value,max=320)=>typeof value==='string'?value.slice(0,max):'';
const forbidden=/^(?:schedule|diary|calendar|story|story55|editor|future|日程|日记|剧情)$/i;
const toolNames=new Set(PHONE_MCP_TOOLS.map(x=>x.name));

export function taiPhoneAccessGranted(state){
 // Explicit story grant is a future authorable node. Developer override
 // only works if the developer knowingly toggles it in this save.
 if(!state||state.poweredOff||state.story55?.ended)return false;
 const storyGrant=Array.isArray(state.events)&&state.events.some(e=>
   e?.type==='tai_phone_access_granted'&&Number.isInteger(e.day)&&e.day<=state.day);
 // User-authored premise: Tai has already gained phone access once his
 // identity-reveal storyline completes. Do NOT infer access merely from day 30.
 // An earlier explicit grant can still come from an authored story event.
 const recognizedAccess=!!state.story55?.completed?.recognition;
 return !!(storyGrant||recognizedAccess||state.aiDraft?.phoneMcp?.developerEnabled===true);
}

function safeChannel(value){return PHONE_MCP_CHANNELS.includes(value)?value:null;}
function permittedChat(state,channel,id){
 if(!safeChannel(channel)||forbidden.test(String(id||'')))return null;
 return (state.content?.conversations?.[channel]||[]).find(c=>c.id===id)||null;
}
function messageAllowed(state,message){
 if(!message||message.demo||message.deleted||message.actual===false||message.draft===true)return false;
 if(message.schedule&&message.schedule.mode!=='immediate'&&!message.delivery)return false;
 if(Number.isInteger(message.day)&&message.day>state.day)return false;
 if(message.delivery&&Number.isInteger(message.delivery.day)&&message.delivery.day>state.day)return false;
 if(message.delivery?.day===state.day&&/^([01]\d|2[0-3]):[0-5]\d$/.test(String(message.delivery.clock||''))&&message.delivery.clock>state.clock)return false;
 const today=dateParts(state).iso;
 const sent=typeof message.sentDate==='string'?message.sentDate.slice(0,10):'';
 if(sent&&sent>today)return false;
 const day=Number.isInteger(message.day)?message.day:
   message.delivery?.day;
 if((day===state.day||sent===today)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(String(message.time||''))&&message.time>state.clock)return false;
 if(message.kind==='app_invitation'||message.kind==='status'||message.kind==='system')return false;
 return true;
}
function visibleThread(state,channel,conversation){
 // Apply the same authored delivery rules as the phone UI, then additional
 // stricter source / real-day guards. Do not leak scheduled preset drafts.
 return visibleMessages(conversation,state).filter(m=>messageAllowed(state,m)).map(m=>({
  id:text(m.id,120),channel,conversation_id:text(conversation.id,80),
  conversation:text(conversation.name||conversation.id,80),
  from:text(m.from,48),day:Number.isInteger(m.day)?m.day:(m.delivery?.day||null),
  time:text(m.time||m.delivery?.clock,12),
  kind:m.kind==='image'?'image':m.kind==='voice'?'voice':'text',
  text:m.kind==='image'?'[图片消息：尚未提供可验证的视觉内容]':
   m.kind==='voice'?text(m.voiceCaption||'[未转写的语音]',320):text(m.text,320)
 }));
}
function allThreads(state){
 const output=[];
 for(const channel of PHONE_MCP_CHANNELS){
  for(const conversation of (state.content?.conversations?.[channel]||[])){
   if(!conversation?.id||forbidden.test(conversation.id))continue;
   const messages=visibleThread(state,channel,conversation);
   if(messages.length)output.push({channel,conversation_id:text(conversation.id,80),name:text(conversation.name||conversation.id,80),messages});
  }
 }
 return output;
}
function photos(state){
 return (Array.isArray(state.content?.photos)?state.content.photos:[]).filter(p=>{
  if(!p||typeof p.id!=='string'||p.deleted||p.demo||p.actual===false)return false;
  if(Number.isInteger(p.day)&&p.day>state.day)return false;
  if(typeof p.sentDate==='string'&&p.sentDate.slice(0,10)>dateParts(state).iso)return false;
  return true;
 });
}
const err=code=>({ok:false,error:code});
export function callTaiPhoneTool(state,name,args={}){
 if(!taiPhoneAccessGranted(state))return err('phone_access_locked');
 if(!toolNames.has(name))return err('tool_not_allowed');
 if(!args||typeof args!=='object'||Array.isArray(args))return err('invalid_arguments');
 // Reject attempts to smuggle raw database paths, app keys, etc.
 if(Object.keys(args).some(k=>!PHONE_MCP_TOOLS.find(t=>t.name===name)?.inputSchema.properties[k]))return err('invalid_arguments');
 if(args.channel!==undefined&&!safeChannel(args.channel))return err('channel_forbidden');
 try{
  if(name==='list_conversations'){
   const threads=allThreads(state).filter(x=>!args.channel||x.channel===args.channel);
   return {ok:true,data:{conversations:threads.map(({messages,...rest})=>({...rest,count:messages.length})).slice(0,30)}};
  }
  if(name==='search_messages'){
   const query=text(args.query,40).trim();
   if(!query)return err('query_required');
   const limit=bounded(args.limit,6,8),lower=query.toLocaleLowerCase();
   const matches=allThreads(state).filter(x=>!args.channel||x.channel===args.channel)
    .flatMap(x=>x.messages).filter(x=>x.text.toLocaleLowerCase().includes(lower))
    .slice(-limit);
   return {ok:true,data:{query,results:matches}};
  }
  if(name==='read_conversation'){
   const c=permittedChat(state,args.channel,args.conversation_id);
   if(!c)return err('conversation_not_found');
   return {ok:true,data:{channel:args.channel,conversation_id:text(c.id,80),
    messages:visibleThread(state,args.channel,c).slice(-bounded(args.limit,8,12))}};
  }
  if(name==='check_new_messages'){
   const messages=allThreads(state).flatMap(x=>x.messages)
    .sort((a,b)=>(a.day||0)-(b.day||0)||String(a.time).localeCompare(String(b.time)));
   return {ok:true,data:{messages:messages.slice(-bounded(args.limit,5,8))}};
  }
  if(name==='list_photos'){
   const list=photos(state).slice(0,bounded(args.limit,8,12)).map(p=>({
    id:text(p.id,120),title:text(p.title,140),day:Number.isInteger(p.day)?p.day:null,
    favorite:!!p.favorite,has_authored_description:!!(p.description||p.caption)
   }));
   return {ok:true,data:{photos:list}};
  }
  if(name==='inspect_photo'){
   const p=photos(state).find(x=>x.id===args.photo_id);
   if(!p)return err('photo_not_found');
   const vision=state.aiDraft?.phoneMcp?.visionCache?.[p.id];
   const validVision=vision&&vision.fingerprint===photoSourceFingerprint(p.src)&&vision.model==='deepseek-flash';
   return {ok:true,data:{id:text(p.id,120),title:text(p.title,140),
    description:text(p.description||p.caption,500),description_source:p.description||p.caption?'authored_metadata':'none',
    image_available:!!p.src,visual_interpretation:validVision?'deepseek_flash_vision':'not_performed',
    ...(validVision?{vision_summary:text(vision.summary,680),visible_text:text(vision.visibleText,260),
     uncertainty:text(vision.uncertainty,200)}:{})}};
  }
  return err('tool_not_allowed');
 }catch{
  // Fail closed on corrupt imported saves.
  return err('phone_data_unavailable');
 }
}
export function listTaiPhoneTools(){
 return PHONE_MCP_TOOLS.map(({name,description,inputSchema})=>({name,description,inputSchema}));
}
