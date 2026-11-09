import {AUTHORED_CHAT_TRACKS} from '../../../../services/messaging/lifecycle/registry.js';
import {story55Config,date55} from '../../../../services/story55/state.js';
import {d01GroupScript,d01BrotherLines,D01_GROUP_BRANCHES} from '../../../../story/d01/wechat.js';
import {celebration,privateScenes as d06Private,rewardSets as d06Rewards} from '../../../../story/d06/wish-content.js';
import {nextDay,afternoonDay,extraDay,dinnerAfter,rewardSets as d07Rewards} from '../../../../story/d07/life-content.js';
import {saveTrackValues,trackSource} from '../../../../story/d14-d24/editor-overrides.js';

const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const labelDay=day=>'D'+String(day).padStart(2,'0')+' · '+date55(day);
const kindOf=line=>line.kind||'text';
const sourceLines=rows=>(rows||[]).map(row=>({
 who:String(row.who??row.from??''),text:String(row.text??''),
 kind:kindOf(row),id:row.id||null,
 ...(Number.isFinite(row.after)?{after:row.after}:{})
}));
const value=(v,s,q)=>typeof v==='function'?v(s,q):v;
const store=s=>s.story55?.chatSceneEdits||{};
const scope=(s,key)=>store(s)[key];
const channelLabel=(channel,chat)=>{
 if(channel==='wechat')return ({group:'狼崽團',wang:'熙旺',xin:'小辛',hufeng:'胡枫',fulongsheng:'傅隆生',zai:'仔仔',zaizai:'仔仔',awei:'阿威',xiaoxin:'小辛'}[chat]||chat);
 return ({mirage:'MIRAGE',noapp:'NoApp'}[channel]||channel)+' / '+chat;
};

function progress(s,prefix,id){
 const ss=s.story55||{};
 const lookup={d02:ss.d02?.wechat,d03:ss.d03Chats,d04:ss.d04Chats,d05:ss.d05Chats,
  d08:ss.d08Chats,d09:ss.d09Chats,d10:ss.d10Chats,d11:ss.d11Chats,d12:ss.d12Chats,d13:ss.d13Chats};
 return (lookup[prefix]||ss.authoredDays?.[prefix]||{})[id];
}
function alreadyStarted(s,prefix,id){
 const q=progress(s,prefix,id);
 if(q?.started||q?.completed||q?.historySettled||q?.skipped||q?.index>0||q?.lateRun)return true;
 for(const list of Object.values(s.content?.conversations||{}))for(const c of list||[])
  if((c.messages||[]).some(m=>m.lifecycleId===prefix+':'+id))return true;
 return false;
}
function trackSources(s,day){
 const result=[];
 for(const {track} of AUTHORED_CHAT_TRACKS){
  if(track.day!==day)continue;
  for(const d of track.defs){
   const key=track.name+':'+d.id,q=progress(s,track.name,d.id)||{};
   let rows=[],at=d.fallback||d.early||'08:00',failure='';
   try{rows=sourceLines(value(d.lines,s,q)||[]);}catch(error){failure=String(error?.message||error);}
   try{at=value(d.at,s,q)||at;}catch{/* leave fallback; lines remain visible */}
   const edited=scope(s,key);
   if(edited?.lines?.length===rows.length)rows=rows.map((l,i)=>({...l,text:edited.lines[i].text}));
   if(edited?.at)at=edited.at;
   const reason=alreadyStarted(s,track.name,d.id)?'本周目这段对话已经开始或生成消息；为了保护玩家记录，请在新的未播放周目修改。':failure;
   result.push({key,type:'track',day,channel:d.channel||'wechat',chat:d.chat,
    title:channelLabel(d.channel||'wechat',d.chat)+' · '+d.id,at:TIME.test(at)?at:'08:00',
    timingLabel:d.condition||d.enabled?'带剧情前置条件 · 最早开始时间':'按游戏时间开始',
    deliveryLabel:rows.some(l=>l.who==='me')?'含熙蒙的原生点击发送':'NPC 逐条自动发送',
    details:[d.optional?'可选支线':'',d.until?'有效至 '+String(d.until):'',d.pauseMs&&typeof d.pauseMs==='number'?'消息间隔 '+d.pauseMs+' 毫秒':''].filter(Boolean),
    lines:rows,reason});
  }
 }
 return result;
}
function d01Sources(s){
 const group=D01_GROUP_BRANCHES.map(branch=>{
  const rows=d01GroupScript(s,branch);
  const key='d01:group-'+branch;
  return {key,day:1,type:'d01',chat:'group',channel:'wechat',
   title:'狼崽團 · '+(branch==='morning'?'午前':'午后')+'对话分支',
   at:'',timingLabel:'玩家主动在群聊发出第一条消息后触发；由游戏时间决定分支',
   deliveryLabel:'NPC 间隔发送；轮到熙蒙时必须亲自点击发送',
   lines:rows.map(x=>({who:x.from,text:x.text,kind:'text',after:x.after})),
   reason:s.story55?.d01?.group?.started?'本周目 D01 群聊已开始，不能覆盖正在播放的文案。':''};
 });
 return [...group,{key:'d01:brother',day:1,type:'d01',chat:'wang',channel:'wechat',
  title:'熙旺 · 独立私聊回复',at:'',
  timingLabel:'玩家先发「哥」，再连发三条，之后经过 2 游戏分钟',
  deliveryLabel:'玩家发言自行输入；熙旺分三段回复',
  lines:d01BrotherLines(s).map(x=>({who:x.who,text:x.text,kind:'text',id:x.at})),
  reason:s.story55?.d01?.brother?.phase&&s.story55.d01.brother.phase!=='idle'?'本周目熙旺私聊已触发；请在未触发的周目修改。':''}];
}
const wishesByDay={
 6:[{key:'wish:d06-celebration',title:'比赛奖金 · 群聊庆祝（赢取 BTC 后）',rows:celebration},
  {key:'wish:d06-private',title:'D06 私聊',rows:d06Private},
  ...Object.entries(d06Rewards).map(([id,rows])=>({key:'wish:d06-'+id,title:'完成心愿后回复 · '+id,rows}))],
 7:[{key:'wish:d07-next',title:'日常群聊 · 上午',rows:nextDay},
  {key:'wish:d07-afternoon',title:'日常群聊 · 下午',rows:afternoonDay},
  {key:'wish:d07-extra',title:'日常私聊',rows:extraDay},
  {key:'wish:d07-dinner',title:'D06 聚餐后的条件回应',rows:[dinnerAfter]},
  ...Object.entries(d07Rewards).map(([id,rows])=>({key:'wish:d07-'+id,title:'心愿到货回复 · '+id,rows}))]};
function wishSources(s,day){
 return (wishesByDay[day]||[]).filter(g=>g.rows.length).map(g=>{
  const rows=sourceLines(g.rows).map(l=>({...l,text:scope(s,'wish:'+l.id)?.text??l.text}));
  const sent=rows.some(l=>(s.story55?.wishes?.story?.delivered||[]).includes(l.id)||
   Object.values(s.content?.conversations||{}).some(chats=>chats.some(c=>(c.messages||[]).some(m=>m.id===l.id))));
  return {key:g.key,type:'wish',day,channel:'wechat',chat:'group',title:g.title,at:'',
   timingLabel:'由原心愿／生活事件驱动，不按固定时间强制发送',
   deliveryLabel:'已有事件条件、逐条通知与实际消息 ID 均保留',
   lines:rows,reason:sent?'该组已有消息送达，避免改写正在进行的心愿记录；新周目可再编辑。':''};
 });
}
function nodeSources(s,day){
 const c=story55Config(s);
 return c.nodes.filter(n=>n.day===day&&Array.isArray(c.scenes?.[n.id])&&c.scenes[n.id].length).map(n=>({
  key:'node:'+n.id,day,type:'node',channel:n.channel||'story55',chat:n.conversationId||n.id,
  title:n.title+' · 主线场景',at:n.at||'',timingLabel:n.at?'达到 '+n.at+' 且满足剧情节点依赖':'由剧情节点前置条件决定，不定时自动弹出',
  deliveryLabel:n.delivery==='queued'?'原系统逐条排队，熙蒙亲自点击发送':'原 Story55 场景及确认流程',
  details:[n.requires?.length?'前置：'+n.requires.join('、'):'',n.call?'包含电话事件':''].filter(Boolean),
  lines:sourceLines(c.scenes[n.id].map(([who,text])=>({who,text}))),
  reason:s.story55?.completed?.[n.id]||s.story55?.scenes?.[n.id]?.index>0?'本周目该剧情节点已开始／完成，为保护剧情进度只读。':''
 }));
}
export function readChatSources(s,day){
 if(!Number.isInteger(day)||day<1||day>55)return [];
 return [...(day===1?d01Sources(s):[]),...trackSources(s,day),...wishSources(s,day),...nodeSources(s,day)];
}
export function daySourceSummary(s,day){
 const rows=readChatSources(s,day);
 return {day,count:rows.length,lines:rows.reduce((sum,row)=>sum+row.lines.length,0),
  nodeCount:story55Config(s).nodes.filter(n=>n.day===day).length};
}
export function findChatSource(s,key){
 for(let day=1;day<=55;day++){const row=readChatSources(s,day).find(x=>x.key===key);if(row)return row;}
 return null;
}
export function saveChatSource(s,key,input){
 const entry=findChatSource(s,key);
 if(!entry)throw Error('找不到预设聊天来源，未更改任何内容');
 if(s.story55?.version!==1)throw Error('请在55天周目中编辑剧情来源');
 if(entry.reason)throw Error(entry.reason);
 const texts=input?.lines;
 if(!Array.isArray(texts)||texts.length!==entry.lines.length)throw Error('消息条数不一致，不允许改变剧情消息ID或跳过玩家发送');
 const valid=texts.map((text,i)=>{
  const old=entry.lines[i];
  if(typeof text!=='string'||text.length>3000||(!text.trim()&&text!==old.text)||old.text===''&&text!=='')throw Error('第 '+(i+1)+' 条正文无效；不能改变专用空消息');
  if(old.kind!=='text'&&text!==old.text)throw Error('图片、电话或其他非文字消息请通过原素材入口修改');
  return {who:old.who,text};
 });
 s.story55.chatSceneEdits??={};
 if(entry.type==='track'){
  if(!TIME.test(input.at))throw Error('发送时间应为 HH:MM');
  const edited={at:input.at,lines:valid};
  if(trackSource(key))saveTrackValues(s,key,edited);
  else s.story55.chatSceneEdits[key]=edited;
 }else if(entry.type==='d01'){
  const lines=valid.map((x,i)=>entry.lines[i].after!==undefined?{...x,after:entry.lines[i].after}:x);
  s.story55.chatSceneEdits[key]={lines};
 }else if(entry.type==='wish'){
  for(let i=0;i<entry.lines.length;i++){
   const l=entry.lines[i];
   if(l.id&&l.kind==='text')s.story55.chatSceneEdits['wish:'+l.id]={text:valid[i].text};
  }
 }else if(entry.type==='node'){
  const id=key.slice(5),c=story55Config(s),node=c.nodes.find(n=>n.id===id);
  if(!node||!Array.isArray(c.scenes[id]))throw Error('剧情节点来源不存在');
  if(input.at!==''&&input.at!=null&&!TIME.test(input.at))throw Error('节点开始时间无效');
  c.scenes[id]=valid.map(l=>[l.who,l.text]);
  if(input.at)node.at=input.at;else delete node.at;
  // Author edits must survive rebuilding a game day or starting a new run.
  // Their runtime source remains story55.config.scenes, not a new dispatcher.
  s.story55.chatSceneEdits[key]={at:input.at||'',lines:valid};
 }
 return entry;
}
