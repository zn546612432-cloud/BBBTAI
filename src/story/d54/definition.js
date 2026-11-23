// D54 · 2025-07-11 · the last full day before the orphanage operation.
// Author-approved dialogue; native messaging composers own all player Send actions.
import {D53_TAI_NIGHT} from '../d53/definition.js';
import {D46_CONTACT} from '../d46/definition.js';

export const D54_ISOLDE='d54-isolde-ready';
export const D54_GROUP='d54-departure-group';
export const D54_TAI='d54-tai-online';
export const D54_FATHER='ready';
export const D54_ISOLDE_LINES=[
 [
  "isolde",
  "僱傭兵就位了"
 ],
 [
  "me",
  "好。"
 ]
];
export const D54_GROUP_LINES=[
 [
  "阿威",
  "真就這樣走了，還有點捨不得"
 ],
 [
  "仔仔",
  "我也是"
 ],
 [
  "小辛",
  "冰箱裡還有兩塊披薩帶不走"
 ],
 [
  "仔仔",
  "這個時候就別想著吃了吧"
 ],
 [
  "胡枫",
  "唉"
 ],
 [
  "小辛",
  "唉"
 ],
 [
  "仔仔",
  "你們唉什麼"
 ],
 [
  "胡枫",
  "想起以前一些回憶"
 ],
 [
  "小辛",
  "其實老頭子有時候對我們也挺好的"
 ],
 [
  "阿威",
  "現在說這些也沒用了"
 ],
 [
  "小辛",
  "要不我們還是想想15億美金要怎麼花吧"
 ],
 [
  "小辛",
  "我要吃一個星期的炸雞"
 ],
 [
  "胡枫",
  "你怎麼那麼沒出息"
 ],
 [
  "阿威",
  "先買一個大莊園大家一起住"
 ],
 [
  "仔仔",
  "帶豪華泳池那種，還要有地下車庫"
 ],
 [
  "胡枫",
  "你連駕照都沒有就想著地下車庫，完全不像你啊"
 ],
 [
  "仔仔",
  "其實我內心很狂野的！"
 ],
 [
  "仔仔",
  "（表情包）"
 ],
 [
  "小辛",
  "我們這樣聊天會不會吵到蒙哥啊哈哈哈"
 ],
 [
  "小辛",
  "他很久沒和我們閒聊了"
 ],
 [
  "胡枫",
  "你少說幾句，多幹活"
 ],
 [
  "小辛",
  "遵命大王"
 ],
 [
  "me",
  "也不是第一天被你們吵了"
 ],
 [
  "me",
  "清點一下護照吧，還有什麼地方想去的就去看看，我們以後大概都不會回來了。"
 ],
 [
  "胡枫",
  "你先忙，我們不聊了"
 ]
];
export const D54_TAI_LINES=[
 [
  "tai",
  "今天一天我都在線，如果你緊張得想和人聊聊天，我隨時奉陪。"
 ],
 [
  "me",
  "你的中國話說的還挺溜。"
 ],
 [
  "tai",
  "中文只是我掌握的其中一門語言，我有幾本護照，就會幾種語言。"
 ],
 [
  "me",
  "看起來你也在過逃亡的生活，怎麼還去哈佛讀書了，又是拿誰的身份偽造的？"
 ],
 [
  "tai",
  "逃亡？我從來沒逃過，是他們太蠢，連摸我的影子也摸不到，那些想殺我的，都先一步死在我手裡了。"
 ],
 [
  "me",
  "說明你身邊沒有你真正信任的人。"
 ],
 [
  "me",
  "床笫之歡往往是兇殺案的搖籃，我在暗網看過很多這些暗殺訂單。"
 ],
 [
  "tai",
  "目前還沒有人有資格在我身邊過夜"
 ],
 [
  "me",
  "嘖嘖，原來你還是處男呀弟弟"
 ],
 [
  "tai",
  "這是什麼語氣？"
 ],
 [
  "tai",
  "聽起來你經驗很豐富"
 ],
 [
  "me",
  "哼那是當然"
 ],
 [
  "tai",
  "可我在你手機裡沒有發現任何關於女人的照片，除了你的家人，就是一些風景照和代碼報錯的截圖。"
 ],
 [
  "me",
  "誰會把床照保存在手機裡啊？"
 ],
 [
  "tai",
  "真想看看你現在的表情"
 ],
 [
  "me",
  "我已經給攝像頭貼上了膠布，別想再看我"
 ],
 [
  "tai",
  "喲，學聰明了"
 ],
 [
  "me",
  "我看你根本不是來跟我聊天的，純純是找我消遣的"
 ],
 [
  "tai",
  "不喜歡？這就是我說話的方式"
 ]
];
export const D54_FATHER_LINES=[
 [
  "me",
  "干爹，明天熙旺會接你到孤兒院，我已經安排了人在那埋伏警察，之後會有人接應你們。"
 ],
 [
  "傅隆生",
  "好。"
 ]
];
export const D54_STICKER='/apps/wechat/stickers/whitecat.webp';

export function applyD54Definition(c){
 if(c.d54Revision>=1)return false;
 const scene=(id,at,title,channel,conversationId,requires,lines,extra={})=>{
  const node={id,day:54,at,title,channel,conversationId,requires,kind:'scene',
   delivery:'queued',gateDay:54,pauseTimeUntilComplete:true,authoredPending:false,
   messagePrefix:'s55-'+id,initialDelayMs:0,pauseMs:3000,...extra};
  const idx=c.nodes.findIndex(n=>n.id===id);
  if(idx<0)c.nodes.push(node);
  else c.nodes[idx]={...c.nodes[idx],...node};
  c.scenes[id]=structuredClone(lines);
 };
 // The first "morning" beat precedes the user-fixed 08:40 group chat.
 scene(D54_ISOLDE,'08:20','僱傭兵就位','mirage',D46_CONTACT,[D53_TAI_NIGHT],D54_ISOLDE_LINES,{requiresContact:true});
 scene(D54_GROUP,'08:40','離開澳門','wechat','group',[D54_ISOLDE],D54_GROUP_LINES,{
  imageLines:{17:D54_STICKER}
 });
 // No exact time was authored for this conversation. It unlocks after the group,
 // without introducing an invented mandatory timestamp.
 scene(D54_TAI,null,'今天都在線','noapp','tai',[D54_GROUP],D54_TAI_LINES,{
  pauseTimeUntilComplete:false
 });
 // Reuse the existing D54 "ready" node already required by D55's finale.
 scene(D54_FATHER,'19:00','通知傅隆生','wechat','fulongsheng',[D54_GROUP],D54_FATHER_LINES);
 const ending=c.nodes.find(n=>n.id==='ending');
 if(ending&&!ending.requires.includes(D54_TAI))ending.requires.push(D54_TAI);
 c.d54Revision=1;
 return true;
}
