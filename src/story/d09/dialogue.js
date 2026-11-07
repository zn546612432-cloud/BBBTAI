// D09 · ordinary Wolf Cubs group life (20 authored NPC bubbles).
// Deliberately includes single standalone messages; no speaker requires a reply.
// Ximeng is not automatically impersonated. Existing scheduler controls spacing.
const parse=body=>body.split('|').filter(Boolean).map(part=>{
 const at=part.indexOf('：');if(at<0)throw Error('群聊缺少说话人');
 return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};
});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D09_GROUP=[
 scene("training-call","08:46","熙旺：下午三點想練的過來，記得帶水|小辛：今天又練？|熙旺：你上次就沒來|小辛：精神上參加了算不算|胡枫：算你熱身"),
 scene("cola","11:27","仔仔：我昨天畫的那件外套，早上看怎麼像個塑膠袋|小辛：你這叫前衛|仔仔：謝謝，我自己都不敢穿|阿威：https://www.tiktok.com/@randomdogclips/video/0000000000000000001"),
 scene("training","15:52","阿威：第三趟比第一趟慢了八秒|小辛：鞋帶鬆了|阿威：你剛才不是才繫過？|小辛：那可能是地的問題|熙旺：休息十分鐘，先喝水|小辛：哥，我下次絕對贏他|阿威：你先把氣喘勻吧"),
 scene("laundry","18:20","仔仔：🐶"),
 scene("shopping","20:14","仔仔：明天下午誰能陪我去買材料？|胡枫：我人在韓國，只能當線上軍師。|熙旺：我明天出車，你們自己安排。")
];
