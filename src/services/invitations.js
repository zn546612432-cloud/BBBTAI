import {taiPresence} from './presence.js';
const uid=()=>globalThis.crypto?.randomUUID?.()||`inv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function createPlayerInvitation(store){const s=store.get();if(s.day<56)throw Error('这个联系人尚未开放');const existing=s.invitations.find(i=>i.senderId==='player'&&i.status==='pending');if(existing)return existing.id;const id=uid();store.update(s=>{s.invitations.push({id,senderId:'player',recipientId:'tai',source:'local-demo',status:'pending',createdDay:s.day,expiresDay:s.day+2,matchId:null});s.events.push({type:'chess_invitation_sent',invitationId:id,day:s.day,clock:s.clock});});return id;}
export function receiveInvitation(store,id){const inv=store.get().invitations.find(i=>i.id===id);if(!inv||inv.senderId!=='tai'||!['demo-fixture','story-invitation'].includes(inv.source))throw Error('邀请来源不可验证');if(inv.expiresDay<store.get().day){store.update(s=>{s.invitations.find(i=>i.id===id).status='expired';});throw Error('邀请已过期');}if(inv.status==='accepted')return inv.matchId;if(inv.status!=='pending'&&inv.status!=='deferred')throw Error('邀请无法接受');const matchId=uid();store.update(s=>{const item=s.invitations.find(i=>i.id===id);item.status='accepted';item.matchId=matchId;s.matches.push({id:matchId,invitationId:id,opponent:'tai',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[],chat:[{id:uid(),from:'tai',text:'来一盘？',time:s.clock}]});s.events.push({type:'chess_match_started',matchId,invitationId:id,day:s.day,clock:s.clock});});return matchId;}
export function deferInvitation(store,id){store.update(s=>{const inv=s.invitations.find(i=>i.id===id);if(inv?.status==='pending'){inv.status='deferred';s.events.push({type:'chess_invitation_deferred',invitationId:id,day:s.day,clock:s.clock});}});}
export function startAcceptedInvitation(store,id){const inv=store.get().invitations.find(i=>i.id===id);if(!inv||inv.status!=='accepted')throw Error('邀请尚未接受');if(inv.matchId)return inv.matchId;const matchId=uid();store.update(s=>{const i=s.invitations.find(i=>i.id===id);if(i.matchId)return;i.matchId=matchId;s.matches.push({id:matchId,invitationId:id,opponent:'tai',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[],chat:[{id:uid(),from:'tai',text:'来一盘？',time:s.clock}]});s.events.push({type:'chess_match_started',matchId,invitationId:id,day:s.day,clock:s.clock});});return store.get().invitations.find(i=>i.id===id).matchId;
}
export function processDemoReply(store){const s=store.get(),presence=taiPresence(s);const expired=s.invitations.filter(i=>i.source==='local-demo'&&i.senderId==='player'&&i.status==='pending'&&i.expiresDay<s.day);if(expired.length)store.update(s=>{for(const inv of s.invitations)if(expired.some(e=>e.id===inv.id))inv.status='expired';});if(presence.status!=='online')return false;const pending=store.get().invitations.find(i=>i.source==='local-demo'&&i.senderId==='player'&&i.status==='pending'&&i.createdDay<=s.day&&i.expiresDay>=s.day);if(!pending)return false;store.update(s=>{const inv=s.invitations.find(i=>i.id===pending.id);inv.status='accepted';s.notifications.unshift({id:uid(),title:'Dr Ouroboros',body:'邀请已接受 · 打开国际象棋',link:{appId:'chess',route:'/invitation',params:{invitationId:inv.id}},demo:true});s.events.push({type:'chess_invitation_demo_accepted',invitationId:inv.id,day:s.day,clock:s.clock});});return true;}

const asMinutes=(day,clock)=>Number(day)*1440+Number(clock.slice(0,2))*60+Number(clock.slice(3,5));
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
