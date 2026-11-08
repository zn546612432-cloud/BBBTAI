import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,advanceScene55,markMail55} from '../src/services/story55/runtime.js';
import {defaultStory55Config} from '../src/services/story55/config.js';
import {completed,nodeStatus,story55Config} from '../src/services/story55/state.js';
import {D14_D24_CONTENT,D14_D24_LEGACY} from '../src/story/d14-d24/definition.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
import {syncD14D24Content} from '../src/story/d14-d24/migrate.js';
import {seedAuthoredNotes} from '../src/services/story55/authored-notes.js';
import {currentScript55,sendScriptedDraft55,threadForScene55} from '../src/services/story55/scripted-chat.js';
import {authorizeProject,deploymentPercent} from '../src/services/story55/projects.js';
import {mail55} from '../src/services/story55/views.js';
import {storyProjectKey} from '../src/apps/files/features/story55-key/index.js';
import {storySessionControls} from '../src/apps/mirage/features/story-controls/index.js';

function at(day,clock){
 const s=activateStory55(initialState());s.day=day;s.clock=clock;s.story55.completed.intrusion={day:13,clock:'23:00'};
 // This test starts after D13: earlier mandatory family/move scenes were already played.
 for(const [id,d] of [['return',11],['move',12]])s.story55.completed[id]={day:d,clock:'22:00',test:true};
 s.story55.activeScene=null;return s;
}
const store=s=>({get:()=>s,update:fn=>fn(s)});

test('every D14–D24 WeChat scene uses the existing queue and commits player lines only through Send',()=>{
 for(const scene of D14_D24_CONTENT.wechat){
  const {track}=D14_D24_TRACKS.find(t=>t.track.day===scene.day);
  const s={day:scene.day,clock:scene.at,story55:{version:1,completed:{loan:true}},content:{conversations:{wechat:['group','wang','hufeng'].map(id=>({id,name:id,messages:[],unread:0}))}},nav:{current:{appId:'home',route:'/'}},events:[],notifications:[]};
  const q=track.ensure(s);for(const other of track.defs)if(other.id!==scene.id)q[other.id].completed=true;
  const chat=s.content.conversations.wechat.find(c=>c.id===scene.chat);let time=0;
  track.tick(s,time);track.tick(s,time+=3000);
  assert.equal(chat.messages.some(m=>m.from==='me'),false,scene.id);
  for(let n=0;n<scene.lines.length+2&&!q[scene.id].completed;n++){
   const draft=track.draft(s,scene.chat);
   if(draft){const before=chat.messages.filter(m=>m.from==='me').length;track.tick(s,time+=3000);assert.equal(chat.messages.filter(m=>m.from==='me').length,before);assert.equal(track.send(store(s),scene.chat,draft.text,time).handled,true);}
   track.tick(s,time+=3000);
  }
  assert.equal(q[scene.id].completed,true,scene.id);
  assert.deepEqual(chat.messages.map(m=>[m.from,m.text]),scene.lines.map(l=>[l.who,l.text]),scene.id);
  const count=chat.messages.length;track.tick(s,time+=3000);assert.equal(chat.messages.length,count);
  assert.ok(!chat.messages.some(m=>['傅隆生','熙泰','陈熙泰'].includes(m.from)));
 }
});

test('D14 mail stays separate from deployment, exposes one file attachment and never puts a key in its body',()=>{
 const s=at(14,'09:15');tickStory55(s);assert.equal(s.content.mail.some(m=>m.id==='code-mail'),false);
 s.clock='09:16';tickStory55(s);const mail=s.content.mail.find(m=>m.id==='code-mail');
 assert.ok(mail);assert.equal(mail.subject,'Framework package');assert.equal(mail.from,'Mirage / 系統轉遞');
 assert.ok(!mail55(s,mail).includes('OUROBOROS-14'));assert.equal(s.story55.projects.base,undefined);
 mail.read=true;assert.throws(()=>authorizeProject(s,'base','OUROBOROS-14'));
 markMail55(s,'code-mail');assert.equal(completed(s,'code'),true);assert.equal(completed(s,'base'),false);
 assert.ok(!storyProjectKey(s,'base').includes('OUROBOROS-14'));
 s.story55.projectKeysRevealed={base:true};assert.match(storyProjectKey(s,'base'),/OUROBOROS-14/);
 authorizeProject(s,'base','OUROBOROS-14');assert.equal(deploymentPercent(s,'base'),0);assert.equal(s.ghost.orders['s55:base:0:0'],undefined);
 s.day=23;tickStory55(s);assert.equal(deploymentPercent(s,'base'),0);assert.equal(completed(s,'base'),false);
});

test('D15 fictional session requires an explicit disconnect and one ledger/debt receipt before later messages',()=>{
 const s=at(15,'15:35');s.story55.completed.code={day:14,clock:'10:00'};
 assert.equal(nodeStatus(s,'loan').state,'locked');s.clock='15:36';assert.equal(nodeStatus(s,'loan').state,'locked');
 s.story55.projects.base={authorized:true,batches:[],active:null};assert.equal(nodeStatus(s,'loan').state,'ready');
 let now=Date.now()+100000;
 const drain=()=>{for(let n=0;n<120&&!completed(s,'loan');n++){
  const line=currentScript55(s,'mirage','s55-ouroboros');
  if(line?.kind==='disconnect')return;
  if(line?.kind==='me')sendScriptedDraft55(s,'mirage','s55-ouroboros',line.text);
  else tickQueuedStoryScenes55(s,now+=3000);
 }};
 drain();const index=s.story55.scenes.loan.index;assert.equal(currentScript55(s,'mirage','s55-ouroboros').kind,'disconnect');
 assert.match(storySessionControls(s,'s55-ouroboros'),/切斷連線/);
 for(let i=0;i<8;i++)tickQueuedStoryScenes55(s,now+=3000);
 assert.equal(s.story55.scenes.loan.index,index);assert.equal(s.bankData.transactions.some(t=>t.id==='s55-loan'),false);
 assert.throws(()=>advanceScene55(s,'loan'),/切斷/);
 advanceScene55(s,'loan',{disconnect:true});assert.equal(s.story55.sceneCamera.active,false);drain();
 assert.equal(completed(s,'loan'),true);const receipt=s.bankData.transactions.filter(t=>t.id==='s55-loan');
 assert.equal(receipt.length,1);assert.equal(receipt[0].amount,1000000);assert.equal(receipt[0].liabilityId,'s55-loan');assert.equal(s.story55.liabilities,1000000);
 tickStory55(s);tickStory55(s);assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);assert.equal(s.story55.liabilities,1000000);
});

test('old default scene migration preserves player history, finished loan and real Ghost batches',()=>{
 const s=at(24,'23:00');s.story55.config.scenes.loan=structuredClone(D14_D24_LEGACY.scenes.loan);s.story55.config.scenes.lead=structuredClone(D14_D24_LEGACY.scenes.lead);
 delete s.story55.d14D24Revision;s.story55.completed.loan={day:15,clock:'16:00'};
 s.story55.projects.base={authorized:true,batches:[{complete:true,steps:[1,2,3,4,5]}]};s.story55.liabilities=1000000;
 s.bankData.transactions.push({id:'s55-loan',amount:1000000});
 const history={id:'keep-historical',from:'me',text:'自己的話',sentDate:'2024-03-10'};const player={id:'s55-loan-1',from:'me',text:'舊版本親自發的話',sentDate:'2025-06-02'};
 s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros')?.messages.push(player,history);
 const before=structuredClone(s.story55.projects.base);syncD14D24Content(s);tickStory55(s);
 assert.deepEqual(s.story55.projects.base,before);assert.equal(s.story55.liabilities,1000000);assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);
 assert.equal(player.text,'舊版本親自發的話');assert.equal(history.text,'自己的話');assert.equal(completed(s,'loan'),true);
});

test('the same timed note adapter works at D08, D23 and D44 without overwriting edits or affecting projects',()=>{
 for(const day of [8,23,44]){
  const s={day,clock:'10:59',story55:{version:1,projects:{base:{batches:[]}}},content:{notes:[]}};
  const note={id:'test-note-'+day,day,at:'11:00',title:'會議',text:'各自提交資料'};
  assert.equal(seedAuthoredNotes(s,[note]),false);s.clock='11:00';assert.equal(seedAuthoredNotes(s,[note]),true);
  s.content.notes[0].text='玩家修改';assert.equal(seedAuthoredNotes(s,[note]),false);assert.equal(s.content.notes[0].text,'玩家修改');assert.deepEqual(s.story55.projects.base.batches,[]);
 }
});

test('D24 uses only an unlocked Flow contact, leaves optional search optional, and preserves the D29 prerequisite',()=>{
 const s=at(24,'21:06');s.story55.completed.code={day:14};s.story55.completed.wallet={day:6};
 s.content.conversations.mirage=s.content.conversations.mirage.filter(c=>c.id!=='mc-flow-d03');
 assert.equal(nodeStatus(s,'lead').state,'locked');const count=s.content.conversations.mirage.length;tickQueuedStoryScenes55(s,Date.now()+3000);
 assert.equal(s.content.conversations.mirage.length,count);assert.equal(currentScript55(s,'mirage','mc-flow-d03'),null);
 s.content.conversations.mirage.push({id:'mc-flow-d03',name:'flow',messages:[],unread:0});
 assert.equal(completed(s,'rumours'),false);assert.equal(nodeStatus(s,'lead').state,'ready');
 assert.deepEqual(threadForScene55('lead',s),{channel:'mirage',conversationId:'mc-flow-d03'});
 const draft=currentScript55(s,'mirage','mc-flow-d03');assert.equal(draft.kind,'me');
 assert.equal(s.content.conversations.mirage.find(c=>c.id==='mc-flow-d03').messages.length,0);
 sendScriptedDraft55(s,'mirage','mc-flow-d03',draft.text);assert.equal(s.content.conversations.mirage.find(c=>c.id==='mc-flow-d03').messages[0].from,'me');
 assert.ok(story55Config(s).nodes.find(n=>n.id==='plan').requires.includes('lead'));
 assert.equal(nodeStatus(s,'plan').state,'locked');
 const content=JSON.stringify(D14_D24_CONTENT);assert.ok(!content.includes('203.0.113'));assert.ok(!content.includes('哈佛'));assert.ok(!content.includes('鬼車'));
});
