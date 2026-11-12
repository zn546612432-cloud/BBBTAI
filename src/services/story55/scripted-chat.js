// Scripted dialogue always belongs to the real messaging UI.
// Player lines are offered in the native text composer and sent ONLY after
// the player presses Send. Other characters deliver their own messages over time.
import {isStory55,nodeStatus,story55Config,nodeById} from './state.js';
import {scene55,sceneLines,advanceScene55,questions55,sendQuestion55,plannedSceneLineClock55} from './runtime.js';
import {FLOW_CONTACT,flowDraft,sendFlowReply} from './flow-d03.js';
import {ghostShareScriptLine,sendGhostShareDraft} from './ghost-share.js';
import {endingReplyDue55} from './finale.js';

const WECHAT=new Set(['intro','return','move','show','target','confide','failure','ready']);
const NOAPP=new Set(['recognition','paris','ending']);
export function threadForScene55(id,s){
 const n=nodeById(s,id);
 if(n?.channel&&n.conversationId)return {channel:n.channel,conversationId:n.conversationId};
 if(WECHAT.has(id))return {channel:'wechat',conversationId:'group'};
 if(NOAPP.has(id))return {channel:'noapp',conversationId:'tai'};
 return {channel:'mirage',conversationId:'s55-ouroboros'};
}
export function currentScript55(s,channel,conversationId){
 if(!isStory55(s)||s.story55.ended)return null;
 if(channel==='mirage'&&conversationId===FLOW_CONTACT){const flow=flowDraft(s);if(flow)return flow;}
 if(channel==='mirage'&&conversationId==='s55-ouroboros'&&
     nodeStatus(s,'questions').state==='ready'&&
     s.story55.questions<questions55.length&&
     (!s.story55.activeScene||s.story55.activeScene==='questions'||s.story55.previewNode==='questions')){
  const index=s.story55.questions;
  return {id:'questions',index,kind:'me',text:questions55[index],channel,conversationId};
 }
  const all=story55Config(s).nodes.filter(n=>n.kind==='scene');
 const current=s.story55.activeScene;
 const preview=s.story55.previewNode;
 const prioritized=[current,preview].filter(Boolean);
 const order=[...prioritized.map(id=>all.find(n=>n.id===id)).filter(Boolean),
   ...all.filter(n=>!prioritized.includes(n.id)).sort((a,b)=>a.day-b.day)];
 for(const n of order){
  if(n.id==='intro'&&s.day===1&&!s.story55?.previewNode)continue;
   const t=threadForScene55(n.id,s);
  if(t.channel!==channel||t.conversationId!==conversationId)continue;
  if(n.id==='recognition'&&!s.story55.noappInstalled)continue;
  if(nodeStatus(s,n.id).state!=='ready')continue;
  const progress=scene55(s,n.id),lines=sceneLines(s,n.id);
  const index=progress.index||0;
  if(index>=lines.length)continue;
  if(n.id==='ending'&&index===6&&!endingReplyDue55(s))continue;
  const [kind,text]=lines[index];
  const clock=n.delivery==='queued'&&kind==='me'?plannedSceneLineClock55(s,n.id,index):null;
  if(clock&&s.clock<clock)continue; // Only offer the native player draft once it is due.
  return {id:n.id,index,kind,text,channel,conversationId,managed:!!n.call&&(kind==='call'||progress.accepted===true)};
 }
 if(channel==='mirage'&&conversationId==='s55-ouroboros')return ghostShareScriptLine(s);
 return null;
}
export function scriptedDraft55(s,channel,conversationId){
 const line=currentScript55(s,channel,conversationId);
 return line?.kind==='me'&&!s.phoneCall?.speaking&&!s.phoneCall?.resumeRequired?line:null;
}
export function sendScriptedDraft55(s,channel,conversationId,text){
 const line=currentScript55(s,channel,conversationId);
 if(!line||line.kind!=='me'||s.phoneCall?.speaking||s.phoneCall?.resumeRequired)throw Error('当前没有等待熙蒙发送的预设消息');
 if(String(text||'').trim()!==line.text.trim())throw Error('訊息未發送');
 if(line.id==='ghost-share')sendGhostShareDraft(s,text);
 else if(line.id==='flow-d03')sendFlowReply(s,text);
 else if(line.id==='questions')sendQuestion55(s);
 else advanceScene55(s,line.id);
 if(s.drafts)s.drafts[conversationId]='';
 return line.id;
}
