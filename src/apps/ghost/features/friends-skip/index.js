import {D01_REPAIR} from '../../../../story/d01/runtime.js';
import {previewSkipD01} from '../dev-skip/index.js';
import {finish} from '../../state.js';
import {FRIENDS_LAST_DAY, friendsPreviewEnded} from '../../../../system/preview/friends.js';

export function canSkipFriendsOrder(s,o){
 return s.story55?.version===1&&s.day<=FRIENDS_LAST_DAY&&!friendsPreviewEnded(s)&&
  o?.status==='running'&&s.story55?.ghostShare?.phase!=='controlling';
}

export function skipFriendsOrder(s,id,now=Date.now()){
 const o=s.ghost?.orders?.[id];
 if(!canSkipFriendsOrder(s,o))return false;
 if(id===D01_REPAIR)return previewSkipD01(s,id,now);
 finish(s,id,true,now);
 return true;
}
