// D23 authored chess teaching content. The existing match/PGN remains the only
// source of board state; this module owns no chess engine or story clock.
import {chessReaction} from './chess-dialogue.js';
import {completeNode,nodeStatus} from './story55/state.js';
import {CHAT_LIFECYCLE_POLICY} from './messaging/lifecycle/engine.js';
export const D23_CHESS_INVITATION='s55-d23-chess-invite';
const D23_POSTGAME_FAREWELL=[
 '我還有點事，得下線了。',
 '下次有機會再切磋，nya。'
];
// These bubbles share the existing chess chat and Story55 delivery heartbeat.
export function beginD23ChessPostgame(match,clock){
 if(!isD23ChessLesson(match)||match.status!=='finished')return false;
 beginD23ChessLesson(match,clock);
 if(match.lesson.postgame)return false;
 match.lesson.finishedNotified=true;match.lesson.teaching=false;
 match.lesson.openingDone=true;match.lesson.openingIndex=OPENING.length;
 match.lesson.outbox=(match.lesson.outbox||[]).filter(line=>
  line.id?.endsWith('capture-white-'+match.history.length)||
  line.id?.endsWith('capture-black-'+match.history.length));
 match.lesson.outboxNextAt=null;
 match.lesson.postgame={phase:'intro',rounds:0,introQueued:false,requestedClose:false,closed:false};
 return true;
}
export function queueD23PostgameFarewell(match,clock){
 const pg=match.lesson?.postgame;
 if(!isD23ChessLesson(match)||!pg||pg.closed||pg.phase==='closing')return false;
 pg.phase='closing';pg.requestedClose=true;
 D23_POSTGAME_FAREWELL.forEach((text,i)=>enqueueChessTaiReply(match,text,clock,'postgame-farewell-'+i));
 return true;
}
export function requestD23PostgameFarewell(match,clock){
 if(!isD23ChessLesson(match)||match.status!=='finished')return false;
 beginD23ChessPostgame(match,clock);
 const pg=match.lesson.postgame;
 if(pg.closed)return true;
 pg.requestedClose=true;
 if(pg.phase==='chat')queueD23PostgameFarewell(match,clock);
 return true;
}

export const isD23ChessLesson=match=>match?.invitationId===D23_CHESS_INVITATION;
const OPENING=[
 '先講規矩。你執白，我執黑，白棋先走，之後輪流各走一步。自己的王不能留在被攻擊的位置。',
 '王受到攻擊叫「將軍」；如果沒有任何合法的辦法化解，就是「將死」。想在棋盤上贏我，就得把我的王將死。',
 '還有「逼和」：王沒有被將軍，卻一枚合法的棋都走不了，算平局。現在，挑枚棋子試試。'
];
const PIECE_LESSONS={
 p:'兵通常只能向前走一格，第一次可以走兩格；吃子卻要斜前方。走到底線還能升變，別小看它。',
 n:'馬走「日」字：先兩格，再轉一格。它還能跳過其他棋子，不像你，繞個彎都要問我。',
 b:'象只走斜線，路上不能有其他棋子擋著。它永遠留在同一種顏色的格子上。',
 r:'車沿著橫線或直線走，走多少格都可以，但不能越過擋路的棋子。明白？',
 q:'后既能直走，也能斜走，威力最大。但如果你只靠它橫衝直撞，我很快就能收下。',
 k:'王平時每次只能走一格，不能走進受攻擊的位置。有條件時可以和車一起「王車易位」，把王藏得安全一點。'
};
const PIECE_VARIANTS={
 p:[PIECE_LESSONS.p,'兵往前走一格，剛出發時可以走兩格。吃子得斜著來，別把這兩件事弄反了。走到底還能升變。','這是兵。平常向前一格，第一次可走兩格；要吃子就斜前方一格，到底線可以升變。'],
 n:[PIECE_LESSONS.n,'馬先走兩格再拐一格，也就是「日」字。中間擋著棋子也能跳過去。這回記住了？','馬走「日」字，兩格再轉一格，可以跳子。不是只能往前，別自己給它加規矩。'],
 b:[PIECE_LESSONS.b,'象走斜線，幾格都行，但不能越過別的棋子。你看，它始終踩著同一種顏色。','看斜線。象只能沿它走，路上有棋子就過不去，一輩子也換不了格子的顏色。'],
 r:[PIECE_LESSONS.r,'車走直線。橫著、豎著，幾格都行；有人擋著就不能穿過去。','這枚車只能橫走或豎走，距離不限。路得空著，別把它當馬用。'],
 q:[PIECE_LESSONS.q,'后能橫走、豎走，也能斜走。不能跳子。是很厲害，但也經不起你亂送。','后走直線和斜線，格數不限，路上不能擋子。先護好它，再想著吃我的。'],
 k:[PIECE_LESSONS.k,'王每次走一格，周圍哪個方向都行，但不能走到受攻擊的格子裡。王車易位另有條件，別急。','王只能挪一格，還不能挪進別人的攻擊範圍。想王車易位也得滿足條件，這枚最要緊，護好了。']
};
const pieceRule=(match,piece)=>chessReaction(match,'rule-'+piece,{},PIECE_VARIANTS[piece]);
const CHESS_WORDS=/棋|對局|对局|棋盤|棋盘|走法|走哪|怎麼走|怎么走|下一步|這步|这步|落子|開局|开局|棄兵|弃兵|吃子|升變|升变|過路兵|过路兵|易位|將軍|将军|將死|将死|逼和|和棋|認輸|认输|國王|国王|皇后|后翼|棋子|[兵馬马象車车后王]|[a-h][1-8]|checkmate|stalemate|castle|bishop|knight|queen|rook|pawn/i;
const FOLLOWUP=/什麼意思|什么意思|為什麼|为什么|不懂|沒懂|没懂|再講|再讲|你剛才|你刚才|你剛剛|你刚刚/;
export const isChessRelated=text=>CHESS_WORDS.test(String(text||''))||FOLLOWUP.test(String(text||''));

const stableId=(match,key)=>'d23-chess-'+match.id+'-'+key;
export const CHESS_PIECE_NAMES=Object.freeze({p:'兵',n:'馬',b:'象',r:'車',q:'后',k:'王'});
export const chessPieceName=piece=>CHESS_PIECE_NAMES[piece]||'棋子';
// One saved outbox per existing match. The existing Story55 heartbeat is its
// sole delivery clock, and the persisted chat remains the only visible history.
export function enqueueChessTaiReply(match,text,clock,key,{source='preset',boardPgn=null,sourceMessageId=null}={}){
 if(!isD23ChessLesson(match))return false;
 beginD23ChessLesson(match,clock);
 const id=stableId(match,key),lesson=match.lesson;
 if((match.chat||[]).some(m=>m.id===id)||(lesson.outbox||[]).some(m=>m.id===id))return false;
 (lesson.outbox??=[]).push({id,from:'tai',text,time:clock,authored:source!=='ai',aiGenerated:source==='ai',mode:'text',boardPgn,sourceMessageId});
 return true;
}
export function appendChessTutorLine(match,text,clock,key){
 if(isD23ChessLesson(match)&&!String(key).startsWith('opening-'))return enqueueChessTaiReply(match,text,clock,key);
 const id=stableId(match,key);
 if((match.chat||[]).some(m=>m.id===id))return false;
 (match.chat??=[]).push({id,from:'tai',text,time:clock,authored:true,mode:'text'});
 return true;
}
export function beginD23ChessLesson(match,clock){
 if(!isD23ChessLesson(match)||match.lesson?.started)return false;
 match.lesson={started:true,teaching:true,seenPieces:[],reminderCount:0,reminderAtPly:-1,finishedNotified:false,
  openingIndex:0,openingNextAt:null,openingDone:false,outbox:[],outboxNextAt:null};
 // Start only the lesson state here. The established Story55 tick delivers
 // the actual lines after the accepted chess board is open, never beforehand.
 return true;
}
// Real-time message delivery must not depend on advancing the game clock or
// unrelated App updates. The existing phone message heartbeat asks this gate.
// Don't interrupt a reply the human is still typing. Keep the shared queue.
function chessComposerBusy(){
 if(typeof document==='undefined')return false;
 const input=document.querySelector('.match-view .chess-chat-form input[name="text"]');
 return !!input&&document.activeElement===input&&input.value.trim().length>0;
}
export function chessLessonDue(s,now=Date.now()){
 const nav=s.nav?.current;
 if(!s.unlocked||nav?.appId!=='chess'||!String(nav.route||'').startsWith('/match/')||chessComposerBusy())return false;
 const match=s.matches?.find(m=>m.id===nav.route.slice(7));
 if(!isD23ChessLesson(match))return false;
 const lesson=match.lesson;
 if(!lesson?.started)return true;
 if(match.status==='active'&&!lesson.openingDone&&(lesson.openingIndex||0)<OPENING.length)
  return !Number.isFinite(lesson.openingNextAt)||now>=lesson.openingNextAt;
 return !!lesson.outbox?.length&&(!Number.isFinite(lesson.outboxNextAt)||now>=lesson.outboxNextAt);
}
/**
 * Existing Story55 heartbeat owns delivery; no second timer or message store.
 * One bubble is committed per due tick, with a stable ID across reloads.
 */
export function tickD23ChessLesson(s,now=Date.now()){
 const nav=s.nav?.current;
 if(nav?.appId!=='chess'||!String(nav.route||'').startsWith('/match/')||chessComposerBusy())return false;
 const id=nav.route.slice('/match/'.length);
 const match=s.matches?.find(m=>m.id===id);
 if(!isD23ChessLesson(match))return false;
 if(!match.lesson?.started)beginD23ChessLesson(match,s.clock);
 const lesson=match.lesson;
 // Retire the previous auto-exit flag even in saved, finished matches.
 delete lesson.autoExitWhenDelivered;delete lesson.exitAfterAt;
 // Older saves with an already-displayed introduction never replay it.
 if(!Number.isInteger(lesson.openingIndex)){
  lesson.openingIndex=OPENING.filter((_,i)=>(match.chat||[]).some(m=>m.id===stableId(match,'opening-'+i))).length;
 }
 if(match.status==='active'&&!lesson.openingDone&&lesson.openingIndex<OPENING.length){
  if(!Number.isFinite(lesson.openingNextAt)){
   lesson.openingNextAt=now+Math.max(1100,CHAT_LIFECYCLE_POLICY.initialDelayMs);
   return true;
  }
  if(now<lesson.openingNextAt)return false;
  const index=lesson.openingIndex;
  appendChessTutorLine(match,OPENING[index],s.clock,'opening-'+index);
  lesson.openingIndex=index+1;
  lesson.openingNextAt=index+1<OPENING.length?now+CHAT_LIFECYCLE_POLICY.pauseMs:null;
  if(index+1===OPENING.length){lesson.openingDone=true;lesson.teaching=false;}
  return true;
 }
 if(!lesson.openingDone){lesson.openingDone=true;lesson.openingNextAt=null;}
 const pending=lesson.outbox||[];
 if(pending.length){
  if(!Number.isFinite(lesson.outboxNextAt)){
   lesson.outboxNextAt=now+Math.max(1200,CHAT_LIFECYCLE_POLICY.initialDelayMs);
   return true;
  }
  if(now<lesson.outboxNextAt)return false;
  const line=pending.shift();
  if(line.boardPgn!==null&&line.boardPgn!==undefined&&line.boardPgn!==match.pgn){
   lesson.outboxNextAt=pending.length?now+1200:null;return true;
  }
  line.time=s.clock;
  if(!(match.chat||[]).some(m=>m.id===line.id))(match.chat??=[]).push(line);
  lesson.outboxNextAt=pending.length?now+CHAT_LIFECYCLE_POLICY.pauseMs:null;
  if(!pending.length){
   lesson.teaching=false;
   const pg=lesson.postgame;
   if(pg?.phase==='intro-delivering'||pg?.phase==='responding'){
    if(pg.requestedClose||pg.rounds>=3)queueD23PostgameFarewell(match,s.clock);
    else pg.phase='chat';
   }else if(pg?.phase==='closing'&&!pg.closed){
    pg.phase='closed';pg.closed=true;
    // One native checkpoint, completed only after the goodbye was actually shown.
    if(nodeStatus(s,'d23-chess-finish').state==='ready')completeNode(s,'d23-chess-finish');
   }
  }
  return true;
 }
 return false;
}
export function noteD23PlayerMove(match,move,clock,game){
 if(!isD23ChessLesson(match)||match.status!=='active')return;
 beginD23ChessLesson(match,clock);
 const lesson=match.lesson;
 if(!lesson.seenPieces.includes(move.piece)){
  lesson.seenPieces.push(move.piece);
  lesson.teaching=true;
  appendChessTutorLine(match,pieceRule(match,move.piece),clock,'piece-'+move.piece);
 }else lesson.teaching=false;
 lesson.reminderAtPly=-1;
 const ply=match.history.length;
 if(move.captured)appendChessTutorLine(match,chessReaction(match,'captureWhite',{piece:chessPieceName(move.captured)}),clock,'capture-white-'+ply);
 if(game.isCheck()&&!game.isCheckmate())appendChessTutorLine(match,chessReaction(match,'checkWhite'),clock,'check-white-'+ply);
 if(move.flags?.includes('e'))appendChessTutorLine(match,chessReaction(match,'enpassant'),clock,'enpassant-'+ply);
 if(move.promotion)appendChessTutorLine(match,chessReaction(match,'promotion'),clock,'promotion-'+ply);
 if(move.flags?.includes('k')||move.flags?.includes('q'))appendChessTutorLine(match,chessReaction(match,'castle'),clock,'castle-'+ply);
}
export function noteD23OpponentMove(match,move,clock,game){
 if(!isD23ChessLesson(match)||match.status!=='active')return;
 const ply=match.history.length;
 if(move.captured)appendChessTutorLine(match,chessReaction(match,'captureBlack',{piece:chessPieceName(move.captured)}),clock,'capture-black-'+ply);
 if(game.isCheck()&&!game.isCheckmate())appendChessTutorLine(match,chessReaction(match,'checkBlack'),clock,'check-black-'+ply);
}
export function finishD23ChessLesson(match,clock,game){
 return beginD23ChessPostgame(match,clock);
}
export function noteD23HangingPiece(match,hanging,clock){
 if(!isD23ChessLesson(match)||match.status!=='active')return false;
 const last=match.history?.at(-1);
 if(!last||last.by!=='player')return false;
 const options=(hanging||[]).filter(p=>p.owner==='熙蒙'&&p.piece!=='p');
 // Only warn on clear material danger, not every imperfect strategic move:
 // a newly moved piece left undefended, or a high-value exposed major piece.
 const exposed=options.find(p=>p.square===last.to)||
  options.find(p=>['q','r'].includes(p.piece)&&!(match.lesson?.warnedThreats||[]).includes(p.square+':'+p.piece));
 if(!exposed)return false;
 const token=exposed.square+':'+exposed.piece;
 const seen=(match.lesson.warnedThreats??=[]);
 if(seen.includes(token))return false;
 seen.push(token);
 const name=chessPieceName(exposed.piece);
 return appendChessTutorLine(match,chessReaction(match,'danger',{piece:name}),clock,'exposed-'+match.history.length);
}
export function resignD23ChessLesson(match,clock){
 return beginD23ChessPostgame(match,clock);
}
export function prewrittenChessReply(match,text,facts){
 if(!isD23ChessLesson(match))return '先看盤面，再落子。';
 const value=String(text||'').trim(),lesson=match.lesson||{};
 if(!isChessRelated(value)){
  if(lesson.teaching){
   if(lesson.reminderAtPly===(match.history||[]).length)return null;
   lesson.reminderAtPly=(match.history||[]).length;
   return chessReaction(match,'listen');
  }
  const topics=[
   [/親|亲|抱抱|喜歡你|喜欢你|愛你|爱你|kiss/i,'affection'],
   [/讓讓|让让|讓我|让我|放水|饒|饶|求你/,'mercy'],
   [/不想下|不玩了|不下了/,'quit'],
   [/累|睏|困|睡|休息/,'tired'],
   [/吃|飯|饭|餓|饿|早餐|午餐|晚餐|好喝/,'food'],
   [/厲害|厉害|好強|好强|真強|真强/,'praise'],
   [/氣死|气死|可惡|可恶|討厭|讨厌|煩死|烦死/,'frustration'],
   [/^(嗨|你好|在嗎|在吗|hello|hi)[！!。.]?$/i,'greeting'],
   [/^(好|好的|嗯|知道了|懂了|明白了|哦|喔|ok)[！!。.]?$/i,'acknowledgement']
  ];
  return chessReaction(match,topics.find(([re])=>re.test(value))?.[1]||'other');
 }
 if(/看不懂|看不明白|不太懂|完全不懂|我不懂|沒看懂|没看懂|不會下|不会下/i.test(value)){
  const last=facts.lastMove;
  if(!last)return chessReaction(match,'noBoard');
  if(last.captured){
   const attacked=chessPieceName(last.captured),by=chessPieceName(last.piece);
   return (last.actor==='Ouroboros'?'你剛才丟了':'我剛才丟了')+attacked+'，'+by+'在 '+last.to+' 把它吃掉了。先看看它們之間的走法。';
  }
  return (last.actor==='Ouroboros'?'我剛才':'你剛才')+'把'+chessPieceName(last.piece)+'從 '+last.from+' 走到 '+last.to+'。先看這枚棋子攻擊哪些格子。哪裡不懂，直接問。';
 }
 if(needsChessAnalysis(value)&&facts.lastMove?.captured){
  const last=facts.lastMove,who=last.actor==='Ouroboros'?'我吃掉的是你的':'你吃掉的是我的';
  return who+chessPieceName(last.captured)+'。'+chessPieceName(last.piece)+'從 '+last.from+' 到 '+last.to+'，這是剛才實際發生的那一步。'+pieceRule(match,last.piece);
 }
 if(/(?:王翼)(?:棄兵|弃兵)|King['’]?s Gambit/i.test(value))return '王翼棄兵是白方先走 e4、黑方 e5，然後白方推 f4。黑方可以吃也可以不吃，白方換取主動權，但王也更容易暴露。';
 if(/王車易位|王车易位|castle|易位/i.test(value))return chessReaction(match,'castle');
 if(/馬|马|knight/i.test(value))return pieceRule(match,'n');
 if(/車|车|rook/i.test(value))return pieceRule(match,'r');
 if(/象|bishop/i.test(value))return pieceRule(match,'b');
 if(/王|king|國王|国王/i.test(value)&&!/后|皇后/.test(value))return pieceRule(match,'k');
 if(/后|皇后|queen/i.test(value))return pieceRule(match,'q');
 if(/兵|pawn/i.test(value))return pieceRule(match,'p');
 if(/逼和|stalemate/i.test(value))return '逼和就是輪到一方走棋時，王沒有被將軍，但完全沒有合法著法。這局算和棋。';
 if(/將死|将死|怎麼贏|怎么赢|怎麼贏|checkmate/i.test(value))return '王被將軍，而且沒有任何合法的走法能解圍，就是將死。把對手將死，才是在棋盤上贏下來。';
 if(/將軍|将军|check/i.test(value))return '將軍只表示王現在受攻擊。可以移王、擋住攻擊，或吃掉攻擊的棋子；前提是那一步真的合法。';
 if(/你剛|你刚|上一步|剛才|刚才/.test(value)&&facts.lastMove)return '剛才是 '+facts.lastMove.actor+'走的 '+facts.lastMove.san+'，從 '+facts.lastMove.from+' 到 '+facts.lastMove.to+'。棋譜都在這裡。';
 if(facts.checkmate)return '棋局已經將死，沒有合法的下一步了。';
 if(facts.stalemate)return '這是逼和，沒有合法著法，結果只能是平局。';
 if(facts.turn==='b')return chessReaction(match,'waiting');
 const suggestion=facts.recommendations?.[0]||facts.legalMoves?.[0];
 if(/哪一步|怎麼走|怎么走|走哪|走什麼|走什么|給點提示|给点提示|下一步/i.test(value)&&suggestion){
  const move=facts.legalMoves?.find(m=>m.san===suggestion.san)||suggestion;
  return '你可以先看看'+chessPieceName(move.piece)+'從 '+move.from+' 到 '+move.to+' 這一步。它是合法的，但值不值得下，還要看看我的反擊。';
 }
 if(facts.lastMove)return chessReaction(match,'other');
 return '先別急著猜。我們從棋盤中央開始看，兵和馬的路你還記得嗎？';
}
// Board interpretation is the narrow AI route; plain rule questions stay authored.
export function needsChessAnalysis(text){
 const value=String(text||'').trim();
 if(/吃飯|吃饭|晚餐|午餐|早餐|餓|饿|親親|亲亲|抱抱|想你|愛我|爱我|喜歡我|喜欢我/.test(value)&&!/(?:棋|[兵馬马象車车后王]|[a-h][1-8])/.test(value))return false;
 return /看不懂|看不明白|不太懂|完全不懂|沒看懂|没看懂|沒懂|没懂|再講|再讲|我不懂|不會下|不会下|為什麼|为什么|怎麼會|怎么会|憑什麼|凭什么|怎麼贏你|怎么赢你|怎麼下贏|怎么下赢|分析|局勢|局势|現在|现在|這步|这步|這個|这个|這裡|这里|那步|剛才|刚才|你剛|你刚|上一步|下一步|走哪|哪一步|走什麼|走什么|給點提示|给点提示|怎麼走比較|怎么走比较|能不能吃|可以吃|為何|为何|[a-h][1-8]/i.test(value)
  ||/^(?:怎麼走|怎么走|怎麼下|怎么下|怎麼辦|怎么办)[？?。!！]*$/.test(value);
}
export function predeterminedChessReply(match,text,facts){
 if(!isD23ChessLesson(match))return null;
 if(needsChessAnalysis(text))return null;
 return prewrittenChessReply(match,text,facts);
}
// The LLM may explain a square, but may only recommend an actual legal SAN.
// A dubious generated recommendation falls back to the local facts.
export function chessReplyUsesLegalMoves(text,facts){
 const legal=new Set((facts.legalMoves||[]).map(m=>m.san.replace(/[+#]$/,'')));
 const re=/(?:(?:建議|建议|推薦|推荐)(?:走|下)?|可以走|不如走|試試|试试|下一步走|直接走)\s*[：:「『“"']?\s*(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-9](?:=[QRBN])?[+#]?)/gi;
 for(const found of String(text||'').matchAll(re)){
  const san=found[1].replace(/[+#]$/,'');
  if(!legal.has(san))return false;
 }
 return true;
}
