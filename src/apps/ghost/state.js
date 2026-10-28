import {defaultConfig} from './catalog.js';
import {createBoard} from './games/logic.js';
export function ensureGhost(s){return s.ghost??={orders:{},history:[],balance:0,config:{}};}
export function configFor(s,type,id){return {...defaultConfig,...s.ghost?.config?.[type],...s.ghost?.orders?.[id]?.settings};}
export function authorize(s,{orderId,mailId,type}){const g=ensureGhost(s);const selected=type||g.missionTypes?.[orderId]||'cipher';if(!g.orders[orderId])g.orders[orderId]={id:orderId,mailId,type:selected,key:'GH-'+orderId.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase(),status:'authorized',attempts:0,settings:{...defaultConfig,...g.config[selected],...g.orderConfigs?.[orderId]}};return g.orders[orderId];}
const boardSignature=(type,b)=>JSON.stringify(type==='cipher'?b.tiles:type==='route'?b.masks:type==='extract'?b.target:type==='veil'?b.code:b.signature);
function freshBoard(type,cfg,previous){
 let board;
 for(let i=0;i<16;i++){board=createBoard(type,cfg);if(!previous||boardSignature(type,board)!==boardSignature(type,previous))return board;}
 // Even if random() was mocked or repeated, consecutive attempts vary visibly.
 if(type==='cipher')[board.tiles[0],board.tiles[1]]=[board.tiles[1],board.tiles[0]];
 else if(type==='route')board.masks[0]=((board.masks[0]<<1)&15)|(board.masks[0]>>3);
 else if(type==='extract')board.target=board.target.slice(0,-1)+(Number(board.target.at(-1))+1)%10;
 else if(type==='veil')board.code=board.code.slice(0,-1)+(Number(board.code.at(-1))+1)%10;
 else board.signature=board.signature.slice(0,-1)+(Number(board.signature.at(-1))+1)%10;
 return board;
}
export function begin(s,id,now=Date.now()){const g=ensureGhost(s),o=g.orders[id];if(!o||!['authorized','failed'].includes(o.status))return false;const cfg=configFor(s,o.type,o.id);if(o.attempts>=cfg.retries)return false;const previous=o.board;o.attempts++;o.status='running';o.startedAt=now;o.deadline=Number.isFinite(cfg.seconds)&&cfg.seconds>0?now+cfg.seconds*1000:null;o.board=freshBoard(o.type,cfg,previous);o.moves=0;o.errors=0;return true;}
export function finish(s,id,success,now=Date.now()){const g=ensureGhost(s),o=g.orders[id];if(!o||o.status!=='running')return;o.status=success?'success':'failed';g.history.unshift({id:id+':'+o.attempts,orderId:id,type:o.type,success,at:now,moves:o.moves,attempt:o.attempts});}
export function submit(s,id,now=Date.now()){const o=s.ghost?.orders[id];if(o?.status!=='success')return false;o.status='settling';o.submittedAt=now;o.dueAt=now+120000;return true;}
export function settle(s,now=Date.now()){const g=s.ghost;if(!g)return false;let changed=false;for(const o of Object.values(g.orders)){if(o.status==='settling'&&now>=o.dueAt){const reward=configFor(s,o.type,o.id).reward;if(Number.isFinite(reward)&&reward>=0){g.balance+=reward;if(s.content){const wallet=s.content.mirage??={};wallet.digitalBalance=(wallet.digitalBalance||0)+reward;wallet.digitalTransactions??=[];wallet.digitalTransactions.unshift({orderId:o.id,amount:reward,at:now});const order=s.content.orders?.find(x=>x.id===o.id);if(order)order.status='COMPLETED';}o.status='paid';o.paidAt=now;changed=true;}}}return changed;}

export function needsWorldTick(s,now=Date.now()){return Object.values(s.ghost?.orders||{}).some(o=>o.status==='running'&&(o.type==='strike'?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline)||o.status==='settling'&&now>=o.dueAt&&Number.isFinite(configFor(s,o.type,o.id).reward));}
export function advanceGhost(s,now=Date.now()){for(const o of Object.values(s.ghost?.orders||{}))if(o.status==='running'&&(o.type==='strike'?now-o.startedAt>=configFor(s,o.type,o.id).attackMs:o.deadline!==null&&now>=o.deadline))finish(s,o.id,o.type==='strike',now);settle(s,now);}
