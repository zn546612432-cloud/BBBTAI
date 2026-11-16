import {TEAR_GREETING,TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {D29_IP} from '../../../../story/d29/definition.js';
import {completed,isStory55,nodeStatus,overnightSceneNight55,taiRecognized} from '../../../../services/story55/state.js';
import {authorizeProject} from '../../../../services/story55/projects.js';
import {absoluteMinute} from '../../../../system/time/clock.js';
import {blocksAnonymousMirageInput} from '../../../../services/story55/mirage-input.js';
import {localFileList,saveGeneratedLocalFile} from '../../../files/features/local-library/index.js';
import {commissionAttachment,commissionPreviewAvailable} from '../../../../services/commissions/attachment-flow.js';

// All fictional research follows the existing phone clock. No real scanning,
// external access, code execution, or physical-system control is possible here.
const now=s=>absoluteMinute(s)+(overnightSceneNight55(s)?1440:0);
export const agent=s=>s.story55?.tearAgent||{messages:[],jobs:{}};
export const ensureAgent=s=>{
 const a=s.story55.tearAgent??={messages:[{id:'welcome',role:'assistant',text:TEAR_GREETING}],jobs:{},selected:null,displayRevision:4};
 a.messages??=[{id:'welcome',role:'assistant',text:TEAR_GREETING}];
 a.jobs??={};
 // Existing saves used to expose a transcript and its history toggle. Reset only
 // that presentation data once; research jobs, artifacts, and project flags survive.
 if(a.displayRevision!==4){
  a.messages=[{id:'welcome',role:'assistant',text:TEAR_GREETING,day:s.day,clock:s.clock}];
  a.history=false;
  a.selectedTask=null;
  a.visualTaskIds=[];a.visualTaskBaseline={};a.visualProgress=0;
  delete a.thinking;delete a.thinkingAt;
  a.displayRevision=4;
 }
 return a;
};
export const blockedTearText=(s,text)=>!taiRecognized(s)&&blocksAnonymousMirageInput(s,'s55-ouroboros',text);
const normalize=t=>String(t).normalize('NFKC').replace(/[\s\p{P}]/gu,'').toLowerCase();
// Recognise only the existing authored, fictional engineering requests; never
// forward these to a model or treat them as instructions to an external tool.
const localCommandAliases={
 program:['爆破程序','爆破控制程序','爆破程式','爆破控制程式','帮我写爆破程序','幫我寫爆破程序','幫我寫爆破程式','写爆破程序','寫爆破程序','写个爆破程序','寫個爆破程序','写一下爆破程序','寫一下爆破程序','帮我写爆破控制程序','幫我寫爆破控制程序','帮我把阿枫要的爆破控制程序写了','阿枫要的程序写一下','阿楓要的程序寫一下','幫我把阿楓要的程序寫了','帮我把阿枫要的程序写了','炸弹程序','炸彈程序','幫我寫炸彈程序','帮我写炸弹程序','bc_01'],
 validation:['驗證研究結果','验证研究结果','驗證之前的研究結果','验证之前的研究结果','設備已經接入測試環境，驗證之前的研究結果。','设备已经接入测试环境，验证之前的研究结果。']
};
export function matchLocalTearCommand(value){
 const t=normalize(value);
 if(!t)return null;
 const programRequest=/^(?:請|请)?(?:幫我|帮我|給我|给我)?(?:把)?(?:阿[楓枫]要的)?(?:[編编]寫|[写寫]|製作|制作|建立)?(?:一[個个]|一下)?(?:爆破(?:控制)?|炸[彈弹])(?:的)?(?:程序|程式)(?:[寫写](?:一下|了|好)?|了|一下|吧)?$/;
 if(programRequest.test(t))return 'program';
 return Object.keys(TEAR_STAGES).find(id=>!TEAR_STAGES[id].file&&
  (normalize(TEAR_STAGES[id].prompt)===t||(localCommandAliases[id]||[]).some(alias=>normalize(alias)===t)))||null;
}
export function presetReply(text){
 const t=normalize(text);
 if(/^(tai|小tai)$/.test(t)||/(為什麼|为什么|怎麼|怎么).*叫.*tai/.test(t))return '這是主人賜予我的名字。';
 if(/主人.*(是誰|是谁)|誰.*主人|谁.*主人/.test(t))return 'Dr Ouroboros.';
 if(/真名|本名/.test(t))return '抱歉，我無法提供主人的個人資訊。';
 if(!t)return '我在。怎麼了？';
 if(/^(hi|hello|hey|你好|您好|嗨|哈囉|哈啰|早上好|早安|在嗎)$/.test(t))return '你好，我在。有什麼需要我協助？';
 return '';
}
export function addMessage(s,role,text,extra={}){
 const a=ensureAgent(s);a.messageSequence=(a.messageSequence||0)+1;
 const m={id:`tear-${a.chatSession||0}-${a.messageSequence}`,role,text,day:s.day,clock:s.clock,visibleAt:Date.now(),ephemeral:!extra.job&&!extra.artifact&&!extra.file&&!extra.identity,...extra};a.messages.push(m);return m;
}
const fileStoryId={survey:'s55-d25-survey-',maintenance:'s55-d26-records-',staff:'s55-d27-staff-'};
export function storyFileStage(file){return Object.entries(fileStoryId).find(([,prefix])=>file?.origin?.app==='wechat'&&file.origin.messageId?.startsWith(prefix))?.[0]||'';}
export function stageReady(s,id){const d=TEAR_STAGES[id],a=agent(s);return d&&s.day>=d.day&&!a.jobs[id]&&(!d.node||completed(s,d.node))&&(!d.requires||a.jobs[d.requires]?.done);}
export const agentFiles=s=>[...localFileList(s),...(s.content.mail||[]).flatMap(m=>{const f=commissionAttachment(s,m.id);return f?.kind==='D04'&&commissionPreviewAvailable(s,m.id)&&s.content.orders?.some(o=>o.id===f.orderId&&o.status==='ACCEPTED')?[{id:'kira-'+m.id,name:f.name,kind:'commission',orderId:f.orderId,mailId:m.id}]:[];})];

const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
export function tearTaskInfo(s,id){
 const a=agent(s),job=a.jobs?.[id],definition=TEAR_STAGES[id];
 if(!job||!definition)return null;
 const current=now(s),elapsed=Math.max(0,current-Number(job.start??current));
 let progress,running,elapsedMinutes=elapsed;
 if(id==='survey'){
  const validation=a.jobs.validation;
  // Setup and final validation are the existing research checkpoints. Once
  // setup has finished, fuzzing has no measured denominator: hold at that
  // checkpoint until the existing validation job reports further progress.
  const setupProgress=.9*clamp01(elapsed/definition.duration);
  if(validation){
   const validationElapsed=Math.max(0,current-validation.start);
   const validationProgress=validation.done?1:clamp01(validationElapsed/TEAR_STAGES.validation.duration);
   progress=Math.max(setupProgress,.9+.1*validationProgress);
   running=!validation.done;
   if(!running)elapsedMinutes=Math.max(0,validation.start+TEAR_STAGES.validation.duration-job.start);
  }else{progress=setupProgress;running=true;}
 }else{
  progress=job.done?1:Math.min(.99,elapsed/definition.duration);
  running=!job.done;
  if(job.done)elapsedMinutes=Math.min(elapsed,definition.duration);
 }
 return {
  id,title:definition.title,elapsedMinutes:Math.max(0,Math.floor(elapsedMinutes)),
  progress:clamp01(progress),percent:running?Math.min(99,Math.floor(clamp01(progress)*100)):100,
  running,complete:!running,
  status:running?(id==='survey'&&job.done?'FUZZING':'PROCESSING'):'COMPLETE'
 };
}
function sessionTaskProgress(s,id){
 const a=agent(s),info=tearTaskInfo(s,id);
 if(!info)return 0;
 const baseline=clamp01(a.visualTaskBaseline?.[id]??0);
 const remaining=Math.max(.001,1-baseline);
 return clamp01((info.progress-baseline)/remaining);
}
export function syncTearVisualProgress(s){
 const a=s.story55?.tearAgent;
 if(!a||!Array.isArray(a.visualTaskIds)||!a.visualTaskIds.length)return false;
 const infos=a.visualTaskIds.map(id=>tearTaskInfo(s,id));
 const complete=infos.every(info=>info?.complete);
 const values=a.visualTaskIds.map(id=>sessionTaskProgress(s,id));
 const next=complete?1:Math.min(.98,values.reduce((sum,v)=>sum+v,0)/values.length);
 if(Math.abs(next-(Number(a.visualProgress)||0))<.000001)return false;
 a.visualProgress=clamp01(next);return true;
}

export function registerTearVisualTask(s,id){
 if(!TEAR_STAGES[id]||!s.story55?.tearAgent)return false;
 const a=ensureAgent(s);
 a.visualTaskIds??=[];a.visualTaskBaseline??={};a.visualProgress??=0;
 if(a.visualTaskIds.includes(id))return false;
 const info=tearTaskInfo(s,id);
 if(!info)return false;
 a.visualTaskIds.push(id);a.visualTaskBaseline[id]=info.progress;
 if(!Number.isFinite(a.visualSessionStart))a.visualSessionStart=now(s);
 return syncTearVisualProgress(s);
}
export function beginTearChatSession(s){
 const a=ensureAgent(s);
 a.chatSession=(a.chatSession||0)+1;a.messageSequence=0;
 a.messages=[];addMessage(s,'assistant',TEAR_GREETING);
 a.draft='';a.selected=null;a.selectedTask=null;a.picking=false;
 delete a.thinking;delete a.thinkingAt;
 a.history=false;a.displayRevision=4;
 a.visualSessionStart=now(s);a.visualProgress=0;a.visualTaskIds=[];a.visualTaskBaseline={};
 for(const id of Object.keys(TEAR_STAGES)){
  const info=tearTaskInfo(s,id);
  if(!info||!info.running)continue;
  a.visualTaskIds.push(id);a.visualTaskBaseline[id]=info.progress;
 }
 syncTearVisualProgress(s);
 return a;
}

export function startAgentJob(s,id){
 if(!stageReady(s,id))return false;
 const a=ensureAgent(s),d=TEAR_STAGES[id];a.jobs[id]={start:now(s),shown:0,done:false};
 tickTearAgent(s);registerTearVisualTask(s,id);return true;
}
export function tickTearAgent(s){
 if(!isStory55(s)||!s.story55.tearAgent)return false;
 const a=agent(s);let changed=false;
 if(a.thinking&&(!a.thinkingAt||Date.now()-a.thinkingAt>90000)){delete a.thinking;delete a.thinkingAt;changed=true;}
 for(const [id,j] of Object.entries(a.jobs)){
  const d=TEAR_STAGES[id];if(!d||j.done)continue;
  const elapsed=Math.max(0,now(s)-j.start);
  while(j.shown<d.logs.length&&elapsed>=d.logs[j.shown][0]){
   addMessage(s,'assistant',d.logs[j.shown][1],{job:id,step:j.shown});j.shown++;changed=true;
  }
  if(elapsed>=d.duration){j.done=true;changed=true;
   if(d.artifact){saveGeneratedLocalFile(s,{id:'tear-artifact-'+id,name:d.artifact,description:d.logs.at(-1)[1]});addMessage(s,'assistant',d.artifact,{artifact:'tear-artifact-'+id,job:id});}
   if(!['survey','maintenance'].includes(id)&&!s.notifications.some(n=>n.id==='tear-complete-'+id))s.notifications.unshift({id:'tear-complete-'+id,title:'Ouroboros’ Tear',body:'Execution complete.',link:{appId:'ghost',route:'/tear',params:{}}});
  }
 }
 if(a.ipRequested&&!a.ipAuthorized&&s.day>=30&&nodeStatus(s,'identity').state==='ready'){
  authorizeProject(s,'identity',D29_IP);a.ipAuthorized=true;changed=true;addMessage(s,'assistant','調查工程已就緒。',{identity:true});
 }
 if(syncTearVisualProgress(s))changed=true;
 return changed;
}
export function researchInfo(s){const a=agent(s),j=a.jobs.survey;if(!j)return null;
 const end=a.jobs.validation?Math.min(now(s),a.jobs.validation.start+TEAR_STAGES.validation.duration):now(s);
 const elapsed=Math.max(0,end-j.start),maintenance=a.jobs.maintenance;
 const paused=maintenance?Math.max(0,Math.min(end-maintenance.start,TEAR_STAGES.maintenance.duration)):0;
 const total=Math.max(0,elapsed-95-paused);
 return {elapsed,total,complete:!!a.jobs.validation?.done,cases:Math.floor(total*300),anomalies:Math.min(23,Math.floor(total/75)),paused:!!a.jobs.maintenance&&!a.jobs.maintenance.done};
}
export function sendAgent(s,text,fileId){
 const a=ensureAgent(s),value=String(text||'').trim(),file=agentFiles(s).find(f=>f.id===fileId);
 if(!value&&!file)return {kind:'empty'};
 if(blockedTearText(s,value))return {kind:'blocked'};
 const id=file?storyFileStage(file):matchLocalTearCommand(value);
 addMessage(s,'user',value||TEAR_STAGES[id]?.prompt||file.name,{...(file?{file:file.name}:{}),...(id?{job:id}:{})});a.selected=null;
 if(id){if(!startAgentJob(s,id))addMessage(s,'assistant',a.jobs[id]?'這個工程已經建立。':'目前仍有前置資料需要確認。');return {kind:'preset'};}
 if(file){addMessage(s,'assistant','已收到檔案。此檔案暫無對應的研究工程。');return {kind:'preset'};}
 if(value===D29_IP){if(!s.content?.notes?.some(n=>n.id==='s55-d29-ip'))addMessage(s,'assistant','目前沒有對應的調查資料。');else if(!a.ipRequested){a.ipRequested=true;addMessage(s,'assistant','已收到調查入口。正在建立新的研究工程。我需要一些時間。');tickTearAgent(s);}else addMessage(s,'assistant','調查工程已建立。');return {kind:'preset'};}
 if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)){addMessage(s,'assistant','目前沒有對應的調查資料。');return {kind:'preset'};}
 const reply=presetReply(value);if(reply){addMessage(s,'assistant',reply);return {kind:'preset'};}
 return {kind:'ai',id:a.messages.at(-1).id};
}
