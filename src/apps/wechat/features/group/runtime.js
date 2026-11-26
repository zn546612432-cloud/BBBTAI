import {appendAuthoredPhoneMessage} from '../../../../services/messaging/phone-messages.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {hiddenGroupMessageIds} from './history.js';
import {nativeWeChatComposer} from '../../../../services/messaging/preset-replies.js';
import {AUTHORED_CHAT_TRACKS} from '../../../../services/messaging/lifecycle/registry.js';
import {currentScript55} from '../../../../services/story55/scripted-chat.js';
import {dateParts} from '../../../../services/calendar.js';
import {GROUP_ID,FATHER_ID,BROTHERS,PRIVATE_IDS,ACTOR_IDS,groupThread,groupState,editGroupState,chatSettings,editChatSettings,groupEggsOpen,groupAway,fatherPresent,fatherUsed,groupName,gameMinute} from './state.js';
import {FATHER_PRIVATE,FATHER_AFTER,NAME_LINES,NOTICE_LINES,NICK_LINES,LEAVE_LINES,RETURN_LINES,PAT_LINES} from './lines.js';
import {FATHER_NOTICE_TYPE,directFatherNotice,fatherNoticePhase,FATHER_NOTICE_LINES,FATHER_NOTICE_COMBO} from './father-notice.js';
const choose=(a,r)=>a[Math.floor(r()*a.length)];
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const uniqueId=s=>'wx-egg-'+(++editGroupState(s).sequence);
const plotMessages=s=>visibleMessages(groupThread(s),s).filter(m=>!m.wechatEgg).map(m=>m.id);
export function groupPlotBusy(s){
 if(!groupThread(s))return true;
 const q=nativeWeChatComposer(s,GROUP_ID);
 return q.text!==null||!!currentScript55(s,'wechat',GROUP_ID)||AUTHORED_CHAT_TRACKS.some(({track})=>track.busy?.(s,GROUP_ID))||!!s.story55?.activeScene;
}
const fatherPending=s=>groupState(s).father?.stage==='classifying';
const idleGroup=s=>groupEggsOpen(s)&&!!groupThread(s)&&!groupAway(s)&&!fatherPresent(s)&&!groupPlotBusy(s);
export const canGroupEgg=s=>idleGroup(s)&&!fatherPending(s);
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
// Notice classification is revision-bound; stale responses cannot revive a deleted notice.
function currentNoticeType(s){
 const value=chatSettings(s,GROUP_ID).notice||'',g=groupState(s);
 if(!value)return '';
 if(directFatherNotice(value))return FATHER_NOTICE_TYPE;
 return g.noticeClassification?.value===value&&g.noticeClassification.revision===(g.revisions?.notice||0)?g.noticeClassification.type:null;
}
function startFather(s,now,type){
 const g=editGroupState(s),combo=type===FATHER_NOTICE_TYPE,phase=fatherNoticePhase(s);
 const value=chatSettings(s,GROUP_ID).notice||'';
 if(combo){
  g.jobs=g.jobs.filter(j=>j.family!=='notice');
  delete g.classifications.notice;
 }
 g.father={used:true,stage:'present',exitAt:now+30000,...(combo?{combo:phase,noticeValue:value,noticeRevision:g.revisions?.notice||0}:{})};
 system(s,'你邀請傅隆生加入了群聊');
 const rows=combo?FATHER_NOTICE_COMBO[phase].private:FATHER_PRIVATE;
 rows.forEach(([by,text],i)=>queue(s,by,text,now+2000+i*3000,{conversationId:ensureDM(s,by),family:'father-private'}));
}
function advancePendingFather(s,now){
 if(!fatherPending(s)||!idleGroup(s))return false;
 const type=currentNoticeType(s);if(type===null)return false;
 startFather(s,now,type);return true;
}
export function inviteFather(s,{now=Date.now()}={}){
 if(!canGroupEgg(s)||fatherUsed(s))return false;
 const g=editGroupState(s),type=currentNoticeType(s);
 if(type!==null){startFather(s,now,type);return true;}
 // Unknown wording: reserve the single invitation, classify this exact announcement first.
 g.father={used:true,stage:'classifying'};
 const value=chatSettings(s,GROUP_ID).notice||'',revision=g.revisions?.notice||0;
 if(!g.classifications.notice||g.classifications.notice.value!==value||g.classifications.notice.revision!==revision)
  g.classifications.notice={id:uniqueId(s),field:'notice',value,revision,due:now,createdAt:now,inviteOnly:true};
 else g.classifications.notice.due=now;
 return true;
}
function fatherExit(s,now){
 const g=editGroupState(s);if(g.father?.stage!=='present')return;
 // After a suspended tab resumes past 30s, finish already-due private messages before the smile, without replaying any of them.
 if(groupEggsOpen(s)){
  const pending=g.jobs.filter(j=>j.family==='father-private'&&j.due<=now&&(!g.father.combo||!groupPlotBusy(s))).sort((a,b)=>a.due-b.due);
  for(const j of pending)write(s,j.by,j.text,{id:j.id,conversationId:j.conversationId});
  g.jobs=g.jobs.filter(j=>j.family!=='father-private');
 }
 write(s,'傅隆生','🙂');system(s,'傅隆生退出了群聊');
 g.father.stage='done';
 if(groupEggsOpen(s)){
  const rows=g.father.combo?FATHER_NOTICE_COMBO[g.father.combo].after:FATHER_AFTER;
  rows.forEach(([by,text],i)=>queue(s,by,text,now+1500+i*2400,{family:'father-after'}));
  if(g.father.combo)queue(s,'熙旺','熙旺清除了群公告',now+1500+rows.length*2400,{kind:'system',family:'father-clear'});
 }
}
export function leaveGroup(s,{now=Date.now(),random=Math.random}={}){
 if(!canGroupEgg(s))return false;
 const g=editGroupState(s);g.leaveCount=(g.leaveCount||0)+1;
 g.hiddenMessageIds=[...new Set([...hiddenGroupMessageIds(s,groupThread(s)),...visibleMessages(groupThread(s),s).map(m=>m.id)])];
 g.leave={by:choose(BROTHERS,random),stage:'waiting',dueMinute:gameMinute(s)+2+Math.floor(random()*49),baseline:plotMessages(s),returnDelay:3000+Math.floor(random()*2001),returnLine:random()<.5};
 system(s,'你退出了群聊');return true;
}
function returnGroup(s,now,{plot=false}={}){
 const g=editGroupState(s),q=g.leave;if(!q)return;
 const hidden=hiddenGroupMessageIds(s,groupThread(s));
 // A plot-triggered early rejoin must retain the new story messages that brought the player back.
 for(const m of visibleMessages(groupThread(s),s))if(!plot||m.wechatEgg||q.baseline.includes(m.id))hidden.add(m.id);
 g.hiddenMessageIds=[...hidden];
 delete g.leave;
 if(plot)g.jobs=g.jobs.filter(j=>j.family!=='leave-private');
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
 const g=editGroupState(s),revision=(g.revisions??={});
 revision[field]=(revision[field]||0)+1;
 g.jobs=g.jobs.filter(j=>j.family!==field);
 delete g.classifications[field];
 if(field==='notice')delete g.noticeClassification;
 if(!groupEggsOpen(s)||!value){if(field==='notice')advancePendingFather(s,now);return true;}
 const at=Math.max(now,field==='name'?(g.lastNameClassification||0)+60000:now);
 g.classifications[field]={id:uniqueId(s),field,value,revision:revision[field],due:at,createdAt:now,restore:field==='name'&&/^狼崽[團团]$/.test(value)};
 if(field==='notice'&&directFatherNotice(value))completeClassification(s,g.classifications[field].id,{type:FATHER_NOTICE_TYPE},{now});
 return true;
}
export const pendingClassification=(s,now=Date.now())=>idleGroup(s)?(fatherPending(s)?[groupState(s).classifications?.notice].find(q=>q&&q.due<=now):Object.values(groupState(s).classifications||{}).find(q=>q.due<=now)):null;
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
  if(q.value!==(chatSettings(s,GROUP_ID).notice||'')||q.revision!==(g.revisions?.notice||0))return false;
  const type=directFatherNotice(q.value)||result?.type===FATHER_NOTICE_TYPE?FATHER_NOTICE_TYPE:result?.type||'generic';
  g.noticeClassification={value:q.value,revision:q.revision,type};
  if(fatherPending(s)){advancePendingFather(s,now);return true;}
  if(q.inviteOnly)return true;
  if(type===FATHER_NOTICE_TYPE){
   const phase=fatherNoticePhase(s);g.noticePhases??={};
   if(g.noticePhases[phase])return true;
   g.noticePhases[phase]=true;rows=FATHER_NOTICE_LINES[phase];
  }else{
   const source=NOTICE_LINES[type==='food'?'food':'command'];
   rows=shuffle(source,random).slice(0,2+Math.floor(random()*2));
  }
 }else if(q.field==='nickname'){
  if(random()<.7){
   const preferred=result?.type==='vanity'||result?.type==='abstract'?['小辛','胡枫']:result?.type==='warm'?['仔仔','熙旺']:BROTHERS;
   const choices=NICK_LINES.filter(([by])=>preferred.includes(by));
   rows=shuffle(choices.length?choices:NICK_LINES,random).slice(0,1+Math.floor(random()*2));
  }
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
 if(fatherPending(s)&&(!groupEggsOpen(s)||idleGroup(s)&&currentNoticeType(s)!==null))return true;
 if(g.father?.stage==='present'&&(!groupEggsOpen(s)||now>=g.father.exitAt))return true;
 if(q&&(forcedReturn(s)||q.stage==='waiting'&&gameMinute(s)>=q.dueMinute||q.stage==='returning'&&now>=q.returnAt))return true;
 if(!groupEggsOpen(s))return !!(g.jobs?.length||Object.keys(g.classifications||{}).length);
 return (g.jobs||[]).some(j=>j.due<=now&&(j.family==='father-private'?(!g.father?.combo||!groupPlotBusy(s)):j.family==='leave-private'||!groupAway(s)&&!fatherPresent(s)&&!fatherPending(s)&&!groupPlotBusy(s)));
}
export function tickGroupEggs(s,now=Date.now()){
 if(!s.wechatGroupEggs)return false;
 const g=editGroupState(s);let changed=false;
 if(fatherPending(s)){
  if(!groupEggsOpen(s)){delete g.father;changed=true;}
  else if(advancePendingFather(s,now))changed=true;
 }
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
 const allowed=j=>j.family==='father-private'?(!g.father?.combo||!groupPlotBusy(s)):j.family==='leave-private'||(!groupAway(s)&&!fatherPresent(s)&&!fatherPending(s)&&!groupPlotBusy(s));
 const due=g.jobs.filter(j=>j.due<=now&&allowed(j)).sort((a,b)=>a.due-b.due);
 // Restore only one due bubble per tick to avoid a burst after a background reload.
 const j=due[0];
 if(j){
  g.jobs=g.jobs.filter(x=>x.id!==j.id);
  if(j.family==='father-clear'){
   // Never erase a new announcement that the player published while this egg was running.
   if(g.father?.combo&&chatSettings(s,GROUP_ID).notice===g.father.noticeValue&&(g.revisions?.notice||0)===g.father.noticeRevision){
    editChatSettings(s,GROUP_ID).notice='';(g.revisions??={}).notice=(g.revisions?.notice||0)+1;
    delete g.noticeClassification;delete g.classifications.notice;g.jobs=g.jobs.filter(x=>x.family!=='notice');
    system(s,j.text,{id:j.id});
   }
  }else if(!j.revision||g.revisions?.[j.family]===j.revision)
   write(s,j.by,j.text,{id:j.id,conversationId:j.conversationId,kind:j.kind,notify:j.kind!=='system'});
  changed=true;
 }
 return changed;
}
