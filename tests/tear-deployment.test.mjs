import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55ChargeGate,completed} from '../src/services/story55/state.js';
import {startDeploymentStep,completeDeploymentRun,upgradeBaseFramework,deploymentPercent} from '../src/services/story55/projects.js';
import {shareGhostToTai,ghostShareScriptLine,sendGhostShareDraft,ghostShareReadyForControl,beginGhostShareControl,finishGhostShareControl} from '../src/services/story55/ghost-share.js';
import {TEAR_DIALOGUES} from '../src/story/d14-d24/tear-dialogue.js';
import {syncTearReminders} from '../src/apps/ghost/deployment/reminders.js';
import {startTearRun,tickTearRun,tearRunAvailability,tearUsesToday,renderTearRun} from '../src/apps/ghost/deployment/tear-run.js';
import {seedD04Contracts,acceptD04Contract,submitD04Contract,DAILY_CONTRACTS,D04_MAIL} from '../src/story/d04/contract.js';
import {deploymentView} from '../src/apps/ghost/deployment/index.js';
import {render as renderGhost,handle as handleGhost} from '../src/apps/ghost/index.js';
import {render as renderFiles,handle as handleFiles} from '../src/apps/files/index.js';
import {handle as handleKira} from '../src/apps/kira/index.js';
import {handle as handleMirage} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=14;s.clock='15:00';
 for(const n of s.story55.config.nodes)if(n.day<=24&&n.id!=='base')s.story55.completed[n.id]={day:n.day,clock:'12:00'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 s.bankData.balance=2000000;
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 return s;
}
const messages=s=>s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages;
function deliver(s){for(const m of messages(s))if(m.schedule&&!m.delivery)m.delivery={day:s.day,clock:s.clock};}
function drain(s){for(let i=0;i<20;i++){deliver(s);const l=ghostShareScriptLine(s);if(l?.kind!=='me')return;sendGhostShareDraft(s,l.text);}}
function win(s,n=5){for(let i=0;i<n;i++){const id=startDeploymentStep(s,'base'),o=s.ghost.orders[id];o.status='success';assert.ok(completeDeploymentRun(s,o));}}

test('D14 report once; all ten offline-guaranteed Tear dialogue scripts settle five LINKs without ordinary takeover or auto payment',()=>{
 const s=fixture();win(s);assert.match(deploymentView(s,'base'),/部署成功！运行失败！/);
 assert.equal(deploymentPercent(s,'base'),9);
 s.story55.ghostShareTakeovers=2;
 for(let day=15;day<=24;day++){
  s.day=day;s.clock='11:00';
  assert.equal(story55ChargeGate(s),'plot');
  assert.doesNotMatch(deploymentView(s,'base'),/部署成功！运行失败！/);
  if(day===15)win(s,2);
  syncTearReminders(s);
  const r=s.content.reminders.find(r=>r.id==='tear-link-'+day);
  assert.equal(r.progress,day===15?2:0);
  const before=s.bankData.balance;
  const result=shareGhostToTai(s,{projectId:'base'},{random:()=>assert.fail('Tear must not roll'),now:day*10000});
  assert.equal(result.script,'tear-'+day);assert.ok(result.accepted);
  drain(s);assert.ok(ghostShareReadyForControl(s));assert.ok(beginGhostShareControl(s));
  // D23: the six confirmed lines happen before the real GHOST takeover.
  // The last reply is not authored/queued until the five LINK checks succeed.
  if(day===23){
   const pre=messages(s).filter(m=>m.id.startsWith(result.cardId+'-')&&/-((me)|(tai))-\d+$/.test(m.id));
   assert.deepEqual(pre.map(m=>m.text),[
    '我又來了。','放那吧，一會給你處理。','昨天不是說讓我今天自己做嗎？',
    '那你還來？','想看你是不是真的忍心。','嘖。'
   ]);
   assert.equal(pre.some(m=>m.text==='滿意了？'),false);
  }
  assert.equal(s.story55.ghostShareTakeovers,2);
  win(s,day===15?3:5);
  s.story55.ghostShare.remote={outcome:'success'};
  if(day===23)assert.equal(messages(s).some(m=>m.id.startsWith(result.cardId+'-')&&m.text==='滿意了？'),false);
  assert.ok(finishGhostShareControl(s));
  if(day===23){
   const post=messages(s).filter(m=>m.id.startsWith(result.cardId+'-')&&m.text==='滿意了？');
   assert.equal(post.length,1,'successful GHOST control may queue the line once');
   assert.ok(post[0].schedule,'keep the native chat-delay mechanism');
   assert.equal(!!post[0].delivery,false,'completion reply should be naturally delayed');
   assert.equal(finishGhostShareControl(s),false,'cannot replay final line');
  }
  drain(s);
  const card=result.cardId;
  const actual=messages(s).filter(m=>m.id.startsWith(card+'-')&&/-((me)|(tai))-\d+$/.test(m.id)).sort((a,b)=>Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1))).map(m=>[m.from==='me'?'me':'tai',m.text]);
  assert.deepEqual(actual,TEAR_DIALOGUES[result.script].filter(([from])=>from!=='control'));
  syncTearReminders(s);assert.equal(r.done,true);assert.equal(r.progress,5);
  assert.equal(s.bankData.balance,before);assert.equal(story55ChargeGate(s),'plot');
  assert.ok(upgradeBaseFramework(s));assert.equal(s.bankData.balance,before-100000);
  assert.equal(story55ChargeGate(s),null);
 }
 assert.equal(deploymentPercent(s,'base'),100);assert.ok(completed(s,'base'));
 assert.equal(s.bankData.transactions.filter(t=>t.id.startsWith('s55-base-upgrade-')).length,10);
});

test('incomplete daily LINK stops at 03:00 and 2%; reminders only reflect actual LINKs',()=>{
 const s=fixture();win(s);s.day=15;s.clock='23:50';s.batteryPercent=30;
 advanceGameMinutes(s,240);assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,2);
 advanceGameMinutes(s,120);assert.equal(s.day,15);assert.equal(s.batteryPercent,2);
 syncTearReminders(s);assert.equal(s.content.reminders.find(x=>x.id==='tear-link-15').done,false);
});

test('100% unlocks precisely two simulated commission executions per day, native manual submission and rewards',()=>{
 const s=fixture();win(s);
 for(let day=15;day<=24;day++){s.day=day;win(s);upgradeBaseFramework(s);}
 s.day=25;s.clock='08:00';seedD04Contracts(s);
 const ids=DAILY_CONTRACTS.filter(c=>c.marketDaily&&c.day===25).map(c=>c.id);
 assert.equal(ids.length,2);
 for(const id of ids)assert.ok(acceptD04Contract(s,id));
 for(const id of ids){
  const before=s.bankData.balance;assert.ok(tearRunAvailability(s,id).allowed);
  assert.ok(startTearRun(s,id,1000));
  for(let i=1;i<=10;i++)tickTearRun(s,id,1000+i*4000);
  assert.equal(s.content.orders.find(o=>o.id===id).status,'READY');assert.equal(s.bankData.balance,before);
  assert.ok(submitD04Contract(s,id));assert.ok(s.bankData.balance>before);assert.equal(submitD04Contract(s,id),false);
 }
 assert.equal(tearUsesToday(s),2);assert.equal(startTearRun(s,ids[0]),false);
 s.day=26;seedD04Contracts(s);const next=DAILY_CONTRACTS.find(c=>c.marketDaily&&c.day===26).id;
 assert.ok(acceptD04Contract(s,next));assert.equal(tearUsesToday(s),0);assert.ok(startTearRun(s,next));
});

test('D29 reminder group appears only after plan dialogue and never creates executable subtasks',()=>{
 const s=fixture();s.day=29;delete s.story55.completed.plan;
 syncTearReminders(s);assert.ok(!s.content.reminders.some(r=>r.id==='ghost-car-plan'));
 s.story55.completed.plan={day:29,clock:'22:00'};syncTearReminders(s);syncTearReminders(s);
 const groups=s.content.reminders.filter(r=>r.id==='ghost-car-plan');
 assert.equal(groups.length,1);assert.equal(groups[0].children.length,10);assert.ok(groups[0].children.every(c=>c.progress===0&&!c.done));
});


test('native Tear canvas reflects canonical progress without advancing, charging or settling the order',()=>{
 const s=fixture();s.day=25;s.clock='08:00';
 s.story55.completed.base={day:24,clock:'21:00'};
 s.story55.projects.base.batches=Array.from({length:11},(_,i)=>({complete:true,steps:Array.from({length:5},()=>({day:i+14})),testedDay:i+14,day:i+14}));
 seedD04Contracts(s);const id=DAILY_CONTRACTS.find(c=>c.marketDaily&&c.day===25).id;
 assert.ok(acceptD04Contract(s,id));assert.ok(startTearRun(s,id,1000));
 const before=JSON.stringify(s),balance=s.bankData.balance;
 const running=renderTearRun(s,id);
 assert.match(running,/<xm-tear-orbit[^>]*status="running" progress="0"/);
 assert.doesNotMatch(running,/gh-tear-terminal|setTimeout|iframe|prompt-input|REASONING_LOOP/);
 assert.equal(JSON.stringify(s),before);
 for(let i=1;i<=12;i++)tickTearRun(s,id,1000+i*4000);
 assert.equal(s.story55.tearRuns[id].status,'complete');
 assert.match(renderTearRun(s,id),/<xm-tear-orbit[^>]*status="complete" progress="1"/);
 assert.match(renderTearRun(s,id),/執行完成 · 待提交/);
 assert.match(renderTearRun(s,id),/data-action="gh-tear-return"/);
 assert.equal(s.content.orders.find(o=>o.id===id).status,'READY');
 assert.equal(s.bankData.balance,balance);
 s.content.orders.find(o=>o.id===id).title='<img src=x onerror=alert(1)>';
 assert.doesNotMatch(renderTearRun(s,id),/<img/);
 s.story55.tearRuns[id].status='failed';s.story55.tearRuns[id].index=0;
 assert.match(renderTearRun(s,id),/status="failed" progress="0"/);
 assert.match(renderTearRun(s,id),/執行中止/);
});

test('completed base opens idle Tear and KIRA file preview is the only share entry',()=>{
 const s=fixture();win(s);
 const routes=[],ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:loc=>{routes.push(loc);s.nav.current=loc;},home:()=>{const loc={appId:'home',route:'/',params:{}};routes.push(loc);s.nav.current=loc;s.nav.stack=[];}},toast:()=>{},refresh:()=>{}};
 assert.doesNotMatch(deploymentView(s,'base'),/gh-tear-open/);
 for(let day=15;day<=24;day++){s.day=day;win(s);assert.ok(upgradeBaseFramework(s));}
 const project={appId:'ghost',route:'/deployment',params:{project:'base'}};
 const html=deploymentView(s,'base');assert.match(html,/gh-tear-open/);assert.doesNotMatch(html,/0 \/ 5|s55-base-upgrade/);
 const before=JSON.stringify(s.story55.tearRuns||{}),balance=s.bankData.balance;
 handleGhost('gh-tear-open',{dataset:{}},ctx,project);
 assert.equal(routes.at(-1).route,'/tear');
 const idle=renderGhost(ctx,routes.at(-1));assert.match(idle,/status="idle" progress="0"/);assert.match(idle,/gh-tear-home/);
 assert.equal(JSON.stringify(s.story55.tearRuns||{}),before);assert.equal(s.bankData.balance,balance);
 handleGhost('gh-tear-home',{dataset:{}},ctx,routes.at(-1));assert.deepEqual(routes.at(-1),{appId:'home',route:'/',params:{}});
 s.day=25;s.clock='08:00';seedD04Contracts(s);const id=DAILY_CONTRACTS.find(c=>c.marketDaily&&c.day===25).id,mailId=D04_MAIL(id);
 assert.ok(acceptD04Contract(s,id));
 setMirageAuthenticated(true);handleMirage('mc-tear-share',{dataset:{id}},ctx,{route:'/order/'+id,params:{}});setMirageAuthenticated(false);
 assert.equal(routes.at(-1).route,'/mail/'+mailId);assert.equal(tearUsesToday(s),0);
 handleKira('kira-open-commission-file',{dataset:{id:mailId}},ctx);
 const file=routes.at(-1);assert.equal(file.appId,'files');
 const preview=renderFiles(ctx,file);assert.match(preview,/files-commission-open-ghost/);assert.match(preview,/files-commission-share-tear/);
 assert.equal(tearUsesToday(s),0);
 handleFiles('files-commission-share-tear',{dataset:{id:mailId}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'ghost',route:'/tear-run',params:{orderId:id}});assert.equal(tearUsesToday(s),1);
 assert.equal(s.bankData.balance,balance);
 for(let i=1;i<=12;i++)tickTearRun(s,id,Date.now()+i*4000);
 assert.equal(s.content.orders.find(o=>o.id===id).status,'READY');
 assert.doesNotMatch(renderFiles(ctx,file),/files-commission-share-tear/);
 assert.ok(submitD04Contract(s,id));assert.doesNotMatch(renderFiles(ctx,file),/files-commission-share-tear/);
});
