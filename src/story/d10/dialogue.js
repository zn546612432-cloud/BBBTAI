// D10 · ordinary Wolf Cubs group life (20 authored NPC bubbles).
// Deliberately includes single standalone messages; no speaker requires a reply.
// Ximeng is not automatically impersonated. Existing scheduler controls spacing.
const parse=body=>body.split('|').filter(Boolean).map(part=>{
 const at=part.indexOf('：');if(at<0)throw Error('群聊缺少说话人');
 return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};
});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D10_GROUP=[
 scene("shopping-list","09:23","仔仔：下午去超市，有没有要带的|熙旺：洗衣液快没了|阿威：五号电池|小辛：薯片|仔仔：什么口味|小辛：都行，别芥末"),
 scene("noodles","11:50","胡枫：中午有人吃面吗|阿威：等会儿再说|仔仔：昨天那袋咖啡豆谁开的|胡枫：我，剩的都封好了"),
 scene("heat","13:40","小辛：今天太阳是真的狠"),
 scene("supermarket","16:21","仔仔：超市排队排了半小时|胡枫：我们还在停车场|仔仔：马上好了"),
 scene("carry","17:46","仔仔：到楼下了，谁下来搬东西|阿威：我下去|小辛：薯片呢|胡枫：你先搬"),
 scene("dinner","20:02","熙旺：汤在炉上，回来自己盛"),
 scene("night","22:20","小辛：明天终于不用买东西了")
];
