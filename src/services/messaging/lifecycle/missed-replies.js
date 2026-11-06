// Shared, character-aware missed-reply lifecycle for every authored WeChat day.
// Story days own their dialogue; this module owns only generic late acknowledgement.
// Never manufacture a player's message, accept an invitation, or settle a mission.
import {appendAuthoredPhoneMessage} from '../phone-messages.js';
import {AUTHORED_CHAT_TRACKS} from './registry.js';

export const MISSED_REPLY_POLICY=Object.freeze({
 minDays:3, npcPauseMs:1900, nudgeDelayMs:2500, nudgeSpacingMs:10000,
 maxNudgesPerDay:2
});

// Eight paired variants per character. No variant assumes a specific old topic,
// an unverified completed action, or that Ximeng has just woken up.
const characters={
 wang:{
  from:'熙旺',
  nudge:['阿蒙，這兩天忙什麼呢？','阿蒙？前幾天的消息看到了嗎？','這幾天都沒怎麼見你回消息。','阿蒙，忙完了記得回我一下。','這兩天是不是又忙得忘了看手機？','阿蒙，最近還好吧？','有空回個消息，別老悶著。','阿蒙，這幾天怎麼沒聲音了？'],
  me:['哥，抱歉啊，前幾天沒顧上看消息。','哥，我剛看到之前的消息，這兩天有點忙。','在呢哥！之前忙忘了回你。','對不起哥，前兩天沒怎麼看手機。','哥，之前的消息我剛看見，讓你惦記了。','我在我在，這兩天忙得有點亂，忘回了。','哥～前幾天沒回消息，別生氣嘛。','才看到前面的消息，哥，這幾天讓你擔心了。'],
  end:['沒事，知道你忙。記得好好吃飯。','看到就好，別總弄到太晚。','我沒生氣，照顧好自己就行。','行，忙完就歇會兒，別太累。','知道啦，下次有空回一聲就行。','你啊，別忙起來連飯都忘了吃。','哈哈，少來這套。沒事就好。','沒事，哥知道了。有事跟我說。']
 },
 hufeng:{
  from:'胡枫',
  nudge:['阿蒙？這兩天人呢？','不是，你又忙到沒空看消息了？😂','前幾天給你發的看見沒有？','阿蒙，你該不會又把手機扔一邊了吧','這幾天怎麼沒動靜啊','阿蒙，有空回我一聲。','你是不是又一頭扎進機房了哈哈哈','給你發消息都快忘記發了什麼了😂'],
  me:['楓哥，抱歉啊，前幾天沒顧上看消息。','哈哈哈哈才看到，之前忙忘了。','這兩天有點忙，剛翻到你的消息。','不好意思啊楓哥，之前沒怎麼看手機。','我來了我來了，前幾天忘回了😂','楓哥，消息我剛看到，別介意。','之前忙得暈頭轉向，現在才有空回。','哈哈，前幾天沒注意消息，怎麼啦？'],
  end:['沒事沒事，知道你忙。','行吧，這次不跟你計較😂','哈哈哈哈，你能回來就行。','沒事啊，有空再聊。','行，改天有空出來坐坐。','差點以為你失蹤了，沒事就好。','知道啦，下次別把自己忙沒了。','好好好，忙你的，有事再找你。']
 },
 xiaoxin:{
  from:'小辛',
  nudge:['蒙哥？？你這幾天人呢！','喂喂喂，理我一下啊哥','不是吧，你真把我消息忘了？','蒙哥！！你是不是把手機丟了','你都多久沒看我消息了啊😭','哥你再不回我都要去找你了','我這麼大一個人你看不見嗎！！','蒙哥，失蹤人口回歸一下好不好'],
  me:['來了來了！之前沒看到消息哈哈哈。','前幾天忙忘了，你別喊啦😂','才看到才看到，怎麼了？','我在啊，這兩天沒看手機而已。','好啦好啦，抱歉，前幾天忘回了。','你這麼多個問號幹嘛哈哈哈哈，我來了。','前兩天忙呢，現在看到了！','不好意思啦，剛翻到你前面的消息。'],
  end:['壞死了！我還以為你不理我了！','行吧行吧，原諒你一次。','你終於回了！！','下次記得理我啊哥😭','算你還有點良心哈哈哈哈。','沒事啦，我就是喊喊你。','哈哈哈哈行，知道你忙。','好好好，不吵你了，忙完再聊。']
 },
 zaizai:{
  from:'仔仔',
  nudge:['阿蒙，前幾天的消息你看到了嗎？','最近很忙嗎？','有空的時候回我一下就好。','阿蒙，這兩天怎麼樣？','之前發你的消息，不急，你有空再看。','你這幾天是不是挺忙的？','阿蒙，忙完再找我也行。','前幾天跟你說的，你還記得嗎？'],
  me:['抱歉啦，前幾天沒顧上看消息。','才看到之前的消息，這幾天有點忙。','不好意思啊，前兩天忘記回了。','我在呢，之前沒看手機。','前面的消息剛看到，抱歉抱歉。','這幾天有點忙，現在回你啦。','我才翻到，之前忙忘了。','抱歉啊，讓你等這麼久。'],
  end:['沒事啦，知道你忙。','沒關係，你先忙你的。','好，不急的。','我也就是問問，別放心上。','沒事，有空再聊就行。','知道啦，照顧好自己。','行，你忙完再說。','哈哈，沒事沒事。']
 },
 awei:{
  from:'阿威',
  nudge:['阿蒙，在忙？','前幾天消息看見沒？','有空回一下。','這兩天忙？','阿蒙？','看到回我一聲。','最近沒空看手機？','忙完再說。'],
  me:['剛看到，之前沒注意消息。','抱歉啊，前幾天忙忘了。','在呢，這兩天有點忙。','之前沒看手機，怎麼了？','剛翻到你的消息，不好意思。','前幾天忘記回了。','我在，剛看到。','抱歉，這兩天沒顧上回。'],
  end:['沒事。','行，知道了。','好，忙你的。','沒事，有空再說。','嗯，注意休息。','行，不急。','知道了，回頭聊。','沒事就好。']
 }
};
characters.xin=characters.xiaoxin;

const eligible=s=>!!(s.story55?.version===1&&!s.story55.ended&&s.day>=3);
const currentDate=s=>new Date(Date.UTC(2025,4,19)+(s.day-1)*86400000).toISOString().slice(0,10);
const state=s=>(s.story55.genericMissedReplies??={version:1,serial:0,episodes:{},nudges:{day:s.day,count:0,lastAt:null}});
const profile=id=>characters[id]||null;
const pending=(s,id)=>AUTHORED_CHAT_TRACKS.flatMap(({track})=>track.pendingCatchup?.(s,id)||[]);
const hasActiveTurn=(s,id)=>AUTHORED_CHAT_TRACKS.some(({track})=>{
 const draft=track.draft(s,id);
 return track.busy?.(s,id)||(draft&&draft.priority>0);
});
const look=(s,id)=>s.story55?.genericMissedReplies?.episodes?.[id]||null;
const message=(s,id,ep,suffix,from,body)=>{
 const mid='missed-'+id+'-'+ep.serial+'-'+suffix;
 return appendAuthoredPhoneMessage(s,{
  channel:'wechat',conversationId:id,messageId:mid,from,text:body,
  day:s.day,clock:s.clock,sentDate:currentDate(s),
  lifecycleId:'missed-reply:'+id
 });
};
function createEpisodes(s,now){
 let changed=false;
 const record=state(s);
 for(const c of s.content?.conversations?.wechat||[]){
  const id=c.id,style=profile(id),old=pending(s,id);
  if(!style||!old.length||s.day-Math.min(...old.map(x=>x.day))<MISSED_REPLY_POLICY.minDays)continue;
  if(record.episodes[id]?.status!=='done'&&record.episodes[id])continue;
  record.serial++;
  const variant=Math.floor(Math.random()*style.me.length);
  record.episodes[id]={
   serial:record.serial,variant,day:s.day,createdAt:now,status:'open',
   nudged:false,nudgeAt:now+MISSED_REPLY_POLICY.nudgeDelayMs,
   sourceKeys:old.map(x=>x.track+':'+x.id)
  };
  changed=true;
 }
 return changed;
}
export function genericMissedReplyDraft(s,id){
 if(!eligible(s))return null;
 const ep=look(s,id),style=profile(id);
 if(!style||!ep||ep.status!=='open'||s.day<ep.day)return null;
 return {text:style.me[ep.variant],stage:'missed:'+ep.serial,source:'generic-missed',day:ep.day,priority:1};
}
export function genericMissedReplyBusy(s,id){
 const ep=look(s,id);
 return !!(eligible(s)&&ep&&s.day>=ep.day&&ep.status==='waiting-npc');
}
export function sendGenericMissedReply(store,id,text,now=Date.now()){
 const s=store.get(),draft=genericMissedReplyDraft(s,id);
 if(!draft)return {handled:false};
 if(String(text||'').trim()!==draft.text.trim())return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
 let messageId=null;
 store.update(next=>{
  const ep=look(next,id),style=profile(id);
  if(!ep||ep.status!=='open'||style.me[ep.variant]!==draft.text)return;
  const wrote=message(next,id,ep,'me','me',draft.text);
  if(!wrote)return;
  messageId=wrote.id;
  // Close *all* old optional WeChat turns for this contact, not merely one
  // scene from each prior day. Never complete any task or invent a player line.
  const closed=AUTHORED_CHAT_TRACKS.flatMap(({track})=>track.settleCatchup?.(next,id)||[]);
  ep.closedSourceKeys=closed.map(x=>x.track+':'+x.id);
  ep.status='waiting-npc';ep.answerAt=now+MISSED_REPLY_POLICY.npcPauseMs;
  if(next.drafts)delete next.drafts[id];
 });
 return {handled:true,...(messageId?{messageId}:{reason:'這條預設消息已經處理過'})};
}
export function tickGenericMissedReplies(s,now=Date.now()){
 if(!eligible(s))return false;
 let changed=createEpisodes(s,now);
 const record=state(s),nudges=record.nudges;
 if(nudges.day!==s.day){nudges.day=s.day;nudges.count=0;nudges.lastAt=null;changed=true;}
 for(const [id,ep] of Object.entries(record.episodes)){
  if(ep.status==='waiting-npc'&&ep.answerAt!==null&&now>=ep.answerAt&&s.day>=ep.day){
   const style=profile(id);
   if(style){
    message(s,id,ep,'end',style.from,style.end[ep.variant]);
    ep.status='done';ep.answerAt=null;changed=true;
   }
  }
 }
 // An unanswered backlog may nudge once, but never burst a day's old prompts
 // into the phone: at most two nudges per game day, spaced in real time.
 for(const [id,ep] of Object.entries(record.episodes)){
  if(ep.status!=='open'||ep.nudged||s.day<ep.day||now<ep.nudgeAt)continue;
  if(nudges.count>=MISSED_REPLY_POLICY.maxNudgesPerDay)break;
  if(Number.isFinite(nudges.lastAt)&&now-nudges.lastAt<MISSED_REPLY_POLICY.nudgeSpacingMs)break;
  if(hasActiveTurn(s,id))continue;
  const style=profile(id);
  if(!style)continue;
  if(message(s,id,ep,'nudge',style.from,style.nudge[ep.variant])){
   ep.nudged=true;ep.nudgedAt=now;
   nudges.count++;nudges.lastAt=now;changed=true;
  }
  break; // one new incoming notification per tick
 }
 return changed;
}
export function genericMissedRepliesDue(s,now=Date.now()){
 if(!eligible(s))return false;
 const record=s.story55?.genericMissedReplies;
 if(!record)return AUTHORED_CHAT_TRACKS.some(({track})=>(track.pendingCatchup?.(s)||[]).some(x=>s.day-x.day>=MISSED_REPLY_POLICY.minDays));
 if(Object.values(record.episodes).some(ep=>ep.status==='waiting-npc'&&ep.answerAt!=null&&now>=ep.answerAt))return true;
 const used=record.nudges?.day===s.day?record.nudges.count:0;
 if(used<MISSED_REPLY_POLICY.maxNudgesPerDay&&Object.values(record.episodes).some(ep=>ep.status==='open'&&!ep.nudged&&now>=ep.nudgeAt))return true;
 return (s.content?.conversations?.wechat||[]).some(c=>!record.episodes[c.id]||record.episodes[c.id].status==='done'
  ?pending(s,c.id).some(x=>s.day-x.day>=MISSED_REPLY_POLICY.minDays):false);
}
