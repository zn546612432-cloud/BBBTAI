// Solvable, newly generated LINK levels. Original GHOST wire art, not an imported UI.
import {pipe} from '../../visuals.js';
import {d01,D01_ORDER} from '../../../../services/story55/d01.js';
const sides=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
export const rotateMask=mask=>((mask<<1)&15)|(mask>>3);
const rand=(n,random)=>Math.floor(random()*n);
function shuffle(values,random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=rand(i+1,random);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function linkedNodes(masks,size){
 const seen=new Set([0]),queue=[0];
 while(queue.length){
  const index=queue.shift(),row=Math.floor(index/size),col=index%size;
  for(const [dr,dc,port,back] of sides){
   const r=row+dr,c=col+dc,next=r*size+c;
   if(r<0||r>=size||c<0||c>=size)continue;
   if((masks[index]&port)&&(masks[next]&back)&&!seen.has(next)){seen.add(next);queue.push(next);}
  }
 }
 return seen;
}
export const linkSolved=board=>linkedNodes(board.masks,board.size).has(board.size*board.size-1);
export function createLinkPuzzle(round=0,random=Math.random){
 const size=round<2?3:4,count=size*size,solution=Array(count).fill(0),visited=new Set([0]),path=[0];
 function visit(index){
  if(index===count-1)return true;
  const row=Math.floor(index/size),col=index%size;
  for(const [dr,dc,port,back] of shuffle(sides,random)){
   const r=row+dr,c=col+dc,next=r*size+c;
   if(r<0||r>=size||c<0||c>=size||visited.has(next))continue;
   visited.add(next);path.push(next);
   solution[index]|=port;solution[next]|=back;
   if(visit(next))return true;
   solution[index]&=~port;solution[next]&=~back;path.pop();
  }
  return false;
 }
 if(!visit(0))throw Error('無法生成可解的線路');
 for(let i=0;i<count;i++)if(solution[i]===0)solution[i]=[3,5,6,9,10,12,15][rand(7,random)];
 const masks=solution.map(mask=>{let m=mask;for(let n=rand(4,random);n>0;n--)m=rotateMask(m);return m;});
 const board={size,masks,solution,moves:0,done:false,path};
 if(linkSolved(board)){
  for(let i=0;i<count;i++){
   if(new Set([0,1,2,3].map(n=>{let m=board.masks[i];for(let k=0;k<n;k++)m=rotateMask(m);return m;})).size<2)continue;
   for(let k=0;k<3&&linkSolved(board);k++)board.masks[i]=rotateMask(board.masks[i]);
   if(!linkSolved(board))break;
  }
 }
 board.done=linkSolved(board);
 return board;
}
export function ensureLinkPuzzle(s,random=Math.random){
 const o=d01(s)?.order;
 if(!o?.deployed||o.completed>=5)return null;
 if(!o.board){o.board=createLinkPuzzle(o.completed,random);o.boardSaved=false;o.leaveApproved=false;}
 return o.board;
}
export function rotateLinkPuzzle(s,index){
 const board=ensureLinkPuzzle(s),o=d01(s).order;
 if(!board||board.done)return false;
 const i=Number(index);
 if(!Number.isInteger(i)||i<0||i>=board.masks.length)throw Error('無效線路');
 board.masks[i]=rotateMask(board.masks[i]);board.moves++;
 if(linkSolved(board))board.done=true;
 o.boardSaved=true;
 return board.done;
}
export function startExitPrompt(s){
 const o=d01(s)?.order;if(!o?.board||o.board.done)return false;
 o.exitPrompt=true;return true;
}
export function chooseExit(s,save){
 const o=d01(s)?.order;if(!o?.exitPrompt)return false;
 if(!save){o.board=null;o.boardSaved=false;}
 else o.boardSaved=true;
 o.exitPrompt=false;o.leaveApproved=true;
 return true;
}
const button=(action,label,cls='',extra='')=>'<button type="button" class="gh-button '+cls+'" data-action="gh-d01-'+action+'" '+extra+'>'+label+'</button>';
const head=(label,back='exit')=>'<div class="gh-top">'+button(back,'‹','','aria-label="返回"')+'<span>'+label+'</span><span>●</span></div>';
export function renderD01Deploy(s){
 const o=d01(s)?.order;
 if(!o?.keyOpened)return '<div class="gh-shell">'+head('部署','home')+'<p class="gh-hint">請先在 KIRA 查收密鑰。</p></div>';
 return '<div class="gh-shell">'+head('GHOST / 部署','home')+'<div class="gh-brand"><span class="gh-wordmark">GHOST<span>®</span></span><span class="gh-live">● 安全連線</span></div><div class="gh-game-head"><small>DATA RECOVERY / '+D01_ORDER+'</small><h1>部署工具</h1><p>授權密鑰已由 KIRA 讀取</p></div><div class="gh-keybox"><small>授權密鑰</small><input id="gh-d01-key" aria-label="部署密鑰" value="mirage001" readonly spellcheck="false"><p>部署後可開始數據修復</p></div>'+button('deploy',o.deployed?'繼續修復':'部署','gh-primary')+'</div>';
}
export function renderD01Link(s){
 const o=d01(s)?.order;
 if(!o?.deployed)return renderD01Deploy(s);
 const board=o.board,progress=o.completed*20;
 let body='';
 if(o.completed>=5){
  body='<div class="gh-report"><div class="gh-result-mark">✓</div><small>DATA RECOVERY</small><h1>已修復 100%</h1><p>五處損壞資料已完成修復</p>'+button('submit','提交訂單','gh-primary')+'</div>';
 }else if(board?.done){
  body='<div class="gh-report"><div class="gh-result-mark">✓</div><small>LINK / '+(o.completed+1)+' OF 5</small><h1>修復成功</h1><p>已修復 '+(progress+20)+'%</p><div class="gh-meter"><i style="width:'+(progress+20)+'%"></i></div>'+button('next',o.completed===4?'提交訂單':'修復下一處','gh-primary')+'</div>';
 }else if(board){
  const lit=linkedNodes(board.masks,board.size),percent=Math.round(lit.size/(board.size*board.size)*100);
  body='<div class="gh-game-head"><small>已修復 '+progress+'% · 第 '+(o.completed+1)+'/5 處</small><h1>鏈接 · 數據修復</h1><p>旋轉線路，連通入口與出口；不限時間及操作次數。</p></div><div class="gh-port-label"><span>↓ 入口</span><span>↓ 出口</span></div><div class="gh-grid gh-pipes gh-d01-pipes" style="grid-template-columns:repeat('+board.size+',minmax(0,1fr))">'+board.masks.map((mask,i)=>button('rotate',pipe(mask,lit.has(i)),'','data-index="'+i+'" aria-label="旋轉第'+(i+1)+'個線路"')).join('')+'</div><div class="gh-progress-label">連線範圍 <span>'+percent+'%</span></div><div class="gh-meter"><i style="width:'+percent+'%"></i></div><div class="gh-game-footer"><span>● 安全會話</span><span>'+board.moves+' 次操作</span></div>';
 }else{
  body='<div class="gh-report"><small>DATA RECOVERY / '+D01_ORDER+'</small><h1>等待修復</h1>'+button('begin','開始修復第 '+(o.completed+1)+' 處','gh-primary')+'</div>';
 }
 if(o.exitPrompt)body+='<div class="gh-d01-overlay" role="alertdialog" aria-label="保存目前關卡"><div class="gh-d01-dialog"><h2>退出目前修復？</h2><p>已完成的 '+progress+'% 不會丟失。是否保存目前線路？</p>'+button('save-exit','保存並退出','gh-primary')+button('discard-exit','放棄並退出')+button('cancel-exit','繼續修復')+'</div></div>';
 return '<div class="gh-shell gh-d01-link">'+head('GHOST / LINK')+body+'</div>';
}
