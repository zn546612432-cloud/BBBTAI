#!/usr/bin/env node
// Plan-time validator only. Passing is NOT proof that runtime events have been wired.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const DAY0=Date.UTC(2025,4,19);
const stages=new Set(['draft','review','approved','example']);
const scopes=new Set(['main','optional','mixed']);
const kinds=new Set(['incoming-text','incoming-image','player-send','purchase',
 'commission','system-notice','moment','email','reminder','delivery','reward','link']);
const owners=new Set(['story55','messaging','wishes','commissions','bank','reminders',
 'assets','notifications','moments','time','mirage','ghost','kira','noapp']);
const surfaces=new Set(['wechat','mirage','ghost','kira','bank','reminders','moments',
 'sms','phone','noapp','calendar','photos','home','system']);
const triggers=new Set(['day-time','node-completed','user-action','user-send',
 'previous-event','order-delivered','bank-posted','manual-submit','message-read']);
const checkKinds=new Set(['trigger','negative','idempotency','save-restore',
 'cross-app','late-entry','assets','date-clock','dialogue','delivery','finance','mobile']);
const requiredChecks=['trigger','negative','idempotency','save-restore',
 'cross-app','late-entry','assets','date-clock'];
const identifier=/^[a-z][a-z0-9-]{2,80}$/;
const hhmm=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const nonempty=x=>typeof x==='string'&&!!x.trim();
const gameDate=day=>new Date(DAY0+(day-1)*86400000).toISOString().slice(0,10);
const forbiddenGroupSenders=new Set(['熙泰','陈熙泰','傅隆生','tai','father']);

export function validateStoryPacket(p,{strict=false}={}){
 const errors=[],warnings=[];
 const error=(where,msg)=>errors.push(where+': '+msg);
 const warn=(where,msg)=>warnings.push(where+': '+msg);
 if(!obj(p))return {ok:false,errors:['root: 需要 JSON 对象'],warnings,summary:null};
 if(p.schemaVersion!==1)error('schemaVersion','必须为 1');
 if(!Number.isInteger(p.day)||p.day<1||p.day>55)error('day','必须是 D01–D55');
 else if(p.date!==gameDate(p.day))error('date','游戏日对应日期必须为 '+gameDate(p.day));
 if(!nonempty(p.title))error('title','缺少标题');
 if(!stages.has(p.stage))error('stage','必须为 draft/review/approved/example');
 if(!scopes.has(p.scope))error('scope','必须为 main/optional/mixed');
 if(!Array.isArray(p.systems)||!p.systems.length)error('systems','列出要复用的现有系统');
 else{
  p.systems.forEach((x,i)=>{if(!owners.has(x))error('systems['+i+']','未知已有系统 '+x)});
  if(new Set(p.systems).size!==p.systems.length)error('systems','系统名称重复');
 }
 const assets=Array.isArray(p.assets)?p.assets:[];
 if(!Array.isArray(p.assets))error('assets','必须是数组');
 const assetsSeen=new Set();
 assets.forEach((a,i)=>{
  const at='assets['+i+']';
  if(!obj(a)){error(at,'必须是对象');return;}
  if(!identifier.test(a.id||''))error(at+'.id','素材 ID 应为 kebab-case');
  if(assetsSeen.has(a.id))error(at+'.id','重复 ID');
  assetsSeen.add(a.id);
  if(!['supabase-public','bundled-local'].includes(a.source))error(at+'.source','必须是 supabase-public 或 bundled-local');
  if(!nonempty(a.path)||/^(?:https?:\/\/|data:|blob:)/i.test(a.path||''))
   error(at+'.path','只填储存对象路径，URL 在统一资源管理器解析');
  if(a.source==='supabase-public'&&!/^ximeng-assets\/[a-z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/i.test(a.path||''))
   error(at+'.path','Supabase 路径应类似 ximeng-assets/d08/meal.jpg');
  if(a.source==='bundled-local'&&!/^public\/[a-z0-9/_-]+\.(?:jpg|jpeg|png|webp|svg|mp3|mp4)$/i.test(a.path||''))
   error(at+'.path','本地素材路径必须以 public/ 起始');
 });
 const events=Array.isArray(p.events)?p.events:[];
 if(!Array.isArray(p.events))error('events','必须是数组');
 const seen=new Set(),transactions=new Set(),eventTimes=new Map();
 events.forEach((e,i)=>{
  const at='events['+i+']';
  if(!obj(e)){error(at,'必须是对象');return;}
  if(!identifier.test(e.id||''))error(at+'.id','需要稳定 kebab-case ID');
  if(seen.has(e.id))error(at+'.id','ID 重复: '+e.id);
  if(!kinds.has(e.kind))error(at+'.kind','未知事件类型 '+e.kind);
  if(!owners.has(e.owner))error(at+'.owner','必须使用现有统一系统: '+e.owner);
  if(!surfaces.has(e.surface))error(at+'.surface','未知手机界面 '+e.surface);
  if(e.once!==true)error(at+'.once','必须显式 once:true，防重复');
  if(!nonempty(e.actor))error(at+'.actor','需要执行者或发言人');
  const chat=['wechat','mirage','noapp'].includes(e.surface)&&
   ['incoming-text','incoming-image','player-send'].includes(e.kind);
  if(chat&&!nonempty(e.thread))error(at+'.thread','需要真实聊天 thread ID');
  if(e.surface==='wechat'&&e.thread==='group'&&forbiddenGroupSenders.has(e.actor))
   error(at+'.actor','熙泰和傅隆生不在狼崽团');
  if(['incoming-text','incoming-image'].includes(e.kind)&&e.actor==='me')
   error(at+'.actor','入站消息不能代玩家发言');
  if(e.kind==='player-send'){
   if(e.delivery?.late==='replay')error(at+'.delivery','玩家消息不得跨日自动补发或重放');
   if(e.actor!=='me')error(at+'.actor','玩家发言必须是 me');
   if(e.trigger?.type!=='user-send')error(at+'.trigger','玩家发言只允许由原生 Send 触发');
   if(!nonempty(e.text))error(at+'.text','玩家预填台词不能为空');
  }
  if(e.kind==='incoming-text'&&!nonempty(e.text))error(at+'.text','NPC 台词不能为空');
  if(e.kind==='incoming-image'&&!assetsSeen.has(e.assetId))
   error(at+'.assetId','图片必须引用本包已登记素材');
  if(e.kind==='purchase'){
   if(!obj(e.money)||e.money.operation!=='payBankPurchase'||
       e.money.currency!=='USD'||!Number.isFinite(e.money.amount)||
       e.money.amount>=0||Math.abs(e.money.amount*100-Math.round(e.money.amount*100))>1e-7)
    error(at+'.money','付款通过 payBankPurchase，用负数 USD 和美分精度');
   if(!identifier.test(e.money?.transactionId||''))error(at+'.money.transactionId','需要稳定交易 ID');
   if(transactions.has(e.money?.transactionId))error(at+'.money.transactionId','重复交易 ID');
   if(e.money?.transactionId)transactions.add(e.money.transactionId);
  }else if(e.money!==undefined)error(at+'.money','普通对白禁止直接产生银行副作用');
  if(!obj(e.trigger)||!triggers.has(e.trigger.type)||!nonempty(e.trigger.ref))
   error(at+'.trigger','需要明确 trigger.type/ref');
  if(e.kind!=='player-send'&&e.trigger?.type==='user-send')
   error(at+'.trigger','只有玩家消息可以使用 user-send');
  if(e.trigger?.type==='previous-event'&&!seen.has(e.trigger.ref))
   error(at+'.trigger.ref','previous-event 必须引用已定义的较早事件');
  if(e.trigger?.type==='user-send'&&!seen.has(e.trigger.ref)&&
      !/^fact:[a-z0-9-]+$/.test(e.trigger.ref||''))
   error(at+'.trigger.ref','user-send 必须依赖已发生的事件/事实，不能凭空发送');
  if(!obj(e.timing)||!Number.isInteger(e.timing.day)||
      e.timing.day<p.day||e.timing.day>55||
      !(e.timing.at==='on-trigger'||hhmm.test(e.timing.at||'')))
   error(at+'.timing','执行日必须为本日或未来D55以内，时间为 HH:MM 或 on-trigger');
  if(e.trigger?.type==='day-time'&&hhmm.test(e.trigger.ref||'')&&
      e.timing?.at!==e.trigger.ref)
   error(at+'.timing','day-time 触发时刻必须与执行时刻一致');
  if(!Array.isArray(e.requires))error(at+'.requires','必须声明前置事件（可以是空数组）');
  else for(const ref of e.requires){
   if(!nonempty(ref)){error(at+'.requires','不允许空依赖');continue;}
   if(!/^(?:node|fact|wallet|legacy):[a-z0-9-]+$/.test(ref)&&!seen.has(ref))
    error(at+'.requires','前置必须先定义，或是 node:/fact:/wallet:/legacy: 事实：'+ref);
   if(ref===e.id)error(at+'.requires','事件不可依赖自身');
  }
  if(e.kind==='player-send'&&seen.has(e.trigger?.ref)&&
      !e.requires?.includes(e.trigger.ref))
   error(at+'.requires','玩家发送必须显式声明触发它的前置事件');
  // Cross-day delivery is allowed (buy on D06, receive on D08), but is never
  // allowed to precede the day/time of a prerequisite.
  if(Array.isArray(e.requires)&&obj(e.timing)){
   for(const ref of e.requires){
    const previous=eventTimes.get(ref);
    if(!previous)continue;
    if(e.timing.day<previous.day)
     error(at+'.timing','发生在前置事件之前：'+ref);
    if(e.timing.day===previous.day&&
       hhmm.test(e.timing.at||'')&&hhmm.test(previous.at||'')&&
       e.timing.at<previous.at)
     error(at+'.timing','同一天执行时间早于前置事件：'+ref);
   }
  }
  if(!obj(e.delivery)||!['silent','skip','replay'].includes(e.delivery.late))
   error(at+'.delivery','必须指定跨日处理 late:silent/skip/replay');
  if(e.delivery?.delaySeconds!==undefined&&(!Number.isFinite(e.delivery.delaySeconds)||
     e.delivery.delaySeconds<0||e.delivery.delaySeconds>86400))
   error(at+'.delivery.delaySeconds','延迟必须在0–86400秒');
  if(p.stage==='approved'&&/(?:TODO|TBD|待填写|占位|<placeholder>|\.\.\.)/i.test(e.text||''))
   error(at+'.text','approved 剧情不能包含占位文案');
  if(!seen.has(e.id))eventTimes.set(e.id,e.timing);
  seen.add(e.id);
 });
 if(p.stage==='approved'&&!events.length)error('events','批准的内容不能为空');
 if(!Array.isArray(p.acceptance))error('acceptance','必须是验收数组');
 else{
  const found=new Set(),checkIds=new Set();
  p.acceptance.forEach((a,i)=>{
   const at='acceptance['+i+']';
   if(!obj(a)||!identifier.test(a.id||''))error(at+'.id','需要唯一 kebab-case 验收 ID');
   else if(checkIds.has(a.id))error(at+'.id','验收 ID 重复');
   else checkIds.add(a.id);
   if(!checkKinds.has(a?.type))error(at+'.type','未知验收类别');
   else found.add(a.type);
   if(!nonempty(a?.verify))error(at+'.verify','说明具体测试动作及断言');
  });
  if(p.stage==='approved'||strict)
   requiredChecks.filter(t=>!found.has(t)).forEach(t=>error('acceptance','缺少验收类型 '+t));
 }
 if(p.stage==='draft'&&!events.length)warn('events','空的 Dxx 模板只代表待填内容');
 if(p.stage==='example')warn('stage','示例仅用于演示，不被手机运行时读取');
 return {ok:errors.length===0,errors,warnings,summary:{
  day:p.day,date:p.date,stage:p.stage,events:events.length,
  assets:assets.length,checks:p.acceptance?.length||0
 }};
}

function main(args){
 const strict=args.includes('--strict');
 const paths=args.filter(x=>x!=='--strict');
 if(!paths.length){console.error('用法: node scripts/validate-story-packet.mjs [--strict] <packet.json>');process.exitCode=2;return;}
 for(const f of paths){
  try{
   const result=validateStoryPacket(JSON.parse(readFileSync(resolve(f),'utf8')),{strict});
   for(const w of result.warnings)console.warn('WARN '+f+' '+w);
   for(const e of result.errors)console.error('ERROR '+f+' '+e);
   console.log((result.ok?'PASS ':'FAIL ')+f+' '+JSON.stringify(result.summary));
   if(!result.ok)process.exitCode=1;
  }catch(e){console.error('ERROR '+f+': '+e.message);process.exitCode=1;}
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main(process.argv.slice(2));
