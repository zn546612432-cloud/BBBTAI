import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {groupState,groupAway} from './state.js';
// Presentation-only history boundary. Never remove the messages used by plot and archive services.
export function hiddenGroupMessageIds(s,c){
 const g=groupState(s);
 if(Array.isArray(g.hiddenMessageIds))return new Set(g.hiddenMessageIds);
 // Existing saves that have already rejoined under the original egg implementation.
 const msgs=c?.messages||[];
 const rejoin=msgs.findLastIndex(m=>m.wechatEgg&&m.kind==='system'&&String(m.text).endsWith('邀請你加入了群聊'));
 return new Set(rejoin<0?[]:msgs.slice(0,rejoin).map(m=>m.id));
}
export function playerWeChatMessages(c,s){
 const msgs=visibleMessages(c,s);
 if(c?.id!=='group')return msgs;
 if(groupAway(s))return [];
 const hidden=hiddenGroupMessageIds(s,c);
 return msgs.filter(m=>!hidden.has(m.id));
}
