// D03 Flow quest: all progress and one-time settlement live in the phone save.
// This deliberately does not install real scanning software or contact networks.
import {isStory55,completeNode,date55} from './state.js';

export const FLOW_CONTACT='mc-flow-d03';
export const FLOW_INVITE='flow-d03-invite';
export const FLOW_KEY='flow-1234';
export const FLOW_REWARD_ID='flow-d03-reward';
export const FLOW_TOOL='漏洞扫描工具';
export const FLOW_INVITE_TEXT='嘿，Nyarlathotep，我最近开发了一个新工具，扫描漏洞很有效率，来帮我测试一下吧，密钥是 flow-1234。';
const HISTORY_DATE='2025-04-10';
const history=[
 ['flow','最近在测漏洞扫描程序，批量扫起来慢得要命。你有什么办法提速吗？','10:12'],
 ['me','先别每轮都全量扫。重复请求去掉，变动的地方优先处理。','10:14'],
 ['flow','这样会不会漏掉东西？','10:16'],
 ['me','增量比对，扫描结果再去重。漏没漏看验证结果，不是看跑了多少遍。','10:18'],
 ['flow','等等，这样倒是给了我一个思路。','10:21'],
 ['flow','我去开发个工具，弄好了找你测试。','10:23']
];
export const flowState=s=>s.story55?.flowD03||{};
const progress=s=>s.story55.flowD03??(s.story55.flowD03={});
const contact=s=>{
 const list=s.content.conversations.mirage??(s.content.conversations.mirage=[]);
 let c=list.find(x=>x.id===FLOW_CONTACT);
 if(!c){c={id:FLOW_CONTACT,name:'Flow',avatar:'FL',online:true,unread:0,messages:[],storySeed:true};list.push(c);}
 return c;
};
const push=(c,id,from,text,day,clock,date)=>{
 if(c.messages.some(m=>m.id===id))return false;
 c.messages.push({id,from,text,kind:'text',day,time:clock,sentDate:date,actual:true,story55:true});
 return true;
};
export function ensureFlowHistory(s){
 if(!isStory55(s))return;
 const c=contact(s);
 history.forEach(([sender,text,time],i)=>{
  const id='flow-history-20250410-'+i;
  if(!c.messages.some(m=>m.id===id))
   c.messages.push({id,from:sender==='me'?'me':FLOW_CONTACT,text,time,sentDate:HISTORY_DATE,kind:'text',actual:true,story55:true});
 });
}
export function tickFlowD03(s){
 if(!isStory55(s))return false;
 ensureFlowHistory(s);
 if(s.day<3||(s.day===3&&s.clock<'09:00'))return false;
 const c=contact(s),p=progress(s);
 if(p.invited)return false;
 p.invited=true;
 push(c,FLOW_INVITE,FLOW_CONTACT,FLOW_INVITE_TEXT,3,'09:00',date55(3));
 c.unread=(Number(c.unread)||0)+1;
 s.notifications.unshift({
  id:'flow-d03-mirage-invite',title:'MIRAGE',body:'Flow：'+FLOW_INVITE_TEXT,
  day:3,clock:'09:00',conversationId:FLOW_CONTACT,
  link:{appId:'mirage',route:'/chat/'+FLOW_CONTACT,params:{}}
 });
 return true;
}
export function openFlowTest(s){
 if(!isStory55(s)||!flowState(s).invited)return false;
 const p=progress(s);if(p.linkOpened)return false;
 p.linkOpened=true;
 s.notifications.unshift({
  id:'flow-d03-ghost-install',title:'GHOST',body:'请将新工具部署在 Ghost。',
  day:s.day,clock:s.clock,
  link:{appId:'ghost',route:'/',params:{}}
 });
 return true;
}
export function acceptFlowKey(s,key){
 if(!isStory55(s)||!flowState(s).linkOpened)return {ok:false,error:'尚未收到对应的部署任务'};
 if(String(key).trim()!==FLOW_KEY)return {ok:false,error:'密钥错误'};
 progress(s).keyAccepted=true;
 return {ok:true};
}
export function installFlowTool(s){
 if(!flowState(s).keyAccepted)return false;
 const p=progress(s);if(p.deployed)return false;
 p.deployed=true;return true;
}
export function submitFlowScan(s){
 const p=flowState(s);
 if(!p.deployed||p.submitted)return false;
 const state=progress(s);
 state.submitted=true;
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===FLOW_REWARD_ID))mail.unshift({
  id:FLOW_REWARD_ID,from:'币速达网安系统',
  subject:'【币速达网安系统】已收到您提交的漏洞，奖励已发放到您的账户。',
  body:'已收到您提交的 45 个安全漏洞。奖励 2,000 USD 已发放到您的账户。',
  date:date55(s.day),read:false,story55:true
 });
 const transactions=s.bankData.transactions??(s.bankData.transactions=[]);
 if(!transactions.some(t=>t.id===FLOW_REWARD_ID)){
  s.bankData.balance+=2000;
  transactions.unshift({
   id:FLOW_REWARD_ID,label:'币速达网安系统 / 漏洞奖励',amount:2000,
   time:s.clock,date:date55(s.day),story55:true
  });
 }
 if(!s.notifications.some(n=>n.id==='flow-d03-kira-reward'))
  s.notifications.unshift({
   id:'flow-d03-kira-reward',title:'KIRA',
   body:'【币速达网安系统】已收到您提交的漏洞，奖励已发放到您的账户。',
   day:s.day,clock:s.clock,
   link:{appId:'kira',route:'/mail/'+FLOW_REWARD_ID,params:{}}
  });
 return true;
}
export function flowOnMirageEntry(s){
 if(!isStory55(s)||!flowState(s).submitted||flowState(s).asked)return false;
 const p=progress(s),c=contact(s);
 p.asked=true;
 push(c,'flow-d03-followup',FLOW_CONTACT,'怎么样，好用吗？',s.day,s.clock,date55(s.day));
 c.unread=(Number(c.unread)||0)+1;
 return true;
}
export function flowDraft(s){
 const p=flowState(s);
 if(!isStory55(s)||!p.asked||p.completed)return null;
 return {id:'flow-d03',index:0,kind:'me',text:'很强。',channel:'mirage',conversationId:FLOW_CONTACT};
}
export function sendFlowReply(s,text){
 const p=flowState(s);
 if(!p.asked||p.completed||String(text).trim()!=='很强。')throw Error('请发送输入框里完整的预设台词');
 const c=contact(s);
 push(c,'flow-d03-player','me','很强。',s.day,s.clock,date55(s.day));
 push(c,'flow-d03-finish',FLOW_CONTACT,'哈哈。',s.day,s.clock,date55(s.day));
 progress(s).completed=true;
 if(s.story55.config.nodes.some(n=>n.id==='flow-d03'))completeNode(s,'flow-d03');
 if(s.drafts)delete s.drafts[FLOW_CONTACT];
 return true;
}
// Developer date rebuilding may simulate completed preceding days, never a
// still-playable target day. Uses the same one-time settlement functions.
export function simulateFlowD03(s){
 tickFlowD03(s);
 openFlowTest(s);
 acceptFlowKey(s,FLOW_KEY);
 installFlowTool(s);
 submitFlowScan(s);
 flowOnMirageEntry(s);
 sendFlowReply(s,'很强。');
}
