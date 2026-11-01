import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {rebuildStory55AtDay,prepareStory55NodeAtDay} from '../src/services/story55/rebuild.js';
import {completed,story55Config,date55} from '../src/services/story55/state.js';
import {storySourceVersion} from '../src/services/story55/test-snapshots.js';
import {restartState} from '../src/system/restart/index.js';

function phone(){
 const s=initialState();
 activateStory55(s);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'history-2024-0310',from:'me',text:'我换新手机了',sentDate:'2024-03-10',time:'09:20',storyImported:true});
 group.messages.push({id:'author-d48',from:'wang',text:'未来通知',sentDate:'2025-07-05',
  schedule:{mode:'game-time',day:48,clock:'10:00'},authored:true});
 return s;
}
const ids=s=>new Set((s.content.conversations.wechat.find(c=>c.id==='group')?.messages||[]).map(m=>m.id));
test('D45 rebuild reconstructs storyline, inbox, wallet, NoApp and phased GHOST',()=>{
 const s=phone(),oldVersion=storySourceVersion(s);
 rebuildStory55AtDay(s,45,'08:00');
 assert.equal(s.day,45);
 assert.equal(s.story55.developerRebuild.simulatedThrough,44);
 assert.equal(completed(s,'recognition'),true);
 assert.equal(s.story55.noappInstalled,true);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').name,'陈熙泰');
 assert.equal(completed(s,'mercenary'),true);
 assert.equal(completed(s,'second'),false); // D43-D47 deployment cannot finish at D44
 assert.equal(s.story55.projects.second.batches.length,2);
 assert.equal(s.story55.projects.base.batches.length,11);
 assert.equal(s.story55.reports['base-10'].percent,100);
 assert.equal(s.content.orders.find(o=>o.id==='s55-mirage-wallet-bounty').status,'COMPLETED');
 assert.equal(s.content.mirage.transactions.filter(t=>t.id==='s55-wallet-10btc').length,1);
 assert.equal(s.content.mail.find(m=>m.id==='code-mail')?.read,true);
 assert.equal(s.content.mail.find(m=>m.id==='invite-mail')?.read,true);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').messages.some(m=>m.id==='s55-recognition-0'),true);
 assert.equal(ids(s).has('history-2024-0310'),true);
 assert.equal(ids(s).has('author-d48'),true);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.find(m=>m.id==='author-d48').delivery,undefined);
 assert.ok(s.bankData.transactions.some(t=>t.test===true&&t.label.startsWith('DEVELOPER TEST CAPITAL')));
 assert.equal(storySourceVersion(s),oldVersion);
});
test('jump backward reconstructs without retaining future unlocks or completed story',()=>{
 const s=phone();
 rebuildStory55AtDay(s,45);
 rebuildStory55AtDay(s,12);
 assert.equal(s.day,12);
 assert.equal(completed(s,'return'),true);
 assert.equal(completed(s,'move'),false);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').name,'Dr Ouroboros');
 assert.equal(s.content.mail.some(m=>m.id==='invite-mail'),false);
 assert.equal(ids(s).has('history-2024-0310'),true);
});
test('D55 leaves final scene and audio playable, but finishes the prior-day tasks',()=>{
 const s=phone();
 rebuildStory55AtDay(s,55);
 assert.equal(completed(s,'second'),true);
 assert.equal(completed(s,'ready'),true);
 assert.equal(completed(s,'ending'),false);
 assert.equal(s.story55.ended,false);
 assert.equal(s.story55.projects.second.batches.length,5);
});
test('scheduled authored messages are replayed chronologically and remain editable',()=>{
 const s=phone();
 s.storyPresets.rules=[{id:'d8-hi',enabled:true,kind:'proactive',mode:'scheduled',day:8,from:'10:30',to:'10:40',channel:'wechat',conversationId:'group',messages:['记得吃饭'],once:true}];
 rebuildStory55AtDay(s,12);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.ok(group.messages.some(m=>m.id==='preset-d8-hi-8-0'&&m.day===8&&m.time==='10:30'));
 assert.ok(s.storyPresets.usedIds.includes('d8-hi'));
 assert.equal(s.notifications.filter(n=>n.id==='preset-notice-d8-hi-8').length,1);
 assert.ok(!group.messages.some(m=>m.id==='author-d48'&&m.delivery));
 rebuildStory55AtDay(s,49);
 const newGroup=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.deepEqual(newGroup.messages.find(m=>m.id==='author-d48').delivery,{day:48,clock:'10:00'});
});
test('node preview reconstructs same-day prerequisites but does not complete target',()=>{
 const s=phone();
 prepareStory55NodeAtDay(s,'recognition');
 assert.equal(s.day,30);
 assert.equal(completed(s,'invite'),true);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.equal(s.story55.previewNode,'recognition');
});
test('invalid target dates are atomic and reject rather than silently corrupt state',()=>{
 const s=phone(),before=JSON.stringify(s);
 assert.throws(()=>rebuildStory55AtDay(s,56),/日期或时间无效/);
 assert.equal(JSON.stringify(s),before);
});

test('phone reset returns to D01 but preserves authored future story and pre-D01 messages',()=>{
 const s=phone(),oldVersion=storySourceVersion(s);
 rebuildStory55AtDay(s,45);
 const reset=restartState(s);
 assert.equal(s.day,45);
 assert.equal(reset.day,1);
 assert.equal(reset.clock,'08:00');
 assert.equal(reset.unlocked,false);
 assert.equal(reset.nav.current.appId,'home');
 assert.equal(Object.keys(reset.story55.completed).length,0);
 assert.equal(reset.content.mail.some(m=>m.story55),false);
 assert.equal(ids(reset).has('history-2024-0310'),true);
 assert.equal(ids(reset).has('author-d48'),true);
 assert.equal(storySourceVersion(reset),oldVersion);
});
