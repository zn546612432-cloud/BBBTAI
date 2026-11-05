// Single source of truth for every WeChat preset reply.
// The Day 1–4 dialogue modules remain content/progress providers; UI and
// Send never pick a different story rule independently.
import {d01Draft,d01ComposerDisabled,sendD01WeChat} from '../../story/d01/wechat.js';
import {d02Draft,d02ComposerDisabled,sendD02WeChat} from '../../story/d02/wechat.js';
import {d03Draft,d03ComposerDisabled,sendD03WeChat} from '../../story/d03/wechat.js';
import {d04Draft,d04ComposerDisabled,sendD04WeChat} from '../../story/d04/wechat.js';
import {currentScript55,sendScriptedDraft55} from '../story55/scripted-chat.js';

const providers=[
 {name:'d01',draft:d01Draft,disabled:d01ComposerDisabled,send:sendD01WeChat},
 {name:'d02',draft:d02Draft,disabled:d02ComposerDisabled,send:sendD02WeChat},
 {name:'d03',draft:d03Draft,disabled:d03ComposerDisabled,send:sendD03WeChat},
 {name:'d04',draft:d04Draft,disabled:d04ComposerDisabled,send:sendD04WeChat}
];
const locate=(s,id)=>{
 for(const provider of providers){
  const draft=provider.draft(s,id);
  if(draft?.text)return {provider,draft};
 }
 return null;
};
export function nativeWeChatComposer(s,id){
 const chosen=locate(s,id),line=currentScript55(s,'wechat',id);
 if(chosen)return {
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
 const s=store.get(),chosen=locate(s,id);
 if(chosen)return chosen.provider.send(store,id,text,now);
 const line=currentScript55(s,'wechat',id);
 if(line?.kind==='me'){
  if(String(text||'').trim()!==line.text.trim())
   return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
  store.update(next=>sendScriptedDraft55(next,'wechat',id,text));
  return {handled:true,messageId:'story55-'+line.id+'-'+line.index};
 }
 if(nativeWeChatComposer(s,id).disabled)return {
  handled:true,reason:'目前正在等待對方回覆，不能自行發送預設劇情'
 };
 return {handled:false};
}
