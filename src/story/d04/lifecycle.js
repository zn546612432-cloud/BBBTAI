import {D04_GROUP,D04_PRIVATE} from './dialogue.js';
import {publicWeChatAsset} from '../../apps/wechat/avatars.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
export const D04_MEDIA={d04Cat:publicWeChatAsset('media/d04-cat.webp'),d04Jacket:publicWeChatAsset('media/d04-jacket.webp')};
export const d04DinnerConfirmed=s=>!!(s.story55?.d04Chats?.dinnerConfirmed&&s.story55.d04Chats.dinnerAcceptedAt&&s.story55.d04Chats.dinnerAcceptedAt<='18:30');
const allowed=(s,scene)=>scene.condition==='dinner'?d04DinnerConfirmed(s):scene.condition==='no-dinner'?!d04DinnerConfirmed(s):true;
const clocks={morning:[[0,'08:20'],[11,'08:37'],[17,'08:51']],earbuds:[[0,'09:35'],[14,'09:43']],lunch:[[0,'12:10'],[14,'12:23']],cat:[[0,'13:25'],[12,'13:38']],'night-games':[[0,'22:30'],[14,'22:42'],[19,'23:05']]};
const clock=(scene,i)=>{let t=scene.at;for(const [at,c] of clocks[scene.id]||[])if(i>=at)t=c;return t;};
const specs=[...D04_GROUP,...D04_PRIVATE].map(scene=>({...scene,
 initialDelayMs:scene.chat==='group'?450:0,condition:s=>allowed(s,scene),historyClock:i=>scene.condition==='no-dinner'?'18:31':clock(scene,i),
 ...(scene.condition==='no-dinner'||scene.condition==='dinner'&&scene.id==='dinner-confirmed'?{at:s=>d04DinnerConfirmed(s)?'18:26':'18:31'}:{}),
 lines:scene.lines.map(l=>({...l,text:l.kind==='image'?D04_MEDIA[l.text]:l.text})),
 replies:LATE_REPLIES.d04[scene.id],
 ...(scene.id==='hufeng-am'?{resolved:s=>s.day>5||s.day===5&&s.clock>='10:00'}:{}),
 ...(scene.id==='hufeng-pm'?{until:'17:20',lateDays:1}:{}),
 ...(scene.id==='wang-dinner'?{until:'18:31',unanswered:[{who:'熙旺',text:'我先去吃了，你忙完也記得吃飯。'}],onSend:(s,q,i)=>{if(scene.lines[i].text==='😘'&&s.day===4&&s.clock<='18:30'){s.story55.d04Chats.dinnerConfirmed=true;s.story55.d04Chats.dinnerAcceptedAt=s.clock;}}}:{}),
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
