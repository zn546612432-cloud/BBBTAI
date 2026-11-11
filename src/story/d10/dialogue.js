import {xinDogSticker} from '../../services/assets/xin-dog-stickers.js';
// D10: 2025-05-28. Hu Feng stays in Seoul until D12 night.
// Keep seven canonical scene IDs and each message count: old saves remain stable.
const parse=body=>body.split('|').filter(Boolean).map(part=>{const i=part.indexOf('：');if(i<0)throw Error('群聊缺少发言人');const speaker=part.slice(0,i);return {who:speaker==='熙蒙'?'me':speaker==='胡楓'?'胡枫':speaker,kind:'text',text:part.slice(i+1)};});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D10_GROUP=[
 scene('shopping-list','09:23','仔仔：下午去買一批布料|仔仔：有家店說今天能看樣|熙旺：你昨天看的顏色定了？|仔仔：還沒，想再比較一下|阿威：我去換登山鞋鞋帶|小辛：我替你們盯顯卡價格好了'),
 scene('noodles','11:50','胡枫：首爾今天一直下雨|胡枫：我晾的衣服又得搬進來|小辛：怎麼，你得首爾病了？|胡枫：首爾的雨未必有你憂鬱。|小辛：這還是我哥嗎？'),
 scene('heat','13:40','小辛：剛看了半小時顯卡價格，越看越貴'),
 scene('supermarket','16:21','仔仔：樣布拿到了|仔仔：比照片暗一點|阿威：還是看實物準'),
 scene('carry','17:46','胡枫：終於考完試了，我可以不憂鬱了。|熙旺：恭喜恭喜。|胡枫：嘿嘿，找個時間我回來一趟，給你們買了很多禮物。|熙旺：謝謝阿楓。|小辛：真的嗎真的嗎！給我買了什麼！！|胡枫：狗項圈。|小辛：阿西八！！'),
 scene('dinner','20:02','熙旺：我明天白天還要出車，可能一整天都在外面'),
 scene('night','22:20','小辛：明天再也不熬夜了，真的。')
];


// Private daily messages join the SAME authored-chat lifecycle as group chat.
// "熙蒙" always means a native composer draft that needs the real Send button.
const privateScene=(id,chat,at,body)=>({id,chat,at,lines:parse(body)});
export const D10_PRIVATE=[];
D10_GROUP.find(s=>s.id==='carry').lines.push({who:'小辛',kind:'image',text:xinDogSticker('狗怒（愤怒/不爽）')});
