import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {deliverAuthoredIncoming} from '../src/services/messaging/authored-incoming.js';
import {wechatChatMuted,wechatNoticeMuted,setWeChatChatMuted,setWeChatAlerts} from '../src/services/messaging/wechat-notifications.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {renderWeChatPreferences,handleWeChatPreferences} from '../src/apps/wechat/features/notifications/index.js';

test('muting a single thread leaves delivery, unread and other apps unchanged and persists',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const store=new PhoneStore(storage);
 store.update(s=>{
  setWeChatChatMuted(s,'group',true);
  assert.equal(deliverAuthoredIncoming(s,{conversationId:'group',from:'阿威',messageId:'mute-test',text:'到了'}),true);
  assert.equal(deliverAuthoredIncoming(s,{conversationId:'wang',from:'熙旺',messageId:'other-test',text:'到了'}),true);
 });
 const s=store.get(),byId=id=>s.notifications.find(n=>n.messageId===id);
 assert.equal(wechatNoticeMuted(s,byId('mute-test')),true);
 assert.equal(wechatNoticeMuted(s,byId('other-test')),false);
 assert.equal(wechatNoticeMuted(s,{link:{appId:'mirage'}}),false);
 assert.ok(s.content.conversations.wechat.find(c=>c.id==='group').unread>0);
 assert.match(renderWeChatHome(s,'/'),/wx-muted-dot/);
 assert.match(renderWeChatPreferences(s,'/chat-info/group'),/aria-checked="true"/);
 assert.equal(wechatChatMuted(new PhoneStore(storage).get(),'group'),true);
 store.update(s=>setWeChatAlerts(s,false));
 assert.equal(wechatNoticeMuted(store.get(),byId('other-test')),true);
 store.update(s=>setWeChatAlerts(s,true));
 assert.equal(wechatNoticeMuted(store.get(),byId('other-test')),false);
 const ctx={store,router:{open:()=>{}}};
 assert.equal(handleWeChatPreferences('wx-mute-chat',{dataset:{id:'group'}},ctx),true);
 assert.equal(wechatChatMuted(store.get(),'group'),false);
 assert.match(renderWeChatPreferences(store.get(),'/chat-info/group'),/aria-checked="false"/);
});
