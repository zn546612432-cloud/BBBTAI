import {d01Gate} from '../../story/d01/runtime.js';
import {STORY55_CONFIG} from '../../story/story55/catalog.js';
export const isStory55=s=>s?.story55?.version===1;
export const story55Config=s=>s?.story55?.config||STORY55_CONFIG;
export const nodeById=(s,id)=>story55Config(s).nodes.find(n=>n.id===id);
export const projectById=(s,id)=>story55Config(s).projects.find(n=>n.id===id);
export const completed=(s,id)=>!!s?.story55?.completed&&Object.hasOwn(s.story55.completed,id);
export const taiRecognized=s=>isStory55(s)?completed(s,'recognition'):s.day>=56;
export const final55=s=>isStory55(s)&&!!s.story55.ended;
export function nodeStatus(s,id){
 const n=nodeById(s,id);if(!n)return {state:'missing',reason:'不存在的节点'};
 if(completed(s,id))return {state:'done',reason:'已完成'};
 if(final55(s))return {state:'locked',reason:'第一视角已结束'};
 if(s.day<n.day)return {state:'locked',reason:`等待D${n.day}`};
 if(n.at&&s.day===n.day&&(s.clock||'00:00')<n.at)return {state:'locked',reason:`等待 ${n.at}`};
 if(n.authorizedProject&&!s.story55?.projects?.[n.authorizedProject]?.authorized)return {state:'locked',reason:'等待本地專案部署'};
 if(n.requiresContact&&!s.content?.conversations?.[n.channel]?.some(c=>c.id===n.conversationId))return {state:'locked',reason:'聯絡人尚未解鎖'};
 const missing=n.requires.filter(x=>!completed(s,x));
 if(missing.length)return {state:'locked',reason:'等待：'+missing.map(x=>nodeById(s,x)?.title||x).join('、')};
 return {state:'ready',reason:'可以继续'};
}
export function completeNode(s,id,{test=false}={}){
 if(!isStory55(s))throw Error('请先开始55天周目');
 const n=nodeById(s,id);if(!n)throw Error('节点不存在');
 if(completed(s,id))return false;
 if(!test&&nodeStatus(s,id).state!=='ready')throw Error(nodeStatus(s,id).reason);
 if(id==='recognition'){
  s.story55.noappInstalled=true;
  const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');if(chat)chat.name='陈熙泰';
 }
 s.story55.completed[id]={day:s.day,clock:s.clock,test:!!test};
 s.events.push({type:'story55_node_completed',id,day:s.day,clock:s.clock,test:!!test});
 return true;
}
export function date55(day,start='2025-05-19'){
 const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+day-1);return d.toISOString().slice(0,10);
}
export function story55ChargeGate(s){
 if(!isStory55(s))return null;
 if(s.day>=55)return 'death';
 if(d01Gate(s))return 'plot';
 return story55Config(s).nodes.some(n=>Number.isInteger(n.gateDay)&&n.gateDay<=s.day&&!completed(s,n.id))?'plot':null;
}

// D13 is a waiting day until the 22:10 KIRA mail. The D13 exhibition and
// wallet/call sequence must not force the player to idle all afternoon.
// Short charge never changes the date, never completes these nodes and still
// stops for an active scene; long charge remains gated by the story tree.
const D13_WAITING_NODES=new Set(['exhibition','d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer','intrusion']);
export function story55ShortChargeGate(s){
 if(!isStory55(s)||s.day!==13)return story55ChargeGate(s);
 if(d01Gate(s))return 'plot';
 return story55Config(s).nodes.some(n=>Number.isInteger(n.gateDay)&&n.gateDay<=s.day&&!completed(s,n.id)&&!D13_WAITING_NODES.has(n.id))?'plot':null;
}
