import {esc} from '../../../system/ui.js';
import {actors} from '../../../editor/conversations/model.js';
import {resolveWeChatAvatar} from '../avatars.js';

// A WeChat group portrait is a mosaic of actual members, never an initial-letter tile.
const preferredOrder=['me','wang','胡枫','小辛','阿威','仔仔'];

export function groupMembersForAvatar(conversation){
  const available=actors(conversation);
  return available.slice().sort((a,b)=>{
    const left=preferredOrder.indexOf(a.id),right=preferredOrder.indexOf(b.id);
    return (left<0?100:left)-(right<0?100:right);
  }).slice(0,6);
}

export function groupAvatar(conversation){
  const members=groupMembersForAvatar(conversation);
  return '<span class="wx-avatar wx-group-avatar" aria-label="群聊头像：'+esc(members.map(a=>a.name).join('、'))+'">'+
    members.map(member=>{
      const src=resolveWeChatAvatar(member.name);
      return '<span class="wx-group-cell">'+(src.startsWith('/')?'<img src="'+esc(src)+'" alt="'+esc(member.name)+'" loading="lazy">':'<span>'+esc(member.name.slice(0,1))+'</span>')+'</span>';
    }).join('')+'</span>';
}
