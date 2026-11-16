import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {appendAuthoredPhoneMessage} from '../src/services/messaging/phone-messages.js';
import {notificationMuted,suppressQuietBanners} from '../src/services/messaging/notification-policy.js';
import {IncomingBannerQueue,queueableNotices} from '../src/services/messaging/incoming-banner-queue.js';
import {batteryGlyph} from '../src/system/control-center/view.js';

test('DND keeps messages, unread counts and notifications while preventing alerts and later receipt replays',()=>{
 const storageData=new Map(),storage={getItem:k=>storageData.get(k)||null,setItem:(k,v)=>storageData.set(k,v)};
 const store=new PhoneStore(storage);
 store.update(s=>{s.unlocked=true;s.focus=true;s.nav.current={appId:'home',route:'/',params:{}};
  appendAuthoredPhoneMessage(s,{conversationId:'group',messageId:'focus-live-1',from:'阿威',text:'到了'});
  s.notifications.find(n=>n.messageId==='focus-live-1').bannerPending=true;
  suppressQuietBanners(s);
 });
 let s=store.get(),n=s.notifications.find(n=>n.messageId==='focus-live-1'),c=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(c.messages.at(-1).text,'到了');assert.ok(c.unread>0);assert.equal(notificationMuted(s,n),true);
 const shown=[],queue=new IncomingBannerQueue({show:n=>shown.push(n.id),stillUnread:()=>true,eligible:n=>!notificationMuted(store.get(),n)});
 queue.enqueue([n]);assert.deepEqual(shown,[]);
 store.update(s=>{s.focus=false;});assert.deepEqual(queueableNotices(store.get().notifications).filter(n=>n.messageId==='focus-live-1'),[]);
 assert.equal(new PhoneStore(storage).get().notifications.find(n=>n.messageId==='focus-live-1').bannerSuppressed,true);
 store.update(s=>appendAuthoredPhoneMessage(s,{conversationId:'group',messageId:'focus-live-2',from:'阿威',text:'出發'}));
 s=store.get();n=s.notifications.find(n=>n.messageId==='focus-live-2');assert.equal(notificationMuted(s,n),false);queue.enqueue([n]);assert.deepEqual(shown,[n.id]);
});
test('silent mode does not hide a message; focus suppresses every messaging app and respects the existing alarm',()=>{
 for(const appId of ['wechat','messages','mirage','noapp','kira']){
  const n={id:appId,link:{appId,route:'/chat/a'}};
  assert.equal(notificationMuted({silent:true},n),false);assert.equal(notificationMuted({focus:true},n),true);
 }
 assert.equal(notificationMuted({focus:true},{type:'alarm',title:'闹钟'}),false);
});
test('battery fill matches the actual percentage at 0, 20, 87 and 100; charging and low power use their colors',()=>{
 for(const percent of [0,20,87,100]){
  const svg=batteryGlyph({batteryPercent:percent});
  const width=Number(svg.match(/data-cc-battery-fill[^>]*width="([\d.]+)"/)[1]);
  assert.ok(Math.abs(width/21.5-percent/100)<.0001);
 }
 assert.match(batteryGlyph({batteryPercent:87,powerMode:'short-charging'}),/#4cdb73/);
 assert.match(batteryGlyph({batteryPercent:87,lowPower:true}),/#ffd65c/);
});
