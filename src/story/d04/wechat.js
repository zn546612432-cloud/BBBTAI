// D04 · 2025-05-22. All NPC lines are deterministic and persisted in WeChat.
// Group chat never waits for the player. Private chats wait at player turns
// without inventing messages the protagonist never sent.
import {D04_GROUP,D04_PRIVATE} from './dialogue.js';
import {publicWeChatAsset} from '../../apps/wechat/avatars.js';
import {deliverAuthoredIncoming} from '../../services/messaging/authored-incoming.js';

const DAY=4,DATE='2025-05-22',PAUSE=1900;
const VIDEO_EXTRA_LINES=['？','你看見什麼了','不是，你真看了？','阿蒙？？？'];
export const D04_MEDIA={
 d04Cat:publicWeChatAsset('media/d04-cat.webp'),
 d04Jacket:publicWeChatAsset('media/d04-jacket.webp')
};
const inTimeline=s=>s.story55?.version===1&&s.day>=DAY;
const active=s=>s.story55?.version===1&&s.day===DAY;
const sceneState=(s,id)=>s.story55?.d04Chats?.[id];
const convo=(s,id)=>s.content?.conversations?.wechat?.find(x=>x.id===id);
const visible=(s,id)=>s.unlocked&&s.nav?.current?.appId==='wechat'&&s.nav.current.route==='/chat/'+id;
const minutes=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
function sceneClock(scene,index){
 const fixed={
  morning:[[0,'08:20'],[11,'08:37'],[17,'08:51']],
  earbuds:[[0,'09:35'],[14,'09:43']],
  lunch:[[0,'12:10'],[14,'12:23']],
  cat:[[0,'13:25'],[12,'13:38']],
  'night-games':[[0,'22:30'],[14,'22:42'],[19,'23:05']]
 }[scene.id];
 if(!fixed)return scene.at;
 let value=scene.at;
 for(const [at,clock] of fixed)if(index>=at)value=clock;
 return value;
}
export function d04DinnerConfirmed(s){
 const d=s.story55?.d04Chats;
 return !!(d?.dinnerConfirmed&&d.dinnerAcceptedAt&&d.dinnerAcceptedAt<='18:30');
}
function sceneAllowed(s,scene){
 if(scene.condition==='dinner')return d04DinnerConfirmed(s);
 if(scene.condition==='no-dinner')return !d04DinnerConfirmed(s);
 return true;
}
const sceneDue=(s,scene)=>s.day>DAY||s.day===DAY&&minutes(s.clock)>=minutes(scene.at);
function ensure(s){
 const map=s.story55.d04Chats??(s.story55.d04Chats={});
 for(const scene of [...D04_GROUP,...D04_PRIVATE])
  map[scene.id]??={started:false,index:0,nextAt:null,completed:false,skipped:false};
 return map;
}
function push(s,scene,index,{who,kind,text},notification=true){
 const c=convo(s,scene.chat);if(!c)return false;
 const id='d04-'+scene.id+'-'+index;
 if(c.messages.some(m=>m.id===id))return false;
 // Never stamp a bubble with a future fictional time it has not reached.
 // The configured scene clock is a publishing threshold; delivery is real.
 const time=s.day===DAY?s.clock:sceneClock(scene,index);
 c.messages.push({id,from:who,kind,text:kind==='image'?D04_MEDIA[text]||publicWeChatAsset('media/fabric-swatches.webp'):text,
  day:DAY,time,sentDate:DATE,actual:true,storyD04:true});
 if(notification)deliverAuthoredIncoming(s,{conversationId:c.id,from:who,text,kind,
  messageId:id,day:DAY,clock:time});
 s.events??=[];
 s.events.push({type:who==='me'?'message_sent':'authored_message_delivered',
  channel:'wechat',conversationId:c.id,messageId:id,day:DAY,clock:time});
 return true;
}
function finish(q){q.completed=true;q.nextAt=null;}
function advance(s,scene,q,now){
 if(q.index>=scene.lines.length){finish(q);return true;}
 const line=scene.lines[q.index];
 if(line.who==='me'){q.nextAt=null;return false;}
 const changed=push(s,scene,q.index,line);
 q.index++;
 if(q.index>=scene.lines.length)finish(q);
 else if(scene.lines[q.index].who==='me')q.nextAt=null;
 else q.nextAt=now+PAUSE;
 return changed;
}
export function tickD04Chats(s,now=Date.now()){
 if(!inTimeline(s))return false;
 const progress=ensure(s);let changed=false;
 // One global queue for the entire family group, irrespective of which app
 // is open. In particular, never seed dozens of bubbles in a single tick.
 // The next due scene cannot overtake a conversation still being delivered.
 for(const scene of D04_GROUP){
  const q=progress[scene.id];
  if(q.completed||q.skipped)continue;
  if(!q.started&&!sceneDue(s,scene))break;
  // Allow a real reply to the brother's dinner invitation until 18:30.
  // Do not fabricate dinner or its negative alternative before that window.
  if(!q.started&&(scene.condition==='dinner'||scene.condition==='no-dinner')
   &&s.day===DAY&&s.clock<'18:31'&&!d04DinnerConfirmed(s))break;
  if(!q.started){
   if(!sceneAllowed(s,scene)){q.skipped=true;changed=true;continue;}
   q.started=true;q.nextAt=now+450;changed=true;
  }
  if(q.nextAt!==null&&now>=q.nextAt){
   changed=advance(s,scene,q,now)||changed;
  }
  break; // No second NPC bubble in this tick, even while outside WeChat.
 }
 const extra=progress.videoExtras;
 if(extra&&!extra.completed&&now>=extra.nextAt){
  const reply=VIDEO_EXTRA_LINES[extra.index];
  const temp={id:'video-extra',chat:'group',at:s.clock};
  changed=push(s,temp,extra.index,{who:'胡枫',kind:'text',text:reply})||changed;
  extra.index++;
  if(extra.index>=VIDEO_EXTRA_LINES.length){extra.completed=true;extra.nextAt=null;}
  else extra.nextAt=now+PAUSE;
 }
 if(!active(s))return changed;
 for(const scene of D04_PRIVATE){
  const q=progress[scene.id];
  if(q.completed||q.skipped||!sceneDue(s,scene))continue;
  if(!q.started){
   if(!sceneAllowed(s,scene)){q.skipped=true;changed=true;continue;}
   // Never overwrite a pending player-authored draft with a newer scene.
   // Later private dialogue starts once the earlier exchange is actually sent.
   if(D04_PRIVATE.some(x=>x.chat===scene.chat&&x.at<scene.at
    &&progress[x.id]?.started&&!progress[x.id]?.completed))continue;
   q.started=true;q.nextAt=now;changed=true;
  }
  if(q.nextAt!==null&&now>=q.nextAt)changed=advance(s,scene,q,now)||changed;
 }
 return changed;
}
export function d04ChatDue(s,now=Date.now()){
 if(!inTimeline(s))return false;
 const progress=s.story55?.d04Chats||{};
 if(progress.videoExtras&&!progress.videoExtras.completed&&now>=progress.videoExtras.nextAt)return true;
 return [...D04_GROUP,...D04_PRIVATE].some(scene=>{
  const q=progress[scene.id];
  return q?.started&&!q.completed&&!q.skipped&&q.nextAt!==null&&now>=q.nextAt;
 });
}
function selectedPrivate(s,id){
 return D04_PRIVATE.filter(scene=>scene.chat===id)
  .filter(scene=>{const q=sceneState(s,scene.id);return q?.started&&!q.completed&&!q.skipped;})
  .at(-1)||null;
}
export function d04Draft(s,id){
 if(!active(s))return null;
 if(id==='group'&&sceneState(s,'video')?.completed&&!s.story55?.d04Chats?.videoReplied)
  return {text:'看見了',stage:'d04:video-reply'};
 const scene=selectedPrivate(s,id),q=scene&&sceneState(s,scene.id);
 const line=scene?.lines[q?.index];
 if(line?.who==='me'&&q.nextAt===null)return {text:line.text,stage:'d04:'+scene.id+':'+q.index};
 return null;
}
export function d04ComposerDisabled(s,id){
 if(!active(s)||!['group','hufeng','wang'].includes(id))return false;
 return !d04Draft(s,id);
}
export function sendD04WeChat(store,id,text,now=Date.now()){
 const s=store.get();
 if(!active(s)||!['group','hufeng','wang'].includes(id))return {handled:false};
 const draft=d04Draft(s,id);
 if(!draft||String(text||'').trim()!==draft.text)return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
 let messageId=null;
 store.update(next=>{
  const map=ensure(next);
  if(id==='group'){
   const c=convo(next,id);
   messageId='d04-video-player';
   if(!c.messages.some(m=>m.id===messageId))c.messages.push({
    id:messageId,from:'me',kind:'text',text:'看見了',day:DAY,time:next.clock,sentDate:DATE,actual:true,storyD04:true});
   map.videoReplied=true;
   // Hu Feng answers one bubble at a time; each is its own incoming event.
   map.videoExtras??={index:0,nextAt:now+900,completed:false};
  }else{
   const scene=selectedPrivate(next,id),q=scene&&map[scene.id];
   if(!scene||!q)return;
   const index=q.index;messageId='d04-'+scene.id+'-'+index;
   push(next,scene,index,scene.lines[index],false);
   q.index++;
   if(scene.id==='wang-dinner'&&scene.lines[index].text==='😘'&&next.clock<='18:30'){
    map.dinnerConfirmed=true;map.dinnerAcceptedAt=next.clock;
   }
   if(q.index>=scene.lines.length)finish(q);
   else q.nextAt=scene.lines[q.index].who==='me'?null:now+PAUSE;
  }
  if(next.drafts)delete next.drafts[id];
 });
 return {handled:true,messageId};
}
export const D04_GROUP_SCENES=D04_GROUP.map(({id,at,condition})=>({id,at,condition}));
