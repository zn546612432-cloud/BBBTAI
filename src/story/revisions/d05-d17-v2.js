// Approved copy upgrade on the existing state. No timer, queue or storage.
import previous from './d05-d17-v2-previous.json' with {type:'json'};
import {AUTHORED_CHAT_TRACKS} from '../../services/messaging/lifecycle/registry.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
import {extraDay,rewardSets} from '../d07/life-content.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const player=m=>['me','熙蒙'].includes(m.from);
const archive=(s,m,chat)=>{(s.story55.contentArchives??=[]).push({revision:'d05-d17-v2',channel:'wechat',conversationId:chat,original:structuredClone(m)});};
function remove(s,c,m){
 archive(s,m,c.id);c.messages=c.messages.filter(x=>x!==m);c.unread=Math.max(0,(Number(c.unread)||0)-1);
 s.notifications=(s.notifications||[]).filter(n=>n.messageId!==m.id);
 s.events=(s.events||[]).filter(e=>e.messageId!==m.id);
}
function replace(s,c,m,line){
 if(!line||player(m)||m.edited||m.authored)return;
 archive(s,m,c.id);const old=m.text;m.text=line.text;m.kind=line.kind||'text';m.from=line.who;
 for(const n of s.notifications||[])if(n.messageId===m.id&&n.body===old)n.body=m.kind==='image'?'[圖片]':m.text;
}
function resumeIndex(before,after,index){
 const sent=before.slice(0,index).filter(l=>(l.who||l[0])==='me').length;
 if(!sent)return Math.min(index,after.findIndex(l=>(l.who||l[0])==='me')<0?after.length:after.findIndex(l=>(l.who||l[0])==='me'));
 const turns=after.map((l,i)=>(l.who||l[0])==='me'?i:-1).filter(i=>i>=0);
 return (turns[Math.min(sent,turns.length)-1]??-1)+1;
}
export function syncApprovedChatV2(s){
 if(s.story55?.version!==1||s.story55.approvedChatV2===1)return false;
 const c=s.story55.config;
 if(!c)return false;
 for(const {before,after} of previous.scenes){
  if(!before)continue;
  const chat=s.content?.conversations?.wechat?.find(c=>c.id===before.chat);
  const track=AUTHORED_CHAT_TRACKS.find(t=>t.track.name===before.source)?.track;
  const prefix=before.source+'-'+before.id+'-';
  const old=(chat?.messages||[]).filter(m=>m.id?.startsWith(prefix)&&!m.edited&&!m.authored&&!(m.sentDate<'2025-05-19'));
  const edit=s.story55.chatSceneEdits?.[before.source+':'+before.id];
  if(edit&&same(edit.lines,before.lines)){
   if(after){edit.lines=structuredClone(after.lines);edit.at=after.at;delete edit.baseline;delete edit.lineTimes;}
   else delete s.story55.chatSceneEdits[before.source+':'+before.id];
  }
  if(!after){
   // Retire only the explicitly removed NPC thread. Real player speech stays.
   for(const m of old)if(!player(m)&&before.lines.some(l=>l.who===m.from&&l.text===m.text))remove(s,chat,m);
   if(s.story55.d10Chats?.[before.id])Object.assign(s.story55.d10Chats[before.id],{completed:true,nextAt:null,dueAt:null});
   continue;
  }
  const q=track?.ensure(s)?.[before.id];
  const recognized=old.filter(m=>before.lines.some(l=>l.who===m.from&&l.text===m.text));
  if(!recognized.length)continue;
  if(before.lines.every(l=>l.who!=='me')&&old.length===recognized.length){
   const finished=q?.completed,limit=finished?after.lines.length:Math.min(q?.index||recognized.length,after.lines.length);
   const first=recognized[0],slot=chat.messages.indexOf(first),when={day:first.day||before.day,clock:first.time||before.at,sentDate:first.sentDate};
   for(const m of recognized)remove(s,chat,m);
   const added=[];
   for(let i=0;i<limit;i++){
    const l=after.lines[i];const m=appendAuthoredPhoneMessage(s,{channel:'wechat',conversationId:chat.id,messageId:prefix+i,from:l.who,text:l.text,kind:l.kind||'text',...when,storyTag:'storyD'+String(before.day).padStart(2,'0'),silent:true,lifecycleId:before.source+':'+before.id});
    if(m)added.push(m);
   }
   chat.messages=chat.messages.filter(m=>!added.includes(m));chat.messages.splice(Math.max(0,slot),0,...added);
   if(q)q.index=limit;
  }else{
   for(const m of recognized){
    if(player(m))continue;
    const i=Number(m.id.slice(prefix.length)),target=after.lines[i];
    if(target?.who===m.from)replace(s,chat,m,target);
    else if(!after.lines.some(l=>l.who===m.from&&l.text===m.text))remove(s,chat,m);
   }
   if(q?.started&&!q.completed){q.index=resumeIndex(before.lines,after.lines,q.index);q.messagePrefix=before.source+'-v2';q.historySettled=false;q.skipped=false;q.nextAt=after.lines[q.index]?.who==='me'?null:0;q.dueAt=q.nextAt;}
  }
 }
 // Story55 owns these native queued scenes; preserve real Send records and
 // use a new message namespace only for an already-started older script.
 for(const former of previous.story){
  const id=former.node.id,lines=c.scenes[id];
  if(!same(lines,former.lines))continue;
  const target=id==='return'?NEW_RETURN:id==='move'?NEW_MOVE:D14_D24_CONTENT.scenes[id];
  if(!target)continue;
  const q=s.story55.scenes?.[id],node=c.nodes.find(n=>n.id===id);
  const thread=s.content.conversations?.[former.node.channel]?.find(x=>x.id===former.node.conversationId);
  for(let i=0;i<former.lines.length;i++){
   const m=thread?.messages.find(m=>m.id===(former.node.messagePrefix||'s55-'+id)+'-'+i);
   if(m&&!player(m)&&m.text===former.lines[i][1]&&target[i]?.[0]===former.lines[i][0])replace(s,thread,m,{who:m.from,text:target[i][1]});
  }
  c.scenes[id]=structuredClone(target);
  if(q?.index&&!s.story55.completed?.[id]){q.index=id==='loan'?q.index:resumeIndex(former.lines,target,q.index);delete q.nextAt;if(node)node.messagePrefix='s55-'+id+'-approved-v2';}
 }
 for(const old of previous.mails){
  const target=c.mails.find(m=>m.id===old.id);
  if(old.id==='code-mail'&&target?.subject===old.subject)Object.assign(target,{subject:CODE_MAIL.subject,body:CODE_MAIL.body,attachmentName:CODE_MAIL.attachmentName});
  const delivered=s.content.mail?.find(m=>m.id===old.id);
  if(delivered&&delivered.subject===old.subject&&delivered.body===old.body&&target){
   const {id,node,...copy}=target;Object.assign(delivered,copy);
  }
 }
 const w=s.story55.wishes;
 if(w){
  const targets=[...extraDay,...Object.values(rewardSets).flat()];
  const oldLines=[...previous.wishBefore.extraDay,...Object.values(previous.wishBefore.rewardSets).flat()];
  for(const old of oldLines){
   const next=targets.find(l=>l.id===old.id),thread=s.content.conversations.wechat.find(c=>c.id===old.chat),m=thread?.messages.find(m=>m.id===old.id);
   if(next&&m&&!player(m)&&m.text===old.text){replace(s,thread,m,{who:m.from,text:next.text,kind:next.kind});if(next.wishText)m.wishText=next.wishText;}
  }
  for(const queued of w.story?.lines||[]){
   const old=oldLines.find(l=>l.id===queued.id),next=targets.find(l=>l.id===queued.id);
   if(old&&next&&queued.text===old.text){queued.text=next.text;if(next.wishText)queued.wishText=next.wishText;if(next.dueClock)queued.dueClock=next.dueClock;}
  }
  if(w.story?.lines)w.story.lines=w.story.lines.filter(l=>l.id!=='wish-tableware-thanks-2'||w.story.delivered?.includes(l.id));
  const table=w.records?.['d07-tableware'];
  if(table?.status==='ordered'&&table.deliveryDay===table.purchasedDay+1){table.deliveryDay=table.purchasedDay+2;for(const l of w.story?.lines||[])if(l.wishRewardId===table.id)l.dueDay=table.deliveryDay;}
 }
 const wallet=s.content.mirage?.wallets?.find(w=>w.id==='s55-d13-wallet-50btc');
 if(wallet)Object.assign(wallet,{controlledBy:'ouroboros',spendable:false});
 s.story55.approvedChatV2=1;return true;
}
import {NEW_RETURN,NEW_MOVE} from '../d10-d13/continuity.js';
import {D14_D24_CONTENT} from '../d14-d24/definition.js';
const CODE_MAIL={subject:'Ouroboros’ Tear — Framework Package',body:'聽說過「Narrenschiff」嗎？這是它的基礎框架「Ouroboros’ Tear」。\n一套能在不同系統之間自行建立通道、繞過常規防護，並在完成操作後抹去痕跡的程序。\n當然，這還不是完整版本。\n別告訴我你連這個都不會用。',attachmentName:'Ouroboros_Tear_package.key'};
