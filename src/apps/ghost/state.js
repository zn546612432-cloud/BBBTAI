import {defaultConfig} from './catalog.js';
import {createBoard} from './games/logic.js';
export function ensureGhost(s){return s.ghost??={orders:{},history:[],balance:0,config:{}};}
export function configFor(s,type,id){return {...defaultConfig,...s.ghost?.config?.[type],...s.ghost?.orders?.[id]?.settings};}
export function authorize(s,{orderId,mailId,type}){const g=ensureGhost(s);const selected=type||g.missionTypes?.[orderId]||'cipher';if(!g.orders[orderId])g.orders[orderId]={id:orderId,mailId,type:selected,key:'GH-'+orderId.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase(),status:'authorized',attempts:0,settings:{...defaultConfig,...g.config[selected],...g.orderConfigs?.[orderId]}};return g.orders[orderId];}
const boardSignature=(type,b)=>JSON.stringify(type==='cipher'?b.tiles:type==='route'?b.masks:type==='extract'?b.target:type==='veil'?b.code:b.signature);
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
  // Deterministic fallback for mocked/low entropy RNG, including adjacent
  // rounds; preserve board structure instead of retrying the same puzzle.
  const count=used.length+1;
  for(let offset=0;offset<5000&&used.includes(boardSignature(type,board));offset++){
   const n=count+offset;
   if(type==='cipher'){
    const tiles=[0,1,2,3,4,5,6,7,8];
    const i=n%9,j=(i+1+Math.floor(n/9)%8)%9;
    [tiles[i],tiles[j]]=[tiles[j],tiles[i]];
    board.tiles=tiles;
   }else if(type==='route'){
    const masks=[...board.masks];
    masks[n%9]=((masks[n%9]<<1)&15)|(masks[n%9]>>3);
    masks[(n+3)%9]=((masks[(n+3)%9]<<1)&15)|(masks[(n+3)%9]>>3);
    board.masks=masks;
   }else if(type==='extract'){
    board.target=String((count+offset)%1000000).padStart(6,'0');
    board.options[board.correct]=board.target;
   }else if(type==='veil'){
    board.code=String(count+offset).padStart(cfg.codeLength||4,'0').slice(-(cfg.codeLength||4));
   }else if(type==='strike'){
    board.signature=String(count+offset).padStart(8,'0').slice(-8);
   }
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
export function begin(s,id,now=Date.now()){const g=ensureGhost(s),o=g.orders[id];if(!o||!['authorized','failed'].includes(o.status))return false;const cfg=configFor(s,o.type,o.id);if(o.attempts>=cfg.retries)return false;o.attempts++;o.status='running';o.startedAt=now;o.deadline=Number.isFinite(cfg.seconds)&&cfg.seconds>0?now+cfg.seconds*1000:null;o.board=uniqueBoard(g,o.type,cfg);o.moves=0;o.errors=0;return true;}
export function finish(s,id,success,now=Date.now()){const g=ensureGhost(s),o=g.orders[id];if(!o||o.status!=='running')return;o.status=success?'success':'failed';g.history.unshift({id:id+':'+o.attempts,orderId:id,type:o.type,success,at:now,moves:o.moves,attempt:o.attempts});}
export function submit(s,id,now=Date.now()){const o=s.ghost?.orders[id];if(o?.status!=='success')return false;o.status='settling';o.submittedAt=now;o.dueAt=now+120000;return true;}
export function settle(s,now=Date.now()){const g=s.ghost;if(!g)return false;let changed=false;for(const o of Object.values(g.orders)){if(o.status==='settling'&&now>=o.dueAt){const reward=configFor(s,o.type,o.id).reward;if(Number.isFinite(reward)&&reward>=0){g.balance+=reward;if(s.content){const wallet=s.content.mirage??={};wallet.digitalBalance=(wallet.digitalBalance||0)+reward;wallet.digitalTransactions??=[];wallet.digitalTransactions.unshift({orderId:o.id,amount:reward,at:now});const order=s.content.orders?.find(x=>x.id===o.id);if(order)order.status='COMPLETED';}o.status='paid';o.paidAt=now;changed=true;}}}return changed;}

export function needsWorldTick(s,now=Date.now()){return Object.values(s.ghost?.orders||{}).some(o=>o.status==='running'&&(o.type==='strike'?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline)||o.status==='settling'&&now>=o.dueAt&&Number.isFinite(configFor(s,o.type,o.id).reward));}
export function advanceGhost(s,now=Date.now()){for(const o of Object.values(s.ghost?.orders||{}))if(o.status==='running'&&(o.type==='strike'?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline))finish(s,o.id,o.type==='strike',now);settle(s,now);}
