import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PhoneStore,KEY,initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {begin,authorize,advanceGhost,finish} from '../src/apps/ghost/state.js';
import {handle,tick} from '../src/apps/ghost/index.js';
import {pauseTaiRemoteOnHide,resumeTaiRemoteOnShow,settleTaiRemotePause,createTaiForegroundDelay} from '../src/system/remote-control/visibility.js';
import {interruptTaiRemoteSession} from '../src/system/remote-control/session.js';
import {createTaiRemoteController,recoverTaiRemoteSession} from '../src/system/remote-control/controller.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {taiRemoteCanOperateOrder} from '../src/system/remote-control/policy.js';
import {saveTestSnapshot,restoreTestSnapshot} from '../src/services/story55/test-snapshots.js';
import {restartState} from '../src/system/restart/index.js';
import {GHOST_SHARE_DIALOGUES,shareGhostToTai,ghostShareSource,ghostShareScriptLine,sendGhostShareDraft,finishGhostShareControl} from '../src/services/story55/ghost-share.js';
import {readChatSources,saveChatSource} from '../src/apps/developer/features/conversations/source-model.js';
import {makeChatBundle,applyChatImport,previewChatImport} from '../src/apps/developer/features/conversations/transfer.js';
import {D02_A,D02_KEYS,acceptD02,deployD02,armD02Ghost} from '../src/story/d02/runtime.js';
import {D03_ORDER,D03_MAIL,acceptD03Contract,d03StepId} from '../src/story/d03/contract.js';
import {DAILY_CONTRACTS,D04_MAIL,D04_STEP,acceptD04Contract} from '../src/story/d04/contract.js';
import {openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';

const now=(time,fn)=>{const saved=Date.now;Date.now=()=>time;try{return fn();}finally{Date.now=saved;}};
function fresh(){
 const s=activateStory55(initialState());s.day=16;s.clock='08:20';s.unlocked=true;
 s.story55.config.nodes=[];s.story55.activeScene=null;
 s.story55.projects.base={authorized:true,batches:[],active:null};
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',messages:[],unread:0});
 tickStory55(s);return s;
}
function strike(){
 const s=fresh(),id='timed-strike';
 authorize(s,{orderId:id,mailId:'timed-strike-key',type:'strike'});s.ghost.orders[id].story55Project='strike-demo';
 s.ghost.orders[id].settings.seconds=30;
 assert.equal(begin(s,id,100000),true);
 s.nav={current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]};
 const store={get:()=>s,update:fn=>fn(s)},ctx={store,refresh(){},router:{open(){}}};
 now(101000,()=>handle('gh-arcade-tap',{dataset:{value:String(s.ghost.orders[id].board.arcade.target)}},ctx,s.nav.current));
 s.story55.ghostShareTakeovers=1;
 s.story55.ghostShare={cardId:'card',phase:'controlling',script:'first',source:{type:'ghost-order',orderId:id},
  remote:{active:true,authorizedDay:16,orderId:id,token:'same-token',stage:'running'}};
 return {s,id,store,ctx};
}
function memory(s){const entries=new Map(s?[[KEY,JSON.stringify(s)]]:[]);return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};}
const canonical=s=>({ghost:structuredClone(s.ghost),count:s.story55.ghostShareTakeovers,bank:structuredClone(s.bankData),chat:structuredClone(s.content.conversations)});

for(const operation of ['foreground','interrupt','release','MCP release','reload','reopen','JSON import','snapshot restore']){
 test('real 30-second STRIKE survives a 60-second background interval: '+operation,()=>{
  const {s,id,store}=strike(),run=s.ghost.orders[id];
  assert.equal(run.deadline,130000);assert.equal(run.board.arcade.hits,1);
  pauseTaiRemoteOnHide(s,110000);
  const before=canonical(s),other=structuredClone(run);other.id='other';s.ghost.orders.other=other;
  let restored=s;
  now(170000,()=>{
   if(operation==='foreground')resumeTaiRemoteOnShow(s);
   if(operation==='interrupt')interruptTaiRemoteSession(s);
   if(operation==='release')finishGhostShareControl(s);
   if(operation==='MCP release'){
    const tools=createTaiLivePhoneTools({store,router:{},tasks:{},document:{}});
    assert.equal(tools.call(s,'remote_release',{}).ok,true);
   }
   if(operation==='reload'||operation==='reopen'){
    const storage=memory(s);
    if(operation==='reopen')storage.getItem(KEY); // identical durable bytes in a new page
    restored=new PhoneStore(storage).get();
   }
   if(operation==='JSON import'){
    const target=new PhoneStore(memory());target.replace(JSON.parse(JSON.stringify(s)));restored=target.get();
   }
   if(operation==='snapshot restore'){
    const target=new PhoneStore(memory()),saved=saveTestSnapshot(target.storage,s,'paused timed STRIKE');
    restoreTestSnapshot(target,saved.id,{allowDifferentVersion:true});restored=target.get();
   }
  });
  const active=restored.ghost.orders[id];
  assert.equal(active.deadline,190000,'preserve exactly the remaining twenty seconds');
  assert.equal(active.startedAt,160000);
  assert.equal(restored.story55.ghostShare.remote.pausedAt,null);
  assert.deepEqual(active.board,before.ghost.orders[id].board);assert.equal(active.moves,1);assert.equal(active.attempts,1);
  assert.equal(restored.story55.ghostShareTakeovers,1);assert.deepEqual(restored.ghost.history,before.ghost.history);
  assert.equal(JSON.stringify(restored.bankData),JSON.stringify(before.bank));assert.deepEqual(restored.content.conversations,before.chat);
  assert.equal(JSON.stringify(restored.ghost.orders.other),JSON.stringify(other),'no compensation for any unshared order');
  const stable=structuredClone(active);
  now(180000,()=>{settleTaiRemotePause(restored);interruptTaiRemoteSession(restored);finishGhostShareControl(restored);});
  assert.deepEqual(active,stable,'repeated recovery/release may not compensate twice');
  const ctx={store:{get:()=>restored,update:fn=>fn(restored)},refresh(){}};
  now(170000,()=>tick(ctx));
  assert.equal(active.status,'running');assert.equal(restored.ghost.history.length,0,'neither fail nor fabricated win on recovery');
  now(190001,()=>tick(ctx));
  assert.equal(active.status,'failed','the original remaining countdown still expires normally');
  assert.equal(restored.ghost.history.filter(h=>h.orderId===id).length,1);
 });
}

test('preview and EXTRACT locks use the same interrupt settlement, once and only for the shared board',()=>{
 for(const kind of ['preview','extract']){
  const {s,id}=strike(),o=s.ghost.orders[id];
  if(kind==='preview'){o.status='preview-win';o.previewUntil=112000;}
  else{o.type='extract';o.board={arcade:{kind:'extract',cards:[0,1,0,1,2,2,3,3,4,4],matched:[],revealed:[0,1],lockUntil:110720}};}
  pauseTaiRemoteOnHide(s,110000);interruptTaiRemoteSession(s,170000);
  assert.equal(o.deadline,190000);assert.equal(o.startedAt,160000);
  if(kind==='preview')assert.equal(o.previewUntil,172000);
  else{assert.equal(o.board.arcade.lockUntil,170720);assert.deepEqual(o.board.arcade.revealed,[0,1]);}
  assert.equal(settleTaiRemotePause(s,180000),false);assert.deepEqual(s.ghost.history,[]);
 }
});

test('pagehide alone pauses before WebKit changes document.hidden; pageshow and visibility share one anchor',()=>{
 const {s,store}=strike(),win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false,defaultView:win,querySelector(){return null;}});
 let writes=0;const original=store.update;store.update=fn=>{writes++;return original(fn);};
 createTaiRemoteController({store,document:doc,router:{},tasks:{}});
 now(110000,()=>{win.dispatchEvent(new Event('pagehide'));win.dispatchEvent(new Event('pagehide'));});
 assert.equal(s.story55.ghostShare.remote.pausedAt,110000);assert.equal(writes,1);
 doc.hidden=true;now(115000,()=>doc.dispatchEvent(new Event('visibilitychange')));
 now(170000,()=>win.dispatchEvent(new Event('pageshow')));
 assert.equal(writes,1,'pageshow while still hidden is not a foreground resume');
 doc.hidden=false;
 now(170000,()=>{doc.dispatchEvent(new Event('visibilitychange'));win.dispatchEvent(new Event('pageshow'));});
 assert.equal(writes,2);assert.equal(s.ghost.orders['timed-strike'].deadline,190000);
 assert.equal(s.story55.ghostShare.phase,'controlling');assert.equal(s.story55.ghostShare.remote.token,'same-token');
});

test('pagehide pauses foreground animation even while document.hidden is still false',async()=>{
 const {s,store}=strike(),win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false,defaultView:win,querySelector(){return null;}});
 createTaiRemoteController({store,document:doc,router:{},tasks:{}});
 const delay=createTaiForegroundDelay(doc,{window:win,isPaused:()=>Number.isFinite(s.story55.ghostShare.remote.pausedAt)});
 let done=false;const waiting=delay(70).then(()=>done=true);
 win.dispatchEvent(new Event('pagehide'));
 await new Promise(resolve=>setTimeout(resolve,110));assert.equal(done,false);
 win.dispatchEvent(new Event('pageshow'));await waiting;assert.equal(done,true);
});

test('a long foreground stall grants no time, writes no heartbeat saves and still uses the original timeout',()=>{
 const {s,store,ctx,id}=strike(),doc=Object.assign(new EventTarget(),{hidden:false,querySelector(){return null;}});
 let writes=0;const original=store.update;store.update=fn=>{writes++;return original(fn);};
 createTaiRemoteController({store,document:doc,router:{},tasks:{}});
 now(170000,()=>{doc.dispatchEvent(new Event('visibilitychange'));assert.equal(writes,0);tick(ctx);});
 assert.equal(s.ghost.orders[id].deadline,130000);assert.equal(s.ghost.orders[id].status,'failed');
});

test('restarting deliberately creates a new run instead of restoring the abandoned Ghost session',()=>{
 const {s}=strike();pauseTaiRemoteOnHide(s,110000);const previous=structuredClone(s);
 const next=now(170000,()=>restartState(s));
 assert.equal(next.day,1);assert.equal(next.story55.ghostShare,undefined);assert.deepEqual(s,previous);
});

for(const script of Object.keys(GHOST_SHARE_DIALOGUES)){
 test('editor and JSON import protect only the actually triggered script: '+script,()=>{
  const s=fresh();s.story55.ghostShareTakeovers=script==='first'?0:script==='second'?1:2;
  assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>script==='dailyNo'?.9:0}).script,script);
  const before=structuredClone(s.content.conversations),bundleSource=fresh();
  for(const name of Object.keys(GHOST_SHARE_DIALOGUES)){
   const row=readChatSources(s,15).find(x=>x.key==='ghost-share:'+name);
   assert.equal(!!row.reason,name===script,name);
   const edited=row.lines.map(x=>x.text);edited[0]='Edited '+name;
   if(name===script)assert.throws(()=>saveChatSource(s,row.key,{lines:edited}),/受保護/);
   else saveChatSource(s,row.key,{lines:edited});
   const base=readChatSources(bundleSource,15).find(x=>x.key===row.key);
   const imported=base.lines.map(x=>x.text);imported[0]='Imported '+name;
   saveChatSource(bundleSource,row.key,{lines:imported});
  }
  const original=readChatSources(s,15).find(x=>x.key==='ghost-share:'+script).lines.map(x=>x.text);
  const bundle=makeChatBundle(bundleSource,{scope:'story'});
  assert.ok(previewChatImport(s,bundle).report.sourcesBlocked>=1);
  applyChatImport(s,bundle,{mode:'replace-conflicts'});
  for(const name of Object.keys(GHOST_SHARE_DIALOGUES)){
   const texts=readChatSources(s,15).find(x=>x.key==='ghost-share:'+name).lines.map(x=>x.text);
   if(name===script)assert.deepEqual(texts,original);
   else assert.equal(texts[0],'Imported '+name);
   assert.equal(texts.length,GHOST_SHARE_DIALOGUES[name].length);
  }
  assert.deepEqual(s.content.conversations,before,'author import cannot rewrite any already queued or sent message');
 });
}

test('an offline share card does not lock any script; current #133 historical lines still protect their own script',()=>{
 const s=fresh();s.clock='11:00';shareGhostToTai(s,{projectId:'base'},{random:()=>.99});
 assert.ok(readChatSources(s,15).filter(x=>x.type==='ghost-share').every(x=>!x.reason));
 delete s.story55.ghostShare;s.clock='08:20';
 shareGhostToTai(s,{projectId:'base'},{random:()=>0,now:10000});
 delete s.story55.ghostShareScriptsStarted;
 for(const m of s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages)delete m.ghostShareScript;
 s.story55.ghostShare={phase:'idle',script:null};
 assert.ok(readChatSources(s,15).find(x=>x.key==='ghost-share:first').reason);
 assert.ok(readChatSources(s,15).filter(x=>x.type==='ghost-share'&&x.key!=='ghost-share:first').every(x=>!x.reason));
});

test('ghost-share overrides stay in their own namespace through a new run and do not modify node/wish/track sources',()=>{
 const s=fresh(),others=readChatSources(s,6),key='ghost-share:second';
 const row=readChatSources(s,15).find(x=>x.key===key),texts=row.lines.map(x=>x.text);texts[0]='Only second';
 saveChatSource(s,key,{lines:texts});assert.deepEqual(readChatSources(s,6),others);
 s.story55.ghostShareScriptsStarted={second:true};activateStory55(s);
 assert.equal(s.story55.ghostShareScriptsStarted,undefined);
 const after=readChatSources(s,15).find(x=>x.key===key);assert.equal(after.lines[0].text,'Only second');assert.equal(after.reason,'');
});

test('identical edited opening lines cannot lock an untriggered branch',()=>{
 const s=fresh();
 for(const script of ['first','second']){
  const row=readChatSources(s,15).find(x=>x.key==='ghost-share:'+script),lines=row.lines.map(x=>x.text);
  lines[0]='同一句開場';saveChatSource(s,row.key,{lines});
 }
 assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0}).script,'first');
 assert.ok(readChatSources(s,15).find(x=>x.key==='ghost-share:first').reason);
 const row=readChatSources(s,15).find(x=>x.key==='ghost-share:second');
 assert.equal(row.reason,'');saveChatSource(s,row.key,{lines:row.lines.map(x=>x.text)});
});

function early(kind,status='authorized'){
 const s=activateStory55(initialState());
 const def=DAILY_CONTRACTS.find(c=>c.id===kind);
 s.day=kind==='d02'?2:kind==='d03'?3:def.day||4;s.clock='13:40';tickStory55(s);let id,parent;
 if(kind==='d02'){parent=D02_A;acceptD02(s,parent);deployD02(s,parent,D02_KEYS[parent]);id=armD02Ghost(s,parent,0);}
 else if(kind==='d03'){parent=D03_ORDER;acceptD03Contract(s);openCommissionWithGhost(s,D03_MAIL);id=d03StepId(0);}
 else{parent=kind;acceptD04Contract(s,kind);openCommissionWithGhost(s,D04_MAIL(kind));id=D04_STEP(kind,0);}
 assert.ok(s.ghost.orders[id]);
 if(status==='failed'){begin(s,id);finish(s,id,false);}
 s.day=15;s.clock='08:20';tickStory55(s);s.story55.activeScene=null;s.unlocked=true;
 s.content.conversations.mirage.push({id:'s55-ouroboros',messages:[],unread:0});
 return {s,id,parent};
}
test('genuine D02–D10 accepted children left authorized/failed after expiry cannot be shared, consume control or start',()=>{
 const kinds=['d02','d03',...DAILY_CONTRACTS.filter(c=>c.id!=='s55-mirage-wallet-bounty'&&(c.day??4)<=10).map(c=>c.id)];
 for(const kind of kinds)for(const status of ['authorized','failed'])for(const day of [15,24]){
  const {s,id,parent}=early(kind,status);s.day=day;
  assert.equal(s.content.orders.find(o=>o.id===parent).status,'EXPIRED',kind);
  assert.equal(s.ghost.orders[id].status,status);
  const before=structuredClone(s.ghost),bank=structuredClone(s.bankData);
  assert.equal(ghostShareSource(s,{orderId:id}),null,kind);
  assert.equal(shareGhostToTai(s,{orderId:id},{random:()=>0}).ok,false,kind);
  assert.equal(taiRemoteCanOperateOrder(s,s.ghost.orders[id]),false,kind);
  assert.equal(begin(s,id),false,kind);
  assert.equal(s.story55.ghostShareTakeovers||0,0);
  assert.deepEqual(s.ghost,before);assert.deepEqual(s.bankData,bank);
 }
});

test('the existing D04 runner can still share a valid later commission; ordinary LINK/CIPHER and projects remain supported',()=>{
 const def={...DAILY_CONTRACTS.find(c=>c.stages[0]==='cipher'),id:'test-d16-later',day:16,deadline:{day:19,clock:'23:59'}};
 DAILY_CONTRACTS.push(def);
 try{
  const s=fresh();tickStory55(s);assert.equal(acceptD04Contract(s,def.id),true);
  openCommissionWithGhost(s,D04_MAIL(def.id));
  assert.ok(ghostShareSource(s,{orderId:D04_STEP(def.id,0)}));
  for(const type of ['route','cipher']){const id='ordinary-'+type;authorize(s,{orderId:id,type});assert.ok(ghostShareSource(s,{orderId:id}));}
  assert.ok(ghostShareSource(s,{projectId:'base'}));
 }finally{DAILY_CONTRACTS.pop();}
});

test('preview publishing is separate, explicit and refuses untested or mismatched SHA tags',async()=>{
 const qa=readFileSync('.github/workflows/tai-remote-mobile-browser-qa.yml','utf8');
 assert.doesNotMatch(qa,/deploy-pages|upload-pages-artifact|pages:\s*write/);
 const publisher=readFileSync('.github/workflows/tai-remote-preview-update.yml','utf8');
 assert.doesNotMatch(publisher,/pull_request:|workflow_run:|branches:/);
 assert.match(publisher,/tags: \['preview\/tai-remote-review-\*'\]/);
 const script=publisher.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s+NODE/)[1].replace(/^          /gm,'');
 const sha='a'.repeat(40);
 const check=(env,runs)=>new vm.Script('(async()=>{'+script+'})()').runInNewContext({
  process:{env:{REVIEWED_SHA:sha,GITHUB_EVENT_NAME:'push',GITHUB_REF_NAME:'preview/tai-remote-review-'+sha,GITHUB_REPOSITORY:'owner/repo',...env}},
  fetch:async()=>({ok:true,json:async()=>({workflow_runs:runs})}),console:{log(){}}
 });
 const runs=['story55-developer','tai-remote-mobile-browser-qa'].map((name,id)=>({id,path:'.github/workflows/'+name+'.yml',status:'completed',conclusion:'success'}));
 await check({},runs);
 await assert.rejects(check({REVIEWED_SHA:'main'},runs),/complete reviewed/);
 await assert.rejects(check({GITHUB_REF_NAME:'preview/tai-remote-review-wrong'},runs),/exact tested/);
 await assert.rejects(check({},[]),/not green/);
 await assert.rejects(check({},runs.map(r=>({...r,conclusion:'failure'}))),/not green/);
});
