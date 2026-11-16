import {agent,addMessage,blockedTearText,ensureAgent,sendAgent,agentFiles,storyFileStage,tearTaskInfo,stageReady,identityPrompts} from './state.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {askTear} from '../../../../services/ai/gateway.js';
import {cleanTearReply,redactTearNetworkIdentifiers,TEAR_NETWORK_PROFILE} from '../../../../services/ai/tear-prompt.js';
import {startTearRun} from '../tear-run.js';

export function buildTearAgentScene(state){
 const a=agent(state);
 return [...Object.keys(a.jobs).flatMap(id=>{const info=tearTaskInfo(state,id);return info?[info.title+': '+info.status+'，'+info.percent+'%，已運行 '+info.elapsedMinutes+' 分鐘']:[];}),
  a.ipRequested&&state.day>=29&&state.content.notes?.some(n=>n.id==='s55-d29-ip')?'既有調查入口已由本機核對；已取得的網絡線索（故事內資料）：'+TEAR_NETWORK_PROFILE:'調查入口尚未核對；沒有可供轉述的網絡線索。'].join('\n');
}

export function handleTearAgent(action,t,ctx){
 const key=action.replace(/^gh-tear-/,'');
 if(!['picker','select','clear-file','prompt','artifact','collect','identity','task','task-close','history','history-close'].includes(key))return false;
 if(key==='artifact'){ctx.router.open({appId:'files',route:'/item/'+encodeURIComponent(t.dataset.id)});return true;}
 if(key==='identity'){
  const s=ctx.store.get();if(!tearTaskInfo(s,'identity')?.complete)return true;
  ctx.store.update(n=>{const a=ensureAgent(n);a.selectedTask=null;a.history=false;a.picking=false;});
  ctx.router.open({appId:'ghost',route:'/deployment',params:{project:'identity'}});return true;
 }
 ctx.store.update(s=>{const a=ensureAgent(s);
  if(key==='collect'){const id=t.dataset.id;if(tearTaskInfo(s,id)?.complete&&agentFiles(s).some(f=>f.id==='tear-artifact-'+id)){a.collectedArtifacts??={};a.collectedArtifacts[id]=true;}}
  if(key==='task'){a.history=false;a.picking=false;}
  if(key==='task')a.selectedTask=tearTaskInfo(s,t.dataset.id)?(a.selectedTask===t.dataset.id?null:t.dataset.id):null;
  if(key==='task-close')a.selectedTask=null;
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
 if(blockedTearText(s,text)){input.value='';ctx.store.update(n=>{ensureAgent(n).draft='';});return true;}
 if(agent(s).thinking)return true;
 const selected=agentFiles(s).find(f=>f.id===agent(s).selected);
 if(selected?.kind==='commission'){
  let started=false;ctx.store.update(n=>{started=startTearRun(n,selected.orderId);if(started){const a=ensureAgent(n);a.selected=null;a.draft='';}});
  if(started)ctx.router.open({appId:'ghost',route:'/tear-run',params:{orderId:selected.orderId}});else ctx.toast?.('目前無法執行此委託');return true;
 }
 let result;ctx.store.update(n=>{result=sendAgent(n,text,agent(n).selected);const a=ensureAgent(n);a.draft='';a.picking=false;if(result.kind==='ai'){a.thinking=result.id;a.thinkingAt=Date.now();}});
 input.value='';
 if(result.kind==='ai'){
  const state=ctx.store.get(),a=agent(state),messages=a.messages.filter(m=>!m.artifact&&!m.job).slice(-12).map(m=>({role:m.role,content:redactTearNetworkIdentifiers(m.text)}));
  const scene=buildTearAgentScene(state);
  const session=a.chatSession;
  const finish=raw=>{const latest=ctx.store.get(),loc=latest.nav.current;
   if(loc.appId!=='ghost'||loc.route!=='/tear'||agent(latest).chatSession!==session||agent(latest).thinking!==result.id)return;
   ctx.store.update(n=>{const current=agent(n);if(current.thinking!==result.id)return;delete current.thinking;delete current.thinkingAt;const reply=redactTearNetworkIdentifiers(cleanTearReply(raw));addMessage(n,'assistant',reply&&!blockedTearText(n,reply)?reply:'目前尚未取得相關資料。');});};
  askTear({day:state.day,messages,scene}).then(r=>finish(r.text)).catch(()=>finish('連線暫時中斷，請稍後再試。'));
 }
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
