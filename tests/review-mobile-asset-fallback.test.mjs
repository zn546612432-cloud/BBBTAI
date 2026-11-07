import test from 'node:test';
import assert from 'node:assert/strict';
import {rebaseBundledPublicAsset} from '../src/services/public-assets.js';
import {wechatAvatars,resolveWeChatAvatar} from '../src/apps/wechat/avatars.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {initialState} from '../src/services/storage.js';

test('legacy saved wallpaper gets the active Pages release path rather than origin root',()=>{
 const base='/BBBTAI/review/d06-wishes-20261107/releases/version123/';
 assert.equal(rebaseBundledPublicAsset('/wallpapers/midnight-glass.png',{base}),
  base+'wallpapers/midnight-glass.png');
 assert.equal(rebaseBundledPublicAsset('/BBBTAI/releases/previous/wallpapers/midnight-glass.png',{base}),
  base+'wallpapers/midnight-glass.png');
});
test('historic one-character WeChat nickname resolves to the actual character portrait',()=>{
 assert.equal(resolveWeChatAvatar('胡','胡'),wechatAvatars['胡枫']);
 assert.equal(resolveWeChatAvatar('枫','枫'),wechatAvatars['胡枫']);
 assert.equal(resolveWeChatAvatar('辛','辛'),wechatAvatars['小辛']);
});
test('unknown historical sender initials do not get used as relative image URLs',()=>{
 const s=initialState();
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.ok(group);
 group.messages.push({id:'historical-hu-alias',from:'胡',text:'大家好',kind:'text',time:'14:00',sentDate:'2025-05-18'});
 group.messages.push({id:'historical-unknown-alias',from:'陌',text:'消息',kind:'text',time:'14:01',sentDate:'2025-05-18'});
 const html=renderWeChatChat(s,'group');
 assert.doesNotMatch(html,/src="(?:胡|陌)"/);
 assert.match(html,/wx-avatar-fallback/);
 assert.match(html,/avatars\/originals\/hufeng\.jpeg/);
});
