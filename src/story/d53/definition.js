// D53 fixed content uses native chat composers and the existing phone runtime.
import {D53_CALL} from './call.js';
import {D46_CONTACT} from '../d46/definition.js';

export const D53_ACTION_START='d53-action-start';
export const D53_ISOLDE_DEAL='d53-isolde-deal';
export const D53_ACTION_END='failure';
export const D53_TAI_NIGHT='d53-tai-night';
export const D53_START_LINES=[
 ['熙旺','我準備好了。'],
 ['me','哥，我只給你這一次機會。'],
 ['me','一旦警察來了，無論得沒得手，你都必須撤。'],
 ['熙旺','明白。']
];
export const D53_DEAL_LINES=[
 ['me','資料已經發給你，消滅目標後，武裝佔領金庫。'],
 ['isolde','你的計劃很瘋狂！'],
 ['me','三千萬美金的酬勞也很瘋狂。'],
 ['isolde','聽著，這個價格沒人會願意幫你撬開那個地方的金庫。'],
 ['me','五千萬美金。'],
 ['isolde','成交！']
];
export const D53_END_LINES=[
 ['熙旺','都怪我。'],
 ['熙旺','就差一點，我本來可以制服那個警察的。'],
 ['me','好了，現在也不用復盤了。'],
 ['me','天意如此。'],
 ['熙旺','你跟弟弟們都談過了嗎？'],
 ['me','嗯。'],
 ['me','他們相信我。'],
 ['熙旺','好。'],
 ['熙旺','我們一定會成功的。']
];
export const D53_TAI_LINES=[
 ['tai','有沒有想要的伴手禮？'],
 ['me','真沒想到這種時候你還有心情問我這個。'],
 ['tai','剛才路過一家禮品店，看到一套傑克的手辦，突然想起了你。'],
 ['me','我要，買給我。'],
 ['tai','你還真是喜歡它。'],
 ['me','我的頭像和壁紙都是它，我還收藏了它的盒蛋。'],
 ['tai','上次偶然打開你的攝像頭，看到你桌上擺了幾個。'],
 ['me','偶然這個詞用得真巧妙。'],
 ['tai','確實挺可愛的，所以我也買了一套。'],
 ['me','嗯？'],
 ['me','是因為可愛才買的，還是想跟我用同款？'],
 ['me','你這個偷窺狂。'],
 ['tai','只是覺得可愛。'],
 ['tai','還有點好奇。'],
 ['me','唉，熙泰，看來你是真的很喜歡我。'],
 ['tai','別自戀了。'],
 ['tai','手辦已經包好了，自己過來拿。'],
 ['me','你說……'],
 ['me','萬一我們逃不掉呢？'],
 ['tai','都到這個時候了，你還在想萬一？'],
 ['me','任何可能性我都會考慮。'],
 ['tai','放心吧，澳門沒有死刑。'],
 ['tai','就算被抓了也沒關係，只要你還活著，我就有辦法把你救出來。'],
 ['me','如果計劃失敗，傅隆生不會放過我的。'],
 ['tai','你不是已經安排好人對付他了嗎？'],
 ['me','兩百個人，還有一枚足以炸掉整棟樓的炸彈。'],
 ['me','就算他不死，警察也會控制住他。'],
 ['tai','那你還在擔心什麼？'],
 ['me','我說不清楚……'],
 ['me','可能是沒睡好吧。'],
 ['tai','好好睡一覺，別想那麼多。'],
 ['me','嗯。']
];
export function applyD53Definition(c){
 if(c.d53ActionRevision>=2)return false;
 const scene=(id,at,title,channel,conversationId,requires,lines,extra={})=>{
  const node={id,day:53,at,title,channel,conversationId,requires,kind:'scene',delivery:'queued',gateDay:53,pauseTimeUntilComplete:true,messagePrefix:'s55-'+id,initialDelayMs:0,pauseMs:3000,...extra};
  const i=c.nodes.findIndex(n=>n.id===id);
  if(i===-1)c.nodes.push(node);else c.nodes[i]=node;
  c.scenes[id]=structuredClone(lines);
 };
 scene(D53_ACTION_START,'20:00','行動前','wechat','wang',['d47-wang'],D53_START_LINES);
 scene(D53_ISOLDE_DEAL,'21:30','Isolde｜確認第二筆委託','mirage',D46_CONTACT,[D53_ACTION_START],D53_DEAL_LINES,{
  requiresContact:true,requiresScriptedCall:D53_CALL.id,lineDelayMs:{4:3000}
 });
 scene(D53_ACTION_END,'23:00','行動失敗','wechat','wang',['confide','second','mercenary',D53_ACTION_START,D53_ISOLDE_DEAL],D53_END_LINES);
 scene(D53_TAI_NIGHT,'23:30','伴手禮','noapp','tai',[D53_ACTION_END],D53_TAI_LINES,{
  lineDelayMs:{17:5000}
 });
 c.d53ActionRevision=2;
 return true;
}
