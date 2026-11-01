/**
 * Reconstruct a developer test phone by replaying completed days from D01.
 * Nothing here changes the authored source config or any saved test snapshot.
 * The target day itself is NOT auto-completed: its events remain playable.
 */
import {isStory55,story55Config,completed,nodeStatus,completeNode,date55} from './state.js';
import {activateStory55,advanceScene55,markMail55,readEvidence55,sendQuestion55,payNode55,tickStory55} from './runtime.js';
import {deployment,projectCapacity,upgradeHardware} from './projects.js';
import {deliverMissedScheduled} from '../../story/presets/engine.js';
import {defaultProducts} from '../../apps/mirage/data.js';

const copy=value=>structuredClone(value);
const minute=(day,clock)=>day*1440+Number(clock.slice(0,2))*60+Number(clock.slice(3,5));
const authoredMessage=m=>m&&!m.story55&&!m.demo&&!m.ouroborosScript&&!/^preset-/.test(m.id||'')&&(
  m.authored===true||m.storyImported===true||m.schedule?.mode==='game-time'||(typeof m.sentDate==='string'&&m.sentDate<'2025-05-19')
);
function preserveAuthoring(s){
 const conversations={};
 for(const [channel,items] of Object.entries(s.content.conversations||{})){
  conversations[channel]=(items||[]).map(c=>({
   id:c.id,name:c.name,avatar:c.avatar,group:c.group,members:c.members,authored:c.authored,
   messages:(c.messages||[]).filter(authoredMessage).map(m=>{
    const saved=copy(m);
    // Scheduled content is the immutable source; delivery is runtime state.
    if(saved.schedule?.mode==='game-time')delete saved.delivery;
    return saved;
   })
  })).filter(c=>c.messages.length||c.authored===true);
 }
 const moments=s.content.moments||{};
 return {
  config:copy(story55Config(s)),conversations,
  presets:copy(s.storyPresets||{}),
  notes:copy(s.content.notes||[]),
  photos:copy(s.content.photos||[]),
  moments:{posts:copy(moments.posts||[]),editedPosts:copy(moments.editedPosts||{}),deletedIds:copy(moments.deletedIds||[]),profiles:copy(moments.profiles||{}),likes:{},comments:{}},
  authoredMail:copy((s.content.mail||[]).filter(m=>m.authored===true&&!m.story55)),
  authoredOrders:copy((s.content.orders||[]).filter(o=>o.authored===true||!!s.content.mirage?.linkedMissions?.[o.id])),
  linkedMissions:copy(s.content.mirage?.linkedMissions||{}),
  // Product definitions can be authored, but a previous test's shopping
  // cart/owned assets and reduced shop stock must never leak backwards.
  mirageProducts:copy((s.content.mirage?.products||[]).filter(p=>p.authored===true||!defaultProducts.some(d=>d.id===p.id))),
  editor:copy(s.editor||{}),nav:copy(s.nav),
 };
}
function restoreAuthoring(s,source){
 s.story55.config=source.config;
 s.storyPresets={...source.presets,flags:[],usedIds:[],usedGroups:[],firedProactiveDays:[]};
 // Message sources stay in their authoring slots and are never silently deleted.
 for(const [channel,items] of Object.entries(source.conversations)){
  const target=s.content.conversations[channel]??(s.content.conversations[channel]=[]);
  for(const original of items){
   let c=target.find(x=>x.id===original.id);
   if(!c){
    c={id:original.id,name:original.name,avatar:original.avatar,group:original.group,members:copy(original.members),authored:original.authored,messages:[],unread:0};
    target.push(c);
   }else if(original.authored===true){
    c.name=original.name;c.avatar=original.avatar;
    if(original.members)c.members=copy(original.members);
    if(original.group!==undefined)c.group=original.group;
   }
   const present=new Set(c.messages.map(m=>m.id));
   for(const m of original.messages)if(!present.has(m.id)){c.messages.push(m);present.add(m.id);}
   c.messages.sort((a,b)=>String(a.sentDate||'').localeCompare(String(b.sentDate||''))||String(a.time||'').localeCompare(String(b.time||'')));
  }
 }
 s.content.notes=source.notes;
 s.content.photos=source.photos;
 s.content.moments=source.moments;
 for(const mail of source.authoredMail)if(!s.content.mail.some(m=>m.id===mail.id))s.content.mail.push(mail);
 for(const order of source.authoredOrders){
  if(!s.content.orders.some(o=>o.id===order.id))s.content.orders.push({...order,status:'OPEN'});
 }
 s.content.mirage.balance=300000;
 s.content.mirage.cart=[];
 s.content.mirage.assets=[];
 const custom=new Map(source.mirageProducts.map(p=>[p.id,p]));
 s.content.mirage.products=[...defaultProducts.filter(p=>!custom.has(p.id)).map(copy),...custom.values()];
 s.content.mirage.linkedMissions=source.linkedMissions;
 for(const m of Object.values(s.content.mirage.linkedMissions))m.stage=0;
 s.editor=source.editor;
 s.nav=source.nav;
}
function funding(s,required,label){
 const shortfall=Math.max(0,required-s.bankData.balance);
 if(!shortfall)return;
 s.bankData.balance+=shortfall;
 const tx=s.bankData.transactions??(s.bankData.transactions=[]);
 tx.unshift({id:'s55-dev-finance-'+tx.filter(x=>String(x.id||'').startsWith('s55-dev-finance-')).length,
  label:'DEVELOPER TEST CAPITAL · '+label,amount:shortfall,day:s.day,time:s.clock,date:date55(s.day),test:true});
 s.events.push({type:'story55_test_funding',amount:shortfall,day:s.day,clock:s.clock});
}
function hardware(s,minimum){
 while((s.story55.hardware||1)<minimum){
  const cost=story55Config(s).economics.hardwarePrices[s.story55.hardware||1];
  if(!Number.isFinite(cost))throw Error('无法重建设备升级：缺少设备价格');
  funding(s,cost,'HARDWARE');
  upgradeHardware(s);
 }
}
function simulateProjectBatch(s,node){
 const p=story55Config(s).projects.find(x=>x.id===node.project);
 if(!p)throw Error('缺少GHOST项目：'+node.project);
 const run=s.story55.projects[p.id]??(s.story55.projects[p.id]={authorized:true,active:null,batches:[]});
 if(run.batches.length>=p.batches||run.batches.length>=projectCapacity(s,p))return false;
 hardware(s,p.minimumHardware);
 run.authorized=true;
 const batch=run.batches.length;
 const steps=p.steps.map((type,index)=>{
  const id='s55:'+p.id+':'+batch+':'+index;
  s.ghost.orders[id]={id,type,key:p.key,status:'success',attempts:1,story55Project:p.id,
   batch,step:index,moves:0,errors:0,settings:{seconds:90,retries:1000,rounds:1},test:true};
  s.ghost.history.unshift({id:id+':1',orderId:id,type,success:true,at:0,attempt:1,test:true,day:s.day});
  return {id,day:s.day,test:true};
 });
 run.batches.push({complete:true,steps,day:s.day,test:true});
 const percent=p.gains.slice(0,run.batches.length).reduce((sum,n)=>sum+n,0);
 s.story55.reports[p.id+'-'+batch]={
  title:p.title+' / BATCH '+(batch+1),project:p.id,percent,day:s.day,test:true
 };
 if(run.batches.length===p.batches){
  completeNode(s,node.id,{test:true});
  if(node.id==='wallet'){
   const transactions=s.content.mirage.transactions??(s.content.mirage.transactions=[]);
   if(!transactions.some(t=>t.id==='s55-wallet-10btc'))transactions.unshift({
    id:'s55-wallet-10btc',type:'REWARD',asset:'BTC',amount:10,day:s.day,time:s.clock,test:true,
    description:'WALLET CHALLENGE · DEVELOPER SIMULATION'
   });
  }
 }
 return true;
}
function simulateScene(s,node){
 const lines=story55Config(s).scenes[node.id];
 if(!Array.isArray(lines)||!lines.length)throw Error('无法重建场景台词：'+node.id);
 for(let i=0;i<lines.length;i++)advanceScene55(s,node.id,{acceptCall:true});
 if(!completed(s,node.id))throw Error('场景重建后没有完成：'+node.id);
 const scene=s.story55.scenes[node.id];
 scene.test=true;
}
function simulateNode(s,node){
 if(node.kind==='project')return simulateProjectBatch(s,node);
 if(node.kind==='scene')simulateScene(s,node);
 else if(node.kind==='mail'){
  tickStory55(s);
  const mail=s.content.mail.find(m=>m.storyNode===node.id);
  if(!mail)throw Error('无法重建KIRA邮件：'+node.id);
  markMail55(s,mail.id);
 }
 else if(['file','page','map'].includes(node.kind)){
  const table={file:'documents',page:'pages',map:'locations'}[node.kind];
  const evidence=story55Config(s)[table].find(x=>x.node===node.id);
  if(!evidence)throw Error('找不到跨App资料：'+node.id);
  readEvidence55(s,node.kind,evidence.id);
  s.story55.testArtifacts??={};
  s.story55.testArtifacts[evidence.id]={node:node.id,type:node.kind,day:s.day,test:true};
 }
 else if(node.kind==='questions'){
  for(let i=0;i<5;i++)sendQuestion55(s);
 }
 else if(node.kind==='payment'){
  funding(s,node.cost,'CONTRACT');
  payNode55(s,node.id);
 }
 else throw Error('未支持的剧情节点类型：'+node.kind);
 if(!completed(s,node.id))throw Error('节点重建未完成：'+node.id);
 return true;
}
function deliverAuthoredScheduled(s,targetDay,clock){
 const cutoff=minute(targetDay,clock),items=[];
 for(const [channel,list] of Object.entries(s.content.conversations||{})){
  for(const c of list)for(const m of c.messages||[]){
   const schedule=m.schedule;
   if(schedule?.mode!=='game-time'||m.delivery)continue;
   const eventAt=minute(Number(schedule.day),String(schedule.clock||'00:00'));
   if(!Number.isFinite(eventAt)||eventAt>cutoff)continue;
   items.push({eventAt,channel,c,m});
  }
 }
 items.sort((a,b)=>a.eventAt-b.eventAt||String(a.m.id).localeCompare(String(b.m.id)));
 for(const {channel,c,m} of items){
  const {day,clock:at}=m.schedule;
  m.delivery={day:Number(day),clock:at};
  s.events.push({type:'authored_message_delivered',channel,conversationId:c.id,messageId:m.id,day:Number(day),clock:at,test:true});
  if(m.from==='me')continue;
  c.unread=(Number(c.unread)||0)+1;
  s.notifications.unshift({
   id:'message-'+channel+'-'+c.id+'-'+m.id,conversationId:c.id,messageId:m.id,
   title:c.name,body:m.text||'[附件]',day:Number(day),clock:at,test:true,
   link:{appId:channel,route:'/chat/'+c.id,params:{}}
  });
 }
}
/**
 * Rebuilds in-place on the PhoneStore.update draft. Caller MUST snapshot first.
 * Every day before targetDay is simulated once in temporal order; target day
 * remains playable. For a project spanning N days, only one batch/day is done.
 */
export function rebuildStory55AtDay(s,targetDay,clock='08:00'){
 if(!isStory55(s))throw Error('请先创建55天周目');
 if(!Number.isInteger(targetDay)||targetDay<1||targetDay>55||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))
  throw Error('日期或时间无效');
 const author=preserveAuthoring(s);
 activateStory55(s);
 // A previous late-game test may have renamed this thread after recognition.
 // Do not leak the revealed identity when returning to an earlier date.
 const taiChat=s.content.conversations.noapp?.find(chat=>chat.id==='tai');
 if(taiChat&&!author.conversations.noapp?.some(chat=>chat.id==='tai'&&chat.authored===true))taiChat.name='Dr Ouroboros';
 restoreAuthoring(s,author);
 const nodes=story55Config(s).nodes;
 for(let day=1;day<targetDay;day++){
  s.day=day;s.clock='20:00';
  tickStory55(s);
  // Multiple passes handle same-day nodes whose prerequisites occur later
  // in the catalog, without prematurely completing multi-day deployments.
  let changed=true,passes=0;
  while(changed){
   if(++passes>nodes.length+2)throw Error('剧情重建依赖关系异常：D'+day);
   changed=false;
   for(const node of nodes){
    if(node.day>day||completed(s,node.id))continue;
    if(node.requires.some(id=>!completed(s,id)))continue;
    if(nodeStatus(s,node.id).state!=='ready')continue;
    if(simulateNode(s,node)){tickStory55(s);changed=true;}
   }
  }
  // Catch up scheduled NPC messages on their original authored day. Never
  // manufacture replies that require an unrecorded player free-chat message.
  deliverMissedScheduled(s,{day,clock:'00:00'},{day,clock:'23:59'});
 }
 s.day=targetDay;s.clock=clock;s.unlocked=true;
 s.deathPhase=null;s.poweredOff=false;s.emergencyCharge=false;
 s.story55.ended=false;s.story55.activeScene=null;s.story55.previewNode=null;
 tickStory55(s);
 deliverAuthoredScheduled(s,targetDay,clock);
 // An authored message can have an earlier original timestamp than a newly
 // simulated mail. Reorder both history and banners by event time, not by
 // which reconciliation helper ran last.
 const stamped=item=>minute(Number(item.day)||targetDay,String(item.clock||clock));
 s.notifications.sort((a,b)=>stamped(b)-stamped(a));
 s.events.sort((a,b)=>stamped(a)-stamped(b));
 s.story55.developerRebuild={day:targetDay,clock,simulatedThrough:targetDay-1,source:'completed-prior-days-v1'};
 // Restore original developer navigation; only runtime state was replayed.
 s.nav=author.nav;
 return s.story55.developerRebuild;
}

/**
 * Node preview is a focused variant of date jump. Rebuild all earlier days,
 * then simulate same-day prerequisites, leaving the chosen node uncompleted.
 */
export function prepareStory55NodeAtDay(s,id){
 const current=story55Config(s).nodes.find(n=>n.id===id);
 if(!current)throw Error('剧情节点不存在：'+id);
 rebuildStory55AtDay(s,current.day,'20:00');
 const visit=(depId,stack=[])=>{
  if(completed(s,depId))return;
  if(stack.includes(depId))throw Error('剧情节点存在循环：'+depId);
  const node=story55Config(s).nodes.find(n=>n.id===depId);
  if(!node)throw Error('找不到剧情前置节点：'+depId);
  if(node.day>current.day)throw Error('前置节点晚于目标日期：'+depId);
  for(const parent of node.requires)visit(parent,[...stack,depId]);
  if(completed(s,depId))return;
  if(nodeStatus(s,depId).state!=='ready')throw Error('无法预览：'+nodeStatus(s,depId).reason);
  const progressed=simulateNode(s,node);
  if(!progressed||!completed(s,depId)){
   throw Error('前置项目需要跨天完成：'+depId+'。请调整剧情时间线。');
  }
  tickStory55(s);
 };
 for(const depId of current.requires)visit(depId,[id]);
 s.story55.previewNode=id;
 s.editor.story55Node=id;
 return {node:id,day:current.day};
}
