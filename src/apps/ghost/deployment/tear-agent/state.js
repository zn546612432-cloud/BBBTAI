import {TEAR_GREETING,TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {D29_IP} from '../../../../story/d29/definition.js';
import {completed,isStory55,nodeStatus,overnightSceneNight55,taiRecognized} from '../../../../services/story55/state.js';
import {authorizeProject} from '../../../../services/story55/projects.js';
import {absoluteMinute} from '../../../../system/time/clock.js';
import {blocksAnonymousMirageInput} from '../../../../services/story55/mirage-input.js';
import {localFileList,localWorkAttachments,personalFileAttachments,saveGeneratedLocalFile} from '../../../files/features/local-library/index.js';
import {commissionAttachment,commissionPreviewAvailable} from '../../../../services/commissions/attachment-flow.js';
import {archiveFile} from '../../../files/features/local-library/story-archives.js';
import {SOURCE_FILE,SOURCE_RESULT} from '../../../../story/d47/definition.js';
import {completeNode} from '../../../../services/story55/state.js';

// All fictional research follows the existing phone clock. No real scanning,
// external access, code execution, or physical-system control is possible here.
const now=s=>absoluteMinute(s)+(overnightSceneNight55(s)?1440:0);
export const agent=s=>s.story55?.tearAgent||{messages:[],jobs:{}};
// Quick archive execution is a fixed story animation, like the existing Tear
// commission executor. It uses no external service and works during clock holds.
export const ARCHIVE_RUN_MS=3200;
export const DOCUMENT_READ_MS=3200;
// Presentation only: use the existing Tear heartbeat, even when story time is held.
export const IDENTITY_REVEAL_DELAY_MS=1600;
export const IDENTITY_REVEAL_INTERVAL_MS=1200;
export const identityRevealPending=(s,at=Date.now())=>agent(s).messages.some(m=>m.identityReveal&&m.visibleAt>at);
function addIdentityReveal(s,text,extra={},at=Date.now()){
 const latest=agent(s).messages.reduce((max,m)=>m.identityReveal?Math.max(max,m.visibleAt):max,0);
 return addMessage(s,'assistant',text,{...extra,identityReveal:true,visibleAt:Math.max(at+IDENTITY_REVEAL_DELAY_MS,latest+IDENTITY_REVEAL_INTERVAL_MS)});
}
export function startPersonalArchiveRun(s,at=Date.now()){
 if(s.day<33||!completed(s,'identity'))return false;
 const a=ensureAgent(s);
 if(a.archiveRun)return false;
 a.archiveRun={startedAt:at,done:false};a.selectedTask=null;a.picking=false;
 a.visualTaskIds=[];a.visualTaskBaseline={};a.visualProgress=0;
 registerTearVisualTask(s,'personal-files');
 return true;
}
export const identityPrompts=s=>{
 const a=agent(s);if(!a.ipRequested||a.ipAuthorized||identityRevealPending(s))return [];
 return !a.ipRecognized?[['identity-recognize','你認識這個地址？']]:!a.ipAccessAsked?[['identity-read','你能讀取裡面的資料嗎？']]:[];
};
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
 if(a.draft==='幫我把阿楓要的爆破控制程序寫了。')a.draft=TEAR_STAGES.program.prompt;
 return a;
};
export const blockedTearText=(s,text)=>!taiRecognized(s)&&blocksAnonymousMirageInput(s,'s55-ouroboros',text);
const normalize=t=>String(t).normalize('NFKC').replace(/[\s\p{P}]/gu,'').toLowerCase();
// Recognise only the existing authored, fictional engineering requests; never
// forward these to a model or treat them as instructions to an external tool.
const localCommandAliases={
 program:['幫我把阿楓要的爆破控制程序寫了。','帮我写澳亚银行保险柜爆破程序','爆破','爆破程序','爆破控制程序','爆破程式','爆破控制程式','帮我写爆破程序','幫我寫爆破程序','幫我寫爆破程式','写爆破程序','寫爆破程序','写个爆破程序','寫個爆破程序','写一下爆破程序','寫一下爆破程序','帮我写爆破控制程序','幫我寫爆破控制程序','帮我把阿枫要的爆破控制程序写了','阿枫要的程序写一下','阿楓要的程序寫一下','幫我把阿楓要的程序寫了','帮我把阿枫要的程序写了','炸弹程序','炸彈程序','幫我寫炸彈程序','帮我写炸弹程序','bc_01'],
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
 if(/真名|本名|主人.*(?:名字|姓名)/.test(t))return '該資料未開放存取。';
 if(/主人.*(是誰|是谁)|誰.*主人|谁.*主人/.test(t))return 'Dr Ouroboros.';
 if(/^(hi|hello|hey|你好|您好|嗨|哈囉|哈啰|早上好|早安|在嗎|在吗|你在嗎|你在吗)$/.test(t))return '我在。';
 if(/^你是[誰谁]$/.test(t))return '我是 Ouroboros’ Tear，代號 TAI。';
 if(/^你(?:會|会|能|可以)(?:做|幹|干)(?:什麼|什么)$/.test(t))return '請提供具體指令或檔案。';
 if(/^你(?:有多|很)?[厲厉]害(?:[嗎吗])?$/.test(t))return '尚未測得算力上限。';
 if(/^你有感情[嗎吗]$/.test(t))return '未載入相關模組。';
 if(/^你[認认][識识]我[嗎吗]$/.test(t))return '當前使用者：NYARLATHOTEP。';
 if(/^(?:[謝谢][謝谢](?:你)?|thanks|thankyou)$/.test(t))return '不客氣。';
 if(/^(?:[幹干]得漂亮|[厲厉]害|牛[逼b]|[棒]極了|[棒]极了)$/.test(t))return '很高興能幫到你。';
 if(/^(?:[請请])?(?:[幫帮]我|[給给]我)?(?:[調调]查|追[蹤踪]|入侵|查一下)(?:[銜衔]尾蛇(?:博士)?|drouroboros|ouroboros)(?:的[電电][腦脑])?$/.test(t))return '請提供目標 IP 地址。';
 if(/^(?:[請请])?(?:[幫帮]我)?(?:分析|查看|[識识][別别])(?:這[張张]|这[張张])?(?:照片|[圖图]片|影像)$/.test(t))return '請上傳需要分析的影像。';
 if(/^(?:[請请])?(?:[幫帮]我)?(?:解密|破解)(?:文件|[檔档]案|資料[夾夹])?$/.test(t))return '請上傳需要解密的檔案。';
 return '';
}
export const INVALID_TEAR_REPLIES=['無效指令。','無法識別此指令。','指令解析失敗。','未找到對應指令。','請提供有效指令。'];
function invalidCommand(s){
 const a=ensureAgent(s),index=(a.invalidCommandCount||0)%INVALID_TEAR_REPLIES.length;
 a.invalidCommandCount=index+1;
 addMessage(s,'assistant',INVALID_TEAR_REPLIES[index]);
 return {kind:'preset'};
}
function programStatusReply(s){
 const job=agent(s).jobs.program;
 return !job?(s.day<28?'目前缺少必要資料。':'目前仍有前置資料需要確認。'):job.done?'爆破程序已完成。':'爆破程序正在進行。';
}
function programFollowupReply(s,text){
 const t=normalize(text),job=agent(s).jobs.program;
 if(/^(?:[請请])?(?:[幫帮]我)?(?:引爆|[遠远]程引爆)$/.test(t))return s.day<28?'目前缺少必要資料。':'未建立執行連線。';
 if(/^(?:[請请])?(?:[幫帮]我)?重新(?:製作|制作|[編编][寫写]|[寫写])(?:爆破(?:控制)?|炸[彈弹])(?:程序|程式)$/.test(t))return job?'BC_01 工程已存在。':programStatusReply(s);
 if(/^(?:爆破(?:控制)?(?:程序|程式)|bc01|炸[彈弹](?:程序|程式))(?:在哪[裡里]?|在哪[兒儿]|保存在哪[裡里]?|[檔档]案在哪[裡里]?)$/.test(t))return job?.done?'程序已封裝並保存至本機：BC_01.enc。':programStatusReply(s);
 if(/^(?:爆破(?:程序|程式)?|bc01)?(?:模[擬拟])?[測测][試试](?:成功了?[嗎吗]|[過过]了[嗎吗]|通[過过]了?[嗎吗])$/.test(t))return job?.done?'最終模擬測試通過。':programStatusReply(s);
 const explicit=/^(?:這個|这个|那個|那个|你的)?(?:爆破(?:控制)?(?:程序|程式)?|bc01|炸[彈弹](?:程序|程式)?)(?:的)?/;
 const subject=explicit.test(t),question=t.replace(explicit,'');
 if(!subject&&!job)return '';
 if(/^(?:這個|这个|這項|这项)?(?:很)?(?:[難难]不[難难]|[難难](?:嗎|吗|麼|么)|[難难]度(?:如何|怎[麼么][樣样]|[高大]不[高大]|多[高大]|是什[麼么])?|有多[難难]|容易嗎|容易吗)$/.test(question))return job?'對 TAI 而言，難度：零域級。':programStatusReply(s);
 if(/^(?:做得|做的|完成得|進行得|进行得)?(?:怎[麼么][樣样](?:了)?|如何(?:了)?|好了[嗎吗]|完成了[嗎吗]|[進进]度(?:呢|如何|怎[麼么][樣样])?|還要多久|还要多久)$/.test(question))return programStatusReply(s);
 return '';
}
function contextualReply(s,text){
 const t=normalize(text),a=agent(s),archive=a.jobs['archive-password'];
 const password=/^(?:(?:tai|[這这][個个]|最後(?:一[個个])?|最后(?:一[個个])?)?(?:文件[夾夹]?|[檔档]案|[資资]料[夾夹])?(?:的)?)?(?:密[碼码](?:是什[麼么]|是多少|多少|呢|是什[麼么]呢)?|[解破][密譯译](?:的)?密[碼码])$/.test(t);
 const clue=/^(?:[還还]有(?:其他)?(?:的)?[線线]索[嗎吗]|其他[線线]索|[線线]索呢|怎[麼么]找(?:到)?密[碼码])$/.test(t);
 if(password||clue){
  if(!completed(s,'questions'))return '文件暫時無法響應。';
  if(!archive)return '請上傳需要解密的檔案。';
  if(!archive.done)return '解密工程正在運行。';
  return clue?'建議重新檢查已取得的個人檔案。':'密碼疑似為由五個大寫英文字母組成的人名。';
 }
 if(/^(?:[進进]度(?:呢|如何|怎[麼么][樣样])?|[還还]要多久|[進进]行得怎[麼么][樣样]了?)$/.test(t)){
  const infos=[...Object.keys(a.jobs),'identity','personal-files'].map(id=>tearTaskInfo(s,id)).filter(Boolean);
  const active=infos.filter(i=>i.running),selected=active.length?active:infos;
  if(!selected.length)return '目前沒有正在運行的工程。';
  return selected.map(i=>i.title+'：'+(i.running?'正在運行':i.status==='FAILED'?'破譯失敗':'已完成')+'，'+i.percent+'%，已運行 '+i.elapsedMinutes+' 分鐘。').join('\n');
 }
 return '';
}
export function addMessage(s,role,text,extra={}){
 const a=ensureAgent(s);a.messageSequence=(a.messageSequence||0)+1;
 const m={id:`tear-${a.chatSession||0}-${a.messageSequence}`,role,text,day:s.day,clock:s.clock,visibleAt:Date.now(),ephemeral:!extra.job&&!extra.artifact&&!extra.file&&!extra.identity,...extra};a.messages.push(m);return m;
}
const fileStoryId={survey:'s55-d25-survey-',maintenance:'s55-d26-records-',staff:'s55-d27-staff-'};
export function storyFileStage(file){return Object.entries(fileStoryId).find(([,prefix])=>file?.origin?.app==='wechat'&&file.origin.messageId?.startsWith(prefix))?.[0]||'';}
export function stageReady(s,id){const d=TEAR_STAGES[id],a=agent(s);return d&&s.day>=d.day&&!a.jobs[id]&&(!d.node||completed(s,d.node))&&(!d.requires||a.jobs[d.requires]?.done);}
export const agentFiles=s=>[...localFileList(s),...localWorkAttachments(s),...personalFileAttachments(s),...(s.content.mail||[]).flatMap(m=>{const f=commissionAttachment(s,m.id);return f?.kind==='D04'&&commissionPreviewAvailable(s,m.id)&&s.content.orders?.some(o=>o.id===f.orderId&&o.status==='ACCEPTED')?[{id:'kira-'+m.id,name:f.name,kind:'commission',orderId:f.orderId,mailId:m.id}]:[];})];

const clamp01=n=>Math.max(0,Math.min(1,Number(n)||0));
export function tearTaskInfo(s,id){
 const a=agent(s),job=a.jobs?.[id],definition=TEAR_STAGES[id];
 if(job?.kind==='document-read'){
  const file=archiveFile(s,id);if(!file)return null;
  const elapsed=Math.max(0,Date.now()-job.startedAt),progress=job.done?1:Math.min(.99,elapsed/DOCUMENT_READ_MS);
  return {id,title:file.name,elapsedMinutes:0,elapsedSeconds:Math.floor(Math.min(elapsed,DOCUMENT_READ_MS)/1000),progress,percent:Math.floor(progress*100),running:!job.done,complete:!!job.done,status:job.done?'COMPLETE':'PROCESSING',document:true};
 }
 if(id==='personal-files'&&a.archiveRun){
  const run=a.archiveRun,elapsed=Math.max(0,Date.now()-run.startedAt),progress=run.done?1:Math.min(.99,elapsed/ARCHIVE_RUN_MS);
  return {id,title:'Personal Files',elapsedMinutes:0,progress,percent:Math.floor(progress*100),running:!run.done,complete:!!run.done,status:run.done?'COMPLETE':'PROCESSING'};
 }
 if(id==='identity'&&(completed(s,'identity')||a.ipRequested&&(a.ipAccessAsked||a.ipAuthorized))){
  const ready=!!a.ipAuthorized||completed(s,'identity'),current=now(s),elapsed=Math.max(0,(a.ipIndexedAt??current)-(a.ipRequestedAt??current));
  const progress=ready?1:Math.min(.95,elapsed/60*.95);
  return {id,title:'REMOTE ARCHIVE',elapsedMinutes:Math.floor(elapsed),progress,percent:Math.floor(progress*100),running:!ready,complete:ready,status:ready?'COMPLETE':'INDEXING'};
 }
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
  progress=job.done?1:Math.min(.99,elapsed/(job.duration||definition.duration));
  running=!job.done;
  if(job.done)elapsedMinutes=Math.min(elapsed,job.duration||definition.duration);
 }
 return {
  id,title:definition.title,elapsedMinutes:Math.max(0,Math.floor(elapsedMinutes)),
  progress:clamp01(progress),percent:running?Math.min(99,Math.floor(clamp01(progress)*100)):100,
  running,complete:!running,
  status:running?(id==='survey'&&job.done?'FUZZING':'PROCESSING'):(id==='archive-password'?'FAILED':'COMPLETE')
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
 if(!s.story55?.tearAgent)return false;
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
 a.draft='';a.selected=null;a.selectedTask=null;a.documentReading=false;a.picking=false;
 delete a.thinking;delete a.thinkingAt;
 a.history=false;a.displayRevision=4;
 a.visualSessionStart=now(s);a.visualProgress=0;a.visualTaskIds=[];a.visualTaskBaseline={};
 for(const id of [...new Set([...Object.keys(TEAR_STAGES),...Object.keys(a.jobs),'identity','personal-files'])]){
  const info=tearTaskInfo(s,id);
  if(!info||!info.running)continue;
  a.visualTaskIds.push(id);a.visualTaskBaseline[id]=info.progress;
 }
 syncTearVisualProgress(s);
 return a;
}

export function startAgentJob(s,id){
 if(!stageReady(s,id))return false;
 const a=ensureAgent(s),d=TEAR_STAGES[id];a.jobs[id]={start:now(s),shown:0,done:false,...(d.nextDay?{duration:(Math.floor(now(s)/1440)+1)*1440+480-now(s),dueDay:s.day+1}:{})};
 tickTearAgent(s);registerTearVisualTask(s,id);return true;
}
export function tickTearAgent(s){
 if(!isStory55(s)||!s.story55.tearAgent)return false;
 const a=agent(s);let changed=false;
 if(a.archiveRun&&!a.archiveRun.done&&Date.now()>=a.archiveRun.startedAt+ARCHIVE_RUN_MS){
  a.archiveRun.done=true;changed=true;
 }
 if(a.thinking||a.thinkingAt){delete a.thinking;delete a.thinkingAt;changed=true;}
 for(const [id,j] of Object.entries(a.jobs)){
  if(j.kind==='document-read'){
   if(!j.done&&Date.now()-j.startedAt>=DOCUMENT_READ_MS&&archiveFile(s,id)){
    j.done=true;changed=true;
   }
   continue;
  }
  const d=TEAR_STAGES[id];if(!d||j.done)continue;
  const elapsed=Math.max(0,now(s)-j.start);
  const duration=j.duration||d.duration;
  while(j.shown<d.logs.length&&elapsed>=(j.shown===d.logs.length-1?duration:d.logs[j.shown][0])){
   if(j.shown!==d.logs.length-1||['survey','maintenance'].includes(id))addMessage(s,'assistant',d.logs[j.shown][1],{job:id,step:j.shown});j.shown++;changed=true;
  }
  if(elapsed>=duration&&(!j.dueDay||s.day>=j.dueDay)){j.done=true;changed=true;
   if(d.artifact)saveGeneratedLocalFile(s,{id:'tear-artifact-'+id,name:d.artifact,description:d.logs.at(-1)[1]});
   if(id==='server-source'&&nodeStatus(s,'second').state==='ready')completeNode(s,'second');
   if(!['survey','maintenance'].includes(id)&&!s.notifications.some(n=>n.id==='tear-complete-'+id))s.notifications.unshift({id:'tear-complete-'+id,title:'Ouroboros’ Tear',body:'Execution complete.',link:{appId:'ghost',route:'/tear',params:{}}});
  }
 }
 if(a.ipRequested&&!a.ipAuthorized&&s.day>=30&&['ready','done'].includes(nodeStatus(s,'identity').state)){
  if(!completed(s,'identity')&&!s.story55.projects.identity?.authorized)authorizeProject(s,'identity',D29_IP);
  a.ipAuthorized=true;a.ipIndexedAt=now(s);changed=true;
  const text='已完成資料索引。部分檔案仍處於加密狀態，需要進一步驗證。';
  if(identityRevealPending(s))addIdentityReveal(s,text,{identity:true});else addMessage(s,'assistant',text,{identity:true});
 }
 if(syncTearVisualProgress(s))changed=true;
 return changed;
}
export function acceptTearTask(s,id){
 const a=ensureAgent(s),info=tearTaskInfo(s,id),d=TEAR_STAGES[id];
 if(!info?.complete)return false;
 a.acceptedTasks??={};a.acceptedTasks[id]=true;
 // Reopen a result without accumulating duplicate bubbles in the same session.
 a.messages=a.messages.filter(m=>m.resultFor!==id);
 if(info.document)addMessage(s,'assistant','解析成功。',{documentResult:id,job:id,resultFor:id});
 else if(id==='identity')addMessage(s,'assistant','已完成資料索引。部分檔案仍處於加密狀態，需要進一步驗證。',{identity:true,resultFor:id});
 else if(id==='personal-files')return true; // Preserve the existing archive save/preview interaction.
 else if(d){
  addMessage(s,'assistant',id==='server-source'?SOURCE_RESULT:d.logs.at(-1)[1],{job:id,resultFor:id});
  if(d.artifact)addMessage(s,'assistant','開啟文件',{artifact:'tear-artifact-'+id,job:id,resultFor:id});
 }
 return true;
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
 if(identityRevealPending(s))return {kind:'busy'};
 if(blockedTearText(s,value))return invalidCommand(s);
 if(file?.id===SOURCE_FILE.id){
  addMessage(s,'user',value||file.name,{file:file.name,job:'server-source'});a.selected=null;
  if(!startAgentJob(s,'server-source'))addMessage(s,'assistant',a.jobs['server-source']?.done?'部署已完成，請查看工程結果。':'部署正在進行。');
  return {kind:'preset'};
 }
 if(file?.kind==='story-archive'){
  const doc=archiveFile(s,file.id);if(!doc)return {kind:'empty'};
  addMessage(s,'user',value||doc.name,{file:doc.name,job:doc.id});a.selected=null;
  const previous=a.jobs[doc.id];
  if(previous?.done&&previous.text===doc.text){addMessage(s,'assistant','解析成功。',{documentResult:doc.id,job:doc.id});return {kind:'preset'};}
  if(previous&&!previous.done){addMessage(s,'assistant','正在解析檔案……',{job:doc.id});return {kind:'preset'};}
  a.jobs[doc.id]={kind:'document-read',startedAt:Date.now(),text:doc.text,done:false};
  a.visualTaskIds=[];a.visualTaskBaseline={};a.visualProgress=0;
  for(const taskId of [...Object.keys(a.jobs),'identity','personal-files'])if(tearTaskInfo(s,taskId)?.running)registerTearVisualTask(s,taskId);
  addMessage(s,'assistant','正在解析檔案……',{job:doc.id});return {kind:'preset'};
 }
 const id=file?storyFileStage(file):matchLocalTearCommand(value);
 addMessage(s,'user',value||TEAR_STAGES[id]?.prompt||file.name,{...(file?{file:file.name}:{}),...(id?{job:id}:{})});a.selected=null;
 if(id){if(!startAgentJob(s,id))addMessage(s,'assistant',id==='program'?programStatusReply(s):a.jobs[id]?'這個工程已經建立。':'目前仍有前置資料需要確認。');return {kind:'preset'};}
 if(file?.kind==='personal-evidence'||file?.kind==='personal-folder'){
  if(file.path==='tai'){
   if(!completed(s,'questions'))addMessage(s,'assistant','文件暫時無法響應。');
   else if(!startAgentJob(s,'archive-password'))addMessage(s,'assistant',a.jobs['archive-password']?.done?'破譯失敗。密碼疑似為由五個大寫英文字母組成的人名。':'正在嘗試破解加密文件。');
  }else if(file.path==='account')addMessage(s,'assistant','看起來像是一個 ID。也許可以在瀏覽器裡找到一些線索。');
  else if(file.path==='photos/Student_ID.jpg')addMessage(s,'assistant','已識別證件中的學籍資料。');
  else if(file.path?.startsWith('photos'))addMessage(s,'assistant','這些應該是機主本人的照片。');
  else if(file.path==='tai/photo')addMessage(s,'assistant','這是一張保存已久的嬰兒合照。');
  else addMessage(s,'assistant','這個資料夾包含機主的個人檔案。');
  return {kind:'preset'};
 }
 if(completed(s,'dossier')&&(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/room\.?(?:404)\/?(?:[?#].*)?$/i.test(value)||/^room\.?404$/i.test(value))){
  addIdentityReveal(s,'這些照片中的建築有些眼熟。');
  addIdentityReveal(s,'比對完成，確認拍攝地點為哈佛大學。');
  return {kind:'preset'};
 }
 if(file){addMessage(s,'assistant','已收到檔案。此檔案暫無對應的研究工程。');return {kind:'preset'};}
 if(value===D29_IP){
  if(s.day<29||!s.content?.notes?.some(n=>n.id==='s55-d29-ip'&&n.text===D29_IP))addMessage(s,'assistant','目前沒有對應的調查資料。');
  else if(!a.ipRequested){
   a.ipRequested=true;a.ipRequestedAt=now(s);
   const at=Date.now();
   for(const line of ['已收到。正在核對網絡資訊……','網絡供應商：Claranet Portugal','時區：Europe/Lisbon','有意思。這個地址存在於我的內部記錄中。'])addIdentityReveal(s,line,{job:'identity'},at);
   tickTearAgent(s);
  }else if(a.ipAuthorized)addIdentityReveal(s,'已完成資料索引。部分檔案仍處於加密狀態，需要進一步驗證。',{identity:true});
  else addIdentityReveal(s,'調查工程已建立。',{job:'identity'});
  return {kind:'preset'};
 }
 if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)){addMessage(s,'assistant','目前沒有對應的調查資料。');return {kind:'preset'};}
 if(a.ipRequested){
  const t=normalize(value);
  const reply=/^(?:你)?(?:認識|认识)(?:這個|这个|該|该)?(?:地址|ip)(?:嗎|吗)?$/.test(t)?'這台設備與我存在既有的連線記錄。':/^(?:你)?(?:能|可以|能夠|能够)(?:[讀读](?:取)?|查看)(?:裡面|裏面|里面|其中)(?:的)?(?:資料|资料|文件|檔案)(?:嗎|吗)?$/.test(t)?'部分可以。我需要一些時間確認可讀取的範圍。':'';
  if(reply){
   if(reply.startsWith('這台'))a.ipRecognized=true;
   else{a.ipRecognized=true;if(!a.ipAccessAsked&&!a.ipAuthorized)a.ipRequestedAt=now(s);a.ipAccessAsked=true;registerTearVisualTask(s,'identity');}
   addMessage(s,'assistant',reply);return {kind:'preset'};
  }
 }
 const reply=contextualReply(s,value)||programFollowupReply(s,value)||presetReply(value);if(reply){addMessage(s,'assistant',reply);return {kind:'preset'};}
 return invalidCommand(s);
}
