import {chatList,chatView,sendChat,attachChat} from '../../components/chat.js';
import {receiveInvitation,deferInvitation,startAcceptedInvitation} from '../../services/invitations.js';
import {replyToTaiMessage} from '../../services/ai/live-chat.js';
import {btn,demo} from '../../system/ui.js';
export const manifest={id:'noapp',name:'NoApp',icon:12,unlockDay:56,defaultRoute:'/',supportsDeepLink:true,kicker:'PRIVATE CHANNEL'};
let taiFeedback='',pendingTai=null;
function showFeedback(ctx,message){taiFeedback=message;const nav=ctx.store.get().nav.current;if(nav.appId==='noapp'&&nav.route==='/chat/tai')ctx.refresh();}
function queueTaiReply(ctx,messageId){
 if(pendingTai)clearTimeout(pendingTai);
 showFeedback(ctx,'消息已发送，等待剧情回复…');
 pendingTai=setTimeout(async()=>{
  pendingTai=null;
  try{
   showFeedback(ctx,'正在等待熙泰回复…');
   const result=await replyToTaiMessage(ctx.store,messageId);
   showFeedback(ctx,result.status==='offline'||result.status==='unavailable'?result.message:'');
  }catch(error){showFeedback(ctx,error.message||'本机 AI 回复失败');ctx.toast(error.message||'本机 AI 回复失败');}
 },3200);
}
export function render({store},loc){const s=store.get(),id=loc.route.startsWith('/chat/')?loc.route.slice(6):null;return `<div class="noapp-shell"><div class="noapp-note"><span>◈　私人频道</span>${demo()}</div>${id?chatView(s,'noapp',id,{feedback:id==='tai'?taiFeedback:''}):chatList(s,'noapp')}</div>`;}
export function handle(action,target,ctx){const id=target.dataset.id;if(action==='open-chat')ctx.router.open({appId:'noapp',route:'/chat/'+id});if(action==='accept-invite'){const matchId=receiveInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId,params:{invitationId:id}});}if(action==='defer-invite')deferInvitation(ctx.store,id);if(action==='open-invite-match'){const matchId=startAcceptedInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId,params:{invitationId:id}});}if(action==='attach-chat')attachChat(id,'noapp',ctx);}
export const submit=(form,ctx)=>{if(form.dataset.form==='send-chat'){const id=sendChat(form,ctx);if(id&&form.dataset.id==='tai')queueTaiReply(ctx,id);}};
