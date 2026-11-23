import {d01Gate} from '../../story/d01/runtime.js';
import {STORY55_CONFIG} from '../../story/story55/catalog.js';
import {GHOST_CAR_MODEL_FILES} from '../../story/d35-d40/progress.js';
import {modelDelivered} from './ghost-car.js';
import {TIMED_SCRIPTED_CALLS} from '../../story/d34-d42/definition.js';
import {D45_CALL} from '../../story/d45/definition.js';
import {NATIVE_PHONE_CALLS} from '../../story/phone-calls.js';
import {fixedSceneTimeline} from './fixed-timeline.js';
import {isD41Chess,d41ChessComplete} from '../../story/d34-d42/d41-chess.js';
export const isStory55=s=>s?.story55?.version===1;
export const story55Config=s=>s?.story55?.config||STORY55_CONFIG;
export const nodeById=(s,id)=>story55Config(s).nodes.find(n=>n.id===id);
export const projectById=(s,id)=>story55Config(s).projects.find(n=>n.id===id);
export const completed=(s,id)=>!!s?.story55?.completed&&Object.hasOwn(s.story55.completed,id);
export const identityMessagesReady=s=>s.day>=33&&completed(s,'ig');
export function identityReplyMode55(s){
 if(!identityMessagesReady(s))return null;
 const saved=s.story55.scenes?.questions?.openingMode;
 if(saved)return saved;
 const replyDay=s.story55.identityContact?.replyDay;
 if(Number.isInteger(replyDay)&&replyDay<=34&&replyDay<=s.day)return 'normal';
 if(s.day>34||(s.day===34&&s.clock>='08:00'))return 'fallback';
 return null;
}
export function observeIdentityMirageSend(s){
 if(!isStory55(s)||!identityMessagesReady(s))return;
 if(completed(s,'photo')&&completed(s,'questions')){
  s.story55.identityInviteRequested=true;return;
 }
 if(completed(s,'questions'))return;
 const r=s.story55.identityContact??={count:0};
 if(r.count<4){r.count++;if(r.count===4)r.replyDay=s.day+1;}
}
// Share the existing overnight mainline checkpoint with the unified clock
// and charging rules. Only explicitly marked scenes hold the story at 03:00.
export const overnightSceneGate55=s=>isStory55(s)
 ?story55Config(s).nodes.find(n=>n.holdAt03===true&&n.gateDay===s.day&&!completed(s,n.id))||null
 :null;
export const overnightSceneNight55=s=>isStory55(s)&&s.story55?.overnightHold?.day===s.day&&s.story55.overnightHold.nightAfterMidnight===true;
const minuteOf=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
export const storyDayMinute=s=>minuteOf(s.clock)+(overnightSceneNight55(s)||s.day===23&&s.story55?.d23?.nightAfterMidnight||s.day===1&&s.story55?.d01?.nightAfterMidnight?1440:0);
export function scriptedCallPlayed(s,event){
 if(s.story55?.scriptedCallCompleted?.[event.id])return true;
 // Existing saves may predate the completion marker. Only a real recorded
 // call containing its final authored line is evidence of completion.
 if(!s.story55?.[event.triggerKey])return false;
 const last=event.steps?.at(-1)?.[1]||event.lines?.at(-1);
 return !!last&&!!s.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages?.some(m=>m.kind==='call'&&m.day===event.day&&m.transcript?.includes(last));
}
export function timedStoryEventComplete(s,event){
 if(!event.triggerKey)return completed(s,event.id);
 return scriptedCallPlayed(s,event)&&(!event.completionMatch||s.matches?.some(m=>m.invitationId===event.completionMatch&&(isD41Chess(m)?d41ChessComplete(m):m.status==='finished')));
}
// One declarative gate for native scenes and calls; completion remains owned
// by the actual App action, not by the clock or a second scheduler.
export function timedStoryEvents(s){
 return [...story55Config(s).nodes,...TIMED_SCRIPTED_CALLS,D45_CALL,...NATIVE_PHONE_CALLS].filter(n=>typeof n.at==='string'&&n.pauseTimeUntilComplete===true);
}
export function pendingTimedStoryEvent(s){
 if(!isStory55(s)||s.story55.ended)return null;
 return timedStoryEvents(s).filter(n=>n.day===s.day&&!timedStoryEventComplete(s,n))
  .map(n=>({...n,minute:minuteOf(n.at)+(n.afterMidnight?1440:0)})).sort((a,b)=>a.minute-b.minute)[0]||null;
}
export function timedStoryPaused(s){
 if(recognitionCallDue(s))return true;
 const n=pendingTimedStoryEvent(s);if(n&&storyDayMinute(s)>=n.minute)return true;
 const active=s.story55?.activeScene;
 return !!active&&fixedSceneTimeline(nodeById(s,active))&&(s.story55.scenes?.[active]?.index||0)>0&&!completed(s,active)&&nodeStatus(s,active).state==='ready';
}
export const taiRecognized=s=>isStory55(s)?completed(s,'recognition'):s.day>=56;
export const recognitionCallDue=s=>isStory55(s)&&!s.story55.ended&&s.story55.noappInstalled===true&&nodeStatus(s,'recognition').state==='ready';
export const final55=s=>isStory55(s)&&!!s.story55.ended;
export function nodeStatus(s,id){
 const n=nodeById(s,id);if(!n)return {state:'missing',reason:'不存在的节点'};
 if(completed(s,id))return {state:'done',reason:'已完成'};
 if(final55(s))return {state:'locked',reason:'第一视角已结束'};
 if(n.authoredPending)return {state:'locked',reason:'等待後續劇情'};
 if(s.day<n.day)return {state:'locked',reason:`等待D${n.day}`};
 if(n.optional&&(s.day>n.throughDay||s.day===n.throughDay&&overnightSceneNight55(s)))return {state:'locked',reason:'已過聊天時間'};
 if(n.afterMidnight&&s.day===n.day&&(!overnightSceneNight55(s)||s.clock<n.at))return {state:'locked',reason:`等待次日 ${n.at}`};
 if(n.requiresModels&&!GHOST_CAR_MODEL_FILES.every(f=>modelDelivered(s,f.id)))return {state:'locked',reason:'等待數字人與數字車輛交付'};
 if(n.at&&s.day===n.day&&(s.clock||'00:00')<n.at&&!(id==='d23-chess'&&s.story55?.d23?.nightAfterMidnight)&&!(overnightSceneNight55(s)))return {state:'locked',reason:`等待 ${n.at}`};
 if(n.authorizedProject&&!s.story55?.projects?.[n.authorizedProject]?.authorized)return {state:'locked',reason:'等待本地專案部署'};
 if(id==='loan'&&!s.story55?.projects?.base?.batches?.[0]?.complete)return {state:'locked',reason:'等待D14基础框架首次运行报告'};
 if(n.requiresContact&&!s.content?.conversations?.[n.channel]?.some(c=>c.id===n.conversationId))return {state:'locked',reason:'聯絡人尚未解鎖'};
 if(n.requiresScriptedCall===D45_CALL.id&&!scriptedCallPlayed(s,D45_CALL))return {state:'locked',reason:'等待孤兒院通話結束'};
 const nativeCall=NATIVE_PHONE_CALLS.find(call=>call.id===n.requiresScriptedCall);
 if(nativeCall&&!scriptedCallPlayed(s,nativeCall))return {state:'locked',reason:'等待通話結束'};
 if(id==='d29-chess'&&!s.story55.d29ChessOpened)return {state:'locked',reason:'等待打開國際象棋'};
 if(id==='plan'&&!s.story55.d29ChessExited)return {state:'locked',reason:'等待棋局結束'};
 if(id==='questions'&&!identityReplyMode55(s))return {state:'locked',reason:'等待對方回覆'};
 if(id==='invite'&&!s.story55.identityInviteRequested)return {state:'locked',reason:'等待聯絡銜尾蛇'};
 if(id==='d23-chess-finish'&&s.story55?.d23Postgame?.phase!=='closing')
  return {state:'locked',reason:'等待 Mirage 賽後交流'};
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
 if(pendingTimedStoryEvent(s))return 'plot';
 // Every day's LINK and explicit equipment payment must settle before
 // advancing; the existing overnight hold handles the 03:00 2% state.
 if(s.day>=14&&s.day<=24&&!completed(s,'base')&&!s.story55.projects?.base?.batches?.[s.day-14]?.complete)return 'plot';
 return story55Config(s).nodes.some(n=>Number.isInteger(n.gateDay)&&n.gateDay<=s.day&&!completed(s,n.id)&&!(n.id==='recognition'&&(s.story55.identityContact?.replyDay>s.day||!completed(s,'identity')&&s.story55.projects?.identity?.batches?.some(b=>b?.complete&&b.day===s.day))))?'plot':null;
}

// D13 is a waiting day until the 22:10 KIRA mail. The D13 exhibition and
// wallet/call sequence must not force the player to idle all afternoon.
// Short charge never changes the date, never completes these nodes and still
// stops for an active scene; long charge remains gated by the story tree.
const D13_WAITING_NODES=new Set(['exhibition','d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer','intrusion']);
export function story55ShortChargeGate(s){
 // Daily LINK checks gate overnight advancement only; short charging keeps
 // the pre-existing scene gates and does not mark a test or payment done.
 if(isStory55(s)&&s.day>=14&&s.day<=24){
  if(d01Gate(s))return 'plot';
  return story55Config(s).nodes.some(n=>Number.isInteger(n.gateDay)&&n.gateDay<=s.day&&!completed(s,n.id))?'plot':null;
 }
 if(!isStory55(s)||s.day!==13)return story55ChargeGate(s);
 if(d01Gate(s))return 'plot';
 return story55Config(s).nodes.some(n=>Number.isInteger(n.gateDay)&&n.gateDay<=s.day&&!completed(s,n.id)&&!D13_WAITING_NODES.has(n.id))?'plot':null;
}
