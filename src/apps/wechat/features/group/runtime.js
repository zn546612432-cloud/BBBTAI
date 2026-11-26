import {appendAuthoredPhoneMessage} from '../../../../services/messaging/phone-messages.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {nativeWeChatComposer} from '../../../../services/messaging/preset-replies.js';
import {dateParts} from '../../../../services/calendar.js';
import {GROUP_ID,FATHER_ID,BROTHERS,PRIVATE_IDS,ACTOR_IDS,groupThread,groupState,editGroupState,chatSettings,editChatSettings,groupEggsOpen,groupAway,fatherPresent,fatherUsed,groupName,gameMinute} from './state.js';
import {FATHER_PRIVATE,FATHER_AFTER,NAME_LINES,NOTICE_LINES,NICK_LINES,LEAVE_LINES,RETURN_LINES,PAT_LINES} from './lines.js';
const choose=(a,r)=>a[Math.floor(r()*a.length)];
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const uniqueId=s=>'wx-egg-'+(++editGroupState(s).sequence);
const plotMessages=s=>visibleMessages(groupThread(s),s).filter(m=>!m.wechatEgg).map(m=>m.id);
export function groupPlotBusy(s){
 if(!groupThread(s))return true;
 const q=nativeWeChatComposer(s,GROUP_ID);
 return q.text!==null||q.disabled||!!s.story55?.activeScene;
}
export const canGroupEgg=s=>groupEggsOpen(s)&&!!groupThread(s)&&!groupAway(s)&&!fatherPresent(s)&&!groupPlotBusy(s);
function ensureDM(s,by){
 const list=s.content.conversations.wechat,id=PRIVATE_IDS[by];
 if(!list.some(c=>c.id===id))list.push({id,name:by,avatar:by.slice(0,1),messages:[],unread:0});
 return id;
}
function write(s,by,text,{id=uniqueId(s),conversationId=GROUP_ID,kind='text',notify=true}={}){
 const from=by==='傅隆生'?FATHER_ID:ACTOR_IDS[by]||by;
 return appendAuthoredPhoneMessage(s,{channel:'wechat',conversationId,messageId:id,from,text,kind,storyTag:'wechatEgg',sentDate:dateParts(s).iso,notify});
}
function system(s,text,options={}){return write(s,'system',text,{kind:'system',notify:false,...options});}
function queue(s,by,text,due,{conversationId=GROUP_ID,kind='text',family='',revision=0}={}){
 const g=editGroupState(s);g.jobs.push({id:uniqueId(s),by,text,due,conversationId,kind,family,revision});
}
export function inviteFather(s,{now=Date.now()}={}){
 if(!canGroupEgg(s)||fatherUsed(s))return false;
 const g=editGroupState(s);
 g.father={used:true,stage:'present',exitAt:now+30000};
 system(s,'你邀請傅隆生加入了群聊');
 FATHER_PRIVATE.forEach(([by,text],i)=>queue(s,by,text,now+2000+i*3000,{conversationId:ensureDM(s,by),family:'father-private'}));
 return true;
}
function fatherExit(s,now){
 const g=editGroupState(s);if(g.father?.stage!=='present')return;
 write(s,'傅隆生','🙂');system(s,'傅隆生退出了群聊');
 g.father.stage='done';
 if(groupEggsOpen(s))FATHER_AFTER.forEach(([by,text],i)=>queue(s,by,text,now+1500+i*2400,{family:'father-after'}));
}
export function leaveGroup(s,{now=Date.now(),random=Math.random}={}){
 if(!canGroupEgg(s))return false;
 const g=editGroupState(s);g.leaveCount=(g.leaveCount||0)+1;
 g.leave={by:choose(BROTHERS,random),stage:'waiting',dueMinute:gameMinute(s)+2+Math.floor(random()*49),baseline:plotMessages(s),returnDelay:3000+Math.floor(random()*2001),returnLine:random()<.5};
 system(s,'你退出了群聊');return true;
}
function returnGroup(s,now,{plot=false}={}){
 const g=editGroupState(s),q=g.leave;if(!q)return;
 delete g.leave;
 // The invitation should surface the existing group even if no optional
 // follow-up is selected. It is not a story task or mandatory player reply.
 write(s,q.by,q.by+'邀請你加入了群聊',{kind:'system',notify:true});
 if(q.returnLine&&!plot)queue(s,q.by,RETURN_LINES[q.by],now+1800,{family:'return'});
}
function forcedReturn(s){
 const q=groupState(s).leave;
 return !!q&&(!groupEggsOpen(s)||groupPlotBusy(s)||plotMessages(s).some(id=>!q.baseline.includes(id)));
}
export function changeGroupField(s,field,value,{now=Date.now()}={}){
 const c=groupThread(s);if(!c||groupAway(s))return false;
 const setting=editChatSettings(s,GROUP_ID);
 value=String(value??'').trim().slice(0,field==='notice'?500:60);
 if(!['name','notice','nickname','remark'].includes(field)||field==='name'&&!value)return false;
 const old=field==='name'?groupName(s,c):setting[field]||'';
 if(old===value)return false;
 setting[field]=value;
 if(field==='remark')return true;
 if(field==='name')system(s,'你修改群名為「'+value+'」');
 if(field==='notice')system(s,value?'你發布了群公告：'+value:'你清除了群公告');
 if(field==='nickname')system(s,'你修改了本群暱稱為「'+(value||'熙蒙')+'」');
 if(!groupEggsOpen(s)||!value)return true;
 const g=editGroupState(s),previous=g.classifications[field],revision=(g.revisions??={});
 revision[field]=(revision[field]||0)+1;
 g.jobs=g.jobs.filter(j=>j.family!==field);
 const at=Math.max(now,field==='name'?(g.lastNameClassification||0)+60000:now);
 g.classifications[field]={id:uniqueId(s),field,value,revision:revision[field],due:at,createdAt:now,restore:field==='name'&&/^狼崽[團团]$/.test(value)};
 return true;
}
export const pendingClassification=(s,now=Date.now())=>groupEggsOpen(s)&&!groupAway(s)&&!fatherPresent(s)&&!groupPlotBusy(s)?Object.values(groupState(s).classifications||{}).find(q=>q.due<=now):null;
export function completeClassification(s,id,result,{now=Date.now(),random=Math.random}={}){
 const g=editGroupState(s),q=Object.values(g.classifications).find(x=>x.id===id);
 if(!q||!groupEggsOpen(s)||groupAway(s))return false;
 delete g.classifications[q.field];
 if(q.field==='name')g.lastNameClassification=now;
 let rows=[];
 if(q.field==='name'){
  const type=q.restore?'restore':Object.hasOwn(NAME_LINES,result?.type)?result.type:'generic';
  if(type==='tease'&&BROTHERS.includes(result?.target)){
   rows=[[result.target,choose(NAME_LINES.tease.filter(x=>x[0]==='target'),random)[1]],[choose(BROTHERS.filter(x=>x!==result.target),random),'我覺得挺合適的']];
  }else{
   const source=NAME_LINES[type==='tease'?'generic':type];
   const count=Math.min(source.length,2+Math.floor(random()*4));
   rows=shuffle(source,random).slice(0,count);
  }
  rows=rows.map(([by,text])=>[by,text.replace('{群名}',q.value)]);
 }else if(q.field==='notice'){
  const source=NOTICE_LINES[result?.type==='food'?'food':'command'];
  rows=shuffle(source,random).slice(0,2+Math.floor(random()*2));
 }else if(q.field==='nickname'){
  if(random()<.7)rows=shuffle(NICK_LINES,random).slice(0,1+Math.floor(random()*2));
 }
 rows.forEach(([by,text],i)=>queue(s,by,text,now+2000+i*2600,{family:q.field,revision:q.revision}));
 return true;
}
export function patBrother(s,by,{now=Date.now(),random=Math.random}={}){
 if(!canGroupEgg(s)||!BROTHERS.includes(by))return false;
 const g=editGroupState(s);if(now<(g.nextPatAt||0))return false;g.nextPatAt=now+5000;
 system(s,'你拍了拍「'+by+'」');
 // One approved response, an actual pat-back, or silence.
 const line=choose([...PAT_LINES[by],null],random);
 if(line)queue(s,by,line==='@pat'?by+'拍了拍「熙蒙」':line,now+2000+Math.floor(random()*2001),{kind:line==='@pat'?'system':'text',family:'pat'});
 return true;
}
export function groupEggsDue(s,now=Date.now()){
 const g=groupState(s),q=g.leave;
 if(!s.wechatGroupEggs)return false;
 if(g.father?.stage==='present'&&(!groupEggsOpen(s)||now>=g.father.exitAt))return true;
 if(q&&(forcedReturn(s)||q.stage==='waiting'&&gameMinute(s)>=q.dueMinute||q.stage==='returning'&&now>=q.returnAt))return true;
 if(!groupEggsOpen(s))return !!(g.jobs?.length||Object.keys(g.classifications||{}).length);
 return (g.jobs||[]).some(j=>j.due<=now&&(j.family==='father-private'||j.family==='leave-private'||!groupAway(s)&&!fatherPresent(s)&&!groupPlotBusy(s)));
}
export function tickGroupEggs(s,now=Date.now()){
 if(!s.wechatGroupEggs)return false;
 const g=editGroupState(s);let changed=false;
 if(g.father?.stage==='present'&&(!groupEggsOpen(s)||now>=g.father.exitAt)){fatherExit(s,now);changed=true;}
 if(g.leave&&forcedReturn(s)){returnGroup(s,now,{plot:true});changed=true;}
 const q=g.leave;
 if(q?.stage==='waiting'&&gameMinute(s)>=q.dueMinute){
  const lines=LEAVE_LINES[q.by][g.leaveCount===1?0:1],cid=ensureDM(s,q.by);
  write(s,q.by,lines[0],{conversationId:cid});
  if(lines.length>1)queue(s,q.by,lines[1],now+1600,{conversationId:cid,family:'leave-private'});
  q.stage='returning';q.returnAt=now+Math.max(q.returnDelay,lines.length>1?4600:3000);changed=true;
 }
 if(g.leave?.stage==='returning'&&now>=g.leave.returnAt){returnGroup(s,now);changed=true;}
 if(!groupEggsOpen(s)){
  if(g.jobs.length||Object.keys(g.classifications).length){g.jobs=[];g.classifications={};changed=true;}
  return changed;
 }
 const allowed=j=>j.family==='father-private'||j.family==='leave-private'||(!groupAway(s)&&!fatherPresent(s)&&!groupPlotBusy(s));
 const due=g.jobs.filter(j=>j.due<=now&&allowed(j)).sort((a,b)=>a.due-b.due);
 // Restore only one due bubble per tick to avoid a burst after a background reload.
 const j=due[0];
 if(j){g.jobs=g.jobs.filter(x=>x.id!==j.id);if(!j.revision||g.revisions?.[j.family]===j.revision)
  write(s,j.by,j.text,{id:j.id,conversationId:j.conversationId,kind:j.kind,notify:j.kind!=='system'});changed=true;}
 return changed;
}
