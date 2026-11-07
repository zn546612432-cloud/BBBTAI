// Single source of truth for every WeChat preset reply.
// The Day 1–5 dialogue modules remain content/progress providers; UI and
// Send never pick a different story rule independently.
import {d01Draft,d01ComposerDisabled,sendD01WeChat} from '../../story/d01/wechat.js';
import {AUTHORED_CHAT_TRACKS} from './lifecycle/registry.js';
import {d06CelebrationDraft,sendD06Celebration} from '../wishes/index.js';
import {currentScript55,sendScriptedDraft55} from '../story55/scripted-chat.js';
import {genericMissedReplyDraft,genericMissedReplyBusy,sendGenericMissedReply} from './lifecycle/missed-replies.js';

// Every new authored day registers its track only once in lifecycle/registry.
const providers=[
 {name:'d01',day:1,draft:d01Draft,disabled:d01ComposerDisabled,send:sendD01WeChat},
 {name:'d06-wish',day:6,draft:d06CelebrationDraft,disabled:()=>false,send:sendD06Celebration},
 ...AUTHORED_CHAT_TRACKS.map(({name,track})=>({
  name:name.toLowerCase(),day:track.day,busy:track.busy,
  draft:track.draft,disabled:track.disabled,send:track.send
 }))
];
const locate=(s,id)=>{
 const choices=providers.map(provider=>({provider,draft:provider.draft(s,id)})).filter(c=>c.draft?.text);
 choices.sort((a,b)=>(b.draft.priority??2)-(a.draft.priority??2)||(b.draft.day??0)-(a.draft.day??0));
 const chosen=choices[0];
 // A live NPC turn in today's thread takes precedence over an old late reply.
 if(chosen&&(chosen.draft.priority??2)===0&&providers.some(p=>p.busy?.(s,id)))return null;
 return chosen||null;
};
// Today's live script always outranks missed-message acknowledgements.
// A multi-day backlog is acknowledged once, never by sending individual old
// 'late' player lines from D03/D04/D05 in succession.
export function nativeWeChatComposer(s,id){
 const chosen=locate(s,id),line=currentScript55(s,'wechat',id);
 const isCurrent=chosen&&(chosen.draft.priority??2)>0;
 if(isCurrent)return {
  text:chosen.draft.text,stage:chosen.draft.stage,
  source:chosen.provider.name,disabled:false
 };
 if(line?.kind==='me')return {
  text:line.text,stage:line.id+':'+line.index,
  source:'story55',disabled:false
 };
 if(genericMissedReplyBusy(s,id))return {text:null,stage:null,source:null,disabled:true};
 const busy=providers.some(p=>p.busy?.(s,id));
 const missed=!line&&!busy?genericMissedReplyDraft(s,id):null;
 if(missed)return {text:missed.text,stage:missed.stage,source:missed.source,disabled:false};
 if(chosen&&!line)return {
  text:chosen.draft.text,stage:chosen.draft.stage,
  source:chosen.provider.name,disabled:false
 };
 return {
  text:null,stage:null,source:null,
  disabled:!!line||busy||providers.some(p=>p.disabled(s,id))
 };
}

// Authored player messages are only written from this path on a real submit.
export function sendNativeWeChatPreset(store,id,text,now=Date.now()){
 const s=store.get(),chosen=locate(s,id),line=currentScript55(s,'wechat',id);
 if(chosen&&(chosen.draft.priority??2)>0)return chosen.provider.send(store,id,text,now);
 if(line?.kind==='me'){
  if(String(text||'').trim()!==line.text.trim())
   return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
  store.update(next=>sendScriptedDraft55(next,'wechat',id,text));
  return {handled:true,messageId:'story55-'+line.id+'-'+line.index};
 }
 // The one generic answer closes the whole historical optional backlog.
 // Do not replace a newer active NPC exchange or a scripted plot instruction.
 const busy=providers.some(p=>p.busy?.(s,id));
 if(genericMissedReplyBusy(s,id))
  return {handled:true,reason:'請等待對方回覆'};
 if(!line&&!busy&&genericMissedReplyDraft(s,id))
  return sendGenericMissedReply(store,id,text,now);
 if(chosen&&!line)return chosen.provider.send(store,id,text,now);
 // D01's first "hello" and certain legacy scenes start when the player
 // types and presses Send, before any preset draft exists. Preserve that
 // authored trigger; never fall through to a generic, unscripted send.
 const dayProvider=providers.find(p=>p.day===s.day);
 if(s.story55?.version===1&&dayProvider){
  const result=dayProvider.send(store,id,text,now);
  if(result?.handled)return result;
 }
 if(nativeWeChatComposer(s,id).disabled)return {
  handled:true,reason:'目前正在等待對方回覆，不能自行發送預設劇情'
 };
 return {handled:false};
}
