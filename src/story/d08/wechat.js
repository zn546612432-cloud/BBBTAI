import {D08_GROUP} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';

// Uses one shared phone-message delivery/persistence engine. No D08 timer.
export const d08Track=createConversationTrack({
 day:8,prefix:'d08',scenes:D08_GROUP,
 progress:s=>s.story55.d08Chats??={}
});
