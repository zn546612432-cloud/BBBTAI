import {nextD01ChatBoundary} from '../../../story/d01/wechat.js';
import {d07RepliesTrack} from '../../../story/d07/replies.js';
// One registration point for all daily authored conversation lifecycles.
// Future D07-D55 content joins here; generic catch-up never needs day-specific code.
import {d02Track} from '../../../story/d02/wechat.js';
import {d03Track} from '../../../story/d03/wechat.js';
import {d04Track} from '../../../story/d04/wechat.js';
import {d05Track,tickD05Chats} from '../../../story/d05/wechat.js';
import {d08Track} from '../../../story/d08/wechat.js';
import {d09Track} from '../../../story/d09/wechat.js';
import {D14_D24_TRACKS} from '../../../story/d14-d24/wechat.js';
import {d10Track} from '../../../story/d10/wechat.js';
import {d11Track} from '../../../story/d11/wechat.js';
import {d12Track,d13Track} from '../../../story/d12-d13/wechat.js';
import {d25Track} from '../../../story/d25/wechat.js';

export const AUTHORED_CHAT_TRACKS=[
 {name:'D02',track:d02Track},
 {name:'D03',track:d03Track},
 {name:'D04',track:d04Track},
 {name:'D05',track:d05Track,tick:tickD05Chats},
 {name:'D07 replies',track:d07RepliesTrack},
 {name:'D08',track:d08Track},
 {name:'D09',track:d09Track},
 {name:'D10',track:d10Track},
 {name:'D11',track:d11Track},
 {name:'D12',track:d12Track},
 {name:'D13',track:d13Track},
 ...D14_D24_TRACKS,
 {name:'D25',track:d25Track}
];

// One shared query across registered daily chat schedules. Returning a current
// pending dialogue prevents a cheat jump from skipping its required player Send.
export function nextAuthoredChatBoundary(s){
 const first=nextD01ChatBoundary(s);
 if(first?.kind==='reply')return first;
 let next=first?.kind==='upcoming'?first:null,active=first?.kind==='delivering'?first:null;
 for(const {track} of AUTHORED_CHAT_TRACKS){
  const item=track.nextBoundary?.(s);
  if(!item)continue;
  if(item.kind==='reply')return item;
  if(item.kind==='delivering'){active??=item;continue;}
  if(item.kind==='upcoming'&&(!next||item.minute<next.minute))next=item;
 }
 return active||next;
}
