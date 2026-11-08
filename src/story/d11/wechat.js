import {D11_GROUP,D11_PRIVATE} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
export const d11Track=createConversationTrack({day:11,prefix:'d11',scenes:[...D11_GROUP,...D11_PRIVATE],progress:s=>s.story55.d11Chats??={}});
