import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickPhoneStoryMessages} from '../src/services/messaging/phone-story-scheduler.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {D10_PRIVATE} from '../src/story/d10/dialogue.js';
import {D11_PRIVATE} from '../src/story/d11/dialogue.js';
import {D12_PRIVATE,D13_PRIVATE} from '../src/story/d12-d13/wechat.js';

const make=(day,clock)=>{
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'home',route:'/',params:{}};
 return s;
};
const chat=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const msgs=(s,prefix,id)=>chat(s,id).messages.filter(m=>m.id.startsWith(prefix));
const store=s=>({get:()=>s,update:fn=>fn(s)});
function pump(s,count=12,begin=10_000){
 for(let i=0;i<count;i++)tickPhoneStoryMessages(s,begin+i*2500);
}
test('reviewed private scenes have exact day/time, recipients, and never add father or Ouroboros to the group',()=>{
 assert.deepEqual(D10_PRIVATE.map(s=>[s.id,s.chat,s.at,s.lines.length]),[]);
 assert.deepEqual(D11_PRIVATE.map(s=>[s.id,s.chat,s.at,s.lines.length]),[
  ['father-after-meeting','fulongsheng','22:06',1],
  ['wang-worry','wang','22:18',13]
 ]);
 assert.deepEqual(D12_PRIVATE.map(s=>[s.id,s.chat,s.at,s.lines.length]),[
  ['wang-airport','wang','18:41',4]
 ]);
 assert.deepEqual(D13_PRIVATE.map(s=>[s.id,s.chat,s.at,s.lines.length]),[
  ['father-planning','fulongsheng','19:03',4]
 ]);
 for(const scene of [...D10_PRIVATE,...D11_PRIVATE,...D12_PRIVATE,...D13_PRIVATE]){
  assert.ok(scene.lines.every(l=>['text'].includes(l.kind)),scene.id);
  assert.ok(scene.lines.every(l=>l.who!=='傅隆生'||scene.chat==='fulongsheng'));
  assert.ok(scene.lines.every(l=>l.who!=='me'||scene.chat!=='group'));
 }
});
test('D11 private father message is truly in Fu Longsheng thread, one time only',()=>{
 const s=make(11,'22:05');
 pump(s,3);
 assert.equal(msgs(s,'d11-father-after-meeting-','fulongsheng').length,0);
 s.clock='22:06';pump(s,5);
 const father=msgs(s,'d11-father-after-meeting-','fulongsheng');
 assert.equal(father.length,1);
 assert.equal(father[0].from,'傅隆生');
 assert.equal(father[0].text,'好好幹。');
 assert.equal(father[0].sentDate,'2025-05-29');
 assert.equal(chat(s,'group').messages.some(m=>m.from==='傅隆生'),false);
 const copy=structuredClone(s);
 pump(copy,15,50000);
 assert.equal(msgs(copy,'d11-father-after-meeting-','fulongsheng').length,1,'reload cannot resend');
});
test('D11 Wang post-meeting worry offers original Send drafts and does not send Ximeng automatically',()=>{
 const s=make(11,'22:18');
 s.story55.completed.return={day:11,clock:'18:00'};
 pump(s,9);
 const prefix='d11-wang-worry-';
 assert.equal(msgs(s,prefix,'wang').map(m=>m.from).join(','),'熙旺');
 const before=msgs(s,prefix,'wang').length;
 assert.equal(nativeWeChatComposer(s,'wang').text,'沒呢哥。');
 assert.equal(msgs(s,prefix,'wang').filter(m=>m.from==='me').length,0);
 assert.ok(sendNativeWeChatPreset(store(s),'wang','錯誤台詞',40000).reason);
 assert.equal(msgs(s,prefix,'wang').length,before,'wrong draft cannot create a message');
 const sent=sendNativeWeChatPreset(store(s),'wang','沒呢哥。',41000);
 assert.equal(sent.handled,true);
 assert.equal(msgs(s,prefix,'wang').filter(m=>m.from==='me').length,1);
 pump(s,12,43500);
 assert.ok(msgs(s,prefix,'wang').some(m=>m.text==='五億美元，沒有那麼容易拿。'));
 assert.equal(nativeWeChatComposer(s,'wang').text,'我又沒說明天就能拿到。');
});
test('D11 unfinished morning scene does not allow later optional Wang draft to hijack it',()=>{
 const s=make(11,'22:18'); // No completed return.
 pump(s,8);
 assert.equal(msgs(s,'d11-wang-worry-','wang').length,0);
 assert.ok(!s.story55?.completed?.return);
});
test('D12 airport is a private conversation, no false arrival before the actual flight',()=>{
 const s=make(12,'18:40');
 pump(s,4);
 assert.equal(msgs(s,'d12-wang-airport-','wang').length,0);
 assert.equal(msgs(s,'d12-arrival-','group').length,0);
 s.clock='18:41';
 pump(s,9,25000);
 assert.deepEqual(msgs(s,'d12-wang-airport-','wang').map(m=>m.text),[
  '我出門去機場接胡楓了。'
 ]);
 assert.equal(nativeWeChatComposer(s,'wang').text,'他幾點落地？');
 assert.equal(msgs(s,'d12-wang-airport-','wang').some(m=>m.from==='me'),false);
 sendNativeWeChatPreset(store(s),'wang','他幾點落地？',52000);
 pump(s,4,54500);
 assert.equal(nativeWeChatComposer(s,'wang').text,'那你小心開車。');
 sendNativeWeChatPreset(store(s),'wang','那你小心開車。',67000);
 pump(s,4,70000);
 assert.equal(msgs(s,'d12-wang-airport-','wang').length,4);
 assert.equal(msgs(s,'d12-arrival-','group').length,0);
});
test('D13 father private chat does not touch wallet/call',()=>{
 const s=make(13,'19:03');
 pump(s,15);
 assert.equal(msgs(s,'d13-father-planning-','fulongsheng').map(x=>x.text).join(' / '),
 '下午說的資料，你先慢慢整理。 / 這次不急著動手，先把每一步想清楚。');
 assert.equal(nativeWeChatComposer(s,'fulongsheng').text,'知道了干爹，我會做好方案的');
 assert.equal(s.story55.completed.intrusion,undefined);
 assert.equal(s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'),false);
});
test('jumping from D10 to D14 quietly backfills only earned NPC prefixes, never imaginary player Sends or live old banners',()=>{
 const s=make(14,'10:00');
 pump(s,16);
 const father=msgs(s,'d11-father-after-meeting-','fulongsheng');
 const airport=msgs(s,'d12-wang-airport-','wang');
 assert.equal(father.length,1);
 assert.equal(father[0].historical,true);
 assert.equal(airport.length,1);
 assert.ok(airport.every(m=>m.historical===true&&m.sentDate==='2025-05-30'));
 assert.equal(airport.some(m=>m.from==='me'),false);
 assert.equal(msgs(s,'d11-wang-worry-','wang').length,1);
 const used=s.notifications.filter(n=>['d11-father-after-meeting-0','d12-wang-airport-0','d12-wang-airport-1'].includes(n.messageId));
 assert.ok(used.every(n=>n.silent),'past notifications never play as live banners');
 pump(s,12,65000);
 assert.equal(msgs(s,'d11-father-after-meeting-','fulongsheng').length,1);
 assert.equal(msgs(s,'d12-wang-airport-','wang').length,1);
});

test('cancelled computer-repair storyline stays absent on D11–D13, including missed old NPC history',()=>{
 for(const [day,defs] of [[11,D11_PRIVATE],[13,D13_PRIVATE]]){
  assert.equal(defs.some(scene=>/laptop|repair|computer/i.test(scene.id)),false);
  assert.ok(defs.every(scene=>scene.lines.every(line=>!/修電腦|修理費|舊筆電|你那台電腦你看了沒|開機像拖拉機/.test(line.text))),'day '+day);
  const s=make(day,'23:59');pump(s,18);
  const h=chat(s,'hufeng');
  assert.equal(h.messages.some(m=>/^d(?:11|13)-hufeng-laptop-/.test(m.id)),false);
 }
});
