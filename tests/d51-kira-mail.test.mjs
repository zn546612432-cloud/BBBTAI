import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55} from '../src/services/story55/runtime.js';
import {nodeStatus,completed,pendingTimedStoryEvent,story55ChargeGate} from '../src/services/story55/state.js';
import {sendScriptedDraft55,currentScript55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {D46_CONTACT} from '../src/story/d46/definition.js';
import {D53_CALL} from '../src/story/d53/call.js';
import {D53_ACTION_START,D53_ISOLDE_DEAL} from '../src/story/d53/definition.js';
import {
 D51_ISOLDE_CHAT,D51_PRIVATE_MAIL,D51_SENT_ID,D51_DIALOGUE,D51_FIXED_MAIL,
 D51_MAIL_REMINDER,sendD51PrivateMail,syncD51MailReminder
} from '../src/story/d51/definition.js';
import * as kira from '../src/apps/kira/index.js';
import {reminderDestination,toggleReminder} from '../src/services/reminders.js';

const storeOf=s=>({get:()=>s,update:fn=>fn(s)});
function fixture(){
 const s=activateStory55(initialState());
 s.day=51;s.clock='18:59';s.story55.activeScene=null;
 for(const n of s.story55.config.nodes)if(n.day<51)
  s.story55.completed[n.id]={day:n.day,clock:'23:00',test:true};
 if(!s.content.conversations.mirage.some(c=>c.id===D46_CONTACT))
  s.content.conversations.mirage.push({id:D46_CONTACT,name:'Isolde Mirage',messages:[],unread:0});
 return s;
}
function playConversation(s){
 let now=Date.now()+100000;
 for(const [who,text] of D51_DIALOGUE){
  assert.deepEqual(sceneLines(s,D51_ISOLDE_CHAT)[scene55(s,D51_ISOLDE_CHAT).index],[who,text]);
  if(who==='me'){
   assert.equal(currentScript55(s,'mirage',D46_CONTACT,now)?.text,text);
   sendScriptedDraft55(s,'mirage',D46_CONTACT,text,now);
  }else advanceScene55(s,D51_ISOLDE_CHAT,{now});
  now+=20000;
 }
 assert.equal(completed(s,D51_ISOLDE_CHAT),true);
}

test('D51 locked at 19:00: Isolde conversation first, then one manual KIRA mail',()=>{
 const s=fixture();
 assert.equal(nodeStatus(s,D51_ISOLDE_CHAT).state,'locked');
 assert.equal(nodeStatus(s,D51_PRIVATE_MAIL).state,'locked');
 assert.equal(pendingTimedStoryEvent(s).id,D51_ISOLDE_CHAT);
 advanceGameMinutes(s,10);assert.equal(s.clock,'19:00');
 assert.equal(pendingTimedStoryEvent(s).id,D51_ISOLDE_CHAT);
 playConversation(s);
 assert.equal(completed(s,D51_PRIVATE_MAIL),false,'chat cannot send the email');
 assert.equal(pendingTimedStoryEvent(s).id,D51_PRIVATE_MAIL);
 assert.equal(story55ChargeGate(s),'plot');
 assert.equal(advanceGameMinutes(s,60).minutes,0,'cannot skip the email');
 const reminder=s.content.reminders.find(r=>r.id===D51_MAIL_REMINDER);
 assert.ok(reminder);assert.equal(reminder.done,false);
 assert.equal(reminderDestination(s,reminder).link.route,'/compose/private-contract');
 assert.equal(toggleReminder(storeOf(s),D51_MAIL_REMINDER),false);
 const notification=s.notifications.find(n=>n.id==='s55-d51-private-contract-notice');
 assert.ok(notification);assert.equal(notification.link.appId,'kira');
});

test('KIRA draft renders correct recipient, body and unreadable attachment; only native submit sends',()=>{
 const s=fixture();s.clock='19:00';playConversation(s);
 const html=kira.render({store:storeOf(s)},{route:'/compose/private-contract'});
 for(const item of ['Isolde Mirage','Private Contract','資料見附件，等你消息。','Target_Profile.enc'])
  assert.ok(html.includes(item),item);
 assert.match(html,/data-form="kira-d51-private-send"/);
 assert.doesNotMatch(html,/data-action="kira-d51-open-attachment"/);
 assert.doesNotMatch(html,/data-action="kira-open-commission-file"/);
 assert.equal(completed(s,D51_PRIVATE_MAIL),false);
 assert.equal(s.content.mail.some(m=>m.id===D51_SENT_ID),false);
 const bad={...D51_FIXED_MAIL,attachment:'other.enc'};
 assert.throws(()=>sendD51PrivateMail(s,bad),/加密附件/);
 assert.equal(completed(s,D51_PRIVATE_MAIL),false);
 const form={dataset:{form:'kira-d51-private-send'},fields:D51_FIXED_MAIL};
 const original=globalThis.FormData;
 globalThis.FormData=class {constructor(node){this.values=node.fields;}get(field){return this.values[field];}};
 const opened=[],ctx={store:storeOf(s),router:{open:route=>opened.push(route)},toast:()=>{}};
 try{assert.equal(kira.submit(form,ctx),true);}finally{globalThis.FormData=original;}
 assert.equal(completed(s,D51_PRIVATE_MAIL),true);
 assert.equal(s.content.mail.filter(m=>m.id===D51_SENT_ID).length,1);
 assert.equal(opened.at(-1)?.route,'/mail/'+D51_SENT_ID);
 assert.equal(s.content.mail.find(m=>m.id===D51_SENT_ID)?.attachments[0],'Target_Profile.enc');
 assert.equal(s.content.reminders.find(r=>r.id===D51_MAIL_REMINDER)?.done,true);
 assert.equal(sendD51PrivateMail(s,D51_FIXED_MAIL),false,'a second send cannot duplicate the original');
 assert.match(kira.render({store:storeOf(s)},{route:'/sent'}),/Private Contract/);
 assert.match(kira.render({store:storeOf(s)},{route:'/mail/'+D51_SENT_ID}),/已發送/);
 assert.doesNotMatch(kira.render({store:storeOf(s)},{route:'/'}),/s55-d51-private-contract-sent/);
});

test('D53 claim that files were sent requires the real D51 KIRA dispatch',()=>{
 const s=fixture();s.clock='19:00';playConversation(s);
 s.day=53;s.clock='21:33';
 s.story55.completed[D53_ACTION_START]={day:53,clock:'20:00'};
 s.story55.scriptedCallCompleted={[D53_CALL.id]:true};
 assert.match(nodeStatus(s,D53_ISOLDE_DEAL).reason,/發送目標資料/);
 s.day=51;s.clock='19:15';
 sendD51PrivateMail(s,D51_FIXED_MAIL);tickStory55(s);
 s.day=53;s.clock='21:33';
 assert.equal(nodeStatus(s,D53_ISOLDE_DEAL).state,'ready');
});

test('older D52+ saves keep their progress and never synthesize a sent KIRA email',()=>{
 const s=fixture(),cfg=s.story55.config;
 cfg.nodes=cfg.nodes.filter(n=>![D51_ISOLDE_CHAT,D51_PRIVATE_MAIL].includes(n.id));
 delete cfg.scenes[D51_ISOLDE_CHAT];delete cfg.d51Revision;
 const deal=cfg.nodes.find(n=>n.id===D53_ISOLDE_DEAL);
 deal.requires=deal.requires.filter(id=>id!==D51_PRIVATE_MAIL);
 s.day=53;s.clock='20:30';s.story55.activeScene=null;
 tickStory55(s);
 assert.equal(s.clock,'20:30');
 assert.equal(s.story55.completed[D51_ISOLDE_CHAT]?.legacySkipped,true);
 assert.equal(s.story55.completed[D51_PRIVATE_MAIL]?.legacySkipped,true);
 assert.equal(s.content.mail.some(m=>m.id===D51_SENT_ID),false);
 assert.ok(s.story55.config.nodes.some(n=>n.id===D51_PRIVATE_MAIL));
});
