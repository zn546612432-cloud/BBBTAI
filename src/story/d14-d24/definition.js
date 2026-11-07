import content from './content.json' with {type:'json'};
import legacy from './legacy-defaults.json' with {type:'json'};

export {content as D14_D24_CONTENT,legacy as D14_D24_LEGACY};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const nodeUpdates={
 code:{at:'09:16'},
 loan:{at:'15:36',delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',authorizedProject:'base',messagePrefix:'s55-loan-v2'},
 rumours:{at:'23:06'},
 // Keep the existing D29 prerequisite. The optional browser search is no
 // longer a prerequisite for asking an already-unlocked Flow contact.
 lead:{at:'21:06',delivery:'queued',channel:'mirage',conversationId:'mc-flow-d03',requires:['code'],requiresContact:true,messagePrefix:'s55-lead-v2'}
};
export function applyD14D24Definition(c,{force=false}={}){
 let changed=false;
 for(const [id,lines] of Object.entries(content.scenes)){
  if(force||same(c.scenes[id],legacy.scenes[id])){c.scenes[id]=structuredClone(lines);changed=true;}
 }
 for(const [id,patch] of Object.entries(nodeUpdates)){
  const node=c.nodes.find(n=>n.id===id),old=legacy.nodes.find(n=>n.id===id);
  if(node&&(force||same(node,old))){Object.assign(node,patch);changed=true;}
 }
 const mail=c.mails.find(m=>m.id==='code-mail');
 if(mail&&(force||same(mail,legacy.mails[0]))){Object.assign(mail,{from:'Mirage / 系統轉遞',subject:'Framework package',body:'別告訴我你不會用。',attachmentName:'Framework package.key',project:'base'});changed=true;}
 const page=c.pages.find(p=>p.id==='mirage');
 if(page&&(force||same(page,legacy.pages[0]))){Object.assign(page,{title:'Mirage / Ouroboros',body:'零散舊論壇討論；不少連結已失效。\n\n有人提過這個匿名帳號，留下的多半是技術圈的傳聞。更多資料無法核實。'});changed=true;}
 return changed;
}
