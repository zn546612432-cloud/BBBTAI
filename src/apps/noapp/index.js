import {chatList,chatView,sendChat,attachChat} from '../../components/chat.js';
import {receiveInvitation,deferInvitation,startAcceptedInvitation} from '../../services/invitations.js';
import {replyToTaiMessage} from '../../services/ai/live-chat.js';
import {apiConfig,saveApiConfig,clearApiConfig} from '../../services/ai/gateway.js';
import {taiPresence} from '../../services/presence.js';
import {btn,demo,esc} from '../../system/ui.js';
import {callView,startIncoming,startOutgoing,callAction,submitCall,toggleVoiceRecord,playVoiceMessage,convertTaiTextToVoice} from './voice-call.js';

export const manifest={id:'noapp',name:'NoApp',icon:12,unlockDay:56,defaultRoute:'/',supportsDeepLink:true,kicker:'PRIVATE CHANNEL'};
let taiFeedback='',pendingTai=null;
function showFeedback(ctx,message){taiFeedback=message;const nav=ctx.store.get().nav.current;if(nav.appId==='noapp'&&nav.route==='/chat/tai')ctx.refresh();}
function queueTaiReply(ctx,messageId){
 if(pendingTai)clearTimeout(pendingTai);
 showFeedback(ctx,'已发送');
 pendingTai=setTimeout(async()=>{
  pendingTai=null;
  try{
   showFeedback(ctx,'熙泰正在输入…');
   const result=await replyToTaiMessage(ctx.store,messageId);
   showFeedback(ctx,result.status==='offline'||result.status==='unavailable'?result.message:'');
  }catch(error){showFeedback(ctx,error.message||'AI 回复失败');ctx.toast(error.message||'AI 回复失败');}
 },3200);
}
const setting=(s)=>{
 const c=apiConfig();
 return '<div class="tai-api-setup"><h2>AI 接口 · 私人调试</h2><p>三个 App 共用 DeepSeek；只有 NoApp 能调用 MiniMax 配音。API Key 只保存在这个浏览器标签页的 sessionStorage；不会提交至 GitHub，不会导出到游戏存档。</p>'
 +'<form data-form="tai-save-ai"><label>DeepSeek API Key<input type="password" name="deepseek" autocomplete="off" placeholder="sk-…" value="'+esc(c.deepseek||'')+'"></label>'
 +'<label>MiniMax API Key<input type="password" name="minimax" autocomplete="off" placeholder="输入 MiniMax API Key" value="'+esc(c.minimax||'')+'"></label>'
 +'<label>MiniMax 平台<select name="region"><option value="cn" '+(c.region!=='intl'?'selected':'')+'>中国站 · minimaxi.com</option><option value="intl" '+(c.region==='intl'?'selected':'')+'>国际站 · minimax.io</option></select></label>'
 +'<label>音色 voice_id<input type="text" name="voiceId" value="'+esc(c.voiceId||'male-qn-qingse')+'" placeholder="male-qn-qingse"></label>'
 +'<label>TTS 模型<select name="ttsModel"><option value="speech-2.8-turbo" '+(c.ttsModel!=='speech-2.8-hd'?'selected':'')+'>2.8 Turbo · 快</option><option value="speech-2.8-hd" '+(c.ttsModel==='speech-2.8-hd'?'selected':'')+'>2.8 HD · 音质</option></select></label>'
 +'<button class="button-primary" type="submit">保存本次会话的 API 设置</button></form>'
 +'<button data-action="tai-clear-ai" type="button">清除当前会话 Key</button><div class="tai-worldbook-links"><strong>人物与声音世界书 · 已接入</strong><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/main/src/services/ai/character-worldbook.js" target="_blank" rel="noopener noreferrer">阅读熙泰完整人物世界书</a><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/main/src/apps/noapp/worldbook/voice-worldbook-v3-original.md" target="_blank" rel="noopener noreferrer">阅读你上传的 16 页语音世界书原文</a><a href="https://github.com/zn546612432-cloud/BBBTAI/blob/main/src/services/voice/voice-regex.js" target="_blank" rel="noopener noreferrer">查看运行中的正则与 Sound Tag 处理</a></div><p>浏览器平台若拒绝跨域请求，需要服务端代理。本页面不会为你把私钥写入公开代码；语音通话是 AI 轮流发言，不是系统电话或后台 VoIP。</p></div>';
};
export function render({store},loc){
 const s=store.get(),id=loc.route.startsWith('/chat/')?loc.route.slice(6):null;
 if(loc.route==='/call')return callView(s);
 if(loc.route==='/settings-ai')return setting(s);
 const head=s.day>=56?'<div class="noapp-voice-actions">'+
 btn('tai-api-settings','⚙ AI 设置','')+
 (id==='tai'?btn('tai-outgoing','☎ 语音电话','')+btn('tai-record','🎤 录语音 / 停止','')+btn('tai-test-incoming','模拟熙泰来电','')+btn('tai-last-voice','让熙泰发语音',''):'')+
 '</div>':'';
 const note=id==='tai'?'<div class="noapp-voice-hint">语音文件只保存在你的设备；长按不必，点击开始，再点击结束。</div>':'';
 return '<div class="noapp-shell"><div class="noapp-note"><span>◈　私人频道</span>'+demo()+'</div>'+head+note+(id?chatView(s,'noapp',id,{feedback:id==='tai'?taiFeedback:''}):chatList(s,'noapp'))+'</div>';
}
export async function handle(action,target,ctx){
 const id=target.dataset.id;
 if(action==='open-chat')ctx.router.open({appId:'noapp',route:'/chat/'+id});
 if(action==='accept-invite'){const matchId=receiveInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId});}
 if(action==='defer-invite')deferInvitation(ctx.store,id);
 if(action==='open-invite-match'){const matchId=startAcceptedInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId});}
 if(action==='attach-chat')attachChat(id,'noapp',ctx);
 if(action==='tai-api-settings')ctx.router.open({appId:'noapp',route:'/settings-ai'});
 if(action==='tai-clear-ai'){clearApiConfig();ctx.refresh();ctx.toast('当前会话 Key 已清除');}
 if(action==='tai-outgoing')startOutgoing(ctx);
 if(action==='tai-test-incoming')startIncoming(ctx);
 if(action==='tai-record')await toggleVoiceRecord(ctx);
 if(action==='tai-play-voice')await playVoiceMessage(id,ctx);
 if(action==='tai-convert-voice'){await convertTaiTextToVoice(ctx,id);ctx.toast('熙泰的语音已合成');}
 if(action==='tai-last-voice'){const c=ctx.store.get().content.conversations.noapp.find(x=>x.id==='tai');const last=c?.messages.slice().reverse().find(m=>m.from==='tai'&&m.kind==='text');if(!last){ctx.toast('先和熙泰聊几句');return;}await convertTaiTextToVoice(ctx,last.id);ctx.toast('熙泰发来一条语音');}
 if(callAction(action,ctx))return;
}
export const submit=(form,ctx)=>{
 if(form.dataset.form==='send-chat'){const id=sendChat(form,ctx);if(id&&form.dataset.id==='tai')queueTaiReply(ctx,id);return;}
 if(form.dataset.form==='tai-call-turn'){submitCall(form,ctx);return;}
 if(form.dataset.form==='tai-save-ai'){
  const data=new FormData(form);saveApiConfig({deepseek:data.get('deepseek'),minimax:data.get('minimax'),region:data.get('region'),voiceId:data.get('voiceId'),ttsModel:data.get('ttsModel')});
  ctx.toast('已为三个 App 配置 DeepSeek，NoApp 另可生成 MiniMax 语音');return;
 }
};
export function mountCallEvents({store}){
 window.addEventListener('ximeng:tai-incoming-call',e=>startIncoming({store},String(e.detail?.preview||'熙泰邀请你语音通话')));
 window.addEventListener('ximeng:noapp-voice-sent',e=>{const id=e.detail?.messageId;if(id)queueTaiReply({store,refresh:()=>{},toast:()=>{}},id);});
}
