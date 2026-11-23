import {D04_GROUP,D04_PRIVATE} from './dialogue.js';
import {publicWeChatAsset} from '../../apps/wechat/avatars.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
export const D04_MEDIA={
 d04Cat:publicWeChatAsset('media/d04-cat.webp'),
 d04Jacket:publicWeChatAsset('media/d04-jacket.webp'),
 d04Sticker:publicWeChatAsset('stickers/xin-dog-075.webp')
};
// One-time, narrowly scoped migration for D04 authored bubbles already in player saves.
// Keep stable IDs on the remaining earbuds lines; never change player-created messages.
function migrateApprovedD04Chat(s,q,id){
 if(q.approvedD04Copy20261123)return;
 const chat=s.content?.conversations?.wechat?.find(c=>c.id==='group');
 if(!chat)return;
 const byId=messageId=>chat.messages?.find(m=>m.id===messageId&&m.storyD04);
 const remove=[];
 const oldMessages={
  earbuds:[['d04-earbuds-13','胡枫','你們能不能盼我點好']],
  lunch:[
   ['d04-lunch-18','仔仔','沒有'],
   ['d04-lunch-19','仔仔','你吃燒鵝'],
   ['d04-lunch-20','小辛','滾啊哈哈哈哈']
  ]
 };
 for(const [messageId,from,text] of oldMessages[id]||[]){
  const m=byId(messageId);
  if(m?.from===from&&m.text===text&&m.kind==='text')remove.push(messageId);
 }
 if(remove.length){
  const removed=new Set(remove);
  chat.messages=chat.messages.filter(m=>!removed.has(m.id));
  const notifications=s.notifications||[];
  const notices=notifications.filter(n=>removed.has(n.messageId));
  s.notifications=notifications.filter(n=>!removed.has(n.messageId));
  if(s.events)s.events=s.events.filter(e=>!removed.has(e.messageId));
  chat.unread=Math.max(0,(Number(chat.unread)||0)-notices.length);
 }
 if(id==='lunch'){
  const m=byId('d04-lunch-17');
  if(m?.from==='小辛'&&m.kind==='text'&&m.text==='吃你家大米了？'){
   m.text=D04_MEDIA.d04Sticker;m.kind='image';
   for(const n of s.notifications||[])if(n.messageId===m.id)n.body='[圖片]';
  }
  if(q.index>18)q.index=18;
 }
 if(id==='earbuds'&&q.index>13)q.index--;
 if(id==='outfit'){
  const m=byId('d04-outfit-20');
  if(m?.from==='小辛'&&m.kind==='text'&&m.text==='哈哈哈哈哈哈滾'){
   m.text='哼';
   for(const n of s.notifications||[])if(n.messageId===m.id)n.body='哼';
  }
 }
 // Preserve genuine developer scene overrides when a line was removed.
 const rev=s.story55?.chatSceneEdits?.['d04:'+id];
 const previousCount=id==='lunch'?21:id==='earbuds'?18:null;
 if(previousCount&&rev?.lines?.length===previousCount){
  const removedIndices=id==='lunch'?[18,19,20]:[13];
  rev.lines=rev.lines.filter((_,i)=>!removedIndices.includes(i));
  if(Array.isArray(rev.baseline))rev.baseline=rev.baseline.filter((_,i)=>!removedIndices.includes(i));
  if(rev.lineTimes&&typeof rev.lineTimes==='object'){
   const next={};
   for(const [key,clock] of Object.entries(rev.lineTimes)){
    const i=Number(key);
    if(!Number.isInteger(i)||removedIndices.includes(i))continue;
    next[String(i-removedIndices.filter(n=>n<i).length)]=clock;
   }
   rev.lineTimes=next;
  }
 }
 q.approvedD04Copy20261123=true;
}
export const d04DinnerConfirmed=s=>!!(s.story55?.d04Chats?.dinnerConfirmed&&s.story55.d04Chats.dinnerAcceptedAt&&s.story55.d04Chats.dinnerAcceptedAt<='18:30');
const allowed=(s,scene)=>scene.condition==='dinner'?d04DinnerConfirmed(s):scene.condition==='no-dinner'?!d04DinnerConfirmed(s):true;
const clocks={morning:[[0,'08:20'],[11,'08:37'],[17,'08:51']],earbuds:[[0,'15:50'],[13,'15:58']],lunch:[[0,'12:10'],[14,'12:23']],cat:[[0,'13:25'],[12,'13:38']],'night-games':[[0,'22:30'],[14,'22:42'],[19,'23:05']]};
const clock=(scene,i)=>{let t=scene.at;for(const [at,c] of clocks[scene.id]||[])if(i>=at)t=c;return t;};
const specs=[...D04_GROUP,...D04_PRIVATE].map(scene=>({...scene,
 initialDelayMs:scene.chat==='group'?450:0,condition:s=>allowed(s,scene),historyClock:i=>scene.condition==='no-dinner'?'18:31':clock(scene,i),
 ...(scene.condition==='no-dinner'||scene.condition==='dinner'&&scene.id==='dinner-confirmed'?{at:s=>d04DinnerConfirmed(s)?'18:26':'18:31'}:{}),
 lines:scene.lines.map(l=>({...l,text:l.kind==='image'?D04_MEDIA[l.text]:l.text})),
 ...(scene.id==='earbuds'?{messageId:(_s,i)=>'d04-earbuds-'+(i>=13?i+1:i)}:{}),
 ...(['earbuds','lunch','outfit'].includes(scene.id)?{migrate:(s,q)=>migrateApprovedD04Chat(s,q,scene.id)}:{}),
 replies:LATE_REPLIES.d04[scene.id],
 ...(scene.id==='wang-night'?{expireReply:true}:{}),
 ...(scene.id==='wang-dinner'?{until:'18:31',expireReply:true,unanswered:[{who:'熙旺',text:'我先去吃了，你忙完也記得吃飯。'}],onSend:(s,q,i)=>{if(scene.lines[i].text==='😘'&&s.day===4&&s.clock<='18:30'){s.story55.d04Chats.dinnerConfirmed=true;s.story55.d04Chats.dinnerAcceptedAt=s.clock;}}}:{}),
}));
const extras=['？','你看見什麼了','不是，你真看了？','阿蒙？？？'];
specs.push({id:'video-reply',chat:'group',at:'10:50',until:'12:10',optional:true,
 enabled:s=>!!s.story55.d04Chats?.video?.completed&&!s.story55.d04Chats?.videoReplied,
 lines:[{who:'me',text:'看見了'},...extras.map(text=>({who:'胡枫',text}))],
 messageId:(s,i)=>i===0?'d04-video-player':'d04-video-extra-'+(i-1),
 migrate:(s,q)=>{const d=s.story55.d04Chats;if(d.videoReplied&&!q.started){q.started=true;q.index=1+(d.videoExtras?.index||0);q.nextAt=d.videoExtras?.nextAt??null;q.completed=!!d.videoExtras?.completed;}},
 onSend:s=>{s.story55.d04Chats.videoReplied=true;}
});
export const d04Track=createConversationTrack({day:4,prefix:'d04',lockChats:['group','hufeng','wang'],scenes:specs,progress:s=>s.story55.d04Chats??={}});
