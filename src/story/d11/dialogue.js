// D11 · 2025-05-29. Only the six Wolf Cubs are in the group;
// Fu Longsheng's offline meeting is represented in Ximeng's own note.
const parse=body=>body.split('|').filter(Boolean).map(part=>{const i=part.indexOf('：');if(i<0)throw Error('群聊缺少发言人');return {who:part.slice(0,i),kind:'text',text:part.slice(i+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body),condition:s=>!!s.story55?.completed?.return});
export const D11_GROUP=[
 scene('notice','09:15','熙旺：晚上七點半，老地方見|熙旺：乾爹回來了，今天大家盡量過來|阿威：我晚上可以|仔仔：收到，我把手上的活弄完就去|小辛：啊？真的？|胡枫：我還在首爾，明晚才落地|熙旺：知道，航班號收到了，我去接'),
 scene('afternoon','15:20','阿威：我先去訓練，結束直接過去|小辛：我帶點喝的|仔仔：別買太多，今晚還有人準備吃的'),
 scene('after-meeting','22:20','仔仔：我到家了|阿威：我也回去了|小辛：今天吃得夠飽|胡枫：你們好歹給我留張照片|熙旺：明晚機場見，早點休息')
];
