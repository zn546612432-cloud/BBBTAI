// D10 · 2025-05-28. 全新独立生活文案，替换旧剧本；不替玩家发送消息。
// 胡枫D12晚从韩国回澳；此前所有发言均在远程微信中发生。
const parse=body=>body.split('|').map(part=>{const at=part.indexOf('：');if(at<0)throw Error('Missing speaker');return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D10_GROUP=[
 scene("shopping","09:23","仔仔：下午去买一批布料|仔仔：有家店说今天能看样|熙旺：你昨天看的颜色定了？|仔仔：还没，想再比较一下|阿威：我去换登山鞋鞋带"),
 scene("seoul","11:50","胡枫：首尔今天一直下雨|胡枫：我晾的衣服又得搬进来|小辛：你到底还要待多久|胡枫：快了|熙旺：机票订好告诉我"),
 scene("afternoon","13:40","小辛：刚看了半小时显卡价格，越看越贵"),
 scene("buying","16:21","仔仔：样布拿到了|仔仔：比照片暗一点|阿威：还是看实物准|小辛：你们设计师真麻烦"),
 scene("night","19:42","熙旺：明天我可能要忙一天|阿威：知道了|胡枫：我周五晚上到澳门|熙旺：把航班号发我"),
 scene("last","22:20","小辛：明天不熬夜了，真的")
];
