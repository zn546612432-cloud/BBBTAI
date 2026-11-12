import {AUTHORED_CHAT_TRACKS} from '../../../../services/messaging/lifecycle/registry.js';
import {story55Config,date55} from '../../../../services/story55/state.js';
import {d01GroupScript,d01BrotherLines,d01GroupWait,D01_GROUP_BRANCHES} from '../../../../story/d01/wechat.js';
import {celebration,privateScenes as d06Private,rewardSets as d06Rewards} from '../../../../story/d06/wish-content.js';
import {nextDay,afternoonDay,extraDay,dinnerAfter,rewardSets as d07Rewards} from '../../../../story/d07/life-content.js';
import {saveTrackValues,trackSource} from '../../../../story/d14-d24/editor-overrides.js';
import {D06_DINNER_PLAYER_LINE} from '../../../../services/wishes/index.js';
import {GHOST_SHARE_DIALOGUES,ghostShareDialogue,ghostShareScriptStarted,TAI_GHOST_THREAD,TAI_REMOTE_TYPED_LINE} from '../../../../services/story55/ghost-share.js';

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
   const baseTexts=rows.map(line=>line.text),baseAt=at;
   const edited=scope(s,key);
   if(edited?.lines?.length===rows.length)rows=rows.map((l,i)=>({
    ...l,text:Array.isArray(edited.baseline)&&edited.baseline[i]===edited.lines[i].text
     ?l.text:edited.lines[i].text
   }));
   rows=rows.map((l,i)=>({...l,clock:edited?.lineTimes?.[i]||'',
    defaultClock:typeof d.historyClock==='function'?d.historyClock(i,s,q):i===0?at:''}));
   if(edited?.at)at=edited.at;
   const reason=alreadyStarted(s,track.name,d.id)?'本周目这段对话已经开始或生成消息；为了保护玩家记录，请在新的未播放周目修改。':failure;
   result.push({key,type:'track',day,channel:d.channel||'wechat',chat:d.chat,
    title:channelLabel(d.channel||'wechat',d.chat)+' · '+d.id,at:TIME.test(at)?at:'08:00',
    baseAt:TIME.test(baseAt)?baseAt:'08:00',baseTexts,atExplicit:!!edited?.at,
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
   lines:rows.map((x,i)=>({who:x.from,text:x.text,kind:'text',
     waitSeconds:d01GroupWait(rows,i)/1000,timeMode:'seconds'})),
   reason:s.story55?.d01?.group?.started?'本周目 D01 群聊已开始，不能覆盖正在播放的文案。':''};
 });
 return [...group,{key:'d01:brother',day:1,type:'d01',chat:'wang',channel:'wechat',
  title:'熙旺 · 独立私聊回复',at:'',
  timingLabel:'玩家先发「哥」，再连发三条，之后经过 2 游戏分钟',
  deliveryLabel:'玩家发言自行输入；熙旺分三段回复',
  lines:d01BrotherLines(s).map((x,i)=>({who:x.who,text:x.text,kind:'text',id:x.at,
    waitSeconds:i===1?x.gameMinutes:x.waitMs/1000,timeMode:i===1?'game-minutes':'seconds'})),
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
  const rows=sourceLines(g.rows).map(l=>({
   ...l,text:scope(s,'wish:'+l.id)?.text??l.text,
   clock:scope(s,'wish:'+l.id)?.clock||'',timeMode:'event-clock'
  }));
  const sent=rows.some(l=>(s.story55?.wishes?.story?.delivered||[]).includes(l.id)||
   Object.values(s.content?.conversations||{}).some(chats=>chats.some(c=>(c.messages||[]).some(m=>m.id===l.id))));
  return {key:g.key,type:'wish',day,channel:'wechat',chat:'group',title:g.title,at:'',
   timingLabel:'由原心愿／生活事件驱动，不按固定时间强制发送',
   deliveryLabel:'已有事件条件、逐条通知与实际消息 ID 均保留',
   lines:rows,reason:sent?'该组已有消息送达，避免改写正在进行的心愿记录；新周目可再编辑。':''};
 });
}
function scriptedPlayerSources(day){
 if(day!==6)return [];
 return [
  {key:'player:d06-celebrate',title:'钱包比赛获奖后 · 熙蒙主动分享',text:'兄弟们！我真的拿到 10 BTC 了！',trigger:'完成钱包比赛后，玩家必须亲自点击发送'},
  {key:'player:d06-dinner',title:'购买 D06 聚餐心愿后 · 熙蒙回复',text:D06_DINNER_PLAYER_LINE,trigger:'真实购买聚餐后，玩家必须亲自点击发送'}
 ].map(x=>({key:x.key,type:'scripted-player',day,channel:'wechat',chat:'group',title:x.title,
  at:'',timingLabel:x.trigger,deliveryLabel:'固定玩家草稿；不由定时器自动发出',
  lines:[{who:'me',text:x.text,kind:'text'}],
  reason:'玩家原生 Send 及购买前置不在此编辑器修改；本条只提供原稿阅读。'}));
}
function nodeSources(s,day){
 const c=story55Config(s);
 return c.nodes.filter(n=>n.day===day&&Array.isArray(c.scenes?.[n.id])&&c.scenes[n.id].length).map(n=>({
  key:'node:'+n.id,day,type:'node',channel:n.channel||'story55',chat:n.conversationId||n.id,
  title:n.title+' · 主线场景',at:n.at||'',timingLabel:n.at?'达到 '+n.at+' 且满足剧情节点依赖':'由剧情节点前置条件决定，不定时自动弹出',
  deliveryLabel:n.delivery==='queued'?'原系统逐条排队，熙蒙亲自点击发送':'原 Story55 场景及确认流程',
  details:[n.requires?.length?'前置：'+n.requires.join('、'):'',n.call?'包含电话事件':''].filter(Boolean),
  lines:sourceLines(c.scenes[n.id].map(([who,text])=>({who,text}))).map((l,i)=>({
   ...l,clock:s.story55?.chatSceneEdits?.['node:'+n.id]?.lineTimes?.[i]||'',
   timeMode:n.delivery==='queued'?'queued-clock':'scene-clock',
   clockLocked:['intrusion','ending'].includes(n.id)||['system','call','watch','camera','disconnect','credit','offline'].includes(l.who)
  })),
  reason:s.story55?.completed?.[n.id]||s.story55?.scenes?.[n.id]?.index>0?'本周目该剧情节点已开始／完成，为保护剧情进度只读。':''
 }));
}
export function readChatSources(s,day){
 if(!Number.isInteger(day)||day<1||day>55)return [];
 return [...(day===1?d01Sources(s):[]),...trackSources(s,day),...wishSources(s,day),...scriptedPlayerSources(day),...nodeSources(s,day),...ghostShareSources(s,day)];
}
function ghostShareSources(s,day){
 // One source entry per branch, listed at the earliest possible day. Runtime
 // availability is D15–D24, not a new D15 time trigger or duplicated script.
 if(day!==15)return [];
 const rows=Object.keys(GHOST_SHARE_DIALOGUES).map(script=>({
  key:'ghost-share:'+script,type:'ghost-share',day,channel:'mirage',chat:TAI_GHOST_THREAD,
  title:'GHOST 分享 · '+({first:'首次接管',second:'第二次接管',dailyYes:'日常接受',dailyNo:'日常拒絕'}[script]),
  at:'',timingLabel:'D15–D24 分享後，沿用在線時段、50% 判定及既有次數規則',
  deliveryLabel:'NPC 逐條排隊；熙蒙親自點擊發送',
  lines:ghostShareDialogue(s,script).map(([who,text])=>({who,text,kind:'text',clock:'',clockLocked:true})),
  reason:ghostShareScriptStarted(s,script)?'本周目此分享腳本已開始，原稿受保護；請在未播放周目編輯。':''
 }));
 rows.push({key:'ghost-share:remote-typing',type:'scripted-player',day,channel:'mirage',chat:TAI_GHOST_THREAD,
  title:'GHOST 首次接管 · 受控輸入',at:'',timingLabel:'首次合法接管開始後，由既有控制器輸入並提交',
  deliveryLabel:'經原 MIRAGE 表單送出',lines:[{who:'me',text:TAI_REMOTE_TYPED_LINE,kind:'text'}],
  reason:'固定接管動作，只提供原稿閱讀。'});
 return rows;
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
 // Every authored bubble can retain its own time; blank means follow the
 // original event-driven timing rather than generating a new timer.
 const times=input.times===undefined?entry.lines.map(x=>x.clock||''):input.times;
 if(!Array.isArray(times)||times.length!==entry.lines.length||
    times.some(t=>typeof t!=='string'||t!==''&&!TIME.test(t)))
  throw Error('逐句時間需要 HH:MM，或者留空沿用既有發送規則');
 if(entry.type==='track'||entry.type==='node'){
  let previous=entry.type==='track'?(input.at||entry.at):(input.at||entry.at||'00:00');
  // A later, independent scene in the same chat keeps its established place.
  // Per-bubble times cannot silently cross its original start time.
  let cutoff='23:59';
  if(entry.type==='track'){
   const parent=AUTHORED_CHAT_TRACKS.find(x=>x.track.name===entry.key.slice(0,3));
   const defs=parent?.track.defs||[],i=defs.findIndex(d=>entry.key===parent.track.name+':'+d.id);
   const current=defs[i];
   if(typeof current?.until==='string'&&TIME.test(current.until))cutoff=current.until;
   for(const later of defs.slice(i+1)){
    if(later.chat!==current?.chat||later.optional)continue;
    const q=progress(s,parent.track.name,later.id)||{};
    const nextTime=value(later.at,s,q)||later.fallback||later.early;
    if(TIME.test(nextTime)&&nextTime>(input.at||entry.at)&&nextTime<cutoff)cutoff=nextTime;
    break;
   }
  }
  for(let i=0;i<times.length;i++){
   if(entry.lines[i].clockLocked&&times[i]!==entry.lines[i].clock)
    throw Error('第 '+(i+1)+' 條是系統電話／固定節點，時間不能修改');
   if(times[i]){
    if(times[i]<previous)throw Error('第 '+(i+1)+' 條指定時間不能早於段落開始或上一條指定時間');
    if(entry.type==='track'&&times[i]>=cutoff)
     throw Error('第 '+(i+1)+' 條時間不能超過本段有效期／下一段開始 '+cutoff);
    previous=times[i];
   }
  }
 }
 s.story55.chatSceneEdits??={};
 if(entry.type==='ghost-share'){
  if(input.at||times.some(Boolean))throw Error('分享對話沿用事件觸發與原消息間隔，不能指定固定時間');
  s.story55.chatSceneEdits[key]={lines:valid};
 }else if(entry.type==='track'){
  const time=input.at==null?entry.baseAt:input.at;
  if(!TIME.test(time))throw Error('发送时间应为 HH:MM');
  const edited={at:time,lines:valid,...(times.some(Boolean)?{lineTimes:[...times]}:{})};
  if(trackSource(key))saveTrackValues(s,key,edited);
  else{
   const old=s.story55.chatSceneEdits[key];
   const atChanged=input.at!=null&&(time!==entry.baseAt||!!old?.at&&time===entry.at);
   const baseline=old?.baseline?.length===valid.length?old.baseline:entry.baseTexts;
   s.story55.chatSceneEdits[key]={...(atChanged?{at:time}:{}),lines:valid,baseline,...(times.some(Boolean)?{lineTimes:[...times]}:{})};
  }
 }else if(entry.type==='d01'){
  const waits=input.waits===undefined?entry.lines.map(x=>x.waitSeconds):input.waits;
  if(!Array.isArray(waits)||waits.length!==entry.lines.length)throw Error('D01每句等待時間數量不一致');
  const calibrated=waits.map((v,i)=>{
   const n=Number(v),game=entry.lines[i].timeMode==='game-minutes';
   if(!Number.isFinite(n)||n<(game?1:0.5)||n>(game?120:3600)||Math.abs(Math.round(n*100)-n*100)>0.001)
    throw Error('第 '+(i+1)+' 條等待時間無效（秒數最多3600，遊戲分鐘最多120）');
   return game?n:Math.round(n*1000);
  });
  const revision={lines:valid};
  if(key==='d01:brother'){
   if(calibrated.some((x,i)=>x!==[850,2,1500][i]))revision.timing=calibrated;
  }else{
   const previous=s.story55.chatSceneEdits?.[key]?.waitMs||[];
   const original=entry.lines.map((x,i)=>previous[i]??Math.round(x.waitSeconds*1000));
   const active=calibrated.map((ms,i)=>ms!==original[i]||Number.isFinite(previous[i])?ms:null);
   if(active.some(Number.isFinite))revision.waitMs=active;
  }
  s.story55.chatSceneEdits[key]=revision;
 }else if(entry.type==='wish'){
  for(let i=0;i<entry.lines.length;i++){
   const l=entry.lines[i];
   if(!l.id)continue;
   const key='wish:'+l.id;
   s.story55.chatSceneEdits[key]={
    ...(l.kind==='text'?{text:valid[i].text}:{}),
    ...(times[i]?{clock:times[i]}:{})
   };
  }
 }else if(entry.type==='node'){
  const id=key.slice(5),c=story55Config(s),node=c.nodes.find(n=>n.id===id);
  if(!node||!Array.isArray(c.scenes[id]))throw Error('剧情节点来源不存在');
  if(input.at!==''&&input.at!=null&&!TIME.test(input.at))throw Error('节点开始时间无效');
  c.scenes[id]=valid.map(l=>[l.who,l.text]);
  if(input.at)node.at=input.at;else delete node.at;
  // Author edits must survive rebuilding a game day or starting a new run.
  // Their runtime source remains story55.config.scenes, not a new dispatcher.
  s.story55.chatSceneEdits[key]={at:input.at||'',lines:valid,
   ...(times.some(Boolean)?{lineTimes:[...times]}:{})};
 }
 return entry;
}
