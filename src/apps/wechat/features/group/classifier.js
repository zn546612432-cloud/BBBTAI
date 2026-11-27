import {taiCloudCall,isTaiCloudHost} from '../../../../services/ai/supabase-gateway.js';
import {pendingClassification,completeClassification} from './runtime.js';
import {BROTHERS,groupThread} from './state.js';
import {playerWeChatMessages} from './history.js';
import {SOCIAL_THINKING,socialQualityIssues,socialRetryMessages} from '../../../../services/ai/brother-social-intent.js';
import {groupSocialMessages} from '../../../../services/ai/brother-social-worldbook.js';
import {brotherPublicMemory} from '../../../../services/ai/worldbook/brother-public-memory.js';
import {traditionalTaiText} from '../../../../services/ai/traditional.js';
const TYPES=new Set(['generic','vanity','tease','food','warm','abstract','restore','command','father_harm']);
export {classificationMessages} from '../../../../services/ai/brother-group-classification.js';
import {classificationMessages} from '../../../../services/ai/brother-group-classification.js';
export function parseClassification(response){
 try{const raw=JSON.parse(String(response?.text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
  const target=raw.target==='胡楓'?'胡枫':raw.target;
  const result={type:TYPES.has(raw.type)?raw.type:'generic',target:BROTHERS.includes(target)?target:''};
  if(Array.isArray(raw.replies))result.replies=raw.replies.slice(0,5).map(r=>({by:r?.by==='胡楓'?'胡枫':r?.by,text:typeof r?.text==='string'?traditionalTaiText(r.text).trim():''})).filter(r=>BROTHERS.includes(r.by)&&r.text&&r.text.length<=100&&!/[\r\n]/.test(r.text)&&!/熙泰|世界書|世界书|系統提示|系统提示|作為AI|作为AI/.test(r.text)&&!(r.by==='熙旺'&&/哈哈哈/.test(r.text))).map(r=>({...r,text:r.by==='阿威'?r.text:r.text.replace(/[。.]$/,'')}));
  return result;
 }catch{return {type:'generic',target:''};}
}
async function groupRequest(q,phase,messages,retry=false){
 const payload=phase==='classify'?{model:'deepseek-flash',temperature:.1,max_tokens:120,messages}:{...SOCIAL_THINKING,messages:retry?socialRetryMessages(messages):messages};
 if(isTaiCloudHost())return parseClassification(await taiCloudCall('decision',payload));
 const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'wechat-group',day:q.day,group:q,phase,retry}),signal:AbortSignal.timeout(50000)});
 if(!r.ok)throw Error('group AI unavailable');
 return parseClassification(await r.json());
}
export async function requestGroupClassification(q){
 // Special-story recognition remains separate from creative dialogue.
 const classified=q.field==='notice'||q.field==='nickname'||q.restore||q.inviteOnly?await groupRequest(q,'classify',classificationMessages(q)):{type:'generic',target:''};
 if(q.field==='nickname'||q.restore||q.inviteOnly||classified.type==='father_harm')return classified;
 const messages=groupSocialMessages(q);
 let result=await groupRequest(q,'dialogue',messages);
 if(socialQualityIssues(result.replies||[],q.value).length)result=await groupRequest(q,'dialogue',messages,true);
 return {...classified,replies:socialQualityIssues(result.replies||[],q.value).length?[]:result.replies||[]};
}
const running=new WeakMap();
export function groupClassificationDue(store,now=Date.now()){return !running.has(store)&&!!pendingClassification(store.get(),now);}
export async function tickGroupClassification(store,{request=requestGroupClassification,now=Date.now()}={}){
 if(running.has(store))return false;
 const q=pendingClassification(store.get(),now);if(!q)return false;
 running.set(store,q.id);
 let result={type:'generic',target:''};
 try{
  // Only classification is sent to the existing protected AI gateway.
  let timer;
  try{result=await Promise.race([request({...q,day:store.get().day,clock:store.get().clock,publicMemory:brotherPublicMemory(store.get(),q.value),history:playerWeChatMessages(groupThread(store.get()),store.get()).filter(m=>m.kind==='text'&&!m.wechatEgg&&!m.demo&&!m.authoredPending).slice(-5).map(m=>({by:m.from,text:m.text}))}),new Promise(resolve=>{timer=setTimeout(()=>resolve({type:'generic',target:''}),110000);})]);}
  finally{clearTimeout(timer);}
 }catch{}finally{running.delete(store);}
 if(!Object.values(store.get().wechatGroupEggs?.classifications||{}).some(x=>x.id===q.id))return false;
 store.update(s=>completeClassification(s,q.id,result,{now:Date.now()}));return true;
}
