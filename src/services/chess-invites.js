// Two authored Xitai chess invitations across D56–D90, not an endless
// auto-reply. Persisted IDs make this idempotent across refresh and reload.
const SCHEDULE=[
 {day:56,clock:'21:17',text:'来一盘？'},
 {day:65,clock:'21:30',text:'下一局？'}
];
export function nextScheduledTaiInvite(s){
 if(s.day<56)return null;
 const done=(s.events||[]).filter(e=>e.type==='tai_chess_invitation_offered').length;
 if(done>=Math.min(2,Math.max(0,Number(s.aiDraft?.maxChessInvites??2))))return null;
 const slot=SCHEDULE[done];
 if(!slot||s.day<slot.day||s.day===slot.day&&s.clock<slot.clock)return null;
 // D56 must be recognized before D65; do not trigger after death.
 if(s.day>89)return null;
 return {...slot,index:done};
}
export function deliverTaiChessInvite(s,slot=nextScheduledTaiInvite(s)){
 if(!slot)return false;
 const id='tai-chess-story-'+(slot.index+1);
 if(s.invitations.some(i=>i.id===id))return false;
 s.invitations.push({id,senderId:'tai',recipientId:'player',source:'story-invitation',status:'pending',createdDay:s.day,expiresDay:Math.min(89,s.day+7),matchId:null});
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 if(c){
  c.messages.push({id:'tai-invite-note-'+(slot.index+1),from:'tai',text:slot.text,day:s.day,time:s.clock,kind:'text',storyImported:true,actual:true});
  c.messages.push({id:'tai-invite-card-'+(slot.index+1),from:'tai',kind:'app_invitation',invitationId:id,day:s.day,time:s.clock,storyImported:true,actual:true});
  c.unread=Math.max(0,c.unread||0)+1;
 }
 s.notifications.unshift({id:'tai-chess-notice-'+(slot.index+1),title:'Dr Ouroboros',body:slot.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
 s.events.push({type:'tai_chess_invitation_offered',invitationId:id,day:s.day,clock:s.clock});
 return true;
}
