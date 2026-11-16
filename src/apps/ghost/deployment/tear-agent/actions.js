import {agent,addMessage,blockedTearText,ensureAgent,sendAgent,agentFiles,storyFileStage} from './state.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {askTear} from '../../../../services/ai/gateway.js';
import {startTearRun} from '../tear-run.js';

export function handleTearAgent(action,t,ctx){
 const key=action.replace(/^gh-tear-/,'');
 if(!['picker','select','clear-file','prompt','artifact','identity','task','task-close'].includes(key))return false;
 if(key==='artifact'){ctx.router.open({appId:'files',route:'/item/'+encodeURIComponent(t.dataset.id)});return true;}
 if(key==='identity'){ctx.router.open({appId:'ghost',route:'/deployment',params:{project:'identity'}});return true;}
 ctx.store.update(s=>{const a=ensureAgent(s);
  if(key==='task')a.selectedTask=TEAR_STAGES[t.dataset.id]&&a.jobs[t.dataset.id]?(a.selectedTask===t.dataset.id?null:t.dataset.id):null;
  if(key==='task-close')a.selectedTask=null;
  if(key==='picker')a.picking=!a.picking;
  if(key==='select'){const f=agentFiles(s).find(f=>f.id===t.dataset.id);if(f){a.selected=f.id;a.picking=false;a.draft=TEAR_STAGES[storyFileStage(f)]?.prompt||'';}}
  if(key==='clear-file'){a.selected=null;a.draft='';}
  if(key==='prompt')a.draft=TEAR_STAGES[t.dataset.id]?.prompt||'';
 });return true;
}
export function submitTearAgent(form,ctx){
 if(form.dataset.form!=='tear-agent-send')return false;
 const input=form.querySelector('[name=text]'),text=input.value.trim(),s=ctx.store.get();
 if(blockedTearText(s,text)){ctx.toast?.('訊息無法發送');return true;}
 if(agent(s).thinking)return true;
 const selected=agentFiles(s).find(f=>f.id===agent(s).selected);
 if(selected?.kind==='commission'){
  let started=false;ctx.store.update(n=>{started=startTearRun(n,selected.orderId);if(started){const a=ensureAgent(n);a.selected=null;a.draft='';}});
  if(started)ctx.router.open({appId:'ghost',route:'/tear-run',params:{orderId:selected.orderId}});else ctx.toast?.('目前無法執行此委託');return true;
 }
 let result;ctx.store.update(n=>{result=sendAgent(n,text,agent(n).selected);const a=ensureAgent(n);a.draft='';if(result.kind==='ai'){a.thinking=result.id;a.thinkingAt=Date.now();}});
 input.value='';
 if(result.kind==='ai'){
  const state=ctx.store.get(),a=agent(state),messages=a.messages.filter(m=>!m.artifact&&!m.job).slice(-12).map(m=>({role:m.role,content:m.text}));
  const scene=Object.entries(a.jobs).map(([id,j])=>TEAR_STAGES[id]?.title+': '+(j.done?'完成':'研究中')).join('\n');
  const finish=raw=>ctx.store.update(n=>{const current=agent(n);if(current.thinking!==result.id)return;delete current.thinking;delete current.thinkingAt;let reply='';try{reply=JSON.parse(raw).reply||'';}catch{reply=String(raw||'');}reply=String(reply).trim().slice(0,1800);addMessage(n,'assistant',reply&&!blockedTearText(n,reply)?reply:'抱歉，目前無法提供這項資訊。');});
  askTear({day:state.day,messages,scene}).then(r=>finish(r.text)).catch(()=>finish('連線暫時中斷，請稍後再試。'));
 }
 return true;
}
