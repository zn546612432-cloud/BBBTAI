import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAppLink} from '../src/services/deep-links/index.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {nodeStatus,completed} from '../src/services/story55/state.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {D17_INVITATION_ID,D17_INVITATION_LINES,D17_WEB_PAGES,D17_NOTE_TEXT} from '../src/story/d17/content.js';
import {applyD17Definition} from '../src/story/d17/definition.js';
import {render,handle} from '../src/apps/browser/index.js';
import {renderResearchPage,recordMirageReading} from '../src/apps/browser/mirage-research.js';

function phone(day=17,clock='19:00'){
 const s=activateStory55(initialState());s.day=day;s.clock=clock;
 for(const n of s.story55.config.nodes)if(n.kind==='scene'&&n.day<17)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 s.story55.completed.code={day:14,clock:'09:16'};s.story55.completed.wallet={day:6,clock:'11:00'};
 s.story55.activeScene=null;return s;
}
function ctx(s){return {store:{get:()=>s,update:f=>f(s)},router:{open:loc=>{s.nav.current=normalizeAppLink(loc,new Map([['browser',{}]]))},back:()=>{}},refresh:()=>{}};}
const forum=D17_WEB_PAGES.find(p=>p.forum);

test('D17 invitation is the approved 30 lines and waits for time and the completed loan',()=>{
 assert.deepEqual(D17_INVITATION_LINES,JSON.parse(readFileSync(new URL('fixtures/d17-approved-lines.json',import.meta.url))));
 const s=phone(17,'18:59');assert.equal(nodeStatus(s,D17_INVITATION_ID).state,'locked');
 s.clock='19:00';delete s.story55.completed.loan;
 assert.equal(nodeStatus(s,D17_INVITATION_ID).state,'locked');
 s.story55.completed.loan={day:17,clock:'21:00'};s.clock='21:00';
 assert.equal(completed(s,'rumours'),false);assert.equal(completed(s,'base'),false);
 assert.equal(nodeStatus(s,D17_INVITATION_ID).state,'ready');
 assert.equal(s.story55.hardware,1);assert.equal(s.content.mirage.assets?.length||0,0);
});

test('all 30 D17 messages use the existing queue and native Send, survive reload and remain unique',()=>{
 let s=phone();let now=Date.now()+100000;
 for(let i=0;i<100&&!completed(s,D17_INVITATION_ID);i++){
  const line=currentScript55(s,'mirage','s55-ouroboros');
  if(line?.id===D17_INVITATION_ID&&line.kind==='me'){
   const before=s.content.conversations.mirage.flatMap(c=>c.messages).filter(m=>m.from==='me').length;
   tickQueuedStoryScenes55(s,now+=3000);
   assert.equal(s.content.conversations.mirage.flatMap(c=>c.messages).filter(m=>m.from==='me').length,before);
   sendScriptedDraft55(s,'mirage','s55-ouroboros',line.text);
   s=JSON.parse(JSON.stringify(s)); // a real persisted player turn
  }else tickQueuedStoryScenes55(s,now+=3000);
 }
 assert.ok(completed(s,D17_INVITATION_ID));
 const messages=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id.startsWith('s55-d17-invitation-'));
 assert.equal(messages.length,30);assert.equal(new Set(messages.map(m=>m.id)).size,30);
 assert.deepEqual(messages.map(m=>[m.from==='me'?'me':'ouroboros',m.text]),D17_INVITATION_LINES);
 tickStory55(s);tickQueuedStoryScenes55(s,now+=3000);
 assert.equal(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id.startsWith('s55-d17-invitation-')).length,30);
});

test('search unlocks on D17, old entry opens search, and failed sites never reveal clues or change money',()=>{
 const s=phone(16);const c=ctx(s),loc={route:'/search',params:{query:'mirage'}};
 assert.doesNotMatch(render(c,loc),/data-page="d17-/);
 assert.equal(recordMirageReading(s,forum),false);
 assert.doesNotMatch(renderResearchPage(s,forum),/憂傷的魚|Azathoth/);
 s.day=17;delete s.story55.completed.loan;delete s.story55.completed.code;
 const before=JSON.stringify(s.bankData);const search=render(c,loc);
 assert.equal((search.match(/class="saf-result" data-page="d17-/g)||[]).length,4);
 assert.match(render(c,{route:'/story55',params:{page:'mirage'}}),/d17-xingyue/);
 for(const p of D17_WEB_PAGES.filter(p=>p.failure)){
  handle('browser-open',{dataset:{page:p.id}},c,loc);
  assert.match(render(c,s.nav.current),/無法開啟此網頁/);
  assert.equal(s.story55.browserReadIds,undefined);
 }
 assert.equal(JSON.stringify(s.bankData),before);assert.equal(completed(s,'rumours'),false);
});

test('forum keeps all three ordered comments and login fails; only rendered content enters existing mirage note once',()=>{
 let s=phone();const existing={id:'my-mirage',title:'Mirage',text:'我自己的記錄'};s.content.notes.unshift(existing);
 let c=ctx(s);handle('browser-open',{dataset:{page:forum.id}},c,{route:'/search',params:{query:'mirage'}});
 const html=render(c,s.nav.current);
 assert.match(html,/Base64 編碼/);assert.match(html,/TWlyYWdl/);assert.match(html,/樓中樓回覆/);
 assert.ok(html.indexOf('這串不是亂碼')<html.indexOf('Mirage 嗎？'));
 assert.ok(html.indexOf('Mirage 嗎？')<html.indexOf('暗網怎麼可能'));
 assert.ok(existing.text.startsWith('我自己的記錄'));assert.ok(existing.text.endsWith(D17_NOTE_TEXT));
 assert.match(existing.text,/尚未核實/);assert.equal(completed(s,'rumours'),true);
 existing.text+='\n自己的補記';
 s=JSON.parse(JSON.stringify(s));c=ctx(s);
 handle('browser-forum-login',{dataset:{}},c,{route:'/page',params:{page:forum.id}});
 const failed=render(c,s.nav.current);assert.match(failed,/該帖子已失效/);assert.doesNotMatch(failed,/憂傷的魚/);
 handle('browser-back',{dataset:{}},c,s.nav.current);
 handle('browser-open',{dataset:{page:forum.id}},c,{route:'/search',params:{query:'mirage'}});
 assert.equal(s.content.notes.filter(n=>n.title.toLowerCase()==='mirage').length,1);
 assert.equal(s.content.notes.find(n=>n.id===existing.id).text,existing.text);
 assert.equal(s.story55.browserReadIds.length,1);
});

test('migration preserves in-flight history, edited notes and completed old optional research',()=>{
 const s=phone();s.story55.config.nodes=s.story55.config.nodes.filter(n=>n.id!==D17_INVITATION_ID);delete s.story55.config.scenes[D17_INVITATION_ID];
 const node=s.story55.config.nodes.find(n=>n.id==='rumours');node.requires=['code'];node.at='23:06';
 s.story55.completed.rumours={day:17,clock:'23:10'};
 const before=JSON.stringify(s.content.conversations),balance=s.bankData.balance;
 assert.equal(applyD17Definition(s.story55.config),true);assert.equal(applyD17Definition(s.story55.config),false);
 assert.equal(JSON.stringify(s.content.conversations),before);assert.equal(s.bankData.balance,balance);
 assert.equal(node.at,'00:00');assert.ok(completed(s,'rumours'));
 const reference=renderResearchPage(s,D17_WEB_PAGES.find(p=>p.reference));
 assert.match(reference,/神話中的名字/);assert.match(reference,/無法核實/);assert.doesNotMatch(reference,/陳熙泰|陈熙泰|管理員/);
});
