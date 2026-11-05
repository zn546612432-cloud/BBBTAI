import {D03_SCENES} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
const scenes=D03_SCENES.map(scene=>({...scene,
 at:(s,q)=>q?.mode==='completed-task'||s.day===3&&scene.trigger(s)?scene.early:scene.fallback,
 enabled:s=>scene.trigger(s)||s.clock>=scene.fallback||s.day>3,
 initialDelayMs:900,replies:LATE_REPLIES.d03[scene.id],
 onStart:(s,q)=>{q.mode=scene.trigger(s)?'completed-task':'fallback';},
 ...(scene.id==='hufeng'?{until:'23:59',resolved:s=>s.day>5||s.day===5&&s.clock>='10:00'}:{}),
 ...(scene.id==='wang'?{resolved:s=>!!s.content.conversations.wechat.find(c=>c.id==='wang')?.messages.some(m=>m.id==='d05-wang-morning-6')}:{}),
}));
export const d03Track=createConversationTrack({day:3,prefix:'d03',scenes,progress:s=>s.story55.d03Chats??={}});
export const tickD03Chats=d03Track.tick;
export const d03ChatDue=d03Track.due;
export const d03Draft=d03Track.draft;
export const d03ComposerDisabled=d03Track.disabled;
export const sendD03WeChat=d03Track.send;
export const D03_CHAT_SCENES=D03_SCENES.map(({id,chat,early,fallback})=>({id,chat,early,fallback}));
