// D09 · ordinary Wolf Cubs group life (20 authored NPC bubbles).
// Deliberately includes single standalone messages; no speaker requires a reply.
// Ximeng is not automatically impersonated. Existing scheduler controls spacing.
const parse=body=>body.split('|').filter(Boolean).map(part=>{
 const at=part.indexOf('：');if(at<0)throw Error('群聊缺少说话人');
 return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};
});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D09_GROUP=[
 scene("training-call","08:46","熙旺：下午三点训练，记得带水|小辛：今天又练？|熙旺：昨天没练|小辛：精神上练了算不算|胡枫：算你热身"),
 scene("cola","11:27","仔仔：冰箱里最后一罐可乐谁喝的|小辛：我|仔仔：瓶子倒是留得挺整齐|阿威：训练的绷带我拿了两卷"),
 scene("training","15:52","胡枫：第三趟比第一趟慢了八秒|小辛：鞋带松了|阿威：你第三趟之前不是刚系过|小辛：那可能是地的问题|熙旺：休息十分钟，先喝水|胡枫：阿威你那边记了没|阿威：记了"),
 scene("laundry","18:20","仔仔：训练服放洗衣篮，别又扔椅子上"),
 scene("shopping","20:14","仔仔：明天下午谁能陪我采购|胡枫：我有空|熙旺：明天不用训练，你们自己休息")
];
