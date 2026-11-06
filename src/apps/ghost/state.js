import {D01_REPAIR,finishD01Round,submitD01Attachment} from '../../story/d01/runtime.js';
import {onD02GhostWin,d02OrderOfStep,D02_DEADLINES} from '../../story/d02/runtime.js';
import {onD03GhostWin,d03OrderOfStep,d03CanRun} from '../../story/d03/contract.js';
import {onD04GhostWin,d04OrderOfStep,d04CanRun} from '../../story/d04/contract.js';
import {completeDeploymentRun} from '../../services/story55/projects.js';
import {linkedMission,advanceLinkedMission,recordLinkedMissionPayment} from '../mirage/linked-missions.js';
import {createLinkedArtifact,tickLinkedContracts,linkedNeedsWorldTick} from '../mirage/linked-contract-runtime.js';
import {WALLET_CHALLENGE_ID,completeWalletChallenge} from '../mirage/contacts-seed.js';
import {defaultConfig} from './catalog.js';
import {createBoard,connected} from './games/logic.js';
import {pipeSolved} from './games/pipe-network.js';
import {createArcadeBoard} from './games/arcade.js';
export function ensureGhost(s){return s.ghost??={orders:{},history:[],balance:0,config:{}};}
export function configFor(s,type,id){return {...defaultConfig,...s.ghost?.config?.[type],...s.ghost?.orders?.[id]?.settings};}
export function authorize(s,{orderId,mailId,type}){const g=ensureGhost(s);const selected=type||g.missionTypes?.[orderId]||'cipher';if(!g.orders[orderId])g.orders[orderId]={id:orderId,mailId,type:selected,key:'GH-'+orderId.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase(),status:'authorized',attempts:0,settings:{...defaultConfig,...g.config[selected],...g.orderConfigs?.[orderId],...(linkedMission(s,orderId)?{retries:Number.MAX_SAFE_INTEGER}:{})}};return g.orders[orderId];}
const boardSignature=(type,b)=>JSON.stringify(type==='cipher'?b.tiles:type==='route'?b.masks:type==='extract'?b.target:type==='veil'?b.code:type==='verify'?b.target:b.signature);
const signatures=(g,type)=>g.usedBoardSignatures??={cipher:[],route:[],extract:[],veil:[],strike:[]};
function uniqueBoard(g,type,cfg){
 const used=signatures(g,type)[type]??=[];
 let board=createBoard(type,cfg);
 // Normally the random generator produces a fresh level. In the unlikely
 // case of a collision, derive another *actual* level rather than repeating.
 for(let attempt=0;attempt<64&&used.includes(boardSignature(type,board));attempt++){
  board=createBoard(type,cfg);
 }
 if(used.includes(boardSignature(type,board))){
  // Seed an internal PRNG instead of relying on a mocked or repeated
  // Math.random implementation. This produces varied puzzle geometry.
  let attempt=0;
  while(attempt++<10000&&used.includes(boardSignature(type,board))){
   let seed=((used.length+attempt)*2654435761)>>>0;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   board=createBoard(type,cfg,random);
  }
 }
 const signature=boardSignature(type,board);
 if(used.includes(signature))throw Error('当前关卡组合已用尽，请调整难度或清理测试记录');
 used.push(signature);
 // A few thousand distinct levels per puzzle type is enough to keep
 // save sizes bounded. The cap is global across orders, not just retries.
 if(used.length>2500)used.shift();
 return board;
}
export function nextGhostRound(s,id){
 const o=s.ghost?.orders[id];if(!o)return false;
 const b=uniqueBoard(s.ghost,o.type,configFor(s,o.type,id));
 if(o.type==='extract')Object.assign(o.board,{target:b.target,options:b.options,correct:b.correct});
 if(o.type==='veil')Object.assign(o.board,{code:b.code,input:''});
 return true;
}
export function begin(s,id,now=Date.now()){const g=ensureGhost(s),o=g.orders[id];if(!o||!['authorized','failed'].includes(o.status))return false;if(o.requiresKeyEntry&&!o.keyVerified)return false;const d02=d02OrderOfStep(id);if(d02&&(s.content.orders?.find(x=>x.id===d02)?.status!=='ACCEPTED'||!s.story55?.d02?.deployed?.[d02]||s.day>D02_DEADLINES[d02].day||s.day===D02_DEADLINES[d02].day&&s.clock>D02_DEADLINES[d02].clock))return false;
 if(d03OrderOfStep(id)&&!d03CanRun(s,id))return false;
 if(d04OrderOfStep(id)&&!d04CanRun(s,id))return false;
 if(id===D01_REPAIR){o.settings??={};o.settings.pipeNetwork=true;o.settings.pipeSize=[5,5,6,6,7][Math.min(4,Math.max(0,Number(s.story55?.d01?.completedRounds)||0))];o.settings.seconds=null;}
 const cfg=configFor(s,o.type,o.id);/* Mistakes and timeouts only restart the current level; attempts are unlimited. */o.attempts++;o.status='running';o.startedAt=now;o.deadline=Number.isFinite(cfg.seconds)&&cfg.seconds>0?now+cfg.seconds*1000:null;o.board=uniqueBoard(g,o.type,cfg);
 // Keep the old board fields for existing story contracts and saved fixtures.
 // New attempts use the playable arcade engine; pre-existing attempts resume their old UI.
 if(['extract','veil','strike'].includes(o.type)&&cfg.arcadeV2!==false){
  o.board.arcade=createArcadeBoard(o.type);
  if(o.type==='strike')o.deadline=now+Math.max(30000,Number.isFinite(cfg.seconds)&&cfg.seconds>0?cfg.seconds*1000:cfg.attackMs*6);
 }
 o.moves=0;o.errors=0;return true;}
export function finish(s,id,success,now=Date.now()){
 const g=ensureGhost(s),o=g.orders[id];
 if(!o||!['running','preview-win'].includes(o.status))return;
 if(o.status==='preview-win'&&(!success||now<o.previewUntil))return;
 o.status=success?'success':'failed';
 if(success&&id===D01_REPAIR){
  finishD01Round(s);
  // The solved GHOST artifact is the actual submission. No second email CTA.
  if(s.story55?.d01?.completedRounds===5)submitD01Attachment(s);
 }
 if(success&&o.story55Project)completeDeploymentRun(s,o);
 if(success&&o.story55Commission){o.status='paid';s.bankData.balance+=20000;s.bankData.transactions.unshift({id:o.id,label:'MIRAGE COMMISSION',amount:20000,time:s.clock});}
 g.history.unshift({id:id+':'+o.attempts,orderId:id,type:o.type,success,at:now,moves:o.moves,attempt:o.attempts});
 // Trigger the scripted D05 conversation and 10 BTC credit ONLY after
 // the player successfully solves the challenge. This is idempotent.
 if(success&&id===WALLET_CHALLENGE_ID)completeWalletChallenge(s);
  if(success)onD02GhostWin(s,id);
  if(success)onD03GhostWin(s,id);
  if(success)onD04GhostWin(s,id);
 if(success&&linkedMission(s,id))createLinkedArtifact(s,id);
 else if(success)advanceLinkedMission(s,id,5);
}
// D01's final connected network must remain visible for three full seconds.
// The saved absolute deadline survives app switches and page reloads.
export function startD01PipePreview(s,id,now=Date.now()){
 if(id!==D01_REPAIR)return false;
 const o=s.ghost?.orders?.[id];
 if(!o||o.status!=='running'||o.type!=='route')return false;
 if(!(o.board?.size?pipeSolved(o.board):connected(o.board?.masks||[]).has(8)))return false;
 o.status='preview-win';o.previewUntil=now+3000;
 return true;
}
export function startD02PipePreview(s,id,now=Date.now()){
 if(!d02OrderOfStep(id))return false;
 const run=s.ghost?.orders?.[id];
 if(run?.type!=='route'||run.status!=='running'||!(run.board?.size?pipeSolved(run.board):connected(run.board?.masks||[]).has(8)))return false;
 run.status='preview-win';run.previewUntil=now+3000;return true;
}
// The D03 LINK level must also keep its solved circuit visible for 3 seconds.
export function startD03PipePreview(s,id,now=Date.now()){
 if(!d03OrderOfStep(id))return false;
 const o=s.ghost?.orders?.[id];
 if(o?.type!=='route'||o.status!=='running'||!(o.board?.size?pipeSolved(o.board):connected(o.board?.masks||[]).has(8)))return false;
 o.status='preview-win';o.previewUntil=now+3000;return true;
}
// D04 LINK also displays the connected circuit for three seconds.
export function startD04PipePreview(s,id,now=Date.now()){
 if(!d04OrderOfStep(id))return false;
 const o=s.ghost?.orders?.[id];
 if(o?.type!=='route'||o.status!=='running'||!(o.board?.size?pipeSolved(o.board):connected(o.board?.masks||[]).has(8)))return false;
 o.status='preview-win';o.previewUntil=now+3000;return true;
}
export function exitD01Puzzle(s,{discard=false}={}){
 const run=s.ghost?.orders?.[D01_REPAIR];if(!run||run.status!=='running')return false;
 if(discard){run.status='authorized';run.board=null;run.deadline=null;run.moves=0;}
 // The completed 20% checkpoints are stored separately and never rolled back.
 return true;
}
export function submit(s,id,now=Date.now()){if(linkedMission(s,id))return false; // Linked jobs require an attached KIRA reply.
 const o=s.ghost?.orders[id];if(o?.status!=='success')return false;o.status='settling';o.submittedAt=now;o.dueAt=now+120000;return true;}
export function settle(s,now=Date.now()){const g=s.ghost;if(!g)return false;let changed=false;for(const o of Object.values(g.orders)){if(linkedMission(s,o.id))continue;if(o.status==='settling'&&now>=o.dueAt){const reward=configFor(s,o.type,o.id).reward;if(Number.isFinite(reward)&&reward>=0){g.balance+=reward;if(s.content){const wallet=s.content.mirage??={};wallet.digitalBalance=(wallet.digitalBalance||0)+reward;wallet.digitalTransactions??=[];wallet.digitalTransactions.unshift({orderId:o.id,amount:reward,at:now});const order=s.content.orders?.find(x=>x.id===o.id);if(order)order.status='COMPLETED';}o.status='paid';o.paidAt=now;advanceLinkedMission(s,o.id,6);recordLinkedMissionPayment(s,o.id,reward,now);changed=true;}}}return tickLinkedContracts(s)||changed;}

export function needsWorldTick(s,now=Date.now()){return linkedNeedsWorldTick(s)||Object.values(s.ghost?.orders||{}).some(o=>o.status==='preview-win'&&now>=o.previewUntil||o.id===D01_REPAIR&&o.status==='running'&&o.board?.size&&pipeSolved(o.board)||o.status==='running'&&(o.type==='strike'&&!o.board?.arcade?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline)||o.status==='settling'&&now>=o.dueAt&&Number.isFinite(configFor(s,o.type,o.id).reward));}
export function advanceGhost(s,now=Date.now()){for(const o of Object.values(s.ghost?.orders||{})){
 // Repair persisted D01 puzzles that visibly connected the endpoints before
 // the corrected rule shipped; the player does not need to rotate again.
 if(o.id===D01_REPAIR&&o.status==='running'&&o.board?.size&&pipeSolved(o.board))startD01PipePreview(s,o.id,now);
 if(o.status==='preview-win'&&now>=o.previewUntil){finish(s,o.id,true,now);continue;}
 if(o.status==='running'&&(o.type==='strike'&&!o.board?.arcade?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline))finish(s,o.id,o.type==='strike'&&!o.board?.arcade,now);
 }
 settle(s,now);}
