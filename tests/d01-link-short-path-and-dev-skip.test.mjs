import test from 'node:test';
import assert from 'node:assert/strict';
import {pipeFlow,pipeSolved} from '../src/apps/ghost/games/pipe-network.js';
import {authorize,begin,finish,startD01PipePreview,needsWorldTick,advanceGhost} from '../src/apps/ghost/state.js';
import {ghostDevSkipAvailable,previewSkipD01} from '../src/apps/ghost/features/dev-skip/index.js';
import {render as renderGhost,handle as handleGhost} from '../src/apps/ghost/index.js';
import {ghostEditor} from '../src/apps/ghost/editor.js';
import {handle as handleEditor} from '../src/apps/developer/index.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {seedD01,acceptD01Repair,deliverD01Attachment,deployD01,tickD01,D01_REPAIR,D01_DONE} from '../src/story/d01/runtime.js';

function fixture(){
 const s=initialState();activateStory55(s);seedD01(s);
 acceptD01Repair(s);deliverD01Attachment(s);
 authorize(s,{orderId:D01_REPAIR,mailId:'d01-mirage001-attachment',type:'route'});
 deployD01(s);begin(s,D01_REPAIR,1000);
 return s;
}
// Exactly the class of short, reciprocal path shown on the user's screen:
// five lit cells in a 5×5 board, all other pieces irrelevant.
function shortPathBoard(){
 const masks=Array(25).fill(0);
 masks[8]=2;   // source east
 masks[9]=12;  // west + south
 masks[14]=9;  // north + west
 masks[13]=6;  // east + south
 masks[18]=1;  // sink north
 return {size:5,source:8,sink:18,masks,solvedMasks:masks.slice()};
}
function doc(preview){
 return {documentElement:{dataset:{ghostBound:'1'}},
  querySelector:()=>preview?{content:'true'}:null};
}
test('D01 LINK succeeds on valid five-cell path; extra tiles are not required',()=>{
 const board=shortPathBoard();
 assert.equal(pipeFlow(board.masks,board.source,board.size).size,5);
 assert.equal(pipeSolved(board),true);
 const broken=structuredClone(board);broken.masks[13]=2;
 assert.equal(pipeSolved(broken),false,'connections require reciprocal ports');
});
test('five-cell win starts real 3s visible preview and increases progress once',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR];
 o.board=shortPathBoard();
 assert.equal(startD01PipePreview(s,D01_REPAIR,2000),true);
 assert.equal(o.status,'preview-win');assert.equal(o.previewUntil,5000);
 assert.equal(s.story55.d01.completedRounds,0);
 finish(s,D01_REPAIR,true,4999);
 assert.equal(s.story55.d01.completedRounds,0);
 finish(s,D01_REPAIR,true,5000);
 assert.equal(s.story55.d01.completedRounds,1);
 assert.equal(o.status,'success');
 finish(s,D01_REPAIR,true,5001);
 assert.equal(s.story55.d01.completedRounds,1);
});
test('already-connected saved board recovers automatically without another touch',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR];
 o.board=shortPathBoard();o.status='running';
 assert.equal(needsWorldTick(s,2000),true);
 advanceGhost(s,2000);
 assert.equal(o.status,'preview-win');
 assert.equal(o.previewUntil,5000);
 advanceGhost(s,4000);
 assert.equal(s.story55.d01.completedRounds,0);
 advanceGhost(s,5000);
 assert.equal(s.story55.d01.completedRounds,1);
});
test('preview-only skip fills real solved board, waits 3 seconds, then awards one round',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR];
 assert.equal(ghostDevSkipAvailable(doc(true)),true);
 assert.equal(ghostDevSkipAvailable(doc(false)),false);
 assert.equal(ghostDevSkipAvailable(null),false);
 assert.equal(previewSkipD01(s,D01_REPAIR,3000),true);
 assert.equal(pipeSolved(o.board),true);
 assert.deepEqual(o.board.masks,o.board.solvedMasks);
 assert.equal(o.status,'preview-win');
 assert.equal(o.previewUntil,6000);
 assert.equal(o.devSkippedRounds,1);
 assert.equal(previewSkipD01(s,D01_REPAIR,3001),false,'no double skip in preview');
 finish(s,D01_REPAIR,true,5999);
 assert.equal(s.story55.d01.completedRounds,0);
 finish(s,D01_REPAIR,true,6000);
 assert.equal(s.story55.d01.completedRounds,1);
 assert.equal(previewSkipD01(s,D01_REPAIR,6001),false);
});
test('skip is preview-enabled or explicitly enabled in developer tools, never by default in production',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR],original=globalThis.document;
 const ctx={store:{get:()=>s,update:f=>f(s)},router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 try{
  globalThis.document=doc(true);
  let html=renderGhost(ctx,{route:'/run',params:{orderId:D01_REPAIR}});
  assert.match(html,/data-action="gh-d01-dev-skip"/);
  assert.match(html,/开发者跳关已开启/);
  globalThis.document=doc(false);
  html=renderGhost(ctx,{route:'/run',params:{orderId:D01_REPAIR}});
  assert.doesNotMatch(html,/data-action="gh-d01-dev-skip"/);
  handleGhost('gh-d01-dev-skip',{dataset:{}},ctx,{route:'/run',params:{orderId:D01_REPAIR}});
  assert.equal(o.status,'running');
  assert.match(ghostEditor(s),/开启 D01 跳关模式/);
  handleEditor('editor-ghost-skip-toggle',{dataset:{}},ctx);
  assert.equal(s.editor.ghostSkipEnabled,true);
  assert.equal(ghostDevSkipAvailable(doc(false),s),true);
  assert.match(ghostEditor(s),/关闭 D01 跳关模式/);
  html=renderGhost(ctx,{route:'/run',params:{orderId:D01_REPAIR}});
  assert.match(html,/data-action="gh-d01-dev-skip"/);
  handleGhost('gh-d01-dev-skip',{dataset:{}},ctx,{route:'/run',params:{orderId:D01_REPAIR}});
  assert.equal(o.status,'preview-win');
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('five-tile path triggers win through the actual GHOST tap handler without a quota',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR];
 o.board=shortPathBoard();
 o.board.masks[13]=3; // One clockwise tap turns port 3 into port 6.
 assert.equal(pipeSolved(o.board),false);
 const ctx={store:{get:()=>s,update:f=>f(s)},router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 handleGhost('gh-pipe',{dataset:{index:'13'}},ctx,{route:'/run',params:{orderId:D01_REPAIR}});
 assert.equal(o.board.masks[13],6);
 assert.equal(pipeFlow(o.board.masks,8,5).size,5);
 assert.equal(o.status,'preview-win');
 assert.ok(o.previewUntil>Date.now());
 const html=renderGhost(ctx,{route:'/run',params:{orderId:D01_REPAIR}});
 assert.match(html,/起點已連至終點/);
 assert.doesNotMatch(html,/5 \/ 25/);
});
test('developer skip mode can be toggled back off without losing the saved pipe board',()=>{
 const s=fixture(),o=s.ghost.orders[D01_REPAIR],ctx={store:{get:()=>s,update:f=>f(s)},router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 const before=structuredClone(o.board);
 handleEditor('editor-ghost-skip-toggle',{dataset:{}},ctx);
 handleEditor('editor-ghost-skip-toggle',{dataset:{}},ctx);
 assert.equal(s.editor.ghostSkipEnabled,false);
 assert.deepEqual(o.board,before);
 assert.equal(ghostDevSkipAvailable(doc(false),s),false);
});
test('preview skip can be explicitly turned off and back on from developer mode',()=>{
 const s=fixture(),original=globalThis.document;
 const ctx={store:{get:()=>s,update:f=>f(s)},toast:()=>{},router:{open:()=>{}}};
 try{
  globalThis.document=doc(true);
  assert.equal(ghostDevSkipAvailable(globalThis.document,s),true);
  assert.match(ghostEditor(s),/关闭 D01 跳关模式/);
  handleEditor('editor-ghost-skip-toggle',{dataset:{}},ctx);
  assert.equal(s.editor.ghostSkipEnabled,false);
  assert.equal(ghostDevSkipAvailable(globalThis.document,s),false);
  assert.match(ghostEditor(s),/开启 D01 跳关模式/);
  handleEditor('editor-ghost-skip-toggle',{dataset:{}},ctx);
  assert.equal(ghostDevSkipAvailable(globalThis.document,s),true);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('skip all five test rounds uses normal single KIRA completion email and 0.04 BTC payout',()=>{
 const s=fixture();
 for(let i=0;i<5;i++){
  const o=s.ghost.orders[D01_REPAIR];
  if(i>0){o.status='authorized';begin(s,D01_REPAIR,10000+i*10000);}
  assert.equal(previewSkipD01(s,D01_REPAIR,11000+i*10000),true);
  finish(s,D01_REPAIR,true,14000+i*10000);
  assert.equal(s.story55.d01.completedRounds,i+1);
 }
 assert.equal(s.story55.d01.submitted,true);
 const now=s.story55.d01.submittedAt;
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(tickD01(s,now+2001),true);
 assert.equal(tickD01(s,now+3000),false);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.orderId===D01_REPAIR).length,1);
 assert.equal(s.content.mail.filter(x=>x.id===D01_DONE).length,1);
 assert.equal(previewSkipD01(s,D01_REPAIR,now+5000),false,'no reward after finished');
});
