// One registration point for all daily authored conversation lifecycles.
// Future D07-D55 content joins here; generic catch-up never needs day-specific code.
import {d02Track} from '../../../story/d02/wechat.js';
import {d03Track} from '../../../story/d03/wechat.js';
import {d04Track} from '../../../story/d04/wechat.js';
import {d05Track,tickD05Chats} from '../../../story/d05/wechat.js';

export const AUTHORED_CHAT_TRACKS=[
 {name:'D02',track:d02Track},
 {name:'D03',track:d03Track},
 {name:'D04',track:d04Track},
 {name:'D05',track:d05Track,tick:tickD05Chats}
];
