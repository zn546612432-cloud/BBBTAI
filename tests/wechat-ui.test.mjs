import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWeChatHome,routeForTab,tabForRoute} from '../src/apps/wechat/components/views.js';
import {wxIcon} from '../src/apps/wechat/components/icons.js';
import {demoContent} from '../src/story/demo/seed.js';
import {isWeChatTabSwitch} from '../src/system/navigation.js';
import {resolveWeChatAvatar,wechatAvatars} from '../src/apps/wechat/avatars.js';
import {readFileSync,existsSync} from 'node:fs';

const mock={content:demoContent};
test('wechat has four functional first-level routes',()=>{
  assert.equal(tabForRoute('/'),'chats');
  for(const [id,route,label] of [
    ['chats','/','微信'],['contacts','/contacts','通讯录'],
    ['discover','/discover','发现'],['me','/me','我']
  ]){
    assert.equal(routeForTab(id),route);
    const html=renderWeChatHome(mock,route);
    assert.match(html,new RegExp('data-wx-tab="'+id+'"'));
    assert.equal((html.match(/class="wx-tab /g)||[]).length,4);
    assert.ok(html.includes(label));
    assert.match(html,/aria-current="page"/);
  }
});
test('wechat reads the existing editable conversations instead of inventing dialogue',()=>{
  const html=renderWeChatHome(mock,'/');
  assert.match(html,/熙旺/);
  assert.match(html,/GROUP/);
  assert.match(html,/data-action="open-chat"/);
  assert.doesNotMatch(html,/DEMO/);
  assert.match(html,/wx-group-avatar/);
});
test('contacts connect to story group participants and existing conversations',()=>{
  const html=renderWeChatHome(mock,'/contacts');
  for(const name of ['熙旺','胡枫','小辛','阿威','仔仔'])
    assert.ok(html.includes(name),name);
  assert.match(html,/data-action="wx-open-groups"/);
  assert.match(html,/data-wx-search/);
});
test('discover and me reproduce native first-level groupings',()=>{
  const discover=renderWeChatHome(mock,'/discover');
  for(const label of ['朋友圈','直播','扫一扫','小程序'])assert.ok(discover.includes(label));
  const me=renderWeChatHome(mock,'/me');
  for(const label of ['熙蒙','服务','收藏','表情','设置'])assert.ok(me.includes(label));
  assert.match(me,/avatars\/originals\/ximeng\.jpeg/);
});

test('uploaded avatars are assigned P4–P9 in order and old saved letter avatars resolve to the new artwork',()=>{
 const ordered=[['熙蒙','ximeng'],['熙旺','xiwang'],['阿威','awei'],['胡枫','hufeng'],['小辛','xiaoxin'],['仔仔','zaizai']];
 for(const [name,file] of ordered){
  assert.equal(wechatAvatars[name],`/apps/wechat/avatars/originals/${file}.jpeg`);
  assert.equal(resolveWeChatAvatar(name,name.slice(0,1)),wechatAvatars[name]);
  assert.ok(existsSync(new URL(`../public/apps/wechat/avatars/originals/${file}.jpeg`,import.meta.url)));
 }
 const contacts=renderWeChatHome(mock,'/contacts');
 for(const file of ['xiwang','awei','hufeng','xiaoxin','zaizai'])assert.match(contacts,new RegExp(`/avatars/originals/${file}\\.jpeg`));
 assert.match(renderWeChatHome(mock,'/'),/avatars\/originals\/xiwang\.jpeg/);
 assert.equal(resolveWeChatAvatar('小辛','data:image/png;base64,custom'),'data:image/png;base64,custom');
});

test('every WeChat conversation has a divider, including the final row',()=>{
 const css=readFileSync(new URL('../src/apps/wechat/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.wx-chat-main\{[^}]*border-bottom:1px solid/);
 assert.doesNotMatch(css,/\.wx-chat-row:last-child \.wx-chat-main\{border-bottom:0/);
});
test('wechat icons remain scalable standalone vectors',()=>{
  assert.match(wxIcon('chats'),/^<svg/);
  assert.match(wxIcon('compass'),/<circle/);
  assert.match(wxIcon('qr'),/<path/);
});

test('native WeChat tab switch never triggers whole-screen navigation transition',()=>{
 assert.equal(isWeChatTabSwitch({appId:'wechat',route:'/'},{appId:'wechat',route:'/contacts'}),true);
 assert.equal(isWeChatTabSwitch({appId:'wechat',route:'/contacts'},{appId:'wechat',route:'/discover'}),true);
 assert.equal(isWeChatTabSwitch({appId:'wechat',route:'/me'},{appId:'wechat',route:'/chat/group'}),false);
 assert.equal(isWeChatTabSwitch({appId:'home',route:'/'},{appId:'wechat',route:'/'}),false);
});

test('red unread badge in WeChat tab bar is driven by conversation data and is consistent across tabs',()=>{
 for(const route of ['/','/contacts','/discover','/me']){
  const markup=renderWeChatHome(mock,route);
  assert.match(markup,/wx-unread-badge/);
  assert.match(markup,/1条未读消息/);
 }
});

