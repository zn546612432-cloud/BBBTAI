// Single source of truth for every WeChat preset reply.
// The Day 1–5 dialogue modules remain content/progress providers; UI and
// Send never pick a different story rule independently.
import {d01Draft,d01ComposerDisabled,sendD01WeChat} from '../../story/d01/wechat.js';
import {d02Track,d02Draft,d02ComposerDisabled,sendD02WeChat} from '../../story/d02/wechat.js';
import {d03Track,d03Draft,d03ComposerDisabled,sendD03WeChat} from '../../story/d03/wechat.js';
import {d04Track,d04Draft,d04ComposerDisabled,sendD04WeChat} from '../../story/d04/wechat.js';
import {d05Track,d05Draft,d05ComposerDisabled,sendD05WeChat} from '../../story/d05/wechat.js';
import {currentScript55,sendScriptedDraft55} from '../story55/scripted-chat.js';

const providers=[
 {name:'d01',draft:d01Draft,disabled:d01ComposerDisabled,send:sendD01WeChat},
 {name:'d02',busy:d02Track.busy,draft:d02Draft,disabled:d02ComposerDisabled,send:sendD02WeChat},
 {name:'d03',busy:d03Track.busy,draft:d03Draft,disabled:d03ComposerDisabled,send:sendD03WeChat},
 {name:'d04',busy:d04Track.busy,draft:d04Draft,disabled:d04ComposerDisabled,send:sendD04WeChat},
 {name:'d05',busy:d05Track.busy,draft:d05Draft,disabled:d05ComposerDisabled,send:sendD05WeChat}
];
const locate=(s,id)=>{
 const choices=providers.map(provider=>({provider,draft:provider.draft(s,id)})).filter(c=>c.draft?.text);
 choices.sort((a,b)=>(b.draft.priority??2)-(a.draft.priority??2)||(b.draft.day??0)-(a.draft.day??0));
 const chosen=choices[0];
 // A live NPC turn in today's thread takes precedence over an old late reply.
 if(chosen&&(chosen.draft.priority??2)===0&&providers.some(p=>p.busy?.(s,id)))return null;
 return chosen||null;
};
export function nativeWeChatComposer(s,id){
 const chosen=locate(s,id),line=currentScript55(s,'wechat',id);
 if(chosen&&!(line&&(chosen.draft.priority??2)===0))return {
  text:chosen.draft.text,
  stage:chosen.draft.stage,
  source:chosen.provider.name,
  disabled:false
 };
 if(line?.kind==='me')return {
  text:line.text,stage:line.id+':'+line.index,
  source:'story55',disabled:false
 };
 return {
  text:null,stage:null,source:null,
  disabled:!!(line&&line.kind!=='me')||providers.some(p=>p.disabled(s,id))
 };
}

// Authored player messages are only written from this path on a real submit.
export function sendNativeWeChatPreset(store,id,text,now=Date.now()){
 const s=store.get(),chosen=locate(s,id),line=currentScript55(s,'wechat',id);
 if(chosen&&!(line&&(chosen.draft.priority??2)===0))return chosen.provider.send(store,id,text,now);
 if(line?.kind==='me'){
  if(String(text||'').trim()!==line.text.trim())
   return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
  store.update(next=>sendScriptedDraft55(next,'wechat',id,text));
  return {handled:true,messageId:'story55-'+line.id+'-'+line.index};
 }
 // D01's first "hello" and certain legacy scenes start when the player
 // types and presses Send, before any preset draft exists. Preserve that
 // authored trigger; never fall through to a generic, unscripted send.
 const dayProvider=providers.find(p=>p.name==='d0'+s.day);
 if(s.story55?.version===1&&dayProvider){
  const result=dayProvider.send(store,id,text,now);
  if(result?.handled)return result;
 }
 if(nativeWeChatComposer(s,id).disabled)return {
  handled:true,reason:'目前正在等待對方回覆，不能自行發送預設劇情'
 };
 return {handled:false};
}
