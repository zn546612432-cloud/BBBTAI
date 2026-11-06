// Compatibility exports; all lifecycle rules live in the shared engine.
export {D04_MEDIA,d04DinnerConfirmed} from './lifecycle.js';
export {d04Track} from './lifecycle.js';
import {d04Track} from './lifecycle.js';
export const tickD04Chats=d04Track.tick;
export const d04ChatDue=d04Track.due;
export const d04Draft=d04Track.draft;
export const d04ComposerDisabled=d04Track.disabled;
export const sendD04WeChat=d04Track.send;
export const d04GroupBroadcastActive=s=>Object.values(s.story55?.d04Chats||{}).some(q=>q?.status==='live');
