// D08 · 2025-05-26. 全新独立生活文案，替换旧剧本；不替玩家发送消息。
// 胡枫D12晚从韩国回澳；此前所有发言均在远程微信中发生。
const parse=body=>body.split('|').map(part=>{const at=part.indexOf('：');if(at<0)throw Error('Missing speaker');return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D08_GROUP=[
 scene("morning","09:12","小辛：我的键盘有个键按一下出两个字|小辛：刚给客服发了视频|阿威：那你等回复|胡枫：我这边已经半夜了，你们怎么还这么精神|小辛：韩国半夜你还在线？"),
 scene("overseas","11:45","胡枫：明天学校那边有个展示|仔仔：你之前做的那个？|胡枫：嗯，资料还差一点|仔仔：加油|熙旺：我刚收车，外面热得很"),
 scene("afternoon","15:40","阿威：今天走了两条山路|阿威：第二条比想的陡|小辛：看着照片我腿就酸了|仔仔：我在裁布，满桌子线头"),
 scene("evening","19:06","小辛：有人晚上上线吗|胡枫：我得赶作业|阿威：我也不打|小辛：好吧|熙旺：晚饭记得吃"),
 scene("one","22:09","仔仔：刚把那张版型图改好了，明早再看")
];
