// D08 · ordinary Wolf Cubs group life (20 authored NPC bubbles).
// Deliberately includes single standalone messages; no speaker requires a reply.
// Ximeng is not automatically impersonated. Existing scheduler controls spacing.
const parse=body=>body.split('|').filter(Boolean).map(part=>{
 const at=part.indexOf('：');if(at<0)throw Error('群聊缺少说话人');
 return {who:part.slice(0,at),kind:'text',text:part.slice(at+1)};
});
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body)});
export const D08_GROUP=[
 scene("keyboard","09:12","小辛：空格键又开始不理我了|小辛：刚才那份表格删了重填|胡枫：你前几天不是说它还能用吗|小辛：能用和好用是两回事啊|仔仔：你是不是每天都在跟键盘吵架"),
 scene("delivery","11:45","熙旺：今天下午大屋有人吗|仔仔：我在|熙旺：有个设备要送来，麻烦签收一下|仔仔：知道了|阿威：门口那盏灯有点闪"),
 scene("heat","15:40","胡枫：外面好热|阿威：刚跑完一趟，汗都没干|小辛：我今天不出去了|仔仔：你本来也没打算出门"),
 scene("games","18:42","胡枫：今晚有人打游戏吗|小辛：我可以|阿威：晚一点|小辛：那我先去找耳机|胡枫：我先开了"),
 scene("soup","22:09","熙旺：明早冰箱里留了汤，谁先起谁热一下")
];
