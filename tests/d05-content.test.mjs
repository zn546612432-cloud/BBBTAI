import {D04_GROUP} from '../src/story/d04/dialogue.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {D05_GROUP,D05_PRIVATE} from '../src/story/d05/dialogue.js';
import {tickD05Chats,d05Draft} from '../src/story/d05/wechat.js';
import {D05_CONTRACTS} from '../src/story/d05/commissions.js';
import {D04_CONTRACTS,D04_MAIL,D04_STEP,acceptD04Contract,submitD04Contract,tickD04Contracts} from '../src/story/d04/contract.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {tickPhoneStoryMessages,PHONE_CHAT_TRACKS} from '../src/services/messaging/phone-story-scheduler.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {handle as kiraHandle} from '../src/apps/kira/index.js';
import {handle as filesHandle,render as filesRender} from '../src/apps/files/index.js';
import {handle as mirageHandle,render as mirageRender} from '../src/apps/mirage/index.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {render as ghostRender,handle as ghostHandle} from '../src/apps/ghost/index.js';
import {commissionAttachment,openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {allMoments} from '../src/apps/wechat/features/moments/model.js';
import {momentImage} from '../src/apps/wechat/features/moments/index.js';
import {visibleMoments} from '../src/apps/wechat/features/moments/data.js';
import {entryFor} from '../src/story/diary/entries.js';
import {worldMinuteRate} from '../src/system/time/clock.js';
const fresh=(clock='08:00',day=5)=>{
 const s=activateStory55(initialState());s.day=day;s.clock=clock;s.unlocked=true;
 s.story55.completed.intro={day:1,clock:'12:00'};s.story55.completed['flow-d03']={day:3,clock:'09:00'};
 s.nav.current={appId:'home',route:'/',params:{}};s.bankData.balance=100;
 tickStory55(s);
 if(day>=5)s.story55.d04Chats=Object.fromEntries(D04_GROUP.map(x=>[x.id,{started:true,completed:true,index:x.lines.length,nextAt:null}]));
 return s;
};
const store=s=>({get:()=>s,update:fn=>fn(s)});
const ctx=s=>({store:store(s),router:{open:link=>{s.nav.current=link;return link;}},toast(){},refresh(){}});
const chat=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const d05messages=(s,id)=>chat(s,id).messages.filter(m=>m.storyD05);

test('D05 has ten group scenes and four private conversations; no Xiaoxin or Tai DM',()=>{
 assert.equal(D05_GROUP.length,10);assert.equal(D05_PRIVATE.length,4);
 assert.ok(D05_GROUP.reduce((n,x)=>n+x.lines.length,0)>=150);
 assert.deepEqual([...new Set(D05_PRIVATE.map(x=>x.chat))].sort(),['hufeng','wang','zaizai']);
 assert.equal(D05_GROUP.some(x=>x.lines.some(l=>l.who==='me')),false);
 for(const scene of D05_PRIVATE)assert.ok(chat(fresh(),scene.chat),'actual roster contact '+scene.chat);
});
test('D05 midnight publishes only two new daily orders; D04 and D06 content remain in their own days',()=>{
 const before=fresh('23:59',4);assert.equal(before.content.orders.filter(x=>x.storyD05).length,0);
 const s=fresh('00:00');const orders=s.content.orders.filter(x=>x.storyD05);
 assert.equal(orders.length,2);assert.ok(orders.every(o=>o.storyDay===5&&o.publishedClock==='00:00'));
 assert.equal(s.content.orders.filter(x=>x.storyD04).length,2);
 assert.equal(s.content.orders.some(o=>/wallet/i.test(o.id)),false);
 assert.equal(s.content.conversations.mirage.some(c=>/ouroboros/i.test(c.id)),false);
 assert.equal(s.content.mail.some(m=>m.storyD05),false,'no mail before manual acceptance');
 assert.equal(s.bankData.balance,100);
});
test('group messages arrive separately across apps, preserve exact unread, and never write a player line',()=>{
 const s=fresh('08:00');const initialUnread=chat(s,'group').unread;let now=Date.now(),previous=0;
 for(const scene of D05_GROUP){
  s.clock=scene.at;
  for(let n=0;n<scene.lines.length+3;n++,now+=2100){
   tickD05Chats(s,now);
   const count=d05messages(s,'group').length;
   assert.ok(count-previous<=1);previous=count;
  }
 }
 const expected=D05_GROUP.reduce((n,x)=>n+x.lines.length,0);
 assert.equal(previous,expected);assert.equal(d05messages(s,'group').some(m=>m.from==='me'),false);
 assert.equal(s.notifications.filter(n=>String(n.messageId).startsWith('d05-')&&n.conversationId==='group').length,expected);
 assert.equal(chat(s,'group').unread,initialUnread+expected);
 const loaded=JSON.parse(JSON.stringify(s));tickD05Chats(loaded,now+9999999);
 assert.equal(d05messages(loaded,'group').length,expected);
});
test('D05 live group is not blocked by an old D04 queue',()=>{
 const s=fresh('08:15');s.story55.d04Chats.morning={started:true,index:3,nextAt:0,completed:false};
 const now=Date.now();tickPhoneStoryMessages(s,now);tickPhoneStoryMessages(s,now+1000);
 assert.equal(s.story55.d04Chats.morning.completed,true);
 assert.equal(d05messages(s,'group').length,1);
 assert.ok(s.notifications.filter(n=>String(n.messageId).startsWith('d04-')).every(n=>n.silent));
});
test('native preset replies wait for Send, preserve consecutive me lines, and all private threads can finish',()=>{
 const s=fresh('08:00'),st=store(s);let now=Date.now();
 for(const scene of D05_PRIVATE){
 s.clock=scene.at;
 for(let n=0;n<70;n++,now+=2100){
  tickPhoneStoryMessages(s,now);
  for(const id of ['wang','hufeng','zaizai']){
   const draft=d05Draft(s,id);if(!draft)continue;
   const count=d05messages(s,id).length;
   assert.equal(nativeWeChatComposer(s,id).text,draft.text);
   assert.ok(sendNativeWeChatPreset(st,id,'不符合的台词',now).reason);
   assert.equal(d05messages(s,id).length,count);
   const result=sendNativeWeChatPreset(st,id,draft.text,now);
   assert.ok(result.messageId);assert.equal(d05messages(s,id).at(-1).from,'me');
  }
 }
 }
 for(const scene of D05_PRIVATE){
  assert.equal(s.story55.d05Chats[scene.id].completed,true,scene.id);
  assert.deepEqual(d05messages(s,scene.chat).filter(m=>m.id.startsWith('d05-'+scene.id+'-')).map(m=>m.text),scene.lines.map(l=>l.text));
 }
 assert.equal(d05messages(s,'xiaoxin').length,0);
});
test('skipping to D06 settles group history and only independent private NPC prefixes',()=>{
 const s=fresh('08:05'),now=Date.now();tickD05Chats(s,now+1000);tickD05Chats(s,now+3100);
 const count=d05messages(s,'wang').length;
 s.day=6;s.clock='08:00';for(let n=0;n<250;n++)tickD05Chats(s,now+10000+n*2100);
 assert.ok(d05messages(s,'wang').length>=count);
 assert.equal(d05messages(s,'wang').some(m=>m.from==='me'),false);
 assert.ok(d05messages(s,'wang').some(m=>m.id==='d05-wang-evening-0'));
 assert.ok(s.notifications.filter(n=>String(n.messageId).startsWith('d05-')).every(n=>n.silent));
 assert.equal(d05messages(s,'group').length,D05_GROUP.reduce((n,x)=>n+x.lines.length,0));
 assert.ok(d05messages(s,'group').every(m=>m.day===5&&m.sentDate==='2025-05-23'));
});

test('both D05 orders go through actual Mirage -> Kira -> Files -> Ghost -> manual submission, paying once',()=>{
 const s=fresh(),c=ctx(s);setMirageAuthenticated(true);
 for(const def of D05_CONTRACTS){
  mirageHandle('mc-accept-bounty',{dataset:{id:def.id}},c);
  const o=s.content.orders.find(o=>o.id===def.id),mailId=D04_MAIL(def.id);
  assert.equal(o.status,'ACCEPTED');assert.equal(s.bankData.balance,100+(def===D05_CONTRACTS[1]?1800:0));
  const mail=s.content.mail.find(m=>m.id===mailId);
  assert.deepEqual(mail.attachments,[def.attachment]);assert.equal(mail.date,'2025-05-23');
  const html=kiraDetail(s,mailId);assert.equal((html.match(/class="kira-d01-attachment"/g)||[]).length,1);
  assert.equal(s.ghost.orders[D04_STEP(def.id,0)],undefined,'cannot skip attachment authorization');
  kiraHandle('kira-open-commission-file',{dataset:{id:mailId}},c);
  const file=commissionAttachment(s,mailId);assert.equal(s.nav.current.route,file.route);
  assert.match(filesRender(c,s.nav.current),/files-commission-open-ghost/);
  filesHandle('files-commission-open-ghost',{dataset:{id:mailId}},c);
  for(let i=0;i<def.stages.length;i++){
   const step=D04_STEP(def.id,i);assert.equal(s.nav.current.params.orderId,step);
   assert.equal(begin(s,step,1000),true);assert.equal(s.ghost.orders[step].type,def.stages[i]);
   finish(s,step,true,2000); // actual shared completion callback, no direct story hook
   const report=ghostRender(c,{route:'/run',params:{orderId:step}});
   assert.match(report,/成功/);assert.match(report,/data-action="gh-d04-next"/);
   ghostHandle('gh-d04-next',{dataset:{id:step}},c,{route:'/contract',params:{orderId:step}});
  }
  assert.equal(o.status,'READY');assert.equal(s.nav.current.appId,'mirage');
  assert.equal(s.nav.current.route,'/order/'+def.id);
  assert.match(mirageRender(c,s.nav.current),/READY TO SUBMIT/);
  mirageHandle('mc-d04-submit',{dataset:{id:def.id}},c);assert.equal(o.status,'COMPLETED');
  const balance=s.bankData.balance;mirageHandle('mc-d04-submit',{dataset:{id:def.id}},c);
  assert.equal(s.bankData.balance,balance);
  assert.equal(s.bankData.transactions.filter(t=>t.storyD05&&t.amount===def.amount).length,1);
  assert.match(kiraDetail(s,mailId),/文件已驗收/);
 }
 assert.equal(s.bankData.balance,6100);
});
test('new orders keep separate progress across reload; expiry cannot reopen Ghost or submit',()=>{
 const s=fresh();for(const def of D05_CONTRACTS)acceptD04Contract(s,def.id);
 const loaded=JSON.parse(JSON.stringify(s));const first=D05_CONTRACTS[0],second=D05_CONTRACTS[1];
 openCommissionWithGhost(loaded,D04_MAIL(first.id));
 assert.ok(loaded.ghost.orders[D04_STEP(first.id,0)]);
 assert.equal(loaded.ghost.orders[D04_STEP(second.id,0)],undefined);
 loaded.day=9;loaded.clock='08:00';tickD04Contracts(loaded);
 for(const def of D05_CONTRACTS){
  assert.equal(loaded.content.orders.find(o=>o.id===def.id).status,'EXPIRED');
  assert.equal(openCommissionWithGhost(loaded,D04_MAIL(def.id)),null);
  assert.equal(submitD04Contract(loaded,def.id),false);
 }
});
test('D04 original commissions also reach READY through real Ghost finish callback',()=>{
 const s=fresh('08:00',4),def=D04_CONTRACTS[0];acceptD04Contract(s,def.id);
 openCommissionWithGhost(s,D04_MAIL(def.id));
 for(let i=0;i<def.stages.length;i++){
  const step=D04_STEP(def.id,i);assert.equal(begin(s,step),true);finish(s,step,true);
 }
 assert.equal(s.content.orders.find(o=>o.id===def.id).status,'READY');
});
test('D05 Moments use real bundled images, keep old post, and follow the existing three-day visibility',()=>{
 const s=fresh('23:00'),posts=allMoments(s).filter(p=>p.storyDay===5);
 assert.deepEqual(posts.map(p=>p.author).sort(),['小辛','熙旺','熙蒙','胡枫','阿威'].filter(x=>x!=='熙旺').sort());
 assert.equal(posts.find(p=>p.id==='hf-d05').text,'散步时看到这片天，站着看了好久。');
 assert.equal(posts.some(p=>p.author==='仔仔'),false);
 for(const post of posts)for(const media of post.media){
  const path=momentImage(media);assert.ok(path);assert.ok(readFileSync(new URL('../public'+path,import.meta.url)).length>0);
 }
 assert.equal(visibleMoments(posts,'2025-05-23',{clock:'08:00'}).length,0);
 assert.equal(visibleMoments(posts,'2025-05-23',{clock:'23:00'}).length,4);
 assert.equal(visibleMoments(posts,'2025-05-27').length,0);
});
test('D05 fills diary and a once-only editable note, preserving all existing timing rules',()=>{
 const s=fresh();assert.match(entryFor(s,5).body,/工房/);
 assert.equal(s.content.notes.filter(n=>n.id==='xm-note-d05-workshop').length,1);
 const note=s.content.notes.find(n=>n.id==='xm-note-d05-workshop');note.text='我自己改过';
 tickStory55(s);assert.equal(s.content.notes.find(n=>n.id===note.id).text,'我自己改过');
 assert.equal(worldMinuteRate(s),5/1000);s.nav.current={appId:'ghost',route:'/'};
 assert.equal(worldMinuteRate(s),5/60000);s.nav.current={appId:'wechat',route:'/chat/wang'};
 assert.equal(worldMinuteRate(s),5/60000);
 assert.equal(PHONE_CHAT_TRACKS.filter(t=>t.day===5).length,1);
});
