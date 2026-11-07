// D10: 2025-05-28. Hu Feng stays in Seoul until D12 night.
// Keep seven canonical scene IDs and each message count: old saves remain stable.
const parse=body=>body.split('|').filter(Boolean).map(part=>{const i=part.indexOf('：');if(i<0)throw Error('群聊缺少发言人');return {who:part.slice(0,i),kind:'text',text:part.slice(i+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D10_GROUP=[
 scene('shopping-list','09:23','仔仔：下午去買一批布料|仔仔：有家店說今天能看樣|熙旺：你昨天看的顏色定了？|仔仔：還沒，想再比較一下|阿威：我去換登山鞋鞋帶|小辛：我替你們盯顯卡價格好了'),
 scene('noodles','11:50','胡枫：首爾今天一直下雨|胡枫：我晾的衣服又得搬進來|小辛：你到底還要待多久|胡枫：快了，週五晚上到澳門'),
 scene('heat','13:40','小辛：剛看了半小時顯卡價格，越看越貴'),
 scene('supermarket','16:21','仔仔：樣布拿到了|仔仔：比照片暗一點|阿威：還是看實物準'),
 scene('carry','17:46','小辛：你們設計師真麻煩|胡枫：我把航班號發給旺哥了|熙旺：收到了，明晚我去機場接你|胡枫：好，落地聯絡'),
 scene('dinner','20:02','熙旺：我明天白天還要出車，可能一整天都在外面'),
 scene('night','22:20','小辛：明天不熬夜了，真的')
];
