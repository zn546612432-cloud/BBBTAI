import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickPhoneStoryMessages,phoneStoryMessagesDue} from '../src/services/messaging/phone-story-scheduler.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {genericMissedReplyDraft,MISSED_REPLY_POLICY} from '../src/services/messaging/lifecycle/missed-replies.js';
import {createConversationTrack} from '../src/services/messaging/lifecycle/engine.js';

const fresh=(day=6,clock='08:00')=>{
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'home',route:'/',params:{}};
 return s;
};
const store=s=>({get:()=>s,update:fn=>fn(s)});
const messages=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id).messages;
const generic=(s,id)=>messages(s,id).filter(m=>m.id.startsWith('missed-'+id+'-'));

test('D06 has one generic missed reply instead of separate D03/D04/D05 late replies',()=>{
 const s=fresh();
 tickPhoneStoryMessages(s,0);
 const composer=nativeWeChatComposer(s,'hufeng');
 assert.equal(composer.source,'generic-missed');
 assert.match(composer.text,/之前|前幾天|這兩天|前兩天|剛看到|才看到/);
 assert.equal(generic(s,'hufeng').filter(m=>m.from==='me').length,0,'opening input cannot send player messages');
 assert.deepEqual(nativeWeChatComposer(JSON.parse(JSON.stringify(s)),'hufeng'),composer,'chosen text survives reload');
 assert.equal(nativeWeChatComposer(s,'awei').source,null,'do not invent messages for a contact without backlog');
});

test('one actual Send settles all old optional scenes, waits before a single NPC answer and never awards a mission',()=>{
 const s=fresh();tickPhoneStoryMessages(s,0);
 const before=messages(s,'hufeng').filter(m=>m.id.startsWith('d03-')||m.id.startsWith('d04-')||m.id.startsWith('d05-')).length;
 const draft=genericMissedReplyDraft(s,'hufeng');
 assert.ok(draft);
 const bad=sendNativeWeChatPreset(store(s),'hufeng','我明天來修電腦',5000);
 assert.equal(bad.handled,true);assert.ok(bad.reason);
 const sent=sendNativeWeChatPreset(store(s),'hufeng',draft.text,10000);
 assert.ok(sent.messageId);
 assert.equal(generic(s,'hufeng').filter(m=>m.from==='me').length,1);
 assert.equal(generic(s,'hufeng').filter(m=>m.from!=='me').length,0);
 assert.equal(nativeWeChatComposer(s,'hufeng').disabled,true);
 assert.equal(s.story55.d03Chats.hufeng.lateHandled,true);
 assert.equal(s.story55.d04Chats['hufeng-am'].lateHandled,true);
 assert.equal(s.story55.d05Chats['hufeng-check'].lateHandled,true);
 const originals=messages(s,'hufeng').filter(m=>m.id.startsWith('d03-')||m.id.startsWith('d04-')||m.id.startsWith('d05-'));
 assert.equal(originals.length,before,'previously delivered conversation must remain');
 assert.equal(originals.some(m=>m.from==='me'),false,'never fabricate player dialogue');
 assert.equal(s.bankData.transactions.filter(t=>t.id?.startsWith('missed-')).length,0);
 tickPhoneStoryMessages(s,10000+MISSED_REPLY_POLICY.npcPauseMs-1);
 assert.equal(generic(s,'hufeng').filter(m=>m.from!=='me').length,0);
 const loaded=JSON.parse(JSON.stringify(s));
 tickPhoneStoryMessages(loaded,10000+MISSED_REPLY_POLICY.npcPauseMs);
 tickPhoneStoryMessages(loaded,90000);
 assert.equal(generic(loaded,'hufeng').filter(m=>m.from==='me').length,1);
 assert.equal(generic(loaded,'hufeng').filter(m=>m.from!=='me').length,1);
 assert.equal(nativeWeChatComposer(loaded,'hufeng').text,null,'closed topics do not resurface');
 loaded.day=9;tickPhoneStoryMessages(loaded,100000);
 assert.equal(generic(loaded,'hufeng').length,2,'future day must not replay same episode');
});

test('NPC reminders are spaced, capped, persisted and never turn into player text',()=>{
 const s=fresh();tickPhoneStoryMessages(s,0);
 assert.equal(phoneStoryMessagesDue(s,2500),true);
 tickPhoneStoryMessages(s,2500);
 tickPhoneStoryMessages(s,3000);
 tickPhoneStoryMessages(s,13000);
 tickPhoneStoryMessages(s,25000);
 const all=Object.keys(s.story55.genericMissedReplies.episodes).flatMap(id=>generic(s,id));
 const nudges=all.filter(m=>m.from!=='me'&&m.id.endsWith('-nudge'));
 assert.ok(nudges.length<=2);
 assert.equal(all.filter(m=>m.from==='me').length,0);
 const ids=nudges.map(m=>m.id);
 const loaded=JSON.parse(JSON.stringify(s));
 tickPhoneStoryMessages(loaded,80000);
 const after=Object.keys(loaded.story55.genericMissedReplies.episodes).flatMap(id=>generic(loaded,id)).filter(m=>m.id.endsWith('-nudge'));
 assert.deepEqual(after.map(m=>m.id),ids,'refresh does not duplicate or reroll notifications');
});

test('recent daily replies stay current; only multi-day forgotten messages use generic apology',()=>{
 const s=fresh(5,'08:00');tickPhoneStoryMessages(s,0);
 assert.equal(genericMissedReplyDraft(s,'wang'),null);
 const c=nativeWeChatComposer(s,'hufeng');
 assert.notEqual(c.source,'generic-missed','a one-day-old scene retains its original behavior');
});

test('the shared engine excludes mandatory, unstarted and group history from batch closing',()=>{
 const s=fresh(6);
 const track=createConversationTrack({day:4,prefix:'check',scenes:[
  {id:'required',chat:'hufeng',at:'09:00',mandatory:true,lines:[{who:'me',text:'主線必須發送'}]},
  {id:'unstarted',chat:'hufeng',at:'09:00',lines:[{who:'me',text:'未曾啟動'}]},
  {id:'group',chat:'group',at:'09:00',lines:[{who:'小辛',text:'早上好'}]},
  {id:'optional',chat:'hufeng',at:'10:00',lines:[{who:'胡枫',text:'有空聊聊'},{who:'me',text:'好'}]}
 ],progress:x=>x.story55.catchupTest??={}});
 track.tick(s,0);
 assert.deepEqual(track.pendingCatchup(s,'hufeng').map(x=>x.id),['optional']);
 assert.equal(track.settleCatchup(s,'hufeng').length,1);
 assert.equal(track.draft(s,'hufeng').text,'主線必須發送');
 assert.equal(track.pendingCatchup(s,'hufeng').length,0);
});
