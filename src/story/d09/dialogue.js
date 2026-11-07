// D09 · 2025-05-27. 全新独立生活文案，替换旧剧本；不替玩家发送消息。
// 胡枫D12晚从韩国回澳；此前所有发言均在远程微信中发生。
const parse=body=>body.split('|').map(part=>{const at=part.indexOf('：');if(at<0)throw Error('Missing speaker');return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D09_GROUP=[
 scene("call","08:46","熙旺：阿威，你下午还去训练场吗|阿威：去，三点|小辛：那我也过去看看|熙旺：先热身，别一上来就拼速度"),
 scene("overseas","11:27","胡枫：展示结束了|胡枫：老师问了好几个问题|仔仔：顺利吗|胡枫：还行，回头细说"),
 scene("training","15:52","阿威：小辛今天第三趟慢了八秒|小辛：我真的没偷懒|阿威：你前面冲得太猛|小辛：下回我分配一下|熙旺：都记下来，下次比一比|胡枫：隔着海都能看见你们较劲|小辛：你别幸灾乐祸|阿威：休息十分钟再练"),
 scene("night","20:14","仔仔：巴黎那个展的票价出来了|仔仔：有点贵|熙旺：慢慢攒，不用急"),
 scene("sleep","22:04","小辛：我今天先睡了")
];
