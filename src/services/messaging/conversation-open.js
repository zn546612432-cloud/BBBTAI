// Shared definition of "actually reading this chat" used by both scheduled
// and scripted incoming messages. Never equate opening the app with opening
// the conversation; notification and badge state must be conversation-scoped.
import {isMirageAuthenticated} from '../../apps/mirage/session.js';
export function isConversationOpen(s,channel,id){
 return !!(s?.unlocked&&(channel!=='mirage'||isMirageAuthenticated())
  &&s.nav?.current?.appId===channel&&s.nav.current.route==='/chat/'+id);
}
