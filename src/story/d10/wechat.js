import {D10_GROUP} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';

// Uses one shared phone-message delivery/persistence engine. No D10 timer.
export const d10Track=createConversationTrack({
 day:10,prefix:'d10',scenes:D10_GROUP,
 progress:s=>s.story55.d10Chats??={}
});
