import {agent,ensureAgent,sendAgent,agentFiles,storyFileStage,tearTaskInfo,stageReady,identityPrompts,startPersonalArchiveRun,identityRevealPending,blockedTearText} from './state.js';
import {completed} from '../../../../services/story55/state.js';
import {savePersonalFiles,PERSONAL_FILES_ID} from '../../../files/features/local-library/index.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {TEAR_NETWORK_PROFILE} from '../../../../services/ai/tear-prompt.js';
import {startTearRun} from '../tear-run.js';

export function buildTearAgentScene(state){
 const a=agent(state);
 return [...Object.keys(a.jobs).flatMap(id=>{const info=tearTaskInfo(state,id);return info?[info.title+': '+info.status+'，'+info.percent+'%，已運行 '+info.elapsedMinutes+' 分鐘']:[];}),
  a.ipRequested&&state.day>=29&&state.content.notes?.some(n=>n.id==='s55-d29-ip')?'既有調查入口已由本機核對；已取得的網絡線索（故事內資料）：'+TEAR_NETWORK_PROFILE:'調查入口尚未核對；沒有可供轉述的網絡線索。'].join('\n');
}

export function handleTearAgent(action,t,ctx){
 const key=action.replace(/^gh-tear-/,'');
 if(!['picker','select','clear-file','prompt','artifact','collect','identity','archive-save','task','task-close','history','history-close','document-read'].includes(key))return false;
 if(key==='artifact'){ctx.router.open({appId:'files',route:'/item/'+encodeURIComponent(t.dataset.id)});return true;}
 if(key==='identity'){
  const s=ctx.store.get();if(identityRevealPending(s)||!tearTaskInfo(s,'identity')?.complete)return true;
  if(completed(s,'identity')){
   ctx.store.update(n=>startPersonalArchiveRun(n));return true;
  }
  ctx.store.update(n=>{const a=ensureAgent(n);a.selectedTask=null;a.history=false;a.picking=false;});
  ctx.router.open({appId:'ghost',route:'/deployment',params:{project:'identity'}});return true;
 }
 if(key==='archive-save'){
  let saved=false;ctx.store.update(s=>{saved=!!savePersonalFiles(s);if(saved)ensureAgent(s).selectedTask=null;});
  if(saved)ctx.router.open({appId:'files',route:'/item/'+PERSONAL_FILES_ID});
  return true;
 }
 ctx.store.update(s=>{const a=ensureAgent(s);
  if(key==='collect'){const id=t.dataset.id;if(tearTaskInfo(s,id)?.complete&&agentFiles(s).some(f=>f.id==='tear-artifact-'+id)){a.collectedArtifacts??={};a.collectedArtifacts[id]=true;}}
  if(key==='task'){a.history=false;a.picking=false;a.documentReading=false;}
  if(key==='task')a.selectedTask=tearTaskInfo(s,t.dataset.id)?(a.selectedTask===t.dataset.id?null:t.dataset.id):null;
  if(key==='document-read'){const info=tearTaskInfo(s,t.dataset.id);if(info?.document&&info.complete){a.selectedTask=info.id;a.documentReading=true;a.history=false;a.picking=false;}}
  if(key==='task-close'){a.selectedTask=null;a.documentReading=false;}
  if(key==='history'){a.history=!a.history;a.selectedTask=null;a.picking=false;}
  if(key==='history-close')a.history=false;
  if(key==='picker')a.picking=!a.picking;
  if(key==='select'){const f=agentFiles(s).find(f=>f.id===t.dataset.id);if(f){a.selected=f.id;a.picking=false;a.draft=TEAR_STAGES[storyFileStage(f)]?.prompt||'';}}
  if(key==='clear-file'){a.selected=null;a.draft='';}
  if(key==='prompt'){const id=t.dataset.id,identity=identityPrompts(s).find(([key])=>key===id);if(identity||stageReady(s,id)&&!TEAR_STAGES[id].file){a.selected=null;a.draft=identity?.[1]||TEAR_STAGES[id].prompt;a.picking=false;}}
 });return true;
}
export function submitTearAgent(form,ctx){
 if(form.dataset.form!=='tear-agent-send')return false;
 const input=form.querySelector('[name=text]'),text=input.value.trim(),s=ctx.store.get();
 if(identityRevealPending(s))return true;
 const selected=agentFiles(s).find(f=>f.id===agent(s).selected);
 if(selected?.kind==='commission'&&!blockedTearText(s,text)){
  let started=false;ctx.store.update(n=>{started=startTearRun(n,selected.orderId);if(started){const a=ensureAgent(n);a.selected=null;a.draft='';}});
  if(started)ctx.router.open({appId:'ghost',route:'/tear-run',params:{orderId:selected.orderId}});else ctx.toast?.('目前無法執行此委託');return true;
 }
 ctx.store.update(n=>{sendAgent(n,text,agent(n).selected);const a=ensureAgent(n);a.draft='';a.picking=false;delete a.thinking;delete a.thinkingAt;});
 input.value='';
 return true;
}

export function inputTearAgent(target,ctx){
 if(target.id!=='tear-agent-input')return false;
 const hadDraft=!!agent(ctx.store.get()).draft;
 ctx.store.update(s=>{ensureAgent(s).draft=target.value;});
 // Begin/reverse the visual transition on the first/last character, without
 // waiting for the existing 250ms Ghost heartbeat or refreshing every key.
 if(hadDraft!==!!target.value)ctx.refresh?.();
 return true;
}
