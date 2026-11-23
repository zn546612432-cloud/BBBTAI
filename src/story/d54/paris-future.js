// Optional D54 NoApp scene 05: author-approved verbatim dialogue.
// Its D43 Paris / pyramids reference is confirmed by the delivered D43
// source scene. The Egypt flight lookup is revealed here for the first time.
// Reuses the standard queued Story55 message and player Send scheduler.
import {D54_TAI} from './definition.js';

export const D54_PARIS_FUTURE='d54-paris-future';
export const D54_PARIS_FUTURE_LINES=[
 ['tai','我問你件事。'],
 ['me','問。'],
 ['tai','如果真的見面了，你第一件事想做什麼？'],
 ['me','看你長什麼樣。'],
 ['tai','你不是看過照片嗎？'],
 ['me','照片跟真人又不一樣。'],
 ['tai','也是。'],
 ['me','你呢？'],
 ['tai','我？'],
 ['me','你見到我第一件事想幹嘛？'],
 ['tai','不知道。'],
 ['me','你怎麼什麼都不知道。'],
 ['tai','因為我改了好多次主意。'],
 ['me','什麼意思？'],
 ['tai','最開始想帶你去看看巴黎。吃頓飯，逛逛街，去看展覽。後來想想，你可能沒那個耐心。上次問你要不要來看鐵塔，你張嘴就是金字塔。'],
 ['me','哈哈哈哈哈。'],
 ['tai','我還真去查了一下。'],
 ['me','查什麼？'],
 ['tai','去埃及的機票。'],
 ['me','真的啊？'],
 ['tai','嗯。後來又覺得，沒必要安排這麼多。'],
 ['me','為什麼？'],
 ['tai','……我就想見見你。'],
 ['me','……'],
 ['tai','你看，你又不說話。'],
 ['me','我在想。'],
 ['tai','想什麼？'],
 ['me','那如果我見到你以後不想走了呢？'],
 ['tai','那就多待幾天。'],
 ['me','要是一直不走呢？'],
 ['tai','……'],
 ['tai','你先來再說。']
];

export function applyD54ParisFuture(c){
 if(c.d54ParisFutureRevision===1)return false;
 const node={
  id:D54_PARIS_FUTURE,day:54,title:'如果真的見面了',
  channel:'noapp',conversationId:'tai',kind:'scene',
  // A relationship-gated bonus scene; it cannot block D54 charging or
  // the D55 mainline and it has no invented fixed timestamp.
  delivery:'queued',optional:true,throughDay:54,requires:[D54_TAI],
  romanceStageRequired:5,romanceParisPromiseRequired:true,
  pauseTimeUntilComplete:false,messagePrefix:'s55-'+D54_PARIS_FUTURE,
  initialDelayMs:0,pauseMs:2400
 };
 const index=c.nodes.findIndex(n=>n.id===D54_PARIS_FUTURE);
 if(index<0)c.nodes.push(node);else c.nodes[index]={...c.nodes[index],...node};
 c.scenes[D54_PARIS_FUTURE]=structuredClone(D54_PARIS_FUTURE_LINES);
 c.d54ParisFutureRevision=1;
 return true;
}
