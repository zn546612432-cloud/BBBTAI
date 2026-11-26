// Fixed, user-approved optional dialogue. No plot flags, free chat or generated lines.
import {completed} from '../../../../services/story55/state.js';
export const FATHER_NOTICE_TYPE='father_harm';
export const fatherNoticePhase=s=>completed(s,'d47-wang')?'agreement':completed(s,'d42-group')?'conflict':'early';
// Exact common phrases also work if the classifier is offline or an invite follows immediately.
// Other expressions are classified by the existing semantic service.
export function directFatherNotice(value){
 const text=String(value||'').normalize('NFKC').replace(/[\s，。！？!?,.：:「」『』]/g,'');
 return /^(?:我要|我們要|我们要|一起|準備|准备|必須|必须|決定|决定|目標|目标)?(?:殺死|杀死|殺掉|杀掉|殺了|杀了|殺|杀|幹掉|干掉|除掉|弄死)(?:傅隆生|干爹|乾爹|老頭子|老头子|老頭|老头)$/.test(text);
}
export const FATHER_NOTICE_LINES={
 early:[['小辛','？？？？？？？'],['胡枫','你活膩了？'],['阿威','已截圖'],['仔仔','蒙蒙哥你快刪掉！！！'],['熙旺','熙蒙。'],['小辛','完了完了'],['小辛','哥你自求多福吧']],
 conflict:[['胡枫','……'],['小辛','反正我還沒消氣'],['阿威','蒙哥，你認真的？'],['熙旺','蒙蒙，把公告刪了吧。'],['小辛','乾爹打人還不讓人家生氣啊'],['熙旺','小辛，少說兩句。']],
 agreement:[['胡枫','這種事就別寫在群公告裡了'],['阿威','刪了吧蒙哥'],['小辛','我們聽你的就是了'],['仔仔','哥……']]
};
export const FATHER_NOTICE_COMBO={
 early:{private:[['小辛','哥！！！！！！'],['小辛','群公告還沒刪啊！！！'],['胡枫','你他媽故意的吧'],['仔仔','蒙蒙哥我求你了快刪掉'],['阿威','我現在退群還來得及嗎'],['熙旺','熙蒙，你在幹什麼？']],after:[['小辛','啊啊啊啊啊啊'],['胡枫','他絕對看到了'],['阿威','我今晚不回去了'],['仔仔','我們明明什麼都沒做😭'],['熙旺','……']]},
 conflict:{private:[['小辛','蒙哥你好勇……'],['胡枫','你來真的啊？'],['阿威','乾爹進群了'],['仔仔','哥哥，你先把公告刪掉好不好'],['熙旺','蒙蒙，別這樣。']],after:[['小辛','他居然還笑得出來'],['胡枫','你少說兩句吧'],['阿威','他肯定看見了'],['仔仔','唉……'],['熙旺','公告刪了吧。']]},
 agreement:{private:[['胡枫','你怎麼把他拉進來了'],['阿威','蒙哥，公告。'],['仔仔','他看見了怎麼辦'],['小辛','哥你是不是故意給他看的'],['熙旺','蒙蒙，你還在生氣嗎？'],['熙旺','把公告刪了，好不好？']],after:[['胡枫','……'],['阿威','走了'],['小辛','好煎熬的半分鐘'],['仔仔','嚇死我了'],['熙旺','好了，都別說了。']]}
};
