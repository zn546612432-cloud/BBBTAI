import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55,tickStory55,advanceScene55,markMail55,readEvidence55,sendQuestion55,payNode55,anonymousPresence55} from '../src/services/story55/runtime.js';
import {story55Config,completed,nodeStatus,date55,taiRecognized,story55ChargeGate} from '../src/services/story55/state.js';
import {authorizeProject,startDeploymentStep,deploymentPercent,upgradeHardware} from '../src/services/story55/projects.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {validateStory55Config,importStory55Config,exportStory55Config} from '../src/services/story55/config.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {handle as ghostAction} from '../src/apps/ghost/index.js';
import {routeSolution} from '../src/apps/ghost/games/logic.js';
import {registry,installed} from '../src/system/registry.js';
import {dateParts} from '../src/services/calendar.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {syncDeathNight,chargingBlock} from '../src/system/power/story.js';
import {installMining,accrueMining,upgradeMining,sellMining} from '../src/services/story55/mining.js';
const fixture=()=>{const s=initialState();activateStory55(s);return s;};
const playScene=(s,id)=>{for(let i=0;i<100&&!completed(s,id);i++)advanceScene55(s,id,{acceptCall:true});assert.ok(completed(s,id));};
function solveRun(s,id){
 const ctx={store:{get:()=>s,update:f=>f(s)}};const loc={route:'/run',params:{orderId:id}};assert.equal(begin(s,id),true);
 const click=(a,data)=>ghostAction('gh-'+a,{dataset:data},ctx,loc);
 const o=s.ghost.orders[id];
 if(o.type==='cipher'){for(let i=0;i<9&&o.status==='running';i++){if(o.board.tiles[i]!==i){const j=o.board.tiles.indexOf(i);click('tile',{index:String(i)});click('tile',{index:String(j)});}}}
 if(o.type==='route'){for(let i=0;i<9&&o.status==='running';i++)for(let n=0;n<4&&o.board.masks[i]!==routeSolution[i]&&o.status==='running';n++)click('pipe',{index:String(i)});}
 if(o.type==='extract'){while(o.status==='running')click('match',{index:String(o.board.correct)});}
 if(o.type==='veil'){while(o.status==='running'){for(const digit of o.board.code)click('key',{key:digit});}}
 if(o.type==='verify'){for(const token of o.board.target)click('verify-token',{index:String(o.board.tokens.indexOf(token))});}
 assert.ok(['success','paid'].includes(o.status),o.type);
}
const runBatch=(s,id)=>{const p=story55Config(s).projects.find(x=>x.id===id);for(let i=0;i<p.steps.length;i++){const run=startDeploymentStep(s,id);solveRun(s,run);}};

test('55-day graph validates and isolates legacy progress without deleting historical authored chat',()=>{
 const s=initialState();s.content.conversations.wechat[0].messages.push({id:'kept',text:'换了手机',sentDate:'2024-03-10'});s.ghost={orders:{old:{}},history:[]};activateStory55(s);
 assert.equal(validateStory55Config(story55Config(s)).nodes.length,33);assert.equal(s.day,1);assert.deepEqual(Object.keys(s.ghost.orders),[]);
 assert.ok(s.content.conversations.wechat[0].messages.some(m=>m.id==='kept'));
 assert.equal(date55(11),'2025-05-29');assert.equal(date55(55),'2025-07-12');assert.equal(dateParts(s).iso,'2025-05-19');
 assert.equal(story55ChargeGate(s),'plot');assert.equal(nodeStatus(s,'code').state,'locked');
});
test('Kira authorization, hardware and five actual games commit one 9% batch; retries/reload do not duplicate it',()=>{
 const s=fixture();previewNode55(s,'code');assert.ok(s.content.mail.some(m=>m.id==='code-mail'));
 assert.throws(()=>authorizeProject(s,'base','wrong'),/等待/);markMail55(s,'code-mail');assert.throws(()=>authorizeProject(s,'base','wrong'),/授权码/);authorizeProject(s,'base','OUROBOROS-14');
 assert.throws(()=>startDeploymentStep(s,'base'),/设备/);s.bankData.balance=100000;upgradeHardware(s);
 const p=story55Config(s).projects.find(p=>p.id==='base');
 for(let i=0;i<4;i++){const run=startDeploymentStep(s,'base');solveRun(s,run);assert.equal(deploymentPercent(s,'base'),0);}
 const final=startDeploymentStep(s,'base');solveRun(s,final);assert.equal(deploymentPercent(s,'base'),9);assert.equal(Object.keys(s.story55.reports).length,1);
 finish(s,final,true);assert.equal(deploymentPercent(s,'base'),9);assert.throws(()=>startDeploymentStep(s,'base'),/本日/);
 const payload=JSON.stringify(s),memory=new Map();const store=new PhoneStore({getItem:()=>payload,setItem:(k,v)=>memory.set(k,v)});
 assert.equal(deploymentPercent(store.get(),'base'),9);assert.equal(store.get().story55.projects.base.batches[0].steps.filter(Boolean).length,5);
});
test('base deployment catches up missed batches, ends at exactly100 and writes completion shared with the tree',()=>{
 const s=fixture();previewNode55(s,'code');markMail55(s,'code-mail');authorizeProject(s,'base','OUROBOROS-14');s.story55.hardware=3;s.day=24;
 for(let i=0;i<11;i++)runBatch(s,'base');
 assert.equal(deploymentPercent(s,'base'),100);assert.equal(completed(s,'base'),true);assert.throws(()=>startDeploymentStep(s,'base'),/已完成/);
 assert.equal(s.ghost.history.filter(h=>h.success).length,55);assert.equal(s.bankData.balance,0);
});
test('failed game cannot increase progress; current batch remains resumable',()=>{
 const s=fixture();previewNode55(s,'base');authorizeProject(s,'base','OUROBOROS-14');s.story55.hardware=2;
 const id=startDeploymentStep(s,'base');begin(s,id);finish(s,id,false);assert.equal(deploymentPercent(s,'base'),0);assert.equal(startDeploymentStep(s,'base'),id);solveRun(s,id);assert.equal(deploymentPercent(s,'base'),0);
});
test('file → map → browser → five messages → encrypted photo → invitation unlocks NoApp without D56',()=>{
 const s=fixture();previewNode55(s,'dossier');assert.equal(taiRecognized(s),false);
 readEvidence55(s,'file','dossier');assert.equal(nodeStatus(s,'uk').state,'ready');readEvidence55(s,'map','uk');readEvidence55(s,'page','harvard');readEvidence55(s,'page','ig');
 for(let i=0;i<4;i++){sendQuestion55(s);assert.equal(completed(s,'questions'),false);}sendQuestion55(s);assert.equal(completed(s,'questions'),true);
 authorizeProject(s,'photo','ARCHIVE-03');s.story55.hardware=2;runBatch(s,'photo');readEvidence55(s,'file','triplets');tickStory55(s);
 assert.ok(s.content.mail.some(m=>m.id==='invite-mail'));markMail55(s,'invite-mail');playScene(s,'recognition');
 assert.equal(s.day,30);assert.equal(taiRecognized(s),true);assert.ok(installed(s).some(m=>m.id==='noapp'));
 const p=registry.get('maps').render({store:{get:()=>s}},{route:'/place',params:{id:'uk'}});assert.match(p,/查看关联网页/);
});
test('config import rejects cycles, impossible deadlines and wrong completion totals atomically',()=>{
 const s=fixture(),original=exportStory55Config(s);let bad=JSON.parse(original);bad.nodes[0].requires=['recognition'];assert.throws(()=>importStory55Config(s,JSON.stringify(bad)),/循环|晚于/);assert.equal(exportStory55Config(s),original);
 bad=JSON.parse(original);bad.projects[1].gains[0]=50;assert.throws(()=>importStory55Config(s,JSON.stringify(bad)),/100%/);
 bad=JSON.parse(original);bad.nodes[0].gateDay=0;assert.throws(()=>importStory55Config(s,JSON.stringify(bad)),/完成期限/);
});
test('expenses, scene loans, direct commissions and mercenary payments settle once with no negative cash',()=>{
 const s=fixture();previewNode55(s,'loan');const before=s.bankData.balance;playScene(s,'loan');assert.equal(s.bankData.balance,before+1000000);assert.equal(s.story55.liabilities,1000000);playScene(s,'loan');assert.equal(s.story55.liabilities,1000000);
 tickStory55(s);tickStory55(s);assert.equal(new Set(s.story55.expenseDays).size,s.story55.expenseDays.length);
 previewNode55(s,'mercenary');s.bankData.balance=9999999;assert.throws(()=>payNode55(s,'mercenary'),/不足/);assert.equal(completed(s,'mercenary'),false);s.bankData.balance=10000000;payNode55(s,'mercenary');assert.equal(s.bankData.balance,0);assert.throws(()=>payNode55(s,'mercenary'));assert.equal(s.bankData.transactions.filter(x=>x.id==='s55-payment-mercenary').length,1);
});
test('time cannot skip mandatory incomplete nodes or flow into D56; ending waits for final audio',()=>{
 const s=fixture();advanceGameMinutes(s,5000);assert.equal(s.day,1);assert.equal(s.clock,'23:59');assert.equal(chargingBlock(s),'plot');
 previewNode55(s,'ending');assert.equal(s.day,55);syncDeathNight(s);assert.equal(s.deathPhase,null);assert.equal(chargingBlock(s),'death');
 advanceGameMinutes(s,20000);assert.equal(s.day,55);assert.equal(s.story55.ended,false);
 for(let i=0;i<100;i++){const state=s.story55.scenes.ending;const line=story55Config(s).scenes.ending[state?.index||0];if(line[0]==='watch')break;advanceScene55(s,'ending');}
 assert.throws(()=>advanceScene55(s,'ending'),/语音/);s.story55.finalAudioHeard=true;playScene(s,'ending');assert.equal(s.batteryPercent,1);assert.equal(s.day,55);assert.equal(s.deathPhase,'off');
});
test('game-clock mining accrues once, survives backwards inspection and caps at ten upgrade levels',()=>{
 const s=fixture();previewNode55(s,'mercenary');s.bankData.balance=100000000;installMining(s);s.clock='21:00';accrueMining(s);assert.equal(s.story55.mining.btc,.05);accrueMining(s);assert.equal(s.story55.mining.btc,.05);
 s.clock='20:00';accrueMining(s);s.clock='21:00';accrueMining(s);assert.equal(s.story55.mining.btc,.05);
 for(let i=1;i<10;i++)upgradeMining(s);assert.equal(s.story55.mining.level,10);assert.throws(()=>upgradeMining(s));const before=s.bankData.balance;sellMining(s);assert.equal(s.bankData.balance-before,6000);
});
test('anonymous 25-minute window persists independently of plot time and cannot start beforeD15',()=>{
 const s=fixture();previewNode55(s,'loan');assert.equal(anonymousPresence55(s,1000).online,false);s.story55.anonymousWindows={[s.day]:1000};assert.equal(anonymousPresence55(s,1000+1499000).online,true);assert.equal(anonymousPresence55(s,1000+1500000).online,false);
 s.day=14;assert.equal(anonymousPresence55(s,1000).online,false);
});

test('developer location keeps the editor open and home widgets use the55-day graph',async()=>{
 const {home,reminderWidget}=await import('../src/system/shell.js');
 const s=fixture();s.nav={current:{appId:'developer',route:'/story55',params:{}},stack:[]};previewNode55(s,'code');
 assert.equal(s.nav.current.appId,'developer');assert.match(home(s),/还有 41 天/);assert.match(reminderWidget(s),/基础框架邮件/);
});
test('five questions become real MIRAGE history and NoApp installation precedes recognition',()=>{
 const s=fixture();previewNode55(s,'questions');
 for(let i=0;i<5;i++)sendQuestion55(s);
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');assert.equal(chat.messages.filter(m=>m.from==='me').length,5);assert.equal(chat.messages.filter(m=>m.from===chat.id).length,1);assert.throws(()=>sendQuestion55(s));
 previewNode55(s,'recognition');assert.equal(taiRecognized(s),false);s.story55.noappInstalled=true;assert.ok(installed(s).some(m=>m.id==='noapp'));playScene(s,'recognition');assert.equal(taiRecognized(s),true);
 assert.ok(s.content.conversations.noapp.find(c=>c.id==='tai').messages.some(m=>m.text.includes('欢迎回家')));
});
test('independent preparation and second program award20 percent only for complete five-game batches',()=>{
 for(const id of ['prep','second']){const s=fixture();previewNode55(s,id);s.day=id==='prep'?35:49;s.story55.hardware=3;const other=id==='prep'?'second':'prep',before=deploymentPercent(s,other);authorizeProject(s,id,story55Config(s).projects.find(p=>p.id===id).key);
  for(let i=1;i<=5;i++){runBatch(s,id);assert.equal(deploymentPercent(s,id),i*20);}
  assert.equal(deploymentPercent(s,other),before);assert.ok(completed(s,id));
 }
});
