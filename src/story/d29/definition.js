import {RECOGNITION_STEPS} from './recognition-call.js';
// Fixed D29 story; shared Story55 queue and existing chess match own delivery.
// Authored story token, never a network destination.
export const D29_IP='195.22.28.198';
export const D29_LEGACY_IPS=['192.0.2.29','203.0.113.29'];
export const D29_CHESS_INVITATION='s55-d29-chess-invite';
export const IDENTITY_FALLBACK_OPENING='看來你已經找到我留給你的小餅乾了。';
export const IDENTITY_TEAR_HINT='或者問問銜尾蛇之淚。';
export const IDENTITY_DIALOGUE=[
 ['ouroboros','怎麼了？哦……你找到我留給你的小餅乾了。'],
 ['me','那些文件是你故意留給我的？'],
 ['ouroboros','甚至還找到了我的 Instagram。'],
 ['me','照片裡的人是你？'],
 ['ouroboros','看到我的照片，有什麼感覺？驚訝得說不出話了？還是以為那是我 P 的？'],
 ['me','？'],['me','不是'],['me','你為什麼跟我長得一模一樣？'],['me','這怎麼可能？'],['me','P 的吧？'],['me','還是 AI？'],
 ['ouroboros','陳熙蒙，我有點失望。你離真相只差一步了，還是說，你只是不敢相信那就是真相？'],
 ['me','等等'],['me','你到底是誰？'],['me','這樣玩弄我對你有什麼好處？'],
 ['ouroboros','當年在澳門的孤兒院，修女會給每個剛送來的嬰兒拍照留念。'],
 ['me','你怎麼知道孤兒院的事？'],
 ['ouroboros','其中一張照片就在最後那個文件夾裡。'],
 ['ouroboros','打開它，你想知道的答案都在裡面。'],
 ['me','密碼呢？'],['ouroboros','自己想。'],['ouroboros',IDENTITY_TEAR_HINT]
];
export const D29_CHESS_LINES=[
 ['me','每種棋子的走法都有什麼講究？'],['tai','怎麼，想學戰術了？'],['me','你教不教？'],['tai','難得你肯向我請教。'],['tai','那就從最不起眼的兵開始吧。'],['tai','Pawn，兵。'],['tai','它只能向前走，不能後退，卻有可能在抵達棋盤另一端時成為后。'],['me','但大部分兵都活不到最後。'],['tai','沒錯。'],['tai','有時候犧牲一枚兵，比保住它更有價值。'],['me','就像你上次用的王翼棄兵？'],['tai','看來你還記得。'],['tai','Knight，馬。唯一能越過其他棋子的傢伙。'],['tai','它的威脅往往不在直覺可以預判的位置上。'],['tai','Bishop，象。沿著斜線移動，但終其一生只能停留在同一種顏色的格子上。'],['me','所以一對象比單獨一個象更有價值？'],['tai','聰明。'],['tai','Rook，車。沿橫線和直線移動，在開闊的棋盤上尤其強大。'],['tai','Queen，后。兼具車與象的能力，也是棋盤上最強大的棋子。'],['me','那王呢？'],['tai','King。'],['tai','它的行動最受限制，卻決定了整盤棋的存亡。'],['tai','到了殘局，王也可以成為進攻的一部分。'],['me','原來如此。'],['tai','記住，吃掉對方多少枚棋子並不重要。'],['tai','Checkmate，將死。'],['tai','這才是你真正要追求的東西。'],['me','沒想到你還挺會教人的。'],['tai','我的優點還有很多，darling.'],['me','……'],['tai','不過，你干爹應該比我更適合教你這些。'],['me','？'],['tai','傅隆生。'],['tai','澳門，六個養子。'],['tai','很有意思的一家人。'],['me','你調查我們？'],['tai','禮尚往來而已。'],['me','你到底想幹什麼？'],['tai','別緊張，nya。'],['tai','至少目前，我對你的興趣遠大於對其他人的興趣。']
];
const scenes=[
 ['d29-meeting','09:32','下午開會','wechat','group','d28-meeting',[
  ['熙旺','下午兩點開會，干爹也會過來。'],['熙旺','都別遲到。'],['熙旺','蒙蒙，把昨天的測試報告也帶過來。'],['me','好。'],['胡枫','我的程序已經拿到了。'],['阿威','仔仔那邊也差不多了。'],['仔仔','下午過來試衣服。'],['小辛','收到🫡']]],
 ['d29-after-meeting','16:48','會後','wechat','group','d29-meeting',[
  ['阿威','我還以為今天又要挨罵。'],['仔仔','你沒有。'],['胡枫','有人挨了。'],['me','……'],['小辛','哈哈哈哈哈哈哈哈'],['熙旺','好了，別鬧他。'],['阿威','蒙哥，干爹是不是覺得之前的方案不可靠？'],['me','不是不可靠，是考慮得不夠全面。'],['me','他問我，如果警察比我預想中更早發現異常怎麼辦。'],['胡枫','確實也得考慮這個。'],['me','知道了知道了，我再想想。'],['熙旺','今天說的事情都回去再想想。']]],
 ['d29-father','17:06','干爹','wechat','fulongsheng','d29-after-meeting',[
  ['傅隆生','熙蒙'],['me','怎麼了干爹'],['傅隆生','還在想下午的事？'],['傅隆生','下棋不是只想著怎麼吃掉對方的棋子。'],['傅隆生','你落子的時候，也要想到對方會怎麼走。'],['me','知道了，干爹。']]],
 ['d29-chess','21:36','再下一盤','mirage','s55-ouroboros','d29-father',[
  ['ouroboros','今天怎麼突然研究起國際象棋了？'],['me','你又在監視我？'],['ouroboros','別說得那麼難聽。'],['ouroboros','看來上次那盤棋讓你印象深刻。'],['me','少自戀了。'],['ouroboros','再來一盤？']]],
 ['plan','21:36','鬼車','mirage','s55-ouroboros','d29-chess',[
  ['ouroboros','對了，送你一個消息。'],['ouroboros','澳門警方最近升級了他們的系統。'],['ouroboros','他們也開始使用 AI 輔助追蹤了。'],['me','AI？'],['ouroboros','還取了個相當火辣的名字。'],['ouroboros','辣妹。'],['me','……'],['me','那你的 AI 為什麼叫 TAI？'],['ouroboros','你以後會知道的。'],['ouroboros','還有，用提前錄好的影像替換監控畫面，這種手段已經過時了。'],['me','你有更好的辦法？'],['ouroboros','當然。'],['ouroboros','既然他們相信自己的眼睛，那就給他們看一點有趣的東西。'],['ouroboros','不存在的人，不存在的車。'],['ouroboros','一場連人工智能都無法分辨真假的幻象。'],['ouroboros','I call it the Ghost Car Trap.'],['me','鬼車陷阱？'],['me','即使有 AI 輔助，生成足以以假亂真的數字人也沒那麼容易。'],['ouroboros','對 Azathoth 而言？'],['ouroboros','É canja.'],['me','什麼意思？'],['ouroboros','毫無難度。'],['ouroboros','我可以幫你，nya。'],['ouroboros','不過，我有個條件。'],['me','又來了。'],['ouroboros','加入我。'],['ouroboros','先叫一聲老闆來聽聽？'],['me','做夢。'],['ouroboros','真不給面子。'],['me','你為什麼一而再再而三地幫我？'],['ouroboros','當然是為了錢。'],['me','我不信。'],['ouroboros','那你覺得是為了什麼？'],['me','我怎麼知道。'],['me','你到底為什麼對我這麼感興趣？'],['ouroboros','還沒查出來嗎？'],['me','……'],['ouroboros','好吧，再給你一點提示。'],['ouroboros',D29_IP],['me','？'],['ouroboros','想知道答案，就來調查我。'],['ouroboros','Boa sorte, nya.']]]
];
export function applyD29Definition(c){
 for(const [id,at,title,channel,conversationId,previous,lines] of scenes){
  const n={id,day:29,at,title,kind:'scene',requires:id==='plan'?[previous,'base','lead']:[previous],gateDay:29,holdAt03:true,delivery:'queued',channel,conversationId,messagePrefix:'s55-'+id,...(channel==='mirage'?{requiresContact:true}:{})};
  const existing=c.nodes.find(x=>x.id===id);
  if(existing&&id==='plan'){
   if(existing.delivery!=='queued'){Object.assign(existing,n);c.scenes[id]=structuredClone(lines);c.nodes.splice(c.nodes.indexOf(existing),1);c.nodes.push(existing);}
  }else if(!existing)c.nodes.push(n);
  c.scenes[id]??=structuredClone(lines);
 }
 for(const line of c.scenes.plan||[])if(line[0]==='ouroboros'&&D29_LEGACY_IPS.includes(line[1]))line[1]=D29_IP;
 const identity=c.projects.find(p=>p.id==='identity');
 if(D29_LEGACY_IPS.includes(identity?.key))identity.key=D29_IP;
 // Personal Files is now the source of the social handle and locked photo.
 // Preserve the later invitation gate until both the questions and photo
 // have been completed, regardless of which one the player discovers first.
 if(identity){identity.batches=3;identity.gains=[33.333,33.333,33.334];}
 const prerequisites={harvard:['dossier'],ig:['dossier'],questions:['ig'],'photo-decrypt':['dossier','questions'],invite:['photo','questions']};
 for(const [id,requires] of Object.entries(prerequisites)){
  const n=c.nodes.find(x=>x.id===id);if(n)n.requires=requires.slice();
 }
 for(const id of ['dossier','uk','harvard','ig','questions','photo-decrypt','photo','invite','recognition']){
  const n=c.nodes.find(x=>x.id===id);if(n)n.day=33;
 }
 const photo=c.projects.find(p=>p.id==='photo');if(photo)photo.day=33;
 const q=c.nodes.find(n=>n.id==='questions');
 if(q){Object.assign(q,{kind:'scene',title:'向銜尾蛇詢問真相',delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',messagePrefix:'s55-identity-reveal'});c.scenes.questions??=structuredClone(IDENTITY_DIALOGUE);
  const lines=c.scenes.questions;if(lines.length===IDENTITY_DIALOGUE.length-1&&lines.at(-1)?.[1]==='自己想。')lines.push(['ouroboros',IDENTITY_TEAR_HINT]);
 }
 const mail=c.mails.find(m=>m.id==='invite-mail');
 if(mail)Object.assign(mail,{from:'Dr Ouroboros',subject:'NoApp / PRIVATE BETA',body:'內測邀請僅供你本人使用。'});
 if(!c.recognitionCallRevision){c.scenes.recognition=structuredClone(RECOGNITION_STEPS);c.recognitionCallRevision=1;}
}
