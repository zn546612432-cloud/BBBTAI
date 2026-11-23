// Read-only dialogue policy derived from the existing NoApp save and taiBond.
// The program grants expression permissions; DeepSeek chooses the actual words.
// No duplicate relationship counter, scheduler, or parallel message history.
import {taiRecognized} from '../story55/state.js';
import {taiBond} from './relationship-bond.js';
import {taiCanonicalMilestones} from './worldbook/plot-memory.js';

const clean=value=>String(value||'').normalize('NFKC').trim().replace(/^[\s，,。！!？?「」“”]+|[\s，,。！!？?「」“”]+$/g,'');
const address=value=>clean(value).replace(/^(?:熙泰|陳熙泰|陈熙泰|nya)[，,、\s]*/i,'');
const playerAffection=/^(?:我|我也|其實我|其实我|我真的|我很)?(?:好)?(?:喜歡你|喜欢你|愛你|爱你|想你|想念你|想見你|想见你|好想你)(?:了|呢|呀|啊|喔|哦)?$/u;
const playerExplicit=/(?:^|[，,、\s])(?:我|我也|其實我|其实我)(?:真的|很)?(?:喜歡你|喜欢你|愛你|爱你)(?:[。！!]|$)/u;
const taiAffection=/(?:我|我也|其實我|其实我)(?:真的|很|也|挺)?(?:喜歡你|喜欢你|想你|想念你|想見你|想见你)/u;
const taiExplicit=/(?:我|我也|其實我|其实我)(?:真的|很|也|挺)?(?:喜歡你|喜欢你)/u;
const playerReject=/(?:我不(?:喜歡|喜欢)你|我不[愛爱]你|我對你沒感覺|我对你没感觉|不要[再]?向我表白|[別别]再(?:說说|讲).*愛我|我們[只]?是兄弟|我们[只]?是兄弟)/u;
const taiDisclaim=/(?:別自戀|别自恋|才怪|開玩笑|开玩笑|我不(?:喜歡|喜欢)你|我不[愛爱]你)/u;
const directLove=/(?:[我俺](?:也|真的|很|一直|永遠|永远)?[愛爱]你|(?:我|俺)對你的愛|(?:我|俺)对你的爱|i\s+love\s+you)/iu;
const directLike=/(?:[我俺](?:也|真的|很|其實|其实|挺)?(?:喜歡|喜欢)你|(?:我|俺)對你有感覺|(?:我|俺)对你有感觉)/u;
const realMessage=(m,day)=>m&&m.actual!==false&&!m.demo&&!m.authoredPending&&!m.testOnly&&
 Number.isInteger(m.day)&&m.day<=day&&m.day>=1&&['me','tai'].includes(m.from)&&
 m.kind!=='call'&&m.kind!=='image'&&m.kind!=='app_invitation'&&
 typeof (m.voiceCaption||m.text)==='string';

function observedNoAppTurns(s){
 const raw=s?.content?.conversations?.noapp?.find(x=>x.id==='tai')?.messages||[];
 const rows=raw.filter(m=>realMessage(m,s.day)).map(m=>({
  speaker:m.from,text:address(m.voiceCaption||m.text),day:m.day,id:m.id
 }));
 // Only speech already stored on an ENDED phone call is evidence, never
 // text pending playback or unplayed script steps.
 for(const m of raw.filter(m=>m.kind==='call'&&m.callStatus==='ended'&&m.day<=s.day&&
  m.actual!==false&&!m.demo&&typeof m.transcript==='string')){
  for(const [i,line] of m.transcript.split('\n').entries()){
   const match=line.match(/^(?:\[\d\d:\d\d\]\s*)?(熙蒙|熙泰)[：:]\s*(.*)$/);
   if(match)rows.push({speaker:match[1]==='熙蒙'?'me':'tai',text:address(match[2]),day:m.day,id:m.id+':'+i});
  }
 }
 return rows;
}
export function taiRelationshipDirector(s,{input='',initiative=false}={}){
 const known=taiRecognized(s),bond=taiBond(s),rows=known?observedNoAppTurns(s):[];
 const player=[],tai=[],playerExplicitDays=new Set(),taiExplicitDays=new Set(),meaningfulDays=new Set(),rejections=[];
 for(const [i,row] of rows.entries()){
  const t=row.text;
  if(row.speaker==='me'&&t.length>=6)meaningfulDays.add(row.day);
  if(row.speaker==='me'){
   if(playerReject.test(t))rejections.push(i);
   // "你是不是喜歡我？", "說你愛我", scripted teasing and repeated
   // questions are not first-person confessions.
   if(playerAffection.test(t)){
    player.push({...row,index:i});
    if(playerExplicit.test(t))playerExplicitDays.add(row.day);
   }
  }else if(!taiDisclaim.test(t)&&taiAffection.test(t)){
   const preceding=rows[i-1];
   // Historic unguarded forced "我愛你" must not establish mutual affection.
   const forced=/^我[愛爱]你(?:[，,]熙蒙)?[。.]?$/u.test(t)&&
    preceding?.speaker==='me'&&/(?:說说|講讲).{0,4}[愛爱]我/u.test(preceding.text);
   if(!forced){
    tai.push({...row,index:i});
    if(taiExplicit.test(t))taiExplicitDays.add(row.day);
   }
  }
 }
 const rejected=rejections.length>0&&(!player.length||rejections.at(-1)>player.at(-1).index);
 const playerDays=new Set(player.map(x=>x.day)),taiDays=new Set(tai.map(x=>x.day));
 const memories=taiCanonicalMilestones(s);
 const paris=memories.some(m=>m.id==='story55-paris-promise');
 const rescue=memories.some(m=>m.id==='story55-rescue-promise');
 let stage=known?1:0;
 if(known&&bond.score>=48&&meaningfulDays.size>=2)stage=2;
 if(known&&(playerDays.size||taiDays.size||(paris&&rescue&&bond.score>=48)))stage=Math.max(stage,3);
 // LIKE may begin with Tai, without player courtship. A high collaboration
 // score can NEVER unlock LOVE by itself.
 if(known&&!rejected&&((taiDays.size>=1&&bond.score>=55)||
   (bond.score>=72&&meaningfulDays.size>=3&&paris&&rescue)))stage=Math.max(stage,4);
 if(known&&!rejected&&bond.score>=65&&playerDays.size>=2&&taiDays.size>=1&&
  playerExplicitDays.size>=1&&taiExplicitDays.size>=1)stage=Math.max(stage,5);
 if(known&&!rejected&&bond.score>=72&&playerDays.size>=3&&taiDays.size>=2&&
  playerExplicitDays.size>=2&&taiExplicitDays.size>=2)stage=Math.max(stage,6);
 if(rejected)stage=Math.min(stage,2);
 const crisis=s.day===55&&!!(s.story55?.scenes?.['d55-xiaoxin']?.index>=5||
  s.story55?.completed?.['d55-xiaoxin']);
 return {
  stage,score:bond.score,playerAffectionDays:playerDays.size,taiAffectionDays:taiDays.size,
  playerExplicitDays:playerExplicitDays.size,taiExplicitDays:taiExplicitDays.size,
  meaningfulDays:meaningfulDays.size,paris,rescue,rejected,crisis,initiative,
  canDeclareLike:known&&!rejected&&stage>=4,
  canDeclareLove:known&&!rejected&&stage>=6,
  canInitiateLike:known&&!rejected&&!crisis&&stage>=4,
  sourceIds:[...player,...tai].slice(-8).map(x=>x.id),
  query:String(input||'').slice(0,120)
 };
}
export function taiRelationshipInstruction(v){
 if(!v)return '';
 const permitted=v.canDeclareLove?'可以自主選擇明確說愛，但沒有義務每輪說。':
  v.canDeclareLike?'可以自主承認喜歡，但不能宣稱雙方已確認愛情或說「我愛你」。':
  '可以自然關心、欣賞、調侃或保留態度，但不得向熙蒙明確表白喜歡或愛。';
 return '【程序已判定的關係權限｜高於模型猜測；不能念出】階段 R'+v.stage+
  '；信任參考 '+v.score+'；玩家有證據的示好日 '+v.playerAffectionDays+
  '；熙泰有證據的回應日 '+v.taiAffectionDays+'。'+permitted+
  (v.rejected?' 玩家最近有明確拒絕，不能繼續強迫或要求表態。':'')+
  (v.initiative&&!v.canInitiateLike?' 這一輪不能主動插入戀愛表白。':'')+
  (v.crisis?' 目前有已發生的危機，主動聯絡以真實情境優先。':'')+
  '合作、信任、救援承諾不等於愛情確認。把「說你愛我」「你是不是喜歡我」當作問題，而非玩家示愛。系統將攔截越權台詞。';
}
export function taiRomanticViolations(v,entries=[]){
 if(!v)return [];
 const words=entries.flatMap(e=>[e?.text,e?.speechText]).filter(Boolean).map(clean);
 if(!v.canDeclareLove&&words.some(x=>directLove.test(x)))return ['love'];
 if(!v.canDeclareLike&&words.some(x=>directLike.test(x)))return ['like'];
 return [];
}
