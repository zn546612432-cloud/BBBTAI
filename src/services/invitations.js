import {isStory55,taiRecognized,date55,overnightSceneNight55} from './story55/state.js';
import {appendAuthoredPhoneMessage} from './messaging/phone-messages.js';
import {taiPresence} from './presence.js';
import {beginD23ChessLesson} from './chess-lesson.js';
const uid=()=>globalThis.crypto?.randomUUID?.()||`inv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const D41_CHESS_INVITATION='s55-d41-chess-invite';
const authoredChessSources=['d23-mirage-story','d29-mirage-story','d41-noapp-story'];
export function offerD41ChessInvitation(s){
 if(!isStory55(s)||!taiRecognized(s)||!s.story55.d41CallTriggered)return false;
 const id=D41_CHESS_INVITATION;
 if(s.invitations.some(i=>i.id===id))return false;
 s.invitations.push({id,senderId:'tai',recipientId:'player',source:'d41-noapp-story',status:'pending',createdDay:s.day,createdClock:s.clock,expiresDay:41,matchId:null});
 const message=appendAuthoredPhoneMessage(s,{channel:'noapp',conversationId:'tai',messageId:'s55-chess-card-d41',from:'tai',kind:'app_invitation',text:'國際象棋邀請',attachment:{invitationId:id,type:'chess'},day:s.day,clock:s.clock,sentDate:date55(s.day+(overnightSceneNight55(s)?1:0)),storyTag:'story55'});
 if(message)message.invitationId=id;
 return true;
}
// A story-owned, already accepted invitation bridges the anonymous D23 MIRAGE
// dialogue to the same chess match store. It does not unlock Tai's identity.
export function offerD23ChessInvitation(s){
 return offerStoryChessInvitation(s,23);
}
export function offerStoryChessInvitation(s,day){
 if(![23,29].includes(day)||!isStory55(s)||!s.story55.completed?.[`d${day}-chess`])return false;
 const id=`s55-d${day}-chess-invite`;
 if(s.invitations.some(i=>i.id===id))return false;
 s.invitations.push({id,senderId:'tai',recipientId:'player',source:`d${day}-mirage-story`,status:'pending',createdDay:s.day,createdClock:s.clock,expiresDay:55,matchId:null});
 appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:'s55-ouroboros',messageId:`s55-chess-card-d${day}`,from:'s55-ouroboros',kind:'app_invitation',
  text:'CHESS / INVITATION',attachment:{invitationId:id,type:'chess'},day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
 return true;
}
export function refuseD29ChessInvitation(s,id){
 const inv=s.invitations.find(i=>i.id===id&&i.source==='d29-mirage-story'&&i.status==='pending');
 if(!inv||inv.refused)return false;
 inv.refused=true;
 for(const [index,line] of ['嘖。','怕了？'].entries())appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:'s55-ouroboros',messageId:`s55-d29-refusal-${index}`,from:'s55-ouroboros',text:line,day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
 return true;
}
export function createPlayerInvitation(store){const s=store.get();if(!taiRecognized(s))throw Error('这个联系人尚未开放');const existing=s.invitations.find(i=>i.senderId==='player'&&i.status==='pending');if(existing)return existing.id;const id=uid();store.update(s=>{s.invitations.push({id,senderId:'player',recipientId:'tai',source:'local-demo',status:'pending',createdDay:s.day,expiresDay:s.day+2,matchId:null});s.events.push({type:'chess_invitation_sent',invitationId:id,day:s.day,clock:s.clock});});return id;}
export function receiveInvitation(store,id){const inv=store.get().invitations.find(i=>i.id===id),story=store.get().story55;if(!inv||inv.senderId!=='tai'||!(['demo-fixture','story-invitation'].includes(inv.source)||['d23-mirage-story','d29-mirage-story'].includes(inv.source)&&!!story?.completed?.[inv.source.slice(0,3)+'-chess']||inv.source==='d41-noapp-story'&&id===D41_CHESS_INVITATION&&story?.d41CallTriggered))throw Error('邀请来源不可验证');if(inv.status==='accepted')return inv.matchId;if(inv.expiresDay<store.get().day){store.update(s=>{s.invitations.find(i=>i.id===id).status='expired';});throw Error('邀请已过期');}if(inv.status!=='pending'&&inv.status!=='deferred')throw Error('邀请无法接受');const matchId=uid();store.update(s=>{const item=s.invitations.find(i=>i.id===id);item.status='accepted';item.matchId=matchId;const match={id:matchId,invitationId:id,opponent:'tai',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[],chat:authoredChessSources.includes(item.source)?[]:[{id:uid(),from:'tai',text:'来一盘？',time:s.clock}]};s.matches.push(match);beginD23ChessLesson(match,s.clock);s.events.push({type:'chess_match_started',matchId,invitationId:id,day:s.day,clock:s.clock});});return matchId;}
export function deferInvitation(store,id){
 store.update(s=>{
  const inv=s.invitations.find(i=>i.id===id);
  if(inv?.status!=='pending')return;
  inv.status='deferred';
  if(inv.source==='d41-noapp-story'){
   s.events.push({type:'chess_invitation_deferred',invitationId:id,day:s.day,clock:s.clock});
   return;
  }
  const c=s.content.conversations.noapp?.find(x=>x.id==='tai');
  const count=s.events.filter(e=>e.type==='chess_invitation_deferred').length;
  const reply=count%2===0?'啧。':'好吧。';
  if(c){
   c.messages.push({id:'tai-deferred-ack-'+id,from:'tai',text:reply,kind:'text',day:s.day,time:s.clock,actual:true,storyImported:true});
   if(!(s.nav.current.appId==='noapp'&&s.nav.current.route==='/chat/tai')){
    c.unread=(c.unread||0)+1;
    s.notifications.unshift({id:'tai-deferred-ack-notice-'+id,title:c.name||'Dr Ouroboros',body:reply,link:{appId:'noapp',route:'/chat/tai',params:{}}});
   }
  }
  s.events.push({type:'chess_invitation_deferred',invitationId:id,day:s.day,clock:s.clock});
 });
}
export function maybeInviteFromTaiChat(store,messageId){
 const s=store.get(),c=s.content.conversations.noapp?.find(x=>x.id==='tai');
 const message=c?.messages.find(m=>m.id===messageId&&m.from==='me');
 if(!message||!taiRecognized(s)||taiPresence(s).status!=='online')return false;
 if(!/(来一盘|下一局|下棋|国际象棋|来下棋|下期吗|再来一盘)/.test(message.text))return false;
 const count=s.events.filter(e=>e.type==='tai_chess_invitation_offered').length;
 const max=Math.min(2,Math.max(0,Number(s.aiDraft?.maxChessInvites??2)));
 if(count>=max||s.invitations.some(i=>i.senderId==='tai'&&['pending','deferred'].includes(i.status)))return false;
 const hash=[...message.id].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,0);
 if(hash%100>=48)return false;
 const index=count+1,invId='tai-chess-chat-'+index+'-'+message.id;
 store.update(state=>{
  state.invitations.push({id:invId,senderId:'tai',recipientId:'player',source:'story-invitation',status:'pending',createdDay:state.day,createdClock:state.clock,expiresDay:Math.min(89,state.day+7),matchId:null});
  const chat=state.content.conversations.noapp.find(x=>x.id==='tai');
  chat.messages.push({id:'tai-chess-offer-note-'+invId,from:'tai',text:'一盘？希望你这次能让我认真一点。',kind:'text',day:state.day,time:state.clock,actual:true});
  chat.messages.push({id:'tai-chess-offer-card-'+invId,from:'tai',kind:'app_invitation',invitationId:invId,day:state.day,time:state.clock,actual:true});
  state.events.push({type:'tai_chess_invitation_offered',invitationId:invId,day:state.day,clock:state.clock,trigger:'player-request'});
 });
 return true;
}
export function startAcceptedInvitation(store,id){const inv=store.get().invitations.find(i=>i.id===id);if(!inv||inv.status!=='accepted')throw Error('邀请尚未接受');if(inv.matchId)return inv.matchId;const matchId=uid();store.update(s=>{const i=s.invitations.find(i=>i.id===id);if(i.matchId)return;i.matchId=matchId;const item=i;const match={id:matchId,invitationId:id,opponent:'tai',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[],chat:['d23-mirage-story','d29-mirage-story'].includes(item.source)?[]:[{id:uid(),from:'tai',text:'来一盘？',time:s.clock}]};s.matches.push(match);beginD23ChessLesson(match,s.clock);s.events.push({type:'chess_match_started',matchId,invitationId:id,day:s.day,clock:s.clock});});return store.get().invitations.find(i=>i.id===id).matchId;
}
export function processDemoReply(store){const s=store.get(),presence=taiPresence(s);const expired=s.invitations.filter(i=>i.source==='local-demo'&&i.senderId==='player'&&i.status==='pending'&&i.expiresDay<s.day);if(expired.length)store.update(s=>{for(const inv of s.invitations)if(expired.some(e=>e.id===inv.id))inv.status='expired';});if(presence.status!=='online')return false;const pending=store.get().invitations.find(i=>i.source==='local-demo'&&i.senderId==='player'&&i.status==='pending'&&i.createdDay<=s.day&&i.expiresDay>=s.day);if(!pending)return false;store.update(s=>{const inv=s.invitations.find(i=>i.id===pending.id);inv.status='accepted';s.notifications.unshift({id:uid(),title:'Dr Ouroboros',body:'邀请已接受 · 打开国际象棋',link:{appId:'chess',route:'/invitation',params:{invitationId:inv.id}},demo:true});s.events.push({type:'chess_invitation_demo_accepted',invitationId:inv.id,day:s.day,clock:s.clock});});return true;}

const asMinutes=(day,clock)=>Number(day)*1440+Number(clock.slice(0,2))*60+Number(clock.slice(3,5));
export function dueChessReminders(s){
 return (s.invitations||[]).some(inv=>inv.senderId==='tai'&&inv.source==='story-invitation'&&['pending','deferred'].includes(inv.status)&&!inv.reminderSent&&asMinutes(s.day,s.clock)-asMinutes(inv.createdDay,inv.createdClock||'21:17')>=240&&asMinutes(s.day,s.clock)-asMinutes(inv.createdDay,inv.createdClock||'21:17')<=7*1440&&s.day<90);
}
export function sendUnansweredChessReminders(s){
 const outgoing=[],c=s.content.conversations.noapp?.find(x=>x.id==='tai');
 if(!c||s.day>=90)return outgoing;
 for(const inv of s.invitations){
  if(inv.senderId!=='tai'||inv.source!=='story-invitation'||!['pending','deferred'].includes(inv.status))continue;
  const age=asMinutes(s.day,s.clock)-asMinutes(inv.createdDay,inv.createdClock||'21:17');
  if(age<240||age>7*1440||inv.reminderSent)continue;
  const index=(s.invitations.filter(i=>i.senderId==='tai'&&i.source==='story-invitation').findIndex(i=>i.id===inv.id));
  const text=index===0?'不说话？不会还在睡觉吧哥哥。':'明明在线却不回消息。天才黑客还真是时间难约。';
  const id='tai-chess-followup-'+inv.id;
  if(!c.messages.some(m=>m.id===id)){
   c.messages.push({id,from:'tai',text,kind:'text',day:s.day,time:s.clock,storyImported:true,actual:true});
   c.unread=Math.max(0,Number(c.unread)||0)+1;
   s.notifications.unshift({id:'tai-chess-remind-'+inv.id,title:'Dr Ouroboros',body:text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
  }
  inv.reminderSent=true;outgoing.push(id);
 }
 return outgoing;
}
