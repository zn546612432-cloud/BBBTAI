// D08 · ordinary Wolf Cubs group life (20 authored NPC bubbles).
// Deliberately includes single standalone messages; no speaker requires a reply.
// Ximeng is not automatically impersonated. Existing scheduler controls spacing.
const parse=body=>body.split('|').filter(Boolean).map(part=>{
 const at=part.indexOf('：');if(at<0)throw Error('群聊缺少说话人');
 return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};
});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D08_GROUP=[
 scene("keyboard","09:12","小辛：我店裡那台破收銀機又卡了|小辛：誰家開店還靠手寫小票啊|胡枫：你家|小辛：？|仔仔：哈哈哈哈哈"),
 scene("delivery","11:45","熙旺：明天下午有人想去練一會嗎？|阿威：我去。|熙旺：上次的護具到了，我順便帶過去。|仔仔：我明天要去看布料，可能晚點。|阿威：行，我先去把場地收拾一下。"),
 scene("heat","15:40","胡枫：救命 韓語課被點名了|胡枫：卡了十秒一個字都沒蹦出來|阿威：你有好好預習嗎|胡枫：不要問了：）"),
 scene("games","18:42","小辛：今晚誰上線？我關店以後來。|胡枫：我還有報告，打一把最多。|阿威：我練完再說。|小辛：誰敢信你們說「打一把」。|胡枫：你自己哪次不是先說最後一把？"),
 scene("soup","22:09","阿威：最近好無聊，我有點想老頭子了。")
];
