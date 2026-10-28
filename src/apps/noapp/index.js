import {chatList,chatView,sendChat,attachChat} from '../../components/chat.js';
import {receiveInvitation,deferInvitation,startAcceptedInvitation} from '../../services/invitations.js';
import {btn,demo} from '../../system/ui.js';
export const manifest={id:'noapp',name:'NoApp',icon:12,unlockDay:56,defaultRoute:'/',supportsDeepLink:true,kicker:'PRIVATE CHANNEL'};
export function render({store},loc){const s=store.get(),id=loc.route.startsWith('/chat/')?loc.route.slice(6):null;return `<div class="noapp-shell"><div class="noapp-note"><span>◈　私人频道 · 本机演示</span>${demo()}</div>${id?chatView(s,'noapp',id):chatList(s,'noapp')}</div>`;}
export function handle(action,target,ctx){const id=target.dataset.id;if(action==='open-chat')ctx.router.open({appId:'noapp',route:'/chat/'+id});if(action==='accept-invite'){const matchId=receiveInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId,params:{invitationId:id}});}if(action==='defer-invite')deferInvitation(ctx.store,id);if(action==='open-invite-match'){const matchId=startAcceptedInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId,params:{invitationId:id}});}if(action==='attach-chat')attachChat(id,'noapp',ctx);}
export const submit=(form,ctx)=>{if(form.dataset.form==='send-chat')sendChat(form,ctx);};
