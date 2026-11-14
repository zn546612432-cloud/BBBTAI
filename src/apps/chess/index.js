import {isStory55,taiRecognized} from '../../services/story55/state.js';
import {btn,card,demo,empty,esc,section} from '../../system/ui.js';
import {taiPresence} from '../../services/presence.js';
import {createPlayerInvitation,receiveInvitation,startAcceptedInvitation,processDemoReply} from '../../services/invitations.js';
import {createSoloMatch,loadGame,playMove,applyStockfishMove,postMatchMessage,replyToMatch,resignChessMatch} from '../../services/chess.js';
import {isD23ChessLesson} from '../../services/chess-lesson.js';
import {bestStockfishMove} from '../../services/chess-stockfish.js';
export const manifest={id:'chess',name:'国际象棋',icon:13,defaultRoute:'/',supportsDeepLink:true,kicker:'A QUIET GAME'};
const pieces={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const resultLabel=result=>({ 'player-resigned':'已認輸','player-win':'白方勝','opponent-win':'黑方勝','draw':'和棋' }[result]||result||'');let selected=null,thinking=null,pendingPromotion=null;
async function playRealOpponentTurn(store,id){
 const match=store.get().matches.find(m=>m.id===id);
 if(!match||match.status!=='active'||match.engineError||thinking===id)return;
 const game=loadGame(match);
 if(game.turn()!=='b')return;
 const originalFen=game.fen();
 thinking=id;
 try{
  const uci=await bestStockfishMove(originalFen,{skillLevel:isD23ChessLesson(match)?5:20});
  applyStockfishMove(store,id,originalFen,uci);
 }catch(error){
  store.update(s=>{
   const m=s.matches.find(x=>x.id===id);
   if(m?.status==='active'&&loadGame(m).fen()===originalFen)m.engineError=String(error?.message||'引擎暫時無法回應');
  });
 }finally{thinking=null;}
}
function home(s){const p=taiPresence(s),latest=s.matches.filter(m=>m.status==='active').at(-1),out=s.invitations.filter(i=>i.senderId==='player').at(-1);return `<div class="chess-home chess-redesign"><div class="chess-title"><span>CHESS CLUB</span><h1>国际象棋</h1><div class="chess-title-piece">♞</div></div><div class="chess-actions">${latest?btn('continue-match','继续对局 <span>↗</span>','feature-button',`data-id="${latest.id}"`):''}${btn('solo-match','单人对局 <span>↗</span>','feature-button')}${btn('chess-history','历史棋局 <span>↗</span>','feature-button')}</div>${taiRecognized(s)?`<div class="chess-friend"><div class="contact-glyph">D</div><div><strong>Dr Ouroboros</strong><small><i class="presence-dot ${p.status}"></i> ${p.reason}</small></div>${out&&out.status==='accepted'?btn('open-invite-match','进入','chess-invite',`data-id="${out.id}"`):out&&out.status==='pending'?'<span class="chess-wait">等待回应</span>':btn('invite-tai','邀请','chess-invite')}</div>`:''}</div>`;}
function boardView(s,id){const match=s.matches.find(m=>m.id===id);if(!match)return empty('未找到棋局');const game=loadGame(match),board=game.board(),last=match.history.at(-1),legal=selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[],tai=match.opponent==='tai';const introPending=isD23ChessLesson(match)&&!match.lesson?.openingDone;const chatAtBottom=(match.chat||[]).some(m=>m.from==='player'||/-(?:piece|ending|resigned|check|capture)-/.test(m.id||''));const chatLines=chatAtBottom?[...(match.chat||[])].reverse():(match.chat||[]);return `<div class="match-view"><div class="match-card opponent"><span class="match-avatar">${tai?'D':'♟'}</span><span><strong>${tai?'Dr Ouroboros':'电脑'}</strong><small>黑方 · ${match.status==='finished'?'已结束':'对弈中'}</small></span><span class="match-status">${match.engineError?'暫停中':match.status==='finished'?'已結束':introPending?'講解中…':game.turn()==='b'?'思考中':'●'}</span></div><div class="board-frame"><div class="board-grid">${board.flatMap((rank,ri)=>rank.map((piece,ci)=>{const sq='abcdefgh'[ci]+(8-ri),dark=(ri+ci)%2===1;return btn('square',`<span class="coord">${ci===0?8-ri:''}${ri===7?'abcdefgh'[ci]:''}</span><span class="chess-piece ${piece?.color==='w'?'white-piece':'black-piece'}">${piece?`<img src="/apps/chess/pieces/${piece.color}${piece.type.toUpperCase()}.png" alt="" draggable="false">`:''}</span>`,`square ${dark?'dark':'light'} ${selected===sq?'chosen':''} ${last&&(last.from===sq||last.to===sq)?'last-move':''} ${legal.includes(sq)?'legal':''}`,`data-square="${sq}" aria-label="${sq} ${piece?piece.color+' '+piece.type:'空'}"`);})).join('')}</div></div><div class="match-card"><span class="match-avatar player">蒙</span><span><strong>熙蒙</strong><small>白方 · ${match.status==='finished'?'已結束':game.turn()==='w'?'轮到你':'等待对手'}</small></span><span class="match-status">${match.status==='finished'?esc(resultLabel(match.result)):''}</span></div>${pendingPromotion?.matchId===id?`<div class="match-card" role="group" aria-label="兵升變"><strong>兵升變</strong>${[['q','后'],['r','車'],['b','象'],['n','馬']].map(([piece,label])=>btn('chess-promote',label,'button-quiet',`data-piece="${piece}"`)).join('')}</div>`:'' }<div class="move-history">${match.history.length?match.history.map((m,i)=>`<span>${i%2===0?Math.floor(i/2)+1+'. ':''}${esc(m.san)}</span>`).join(''):'<span>—</span>'}</div><section class="chess-chat"><header><span>对局聊天</span><small>${tai?'Dr Ouroboros':'棋局记录'}</small></header><div class="chess-chat-messages ${chatAtBottom?'is-live':''}">${chatLines.map(m=>`<div class="chess-chat-line ${m.from==='player'?'mine':''}"><span>${esc(m.text)}</span><time>${esc(m.time)}</time></div>`).join('')||'<div class="chess-chat-empty">开局了。</div>'}</div>${tai?`<form data-form="chess-chat" data-id="${esc(id)}" class="chess-chat-form"><input name="text" type="text" maxlength="200" autocomplete="off" placeholder="发消息" aria-label="对局消息" required><button type="submit" aria-label="发送消息">↑</button></form>`:''}</section><div class="match-footer">${match.engineError?btn('retry-engine','繼續對弈','button-quiet',`data-id="${esc(id)}"`):''}${match.status==='active'?btn('resign-match','認輸','button-quiet',`data-id="${esc(id)}"`):''}${btn('chess-home','‹ 返回棋室','button-quiet')}</div></div>`;}
function invitation(s,id){const inv=s.invitations.find(i=>i.id===id);if(!inv)return empty('邀请不存在');return `<div class="chess-home"><div class="invite-page-symbol">♞</div><span class="eyebrow">INVITATION</span><h1>一盘友谊赛</h1><p class="muted">${inv.senderId==='tai'?'Dr Ouroboros 发来邀请':'你发出的邀请'} · ${inv.status} ${demo()}</p>${inv.status==='accepted'?btn('accept-bridge','进入棋局','button-primary wide',`data-id="${id}"`):inv.senderId==='tai'&&['pending','deferred'].includes(inv.status)?btn('accept-bridge','接受邀请','button-primary wide',`data-id="${id}"`):btn('chess-home','返回棋室','button-quiet wide')}</div>`;}
export function render({store},loc){const s=store.get();if(loc.route.startsWith('/match/')){const id=loc.route.slice(7),m=s.matches.find(x=>x.id===id);if(m?.status==='active'&&loadGame(m).turn()==='b'&&!m.engineError&&thinking!==id)void playRealOpponentTurn(store,id);}if(loc.route.startsWith('/match/'))return boardView(s,loc.route.slice(7));if(loc.route==='/history')return `<div class="page-pad"><div class="large-title">历史棋局</div><div class="surface-list">${s.matches.map(m=>btn('continue-match',`<span class="list-copy"><strong>${m.opponent==='tai'?'Dr Ouroboros':'单人棋局'}</strong><small>D${m.createdDay} · ${m.status==='active'?'进行中':resultLabel(m.result)||'已結束'}</small></span><span>›</span>`,'list-row',`data-id="${m.id}"`)).join('')||'<div class="muted-note">还没有对局。</div>'}</div></div>`;if(loc.route==='/invitation')return invitation(s,loc.params.invitationId);return home(s);}
export function handle(action,target,ctx,loc){const id=target.dataset.id;if(action==='retry-engine'){ctx.store.update(s=>{const m=s.matches.find(x=>x.id===id);if(m)delete m.engineError;});void playRealOpponentTurn(ctx.store,id);return;}if(action==='chess-home'){selected=null;pendingPromotion=null;ctx.router.open({appId:'chess',route:'/'});}if(action==='solo-match'){const matchId=createSoloMatch(ctx.store);ctx.router.open({appId:'chess',route:'/match/'+matchId});}if(action==='chess-history')ctx.router.open({appId:'chess',route:'/history'});if(action==='continue-match'){selected=null;ctx.router.open({appId:'chess',route:'/match/'+id});}if(action==='invite-tai'){const invId=createPlayerInvitation(ctx.store);ctx.toast('邀请已发送。演示回应取决于统一在线状态。');setTimeout(()=>processDemoReply(ctx.store),1200);ctx.router.open({appId:'chess',route:'/invitation',params:{invitationId:invId}});}if(action==='open-invite-match'||action==='accept-bridge'){const inv=ctx.store.get().invitations.find(i=>i.id===id);const matchId=inv.senderId==='tai'&&inv.status!=='accepted'?receiveInvitation(ctx.store,id):startAcceptedInvitation(ctx.store,id);ctx.router.open({appId:'chess',route:'/match/'+matchId});}if(action==='open-app-link')ctx.router.open({appId:target.dataset.app,route:target.dataset.route});if(action==='resign-match'){
  const resigned=resignChessMatch(ctx.store,id);
  if(resigned){
   selected=null;pendingPromotion=null;ctx.refresh();
   setTimeout(()=>{
    const nav=ctx.store.get().nav?.current;
    if(nav?.appId==='chess'&&nav.route==='/match/'+id)ctx.router.open({appId:'chess',route:'/'});
   },7000);
  }
  return;
 }
 if(action==='chess-promote'){
  const p=pendingPromotion;
  if(!p||p.matchId!==loc.route.slice(7)||!['q','r','b','n'].includes(target.dataset.piece))return;
  pendingPromotion=null;selected=null;
  try{playMove(ctx.store,p.matchId,p.from,p.to,target.dataset.piece);void playRealOpponentTurn(ctx.store,p.matchId);}
  catch{ctx.refresh();}
  return;
 }
 if(action==='square'){const matchId=loc.route.slice(7),match=ctx.store.get().matches.find(m=>m.id===matchId),game=loadGame(match),sq=target.dataset.square;if(game.turn()!=='w'||match.status!=='active'||isD23ChessLesson(match)&&!match.lesson?.openingDone)return;if(selected){
  const promotion=game.moves({square:selected,verbose:true}).some(m=>m.to===sq&&m.promotion);
  if(promotion){pendingPromotion={matchId,from:selected,to:sq};ctx.refresh();return;}
  try{playMove(ctx.store,matchId,selected,sq);selected=null;pendingPromotion=null;void playRealOpponentTurn(ctx.store,matchId);return;}
  catch{selected=null;pendingPromotion=null;}
 }if(game.get(sq)?.color==='w'){selected=sq;ctx.refresh();}else ctx.refresh();}}
export function submit(form,ctx){if(form.dataset.form!=='chess-chat')return;const id=form.dataset.id,text=new FormData(form).get('text');const accepted=postMatchMessage(ctx.store,id,text);form.reset();if(accepted)setTimeout(()=>{void replyToMatch(ctx.store,id).catch(()=>{});},700);}
