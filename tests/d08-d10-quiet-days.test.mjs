import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {date55} from '../src/services/story55/state.js';
import {D08_CONTRACTS} from '../src/story/d08/commissions.js';
import {D09_CONTRACTS} from '../src/story/d09/commissions.js';
import {D10_CONTRACTS} from '../src/story/d10/commissions.js';
import {D08_GROUP} from '../src/story/d08/dialogue.js';
import {D09_GROUP} from '../src/story/d09/dialogue.js';
import {D10_GROUP} from '../src/story/d10/dialogue.js';
import {DAILY_CONTRACTS,D04_MAIL,D04_STEP,tickD04Contracts,acceptD04Contract,submitD04Contract} from '../src/story/d04/contract.js';
import {tickPhoneStoryMessages,PHONE_CHAT_TRACKS} from '../src/services/messaging/phone-story-scheduler.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {handle as mirageHandle,render as mirageRender} from '../src/apps/mirage/index.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {handle as kiraHandle} from '../src/apps/kira/index.js';
import {handle as filesHandle,render as filesRender} from '../src/apps/files/index.js';
import {handle as ghostHandle,render as ghostRender} from '../src/apps/ghost/index.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {commissionAttachment,openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {nativeWeChatComposer} from '../src/services/messaging/preset-replies.js';

const DAYS=[
 {day:8,defs:D08_CONTRACTS,scenes:D08_GROUP},
 {day:9,defs:D09_CONTRACTS,scenes:D09_GROUP},
 {day:10,defs:D10_CONTRACTS,scenes:D10_GROUP}
];
function fresh(day=8,clock='00:00'){
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'home',route:'/',params:{}};
 s.story55.completed.intro={day:1,clock:'09:00'};
 s.story55.completed['flow-d03']={day:3,clock:'09:00'};
 s.bankData.balance=100;
 tickStory55(s);
 return s;
}
const store=s=>({get:()=>s,update:fn=>fn(s)});
const ctx=s=>({
 store:store(s),router:{open:loc=>{s.nav.current=loc;return loc;}},toast:()=>{},refresh:()=>{}
});
const group=s=>s.content.conversations.wechat.find(c=>c.id==='group');
const messages=(s,day)=>group(s).messages.filter(m=>m['storyD'+String(day).padStart(2,'0')]);
const lines=scenes=>scenes.flatMap(scene=>scene.lines);

test('D08-D10 have exactly 3 optional B/C MIRAGE commissions per day, never a second D06 reward',()=>{
 const ids=new Set(),files=new Set(),steps=new Set();
 for(const {day,defs} of DAYS){
  assert.equal(defs.length,3);
  for(const def of defs){
   assert.equal(def.day,day);
   assert.match(def.id,new RegExp('^d'+String(day).padStart(2,'0')+'-'));
   assert.ok(['B','C'].includes(def.grade));
   assert.ok(def.stages.length>=2&&def.stages.length<=4);
   assert.ok(def.stages.every(s=>['cipher','route','veil','extract'].includes(s)));
   assert.ok(def.amount>0&&Number.isSafeInteger(def.amount));
   assert.ok(def.deadline.day>day&&def.deadline.day<=day+3);
   assert.ok(!ids.has(def.id)&&!files.has(def.attachment)&&!steps.has(def.key),'unique contract attachment and key');
   ids.add(def.id);files.add(def.attachment);steps.add(def.key);
   assert.ok(def.description.includes('交付：'));
   assert.ok(def.letter.includes('附件：'+def.attachment));
   assert.equal(DAILY_CONTRACTS.find(d=>d.id===def.id),def);
  }
 }
 assert.equal(ids.size,9);
 assert.ok(DAILY_CONTRACTS.some(c=>c.id==='mirage-ouroboros-10btc-d05'||c.asset==='BTC'),
   'original D06 BTC contract still exists');
});

test('Three contracts are published on their date, not early; opening MIRAGE neither accepts nor sends KIRA mail',()=>{
 const s=fresh(7,'23:59');
 for(const {day,defs} of DAYS)assert.ok(defs.every(d=>!s.content.orders.some(o=>o.id===d.id)),day);
 for(const {day,defs} of DAYS){
  s.day=day;s.clock='00:00';tickD04Contracts(s);
  const published=s.content.orders.filter(o=>o.storyDay===day&&defs.some(d=>d.id===o.id));
  assert.equal(published.length,3,'D'+day);
  assert.ok(published.every(o=>o.status==='OPEN'&&o.publishedClock==='00:00'));
  assert.ok(defs.every(d=>!s.content.mail.some(m=>m.id===D04_MAIL(d.id))),'KIRA stays empty until acceptance');
  assert.ok(DAYS.filter(t=>t.day>day).flatMap(t=>t.defs).every(d=>!s.content.orders.some(o=>o.id===d.id)));
  assert.equal(s.bankData.balance,100);
 }
 tickD04Contracts(s);
 for(const {day,defs} of DAYS)assert.equal(s.content.orders.filter(o=>defs.some(d=>d.id===o.id)).length,3);
});

test('All 9 commissions use real MIRAGE acceptance → KIRA single attachment → Files → GHOST stages → manual settlement once',()=>{
 setMirageAuthenticated(true);
 for(const {day,defs} of DAYS){
  const s=fresh(day,'08:00'),c=ctx(s);
  for(const def of defs){
   const original=s.bankData.balance;
   mirageHandle('mc-accept-bounty',{dataset:{id:def.id}},c);
   const order=s.content.orders.find(o=>o.id===def.id),mailId=D04_MAIL(def.id);
   assert.equal(order.status,'ACCEPTED',def.id);
   assert.equal(s.bankData.balance,original,'no reward at acceptance');
   const mail=s.content.mail.find(m=>m.id===mailId);
   assert.ok(mail);
   assert.deepEqual(mail.attachments,[def.attachment]);
   assert.equal(mail.date,date55(day));
   assert.equal(s.content.mail.filter(m=>m.id===mailId).length,1);
   assert.ok(kiraDetail(s,mailId).includes(def.attachment));
   assert.equal((kiraDetail(s,mailId).match(/class="kira-d01-attachment"/g)||[]).length,1);
   assert.equal(s.ghost.orders[D04_STEP(def.id,0)],undefined,'Ghost locked before attachment opens');
   kiraHandle('kira-open-commission-file',{dataset:{id:mailId}},c);
   assert.equal(s.nav.current.appId,'files');
   assert.match(filesRender(c,s.nav.current),/files-commission-open-ghost/);
   filesHandle('files-commission-open-ghost',{dataset:{id:mailId}},c);
   assert.equal(s.nav.current.appId,'ghost');
   for(let i=0;i<def.stages.length;i++){
    const step=D04_STEP(def.id,i);
    assert.equal(s.nav.current.params.orderId,step);
    assert.equal(begin(s,step,10000),true);
    assert.equal(s.ghost.orders[step].type,def.stages[i]);
    finish(s,step,true,11000);
    assert.match(ghostRender(c,{route:'/run',params:{orderId:step}}),/成功/);
    ghostHandle('gh-d04-next',{dataset:{id:step}},c,{route:'/contract',params:{orderId:step}});
   }
   assert.equal(order.status,'READY');
   assert.equal(s.bankData.balance,original,'no reward from puzzle completion alone');
   assert.match(mirageRender(c,{appId:'mirage',route:'/order/'+def.id,params:{}}),/READY TO SUBMIT/);
   mirageHandle('mc-d04-submit',{dataset:{id:def.id}},c);
   assert.equal(order.status,'COMPLETED');
   assert.equal(s.bankData.balance,original+def.amount,def.id);
   assert.equal(s.bankData.transactions.filter(t=>t.id==='d04-receipt-'+def.id).length,1);
   assert.equal(s.content.mail.filter(m=>m.id==='d04-receipt-'+def.id).length,1);
   const settled=s.bankData.balance;
   mirageHandle('mc-d04-submit',{dataset:{id:def.id}},c);
   assert.equal(s.bankData.balance,settled,'no duplicate payout');
  }
  assert.equal(s.bankData.transactions.filter(t=>defs.some(d=>t.id==='d04-receipt-'+d.id)).length,3);
 }
});

test('Expiry, partial saves and unaccepted tasks never manufacture payments or unlock later GHOST stages',()=>{
 for(const {day,defs} of DAYS){
  const s=fresh(day,'08:00');
  const def=defs[0],other=defs[1];
  assert.equal(acceptD04Contract(s,def.id),true);
  const saved=structuredClone(s),file=D04_MAIL(def.id);
  assert.ok(commissionAttachment(saved,file));
  assert.equal(openCommissionWithGhost(saved,file),D04_STEP(def.id,0));
  assert.equal(saved.ghost.orders[D04_STEP(def.id,1)],undefined);
  saved.day=def.deadline.day+1;saved.clock='09:00';tickD04Contracts(saved);
  assert.equal(saved.content.orders.find(o=>o.id===def.id).status,'EXPIRED');
  assert.equal(saved.content.orders.find(o=>o.id===other.id).status,'EXPIRED');
  assert.equal(openCommissionWithGhost(saved,file),null);
  assert.equal(submitD04Contract(saved,def.id),false);
  assert.equal(saved.bankData.balance,100);
  assert.equal(saved.bankData.transactions.filter(t=>t.id==='d04-receipt-'+def.id).length,0);
 }
});

test('Every day has 20 original group bubbles, with standalone remarks and no automatic Ximeng/player line',()=>{
 const ids=new Set();
 for(const {day,scenes} of DAYS){
  const all=lines(scenes);
  assert.equal(all.length,20,'day '+day);
  assert.ok(scenes.some(x=>x.lines.length===1),'not every group message gets a reply');
  assert.ok(all.every(x=>x.who!=='me'&&x.who!=='熙蒙'&&x.who!=='熙泰'&&x.who!=='傅隆生'));
  assert.ok(all.every(x=>x.text&&!x.text.includes('玩家')&&!x.text.includes('任务完成')));
  for(const scene of scenes){
   assert.equal(scene.chat,'group');
   assert.ok(/^\d\d:\d\d$/.test(scene.at));
   const id='d'+String(day).padStart(2,'0')+'-'+scene.id;
   assert.ok(!ids.has(id));ids.add(id);
  }
 }
 assert.ok(D09_GROUP.some(scene=>scene.id==='training'));
 assert.ok(!D08_GROUP.some(scene=>scene.id==='training'));
 assert.ok(!D10_GROUP.some(scene=>scene.id==='training'));
 assert.deepEqual(PHONE_CHAT_TRACKS.filter(x=>[8,9,10].includes(x.day)).map(x=>x.day),[8,9,10]);
});

test('Shared scheduler sends one new D08-D10 group bubble per tick, preserving unread, notifications, idempotence and timestamps',()=>{
 for(const {day,scenes} of DAYS){
  const s=fresh(day,'08:00'),first=group(s).unread;
  let now=10000,count=0;
  for(const scene of scenes){
   s.clock=scene.at;
   for(let i=0;i<scene.lines.length+4;i++,now+=2150){
    tickPhoneStoryMessages(s,now);
    const n=messages(s,day).length;
    assert.ok(n-count<=1,'more than one group bubble at once D'+day);
    count=n;
   }
  }
  assert.equal(count,20,'day '+day);
  assert.equal(messages(s,day).filter(x=>x.from==='me').length,0);
  assert.equal(group(s).unread,first+20);
  assert.equal(s.notifications.filter(n=>String(n.messageId).startsWith('d'+String(day).padStart(2,'0')+'-')&&n.conversationId==='group').length,20);
  assert.ok(messages(s,day).every(m=>m.sentDate===date55(day)));
  const refreshed=structuredClone(s);
  for(let i=0;i<40;i++)tickPhoneStoryMessages(refreshed,now+i*2000);
  assert.equal(messages(refreshed,day).length,20,'reloading cannot redeliver');
  assert.ok(!messages(s,day).some(m=>m.from==='me'),'player lines must never be authored by background scheduler');
 }
});

test('Skipping to D10 silently backfills only real D08-D09 NPC messages, never late live notification bursts',()=>{
 const s=fresh(7,'21:00');
 s.day=10;s.clock='09:00';
 for(let i=0;i<10;i++)tickPhoneStoryMessages(s,90000+i*3000);
 for(const day of [8,9]){
  assert.equal(messages(s,day).length,20);
  assert.ok(messages(s,day).every(m=>m.historical&&m.day===day&&m.sentDate===date55(day)));
  assert.ok(s.notifications.filter(n=>String(n.messageId).startsWith('d'+String(day).padStart(2,'0')+'-'))
    .every(n=>n.silent));
 }
 assert.equal(messages(s,10).length,0,'D10 first scene has not started by 09:00');
 const before=s.content.conversations.wechat.find(c=>c.id==='group').messages.length;
 tickPhoneStoryMessages(s,999999);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.length,before,'stable on retry');
 assert.equal(s.bankData.transactions.filter(t=>/d0[89]|d10-/.test(t.id)).length,0);
});
