import {D05_CONTRACTS} from '../src/story/d05/commissions.js';
import {D06_CONTRACT} from '../src/story/d06/commission.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {appendAuthoredPhoneMessage} from '../src/services/messaging/phone-messages.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {unreadAppCount} from '../src/services/unread-badges.js';
import {PHONE_CHAT_TRACKS,tickPhoneStoryMessages,phoneStoryMessagesDue} from '../src/services/messaging/phone-story-scheduler.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {kiraMailTreatment,kiraMailDateLabel,KIRA_INTERACTIVE_MAILS} from '../src/apps/kira/features/detail/policy.js';
import {D01_OPENING,D01_ATTACHMENT} from '../src/story/d01/runtime.js';
import {D02_MAIL,D02_A_MAIL} from '../src/story/d02/runtime.js';
import {D03_ORDER,D03_MAIL,seedD03Contract,acceptD03Contract} from '../src/story/d03/contract.js';
import {D04_CONTRACTS,DAILY_CONTRACTS,D04_MAIL,seedD04Contracts,acceptD04Contract} from '../src/story/d04/contract.js';
import {HACKER_MAIL_ID} from '../src/apps/mirage/mission.js';

const fresh=(day=4,clock='08:00')=>{
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'home',route:'/',params:{}};
 return s;
};
const cv=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const mail=(id,properties={})=>({id,subject:'【mirage】測試',from:'MIRAGE',
 body:'測試郵件內容',day:4,time:'11:15',read:false,...properties});
const fakeStore=s=>({get:()=>s,update:fn=>fn(s)});

test('one authored message write path records exactly one unread, event and notification',()=>{
 const s=fresh();
 const data={conversationId:'group',messageId:'phone-unified-check-1',
  from:'小辛',text:'群聊測試',storyTag:'storyD04',
  day:4,clock:'08:20',sentDate:'2025-05-22'};
 const first=appendAuthoredPhoneMessage(s,data);
 assert.equal(first?.text,'群聊測試');
 assert.equal(appendAuthoredPhoneMessage(s,data),null);
 assert.equal(cv(s,'group').messages.filter(m=>m.id===data.messageId).length,1);
 assert.equal(s.notifications.filter(n=>n.messageId===data.messageId).length,1);
 assert.equal(s.events.filter(e=>e.messageId===data.messageId).length,1);
 assert.equal(cv(s,'group').unread,1);
 assert.equal(unreadAppCount(s,'wechat')>=1,true);
 assert.equal(readConversationInState(s,'wechat','group'),true);
 assert.equal(cv(s,'group').unread,0);
 assert.equal(s.notifications.filter(n=>n.messageId===data.messageId).length,0);
});
test('authored protagonist messages are never counted as unread and no fake NPC is created',()=>{
 const s=fresh();
 const message=appendAuthoredPhoneMessage(s,{conversationId:'group',messageId:'player-test-one',
  from:'me',text:'我真的按下了發送',day:4,clock:'11:00',sentDate:'2025-05-22'});
 assert.equal(message?.from,'me');
 assert.equal(cv(s,'group').unread,0);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,0);
 s.nav.current={appId:'wechat',route:'/chat/group',params:{}};
 appendAuthoredPhoneMessage(s,{conversationId:'group',messageId:'npc-read-open',
  from:'仔仔',text:'在看聊天時收到',day:4,clock:'11:01'});
 assert.equal(cv(s,'group').unread,0);
});
test('one scheduler preserves D01–D05 and registers D08–D13 without duplicate daily engines',()=>{
 assert.deepEqual(PHONE_CHAT_TRACKS.slice(0,5).map(x=>x.name),['D01','D02','D03','D04','D05']);
 assert.deepEqual(PHONE_CHAT_TRACKS.slice(5).map(x=>x.name),['D08','D09','D10','D11','D12','D13',...Array.from({length:11},(_,i)=>'D'+(14+i))]);
 assert.equal(new Set(PHONE_CHAT_TRACKS.map(x=>x.name)).size,PHONE_CHAT_TRACKS.length);
 const s=fresh(4,'08:20');
 tickPhoneStoryMessages(s,0);
 assert.equal(s.story55?.d04Chats?.morning?.started,true);
 assert.equal(phoneStoryMessagesDue(s,1000),true);
 tickPhoneStoryMessages(s,1000,{dueOnly:true});
 assert.equal(cv(s,'group').messages.filter(m=>m.id==='d04-morning-0').length,1);
 tickPhoneStoryMessages(s,1000,{dueOnly:true});
 assert.equal(cv(s,'group').messages.filter(m=>m.id==='d04-morning-0').length,1);
});
test('unified preset composer never fabricates D04 protagonist; native input shows the exact next line',()=>{
 const s=fresh(4,'17:45');
 tickPhoneStoryMessages(s,0);tickPhoneStoryMessages(s,2100);
 s.nav.current={appId:'wechat',route:'/chat/wang',params:{}};
 assert.equal(nativeWeChatComposer(s,'wang').text,'你請？');
 assert.match(renderWeChatChat(s,'wang'),/value="你請？"/);
 assert.equal(nativeWeChatComposer(s,'hufeng').text,null,'old repair dialogue retired');
 assert.equal(cv(s,'wang').messages.filter(m=>m.from==='me'&&m.storyD04).length,0);
 assert.equal(sendNativeWeChatPreset(fakeStore(s),'wang','隨便亂發').reason,'請發送輸入框裡完整的預設台詞');
 assert.equal(cv(s,'wang').messages.filter(m=>m.from==='me'&&m.storyD04).length,0);
 assert.ok(sendNativeWeChatPreset(fakeStore(s),'wang','你請？').messageId);
 assert.equal(cv(s,'wang').messages.filter(m=>m.from==='me'&&m.storyD04).length,1);

});
test('unified resolver respects D01 first manual message startup trigger',()=>{
 const s=fresh(1,'08:10');
 const result=sendNativeWeChatPreset(fakeStore(s),'group','早');
 assert.equal(result.handled,true);
 assert.ok(result.messageId,'manual D01 opening message id required');
 assert.equal(cv(s,'group').messages.filter(m=>m.from==='me'&&m.text==='早').length,1);
 assert.equal(s.story55.d01.group.started,true);
});
test('unknown emails never sprout a generic attachment button',()=>{
 const s=fresh(4,'19:52');
 const m=mail('unrelated-foreign-mail',{attachments:['readme.txt']});
 s.content.mail.unshift(m);
 assert.equal(kiraMailTreatment(m),'plain-mail');
 const html=kiraDetail(s,m.id);
 assert.ok(html.includes('測試郵件內容'));
 assert.ok(!html.includes('查看附件'));
 assert.ok(!html.includes('kira-attachment'));
 assert.ok(!html.includes('data-action="kira-d01-open-file"'));
});
test('D03 and D04 Mirage orders retain source description without an invented file CTA',()=>{
 const s=fresh(3,'13:40');
 seedD03Contract(s);assert.equal(acceptD03Contract(s),true);
 s.day=4;s.clock='19:52';
 seedD04Contracts(s);
 assert.equal(D04_CONTRACTS.length,2);
 for(const def of D04_CONTRACTS)assert.equal(acceptD04Contract(s,def.id),true);
 for(const id of [D03_MAIL,...D04_CONTRACTS.map(d=>D04_MAIL(d.id))]){
  const m=s.content.mail.find(x=>x.id===id);
  const html=kiraDetail(s,id);
  assert.equal(kiraMailTreatment(m),'commission-file');
  assert.match(html,/執行程序/);
  assert.ok(html.includes('附件：'),'keep information in body');
  assert.ok(!html.includes('查看附件'));
  assert.ok(!html.includes('kira-attachment'));
  assert.match(html,/1 個附件/);
  assert.match(html,/data-action="kira-open-commission-file"/);
  assert.equal((html.match(/class="kira-d01-attachment"/g)||[]).length,1);
  assert.equal(html.includes('data-action="kira-ghost-submit"'),false);
 }
 assert.match(kiraDetail(s,D03_MAIL),/昨天/);
});
test('explicitly approved D01/D02 credential files and HACKER task are unaffected',()=>{
 const s=fresh();
 for(const id of [D01_ATTACHMENT,D02_MAIL,D02_A_MAIL,HACKER_MAIL_ID])
  s.content.mail.unshift(mail(id));
 assert.deepEqual(new Set(KIRA_INTERACTIVE_MAILS),new Set([D01_ATTACHMENT,D02_MAIL,D02_A_MAIL,D03_MAIL,...DAILY_CONTRACTS.map(d=>D04_MAIL(d.id)),HACKER_MAIL_ID]));
 assert.equal(kiraMailTreatment(s.content.mail.find(x=>x.id===D01_ATTACHMENT)),'explicit-key-file');
 assert.match(kiraDetail(s,D01_ATTACHMENT),/data-action="kira-d01-open-file"/);
 assert.match(kiraDetail(s,D02_MAIL),/data-action="kira-d02-open-file"/);
 assert.match(kiraDetail(s,D02_A_MAIL),/data-action="kira-d02-open-file"/);
 assert.equal(kiraMailTreatment(s.content.mail.find(x=>x.id===HACKER_MAIL_ID)),'mission');
 assert.match(kiraDetail(s,HACKER_MAIL_ID),/kira-mission/);
 for(const id of [D01_ATTACHMENT,D02_MAIL,D02_A_MAIL])
  assert.ok(!kiraDetail(s,id).includes('查看附件'));
});
test('D01 bank account is an inline blue-link action, never a generic attachment button',()=>{
 const s=fresh();
 s.content.mail.unshift(mail(D01_OPENING,{body:'Click bank account for payment'}));
 const html=kiraDetail(s,D01_OPENING);
 assert.match(html,/class="kira-d01-inline-link"/);
 assert.match(html,/data-action="kira-d01-bank"/);
 assert.ok(!html.includes('查看附件'));
});
test('KIRA mail dates are based on actual day, not hardcoded 今天',()=>{
 const s=fresh(4,'19:52');
 assert.equal(kiraMailDateLabel(s,mail('one',{date:'2025-05-21'})),'昨天 11:15');
 assert.equal(kiraMailDateLabel(s,mail('two',{date:'2025-05-22'})),'今天 11:15');
 assert.equal(kiraMailDateLabel(s,mail('three',{date:'2025-05-19'})),'5月19日 11:15');
});
