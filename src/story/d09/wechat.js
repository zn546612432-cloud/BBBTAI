import {D09_GROUP} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';

// Uses one shared phone-message delivery/persistence engine. No D09 timer.
export const d09Track=createConversationTrack({
 day:9,prefix:'d09',scenes:D09_GROUP,
 progress:s=>s.story55.d09Chats??={}
});
