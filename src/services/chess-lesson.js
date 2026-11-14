// D23 authored chess teaching content. The existing match/PGN remains the only
// source of board state; this module owns no chess engine or story clock.
import {CHAT_LIFECYCLE_POLICY} from './messaging/lifecycle/engine.js';
export const D23_CHESS_INVITATION='s55-d23-chess-invite';
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
const LISTEN=[
 '上課的時候要認真聽，nya。',
 '我還沒講完。這就開始走神了？',
 '先聽我說完，再輪到你發問。',
 '注意力集中一點。我可不打算講第二遍。',
 '才教到這裡，就這麼坐不住？'
];
const OTHER=[
 [/親|亲|抱抱|喜歡你|喜欢你|愛你|爱你|kiss/i,'想得倒美。先好好下棋。'],
 [/累|睏|困|睡|休息/,'這就累了？下完這局再休息。'],
 [/吃|飯|饭|餓|饿|早餐|午餐|晚餐|好喝/,'你是在跟我下棋，還是在研究晚餐？'],
 [/不想下|不玩了|不下了/,'才走幾步就想跑？要結束就自己認輸。'],
 [/^(?:嗨|你好|在嗎|在吗|hello|hi)[！!。.]?$/i,'人就在棋盤另一邊。專心。']
];
const CHESS_WORDS=/棋|對局|对局|棋盤|棋盘|走法|走哪|怎麼走|怎么走|下一步|這步|这步|落子|開局|开局|棄兵|弃兵|吃子|升變|升变|過路兵|过路兵|易位|將軍|将军|將死|将死|逼和|和棋|認輸|认输|國王|国王|皇后|后翼|棋子|[兵馬马象車车后王]|[a-h][1-8]|checkmate|stalemate|castle|bishop|knight|queen|rook|pawn/i;
const FOLLOWUP=/什麼意思|什么意思|為什麼|为什么|不懂|沒懂|没懂|再講|再讲|你剛才|你刚才|你剛剛|你刚刚/;
export const isChessRelated=text=>CHESS_WORDS.test(String(text||''))||FOLLOWUP.test(String(text||''));
const stableId=(match,key)=>'d23-chess-'+match.id+'-'+key;
export function appendChessTutorLine(match,text,clock,key){
 const id=stableId(match,key);
 if((match.chat||[]).some(m=>m.id===id))return false;
 (match.chat??=[]).push({id,from:'tai',text,time:clock,authored:true,mode:'text'});
 return true;
}
export function beginD23ChessLesson(match,clock){
 if(!isD23ChessLesson(match)||match.lesson?.started)return false;
 match.lesson={started:true,teaching:true,seenPieces:[],reminderCount:0,reminderAtPly:-1,finishedNotified:false,
  openingIndex:0,openingNextAt:null,openingDone:false};
 // Start only the lesson state here. The established Story55 tick delivers
 // the actual lines after the accepted chess board is open, never beforehand.
 return true;
}
/**
 * Existing Story55 heartbeat owns delivery; no second timer or message store.
 * One bubble is committed per due tick, with a stable ID across reloads.
 */
export function tickD23ChessLesson(s,now=Date.now()){
 const nav=s.nav?.current;
 if(nav?.appId!=='chess'||!String(nav.route||'').startsWith('/match/'))return false;
 const id=nav.route.slice('/match/'.length);
 const match=s.matches?.find(m=>m.id===id);
 if(!isD23ChessLesson(match)||match.status!=='active')return false;
 if(!match.lesson?.started)beginD23ChessLesson(match,s.clock);
 const lesson=match.lesson;
 // Previously accepted matches already contained every opening line. Never
 // replay those messages when loading an earlier save.
 if(!Number.isInteger(lesson.openingIndex)){
  lesson.openingIndex=OPENING.filter((_,i)=>(match.chat||[]).some(m=>m.id===stableId(match,'opening-'+i))).length;
 }
 if(lesson.openingIndex>=OPENING.length){
  if(lesson.openingDone)return false;
  lesson.openingDone=true;lesson.openingNextAt=null;lesson.teaching=false;
  return true;
 }
 if(!Number.isFinite(lesson.openingNextAt)){
  lesson.openingNextAt=now+Math.max(1100,CHAT_LIFECYCLE_POLICY.initialDelayMs);
  return true;
 }
 if(now<lesson.openingNextAt)return false;
 const line=lesson.openingIndex;
 appendChessTutorLine(match,OPENING[line],s.clock,'opening-'+line);
 lesson.openingIndex=line+1;
 lesson.openingNextAt=line+1<OPENING.length?now+Math.max(3100,CHAT_LIFECYCLE_POLICY.pauseMs):null;
 if(line+1===OPENING.length){lesson.openingDone=true;lesson.teaching=false;}
 return true;
}
export function noteD23PlayerMove(match,move,clock,game){
 if(!isD23ChessLesson(match)||match.status!=='active')return;
 beginD23ChessLesson(match,clock);
 const lesson=match.lesson;
 if(!lesson.seenPieces.includes(move.piece)){
  lesson.seenPieces.push(move.piece);
  lesson.teaching=true;
  appendChessTutorLine(match,PIECE_LESSONS[move.piece],clock,'piece-'+move.piece);
 }else lesson.teaching=false;
 lesson.reminderAtPly=-1;
 const ply=match.history.length;
 if(game.isCheck()&&!game.isCheckmate())appendChessTutorLine(match,'將軍。這一次你把我的王逼得必須先應對。記住，這還不等於將死。',clock,'check-white-'+ply);
 if(move.flags?.includes('e'))appendChessTutorLine(match,'剛才那步叫「吃過路兵」。兵剛從起點跨兩格，對手緊接著可以像它只走一格那樣斜吃。',clock,'enpassant-'+ply);
 if(move.promotion)appendChessTutorLine(match,'你把兵送到底線了。升變可以選后、車、象或馬，不一定非要選后。',clock,'promotion-'+ply);
 if(move.flags?.includes('k')||move.flags?.includes('q'))appendChessTutorLine(match,'這是王車易位。王與車同一步移動，但中間要暢通，王也不能穿過受攻擊的格子。',clock,'castle-'+ply);
}
export function noteD23OpponentMove(match,move,clock,game){
 if(!isD23ChessLesson(match)||match.status!=='active')return;
 const ply=match.history.length;
 if(game.isCheck()&&!game.isCheckmate())appendChessTutorLine(match,'將軍了，nya。想想怎樣把你的王從威脅裡救出來。',clock,'check-black-'+ply);
 else if(move.captured)appendChessTutorLine(match,'這枚棋子我就收下了。下次先看看它是不是被盯上。',clock,'capture-black-'+ply);
}
export function finishD23ChessLesson(match,clock,game){
 if(!isD23ChessLesson(match))return false;
 beginD23ChessLesson(match,clock);
 if(match.lesson.finishedNotified)return false;
 match.lesson.finishedNotified=true;
 match.lesson.teaching=false;
 let texts;
 if(game.isCheckmate())texts=match.result==='player-win'
   ?['將死了。這回算你贏。','至少你學會先看棋盤了，別太得意。']
   :['這就是將死。你的王沒有任何合法的辦法脫身。','現在知道為什麼要一直留意王的安全了？'];
 else if(game.isStalemate())texts=['看到了嗎？你的王沒被將軍，卻無棋可走。','這是逼和，不是我贏，也不是你贏。'];
 else texts=['這局是和棋。不是所有棋都會分出勝負。','回頭看看剛才丟過的棋子，你會學得更快。'];
 texts.forEach((text,i)=>appendChessTutorLine(match,text,clock,'ending-'+i));
 return true;
}
export function noteD23HangingPiece(match,hanging,clock){
 if(!isD23ChessLesson(match)||match.status!=='active')return false;
 const exposed=(hanging||[]).find(p=>p.owner==='熙蒙');
 if(!exposed)return false;
 // Socratic first-level hint: the player must identify and save the piece.
 return appendChessTutorLine(match,'有枚棋子現在被盯上了，還沒人護著。你確定不先想想？',clock,'exposed-'+match.history.length);
}
export function resignD23ChessLesson(match,clock){
 if(!isD23ChessLesson(match))return false;
 beginD23ChessLesson(match,clock);
 if(match.lesson.finishedNotified)return false;
 match.lesson.finishedNotified=true;
 match.lesson.teaching=false;
 ['這就認輸了？','我還以為你至少能讓我費點力氣。','行了，下課。下次先看好你的王，nya。']
  .forEach((text,i)=>appendChessTutorLine(match,text,clock,'resigned-'+i));
 return true;
}
export function prewrittenChessReply(match,text,facts){
 if(!isD23ChessLesson(match))return '先看盤面，再落子。';
 const value=String(text||'').trim(),lesson=match.lesson||{};
 if(!isChessRelated(value)){
  if(lesson.teaching){
   if(lesson.reminderAtPly===(match.history||[]).length)return null;
   lesson.reminderAtPly=(match.history||[]).length;
   return LISTEN[(lesson.reminderCount++||0)%LISTEN.length];
  }
  return OTHER.find(([re])=>re.test(value))?.[1]||'其他的事待會再說。先好好下棋。';
 }
 if(/(?:后翼|後翼)(?:棄兵|弃兵)|Queen['’]?s Gambit/i.test(value))return '後翼棄兵通常從白方 d4、接著 c4 開始，目的在爭奪中心。名字裡有棄兵，不代表你該隨便把兵送掉。';
 if(/馬|马|knight/i.test(value))return PIECE_LESSONS.n;
 if(/車|车|rook/i.test(value))return PIECE_LESSONS.r;
 if(/象|bishop/i.test(value))return PIECE_LESSONS.b;
 if(/王車易位|王车易位|castle|易位/i.test(value))return '王車易位要王和車都還沒移動過，兩者中間沒有其他棋子；王不能正在被將軍，也不能穿過或落在受攻擊的格子上。';
 if(/王|king|國王|国王/i.test(value)&&!/后|皇后/.test(value))return PIECE_LESSONS.k;
 if(/后|皇后|queen/i.test(value))return PIECE_LESSONS.q;
 if(/兵|pawn/i.test(value))return PIECE_LESSONS.p;
 if(/逼和|stalemate/i.test(value))return '逼和就是輪到一方走棋時，王沒有被將軍，但完全沒有合法著法。這局算和棋。';
 if(/將死|将死|怎麼贏|怎么赢|怎麼贏|checkmate/i.test(value))return '王被將軍，而且沒有任何合法的走法能解圍，就是將死。把對手將死，才是在棋盤上贏下來。';
 if(/將軍|将军|check/i.test(value))return '將軍只表示王現在受攻擊。可以移王、擋住攻擊，或吃掉攻擊的棋子；前提是那一步真的合法。';
 if(/你剛|你刚|上一步|剛才|刚才/.test(value)&&facts.lastMove)return '剛才是 '+facts.lastMove.actor+'走的 '+facts.lastMove.san+'，從 '+facts.lastMove.from+' 到 '+facts.lastMove.to+'。棋譜都在這裡。';
 if(facts.checkmate)return '棋局已經將死，沒有合法的下一步了。';
 if(facts.stalemate)return '這是逼和，沒有合法著法，結果只能是平局。';
 if(facts.turn==='b')return '輪到我走了。等我落完子，你再看看盤面。';
 const picks=(facts.recommendations||facts.legalMoves||[]).slice(0,3).map(m=>m.san).join('、');
 return picks?'先看看你能走的棋，例如 '+picks+'。這些只是合法選項，不代表每一步都一樣好。':'先看看你的王是不是被將軍。';
}
export function predeterminedChessReply(match,text,facts){
 if(!isD23ChessLesson(match))return null;
 if(!isChessRelated(text))return prewrittenChessReply(match,text,facts);
 return null;
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
