import {D14_D24_CONTENT} from './definition.js';
import {createConversationTrack,CHAT_LIFECYCLE_POLICY} from '../../services/messaging/lifecycle/engine.js';
import {trackKey,restoreTrackLineMetadata} from './editor-overrides.js';
import d15LegacyChats from './d15-legacy-chats.json' with {type:'json'};
import d16D20LegacyChats from './d16-d20-legacy-chats.json' with {type:'json'};

// Eleven content registrations, one existing conversation lifecycle/clock.
export const D14_D24_TRACKS=Array.from({length:11},(_,i)=>{
 const day=14+i,prefix='d'+String(day).padStart(2,'0');
 const scenes=D14_D24_CONTENT.wechat.filter(s=>s.day===day).map(scene=>{
  const key=trackKey(scene);
  const revisedD14=scene.day===14&&scene.id==='meeting';
  const oldD14=[{"who":"胡枫","text":"幹爹要的資料我先整理成一份。今晚到大屋再看"},{"who":"阿威","text":"幾點？"},{"who":"熙旺","text":"八點吧，乾爹也會去"},{"who":"小辛","text":"收到。"},{"who":"仔仔","text":"我帶樣板過去"}];
  const oldLines=revisedD14?oldD14:scene.day===15?d15LegacyChats[scene.id]:d16D20LegacyChats[day+':'+scene.id];
  return {...scene,
   // The loan conversation can arrive late, but its old complaint must not
   // remain a mandatory composer draft weeks after the subject has passed.
   ...(scene.id==='room'?{endWhen:s=>s.day>day+CHAT_LIFECYCLE_POLICY.lateDays}:{}),
   // Edit only the data consumed by the existing engine. Keep IDs, clock,
   // progress flags, player-Send gating and delivery infrastructure unchanged.
   ...(oldLines?{migrate:(s,q)=>{if(q.scriptVersion==null){const previous=s.story55?.chatSceneEdits?.[key]?.lines;q.scriptVersion=q.started||q.index>0||q.completed||q.historySettled||previous?.length===oldLines.length?1:2;}}}:{}),
   lines:(s,q)=>{const edited=s.story55?.chatSceneEdits?.[key]?.lines;return edited?restoreTrackLineMetadata(scene,edited):(oldLines&&q?.scriptVersion===1?oldLines:scene.lines);},
   at:s=>{const at=s.story55?.chatSceneEdits?.[key]?.at||scene.at,done=s.story55.completed?.[scene.requiresNode];return done?.day===scene.day&&done.clock>at?done.clock:at;},
   condition:s=>!scene.requiresNode||!!s.story55.completed?.[scene.requiresNode]
  };
 });
 return {name:prefix.toUpperCase(),track:createConversationTrack({day,prefix,scenes,
  progress:s=>(s.story55.authoredDays??={})[prefix]??={},lockChats:[...new Set(scenes.map(s=>s.chat))]
 })};
});
