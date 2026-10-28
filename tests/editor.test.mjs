import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {selectedConversation,renameConversation,renameActor,actorName,setSchedule,reorderMessage,clearDelivery} from '../src/editor/conversations/model.js';
import {homePages,dockApps,registry,installed} from '../src/system/registry.js';
import {normalizeAppLink} from '../src/services/deep-links/index.js';
import {chatList,chatView} from '../src/components/chat.js';
import {handle,change} from '../src/editor/index.js';
function setup(){const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);return {store,storage};}
function schedule(store,id,schedule){store.update(s=>{const c=s.content.conversations.wechat[0],m=c.messages.find(m=>m.id===id);setSchedule(s,c,m,schedule);});}
test('dock contains only phone and messages, desktop has neither and KIRA is the single mail app',()=>{
 assert.deepEqual(dockApps,['phone','messages']);assert.ok(!homePages.flat().some(id=>['phone','messages','mail'].includes(id)));
 assert.equal(homePages.flat().filter(id=>id==='browser').length,1);assert.equal(homePages.flat().filter(id=>id==='kira').length,1);
 const {store}=setup();assert.equal(installed(store.get()).filter(a=>a.id==='mail').length,0);
 assert.deepEqual(normalizeAppLink({appId:'mail',route:'/mail/mail-1'},registry),{appId:'kira',route:'/mail/mail-1',params:{}});
});
test('editor changes contact and actor names without changing identity; both render in chat',()=>{
 const {store}=setup();store.update(s=>{s.editor.conversation='wang';s.editor.channel='wechat';});
 change({id:'editor-conversation-name',value:'哥哥',dataset:{}},{store});
 change({id:'',value:'阿蒙',dataset:{actorName:'me'}},{store});
 change({id:'',value:'wang',dataset:{messageField:'from',id:'w2'}},{store});
 const c=selectedConversation(store.get()).c;assert.equal(c.id,'wang');assert.equal(c.messages[1].from,'wang');assert.equal(c.name,'哥哥');assert.equal(actorName(c,'me'),'阿蒙');
 assert.match(chatView(store.get(),'wechat','wang'),/哥哥/);assert.match(chatList(store.get(),'wechat'),/哥哥/);
 assert.throws(()=>renameConversation(c,''));renameActor(c,'wang','大哥');assert.equal(c.name,'大哥');
});
test('scheduled messages stay out of chat and list previews, deliver once at game time, survive reload',()=>{
 const {store,storage}=setup();schedule(store,'w1',{mode:'game-time',day:57,clock:'10:00'});
 assert.equal(visibleMessages(store.get().content.conversations.wechat[0]).length,1);
 assert.ok(!chatView(store.get(),'wechat','wang').includes('阿蒙，返嚟記得食宵夜。'));
 const engine=new MessageDelivery(store);assert.equal(engine.tick(0).length,0);
 store.update(s=>{s.day=57;s.clock='09:59';});assert.equal(engine.tick(1).length,0);
 store.update(s=>{s.clock='10:00';});assert.equal(engine.tick(2).length,1);assert.equal(engine.tick(3).length,0);
 assert.equal(store.get().notifications.filter(n=>n.messageId==='w1').length,1);
 assert.equal(new MessageDelivery(new PhoneStore(storage)).tick(4).length,0);
 store.update(s=>{s.day=56;});assert.equal(visibleMessages(store.get().content.conversations.wechat[0]).length,2);
});
test('chat delay resets on leaving, locking and hiding; waits for the correct conversation',()=>{
 const {store}=setup();schedule(store,'w1',{mode:'chat-delay',seconds:2});
 const engine=new MessageDelivery(store);assert.equal(engine.tick(0).length,0);
 store.update(s=>{s.unlocked=true;s.nav.current={appId:'wechat',route:'/chat/wang',params:{}};});
 assert.equal(engine.tick(100).length,0);assert.equal(engine.tick(2000).length,0);
 store.update(s=>{s.nav.current.route='/chat/group';});assert.equal(engine.tick(2200).length,0);
 store.update(s=>{s.nav.current.route='/chat/wang';});assert.equal(engine.tick(3000).length,0);assert.equal(engine.tick(4000,false).length,0);
 assert.equal(engine.tick(5000).length,0);store.update(s=>{s.unlocked=false;});assert.equal(engine.tick(6000).length,0);
 store.update(s=>{s.unlocked=true;});assert.equal(engine.tick(7000).length,0);assert.equal(engine.tick(9000).length,1);
 assert.equal(store.get().notifications.length,0);
});
test('authoring does not deliver messages while typing and rearming clears the previous notification',()=>{
 const {store}=setup();schedule(store,'w1',{mode:'game-time',day:56,clock:'21:18'});
 store.update(s=>{s.unlocked=true;s.nav.current={appId:'editor',route:'/',params:{}};});
 const engine=new MessageDelivery(store);assert.equal(engine.tick(0).length,0);
 store.update(s=>{s.nav.current={appId:'home',route:'/',params:{}};});assert.equal(engine.tick(1).length,1);
 store.update(s=>{const c=s.content.conversations.wechat[0];clearDelivery(s,c,c.messages[0]);});
 assert.equal(store.get().notifications.length,0);assert.equal(visibleMessages(store.get().content.conversations.wechat[0]).length,1);
 assert.equal(engine.tick(2).length,1);assert.equal(store.get().notifications.length,1);
});
test('reordering and duplication preserve payloads and schedules with stable distinct message IDs',()=>{
 const {store}=setup();store.update(s=>{s.editor.conversation='tai';s.editor.channel='noapp';});
 store.update(s=>{const c=selectedConversation(s).c;reorderMessage(c,'n2','n1');});
 const source=structuredClone(selectedConversation(store.get()).c.messages[0]);assert.equal(source.kind,'app_invitation');
 handle('duplicate-message',{dataset:{id:'n2'}},{store});const messages=selectedConversation(store.get()).c.messages;
 assert.equal(messages[1].invitationId,source.invitationId);assert.notEqual(messages[0].id,messages[1].id);assert.equal(messages[2].id,'n1');
});
test('NoApp delivery waits for its opening day and invalid schedules cannot corrupt saved state',()=>{
 const {store}=setup();store.update(s=>{s.day=55;const c=s.content.conversations.noapp[0];setSchedule(s,c,c.messages[0],{mode:'game-time',day:55,clock:'10:00'});});
 const engine=new MessageDelivery(store);assert.equal(engine.tick(0).length,0);store.update(s=>{s.day=56;});assert.equal(engine.tick(1).length,1);
 const before=structuredClone(store.get());assert.throws(()=>schedule(store,'w1',{mode:'game-time',day:99,clock:'25:99'}));assert.deepEqual(store.get(),before);
});
