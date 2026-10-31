import {sceneView55} from '../../services/story55/views.js';
import {isStory55,taiRecognized} from '../../services/story55/state.js';
import {taiForcedOnline,setTaiForcedOnline} from '../../services/ai/test-controls.js';
import {rememberTaiConversation} from '../../services/ai/memory.js';
import {chatList,chatView,sendChat,attachChat} from '../../components/chat.js';
import {receiveInvitation,deferInvitation,startAcceptedInvitation,maybeInviteFromTaiChat} from '../../services/invitations.js';
import {replyToTaiMessage} from '../../services/ai/live-chat.js';
import {taiBehavior,normalizeTaiBehavior} from '../../services/ai/behavior.js';
import {behaviorSettings,readBehaviorForm} from './settings/behavior.js';
import {maybeSendProactive} from '../../services/ai/proactive.js';
import {apiConfig,saveApiConfig,clearApiConfig,XITAI_VOICE_ID} from '../../services/ai/gateway.js';
import {DEEPSEEK_MODELS} from '../../services/ai/model-config.js';
import {taiPresence} from '../../services/presence.js';
import {btn,demo,esc} from '../../system/ui.js';
import {callView,startIncoming,startOutgoing,callAction,submitCall,toggleVoiceRecord,playVoiceMessage,convertTaiTextToVoice,sendTaiTestVoice,callState} from './voice-call.js';

export const manifest={id:'noapp',name:'NoApp',icon:12,unlockDay:56,defaultRoute:'/',supportsDeepLink:true,kicker:'PRIVATE CHANNEL'};
let taiFeedback='',pendingTai=null,replyVersion=0;
// Keep unsaved iOS paste/keyboard contents across periodic world-clock renders.
let settingsDraft={};
function showFeedback(ctx,message){taiFeedback=message;const nav=ctx.store.get().nav.current;if(nav.appId==='noapp'&&nav.route==='/chat/tai')ctx.refresh();}
function queueTaiReply(ctx,messageId){
 const version=++replyVersion;
 if(pendingTai)clearTimeout(pendingTai);
 ctx.store.update(s=>{const m=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===messageId);if(m&&!m.receivedAt)m.receivedAt=Date.now();});
 showFeedback(ctx,'已发送');
 const run=async()=>{
  if(version!==replyVersion)return;
  pendingTai=null;
  try{
   showFeedback(ctx,'熙泰正在输入…');
   const result=await replyToTaiMessage(ctx.store,messageId);
   if(version!==replyVersion)return;
   if(result.status==='busy'){pendingTai=setTimeout(run,500);return;}
   showFeedback(ctx,result.status==='offline'||result.status==='unavailable'?result.message:'');
  }catch(error){if(version===replyVersion){showFeedback(ctx,error.message||'AI 回复失败');ctx.toast(error.message||'AI 回复失败');}}
 };
 pendingTai=setTimeout(run,3000);
}
const setting=(s)=>{
 const c={...apiConfig(),...settingsDraft};
 return '<div class="tai-api-setup"><h2>AI 接口 · 私人调试</h2><p>三个 App 共用 DeepSeek；只有 NoApp 能调用 MiniMax 配音。API Key 只保存在这个浏览器标签页的 sessionStorage；不会提交至 GitHub，不会导出到游戏存档。</p>'
 +'<form data-form="tai-save-ai"><label>DeepSeek API Key<input type="password" name="deepseek" autocomplete="off" placeholder="sk-…" value="'+esc(c.deepseek||'')+'"></label>'
 +'<label>DeepSeek 模型<select name="model">'+DEEPSEEK_MODELS.map(m=>'<option value="'+m.id+'"'+(c.model===m.id?' selected':'')+'>'+esc(m.label)+'</option>').join('')+'</select></label><p>V4 Pro：明确关闭思考，temperature = 1.3。只影响新发送的 AI 回复；Flash 保持原有配置。</p>'
 +'<label>MiniMax API Key<input type="password" name="minimax" autocomplete="off" placeholder="输入 MiniMax API Key" value="'+esc(c.minimax||'')+'"></label>'
 +'<label>MiniMax 平台<select name="region"><option value="cn" '+(c.region!=='intl'?'selected':'')+'>中国站 · minimaxi.com</option><option value="intl" '+(c.region==='intl'?'selected':'')+'>国际站 · minimax.io</option></select></label>'
 +'<label>熙泰固定音色<input type="text" name="voiceId" readonly value="'+esc(XITAI_VOICE_ID)+'"></label>'
 +'<label>TTS 模型<select name="ttsModel"><option value="speech-2.8-turbo" '+(c.ttsModel!=='speech-2.8-hd'?'selected':'')+'>2.8 Turbo · 快</option><option value="speech-2.8-hd" '+(c.ttsModel==='speech-2.8-hd'?'selected':'')+'>2.8 HD · 音质</option></select></label>'
 +'<button class="button-primary" type="submit">保存本次会话的 API 设置</button></form>'
 +behaviorSettings(taiBehavior(s),settingsDraft)
 +'<section class="tai-test-controls"><h3>熙泰 · 测试控制</h3><p>只作用于当前测试标签页，不更改游戏原有的剧情天数。</p>'
 +'<label class="tai-test-toggle"><input type="checkbox" data-action="tai-force-online" '+(taiForcedOnline()?'checked':'')+'> 强制熙泰在线（仅测试）</label>'
 +'<div class="tai-test-actions"><button type="button" data-action="tai-test-incoming">模拟熙泰来电</button><button type="button" data-action="tai-outgoing">给熙泰打电话</button></div>'
 +'<label>测试语音台词<textarea name="testSpeech" rows="3" placeholder="例如：嗯？你还没睡？">'+esc(settingsDraft.testSpeech||'嗯？你还没睡？我还以为你终于肯休息了。')+'</textarea></label>'
 +'<label>语音情绪<select name="testTone">'+['neutral','dry','playful','soft','serious'].map(v=>'<option value="'+v+'"'+(settingsDraft.testTone===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label>'
 +'<button type="button" data-action="tai-test-voice">让熙泰发语音</button></section>'
 +'<button data-action="tai-clear-ai" type="button">清除当前会话 Key</button><div class="tai-worldbook-links"><strong>人物与声音世界书 · 已接入</strong><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/fix/xitai-system-card-v5-20261031/docs/XITAI_CHARACTER_CARD_V5.md" target="_blank" rel="noopener noreferrer">阅读熙泰专属人设 v5 与接入说明</a><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/main/src/apps/noapp/worldbook/voice-worldbook-v3-original.md" target="_blank" rel="noopener noreferrer">阅读你上传的 16 页语音世界书原文</a><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/main/src/services/voice/voice-regex.js" target="_blank" rel="noopener noreferrer">查看运行中的正则与 Sound Tag 处理</a></div><p>浏览器平台若拒绝跨域请求，需要服务端代理。本页面不会为你把私钥写入公开代码；语音通话是 AI 轮流发言，不是系统电话或后台 VoIP。</p></div>';
};
export function render({store},loc){if(isStory55(store.get())&&loc.route==='/story55/recognition')return sceneView55(store.get(),loc);
 const s=store.get(),id=loc.route.startsWith('/chat/')?loc.route.slice(6):null;
 if(loc.route==='/call')return callView(s);
 if(loc.route==='/settings-ai')return setting(s);
 const phoneIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 7 7l1.6-1.9a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.6 1.9Z"/></svg>';
 const settingsIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.5 1.5 0 0 0 .3 1.7l.1.1-2.2 2.2-.1-.1a1.5 1.5 0 0 0-1.7-.3l-.7.3a1.5 1.5 0 0 0-.9 1.4v.2H11v-.2a1.5 1.5 0 0 0-.9-1.4l-.7-.3a1.5 1.5 0 0 0-1.7.3l-.1.1-2.2-2.2.1-.1a1.5 1.5 0 0 0 .3-1.7l-.3-.7a1.5 1.5 0 0 0-1.4-.9H4v-3.2h.2a1.5 1.5 0 0 0 1.4-.9l.3-.7a1.5 1.5 0 0 0-.3-1.7l-.1-.1 2.2-2.2.1.1a1.5 1.5 0 0 0 1.7.3l.7-.3a1.5 1.5 0 0 0 .9-1.4V4h3.2v.2a1.5 1.5 0 0 0 .9 1.4l.7.3a1.5 1.5 0 0 0 1.7-.3l.1-.1 2.2 2.2-.1.1a1.5 1.5 0 0 0-.3 1.7l.3.7a1.5 1.5 0 0 0 1.4.9h.2v3.2h-.2a1.5 1.5 0 0 0-1.4.9Z"/></svg>';
 const toolbar=taiRecognized(s)?'<nav class="noapp-mini-toolbar" aria-label="对话操作">'+
 (id==='tai'?'<button type="button" data-action="tai-outgoing" aria-label="给熙泰打电话">'+phoneIcon+'</button>':'')+
 '<button type="button" data-action="tai-api-settings" aria-label="AI 设置">'+settingsIcon+'</button></nav>':'';
 const overlay=id==='tai'?'<div class="noapp-record-overlay" aria-hidden="true"><div class="noapp-record-heading">正在录音</div><div class="noapp-record-waves">'+Array.from({length:17},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div><small>上滑取消 · 松开发送</small></div>':'';
 return '<div class="noapp-shell">'+toolbar+overlay+(id?chatView(s,'noapp',id,{feedback:id==='tai'?taiFeedback:''}):chatList(s,'noapp'))+'</div>';
}
export async function handle(action,target,ctx){
 const id=target.dataset.id;
 if(action==='open-chat')ctx.router.open({appId:'noapp',route:'/chat/'+id});
 if(action==='accept-invite'){const matchId=receiveInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId});}
 if(action==='defer-invite')deferInvitation(ctx.store,id);
 if(action==='open-invite-match'){const matchId=startAcceptedInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId});}
 if(action==='attach-chat')attachChat(id,'noapp',ctx);
 if(action==='tai-api-settings')ctx.router.open({appId:'noapp',route:'/settings-ai'});
 if(action==='tai-clear-ai'){settingsDraft={};clearApiConfig();ctx.refresh();ctx.toast('当前会话 Key 已清除');}
 if(action==='tai-force-online'){
  setTaiForcedOnline(!taiForcedOnline());ctx.refresh();
  ctx.toast(taiForcedOnline()?'已为本标签页强制在线':'已恢复正常在线时间');
  return;
 }
 if(action==='tai-test-outreach'||action==='tai-test-followup'){
  if(['ringing','dialing','connected'].includes(callState().state)){ctx.toast('请先结束当前通话');return;}
  const sent=await maybeSendProactive(ctx.store,{force:action==='tai-test-followup'?'followup':'topic'});
  ctx.toast(sent?'熙泰已发来测试消息':'熙泰需要在线；跟进测试还需要最后一条是他发来且未回复的消息');return;
 }
 if(action==='tai-test-voice'){
  const box=target.closest('.tai-api-setup');
  const message=box?.querySelector('[name="testSpeech"]')?.value?.trim();
  const tone=box?.querySelector('[name="testTone"]')?.value||'neutral';
  if(!message){ctx.toast('请填写测试语音台词');return;}
  await sendTaiTestVoice(ctx,{text:message,tone});
  ctx.toast('熙泰的测试语音已发送到 NoApp');
  return;
 }
 if(action==='tai-outgoing')startOutgoing(ctx);
 if(action==='tai-test-incoming')startIncoming(ctx);
 if(action==='tai-record'&&target.dataset.hold!=='true')await toggleVoiceRecord(ctx);
 if(action==='tai-play-voice')await playVoiceMessage(id,ctx);
 if(action==='tai-convert-voice'){await convertTaiTextToVoice(ctx,id);ctx.toast('熙泰的语音已合成');}
 if(action==='tai-last-voice'){const c=ctx.store.get().content.conversations.noapp.find(x=>x.id==='tai');const last=c?.messages.slice().reverse().find(m=>m.from==='tai'&&m.kind==='text');if(!last){ctx.toast('先和熙泰聊几句');return;}await convertTaiTextToVoice(ctx,last.id);ctx.toast('熙泰发来一条语音');}
 if(callAction(action,ctx))return;
}
export const submit=(form,ctx)=>{
 if(form.dataset.form==='send-chat'){const id=sendChat(form,ctx);if(id&&form.dataset.id==='tai'){ctx.store.update(s=>{const msg=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===id);if(msg)rememberTaiConversation(s,msg.text);});if(!maybeInviteFromTaiChat(ctx.store,id))queueTaiReply(ctx,id);}return;}
 if(form.dataset.form==='tai-call-turn'){submitCall(form,ctx);return;}
 if(form.dataset.form==='tai-save-behavior'){
  const behavior=normalizeTaiBehavior(readBehaviorForm(new FormData(form)));
  ctx.store.update(s=>{s.aiDraft??={};s.aiDraft.behavior=behavior;});
  for(const key of Object.keys(behavior))delete settingsDraft['behavior_'+key];
  ctx.refresh();ctx.toast('熙泰的聊天与通话设置已保存');return;
 }
 if(form.dataset.form==='tai-save-ai'){
  const data=new FormData(form);saveApiConfig({deepseek:data.get('deepseek'),minimax:data.get('minimax'),model:data.get('model'),region:data.get('region'),voiceId:XITAI_VOICE_ID,ttsModel:data.get('ttsModel')});settingsDraft={};
  ctx.toast('已保存所选 DeepSeek 模型（NoApp / MIRAGE / 国际象棋共用）');return;
 }
};
export function mountCallEvents({store}){
 window.addEventListener('ximeng:tai-incoming-call',e=>startIncoming({store},String(e.detail?.preview||'熙泰邀请你语音通话')));
 window.addEventListener('ximeng:noapp-voice-sent',e=>{const id=e.detail?.messageId;if(id)queueTaiReply({store,refresh:()=>{},toast:()=>{}},id);});
}

/** Persist API input values in memory while the Safari software keyboard is open. */
export function input(t){if(t.closest?.('.tai-api-setup')&&t.name&&t.name!=='voiceId')settingsDraft[t.name]=t.type==='checkbox'?t.checked:t.value;}

export function change(target){input(target);}
