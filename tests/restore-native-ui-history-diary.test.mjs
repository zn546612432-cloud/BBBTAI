import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {registry,appUnlocked} from '../src/system/registry.js';
import {entryFor,diaryDate,saveDiaryEntry} from '../src/story/diary/entries.js';
import {journalText,diaryView,diaryAction} from '../src/apps/schedule/features/diary/index.js';
import {loadPreD01Wechat,hydrateBuiltInPresets} from '../src/story/presets/catalog.js';
import {nodeStatus} from '../src/services/story55/state.js';
import {STORY55_BOUNTY_ID} from '../src/apps/mirage/data.js';
import {isMirageAuthenticated,setMirageAuthenticated} from '../src/apps/mirage/session.js';

const fixture=()=>{const s=initialState();activateStory55(s);return s;};
test('native MIRAGE loads complete original account and UI, not full-screen story board',()=>{
 const s=fixture();
 assert.ok(s.content.mirage.cart&&s.content.mirage.products.length>=3);
 assert.ok(s.content.conversations.mirage.some(c=>c.name==='BASILISK SUPPLY'));
 const app=registry.get('mirage');
 const login=app.render({store:{get:()=>s}},{route:'/',params:{}});
 assert.match(login,/mc-login-panel/);
 assert.match(login,/mc-login-back/);
 setMirageAuthenticated(true);
 const native=app.render({store:{get:()=>s}},{route:'/',params:{}});
 assert.match(native,/mc-contact-scroll/);
 assert.match(native,/MIRAGE CIPHER/);
 assert.doesNotMatch(native,/s55-dark|55天 · 剧情运行台/);
 const board=app.render({store:{get:()=>s}},{route:'/bounties',params:{}});
 assert.match(board,/mc-board|BOUNTY EXCHANGE/);
 const market=app.render({store:{get:()=>s}},{route:'/market',params:{}});
 assert.match(market,/mc-product-grid/);
 setMirageAuthenticated(false);
});
test('D06 wallet commission is listed in original MIRAGE contracts, not calendar',async()=>{
 const s=fixture();
 s.day=6;
 const {tickStory55}=await import('../src/services/story55/runtime.js');
 tickStory55(s);
 const order=s.content.orders.find(o=>o.id===STORY55_BOUNTY_ID);
 assert.equal(order?.status,'OPEN');
 assert.ok(nodeStatus(s,'wallet'));
});
test('original iOS-style reminders and desktop widget never become story task cards',async()=>{
 const s=fixture();
 const html=registry.get('reminders').render({store:{get:()=>s}},{route:'/',params:{}});
 assert.match(html,/class="reminders-app"/);
 assert.doesNotMatch(html,/class="s55"/);
 const {reminderWidget}=await import('../src/system/shell.js');
 assert.match(reminderWidget(s),/提醒事项表/);
 assert.doesNotMatch(reminderWidget(s),/data-action="s55-node"/);
 assert.equal(appUnlocked('noapp',s),true);
});
test('diary story is the exact requested D01 narrative, and optional reminders are blue links',()=>{
 const s=fixture();
 assert.equal(diaryDate(1),'2025-05-19');
 assert.match(entryFor(s,1).body,/傅隆生回澳门的第三天/);
 assert.match(entryFor(s,1).body,/三年了/);
 const html=diaryView(s,{route:'/',params:{day:'1'}});
 assert.match(html,/老狼归巢/);
 assert.match(html,/天气 晴/);
 assert.match(html,/data-action="diary-add-reminder"/);
 assert.doesNotMatch(html,/GHOST|BOUNTY|任务树/);
 const rich=journalText('提案：[[据点碰面|前往据点碰面]]。');
 assert.match(rich,/class="diary-reminder-link"/);
 assert.match(rich,/前往据点碰面/);
 saveDiaryEntry(s,10,{title:'测试',weather:'雨',body:'不要显示旧日程'});
 assert.equal(entryFor(s,10).weather,'雨');
});
test('add-reminder confirmation creates iOS reminders only after explicit confirmation',()=>{
 const s=fixture();
 const store={get:()=>s,update:fn=>fn(s)};
 let refreshed=0;
 const ctx={store,refresh:()=>{refreshed++;}};
 diaryAction('diary-add-reminder',{dataset:{title:'前往据点碰面'}},ctx);
 assert.equal(s.content.reminders.length,0);
 diaryAction('diary-confirm-reminder',{dataset:{}},ctx);
 assert.deepEqual(s.content.reminders.map(r=>r.title),['前往据点碰面']);
 diaryAction('diary-add-reminder',{dataset:{title:'前往据点碰面'}},ctx);
 diaryAction('diary-confirm-reminder',{dataset:{}},ctx);
 assert.equal(s.content.reminders.length,1);
});
test('55-day Calendar does not auto-inject story scene cards',async()=>{
 const s=fixture();s.day=42;
 const {tickStory55}=await import('../src/services/story55/runtime.js');
 s.content.calendarEvents=[{id:'s55-event-recognition',storyNode:'recognition',title:'旧版剧情弹窗'}];
 tickStory55(s);
 assert.ok(!s.content.calendarEvents.some(e=>e.id.startsWith('s55-event-')));
});
test('pre-D01 history loader strips new plot rules and keeps all dated group and private chat',async()=>{
 const pack={format:'ximeng-preset-day-v1',day:1,channel:'wechat',rules:[],history:[
  {conversationId:'group',conversationName:'群聊',messages:[{id:'hist-group',from:'me',text:'我换新手机了',time:'09:00',sentDate:'2024-03-10'}]},
  {conversationId:'wang',conversationName:'哥',messages:[{id:'hist-wang',from:'wang',text:'阿蒙',time:'09:01',sentDate:'2025-05-11'}]}
 ]};
 // The public release archive contains more than 30 historical messages.
 const copy=JSON.parse(JSON.stringify(pack));
 copy.history[0].messages=Array.from({length:32},(_,i)=>({...pack.history[0].messages[0],id:'hist-'+i}));
 const fetcher=async url=>({ok:true,json:async()=>({format:'ximeng-preset-bundle-v1',packs:[copy]})});
 const packs=await loadPreD01Wechat(fetcher);
 assert.equal(packs[0].history.length,2);
 assert.equal(packs[0].history[0].messages.length,32);
 assert.equal(packs[0].rules.length,0);
});
