// D04: the brother replies only if the player manually posted this exact D03 comment.
export const D03_WANG_MOMENT='xw-d03';
export const D03_WANG_REPLY_ID='d04-wang-rose';
export function tickD03MomentReply(s){
 if(s.story55?.version!==1||s.day<4||s.day===4&&s.clock<'08:30')return false;
 const comments=s.content?.moments?.comments?.[D03_WANG_MOMENT];
 if(!Array.isArray(comments))return false;
 if(comments.some(c=>c.ruleId===D03_WANG_REPLY_ID))return false;
 if(!comments.some(c=>c.by==='熙蒙'&&c.text==='想你了快回來'&&c.day===3))return false;
 comments.push({by:'熙旺',to:'熙蒙',text:'🌹',ruleId:D03_WANG_REPLY_ID,day:4,time:'08:30'});
 return true;
}
