import {D14_D24_CONTENT} from './definition.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';

// Eleven content registrations, one existing conversation lifecycle/clock.
export const D14_D24_TRACKS=Array.from({length:11},(_,i)=>{
 const day=14+i,prefix='d'+String(day).padStart(2,'0');
 const scenes=D14_D24_CONTENT.wechat.filter(s=>s.day===day).map(scene=>({...scene,
  condition:s=>!scene.requiresNode||!!s.story55.completed?.[scene.requiresNode]
 }));
 return {name:prefix.toUpperCase(),track:createConversationTrack({day,prefix,scenes,
  progress:s=>(s.story55.authoredDays??={})[prefix]??={},lockChats:[...new Set(scenes.map(s=>s.chat))]
 })};
});
