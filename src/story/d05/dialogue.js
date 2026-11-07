// D05 · 2025-05-23. 全量重写。大家分开生活，胡枫在韩国；不再伪造同居群聊。
const parse=body=>body.split('|').map(x=>{const at=x.indexOf('：');if(at<0)throw Error('Missing speaker');return {who:x.slice(0,at),text:x.slice(at+1),kind:'text'};});
const scene=(id,chat,at,body)=>({id,chat,at,lines:parse(body)});
export const D05_GROUP=[
 scene("breakfast",'group',"08:15","熙旺：今早出车接了一单去氹仔的客|熙旺：路上堵得厉害|阿威：我刚晨跑完|小辛：你们真有精神|胡枫：我在韩国还没睡，别吓我"),
 scene("lunch",'group',"12:05","小辛：澳门今天会不会下雨|仔仔：天气预报说下午有阵雨|阿威：我先去爬山了|熙旺：下雨就早点回来"),
 scene("paris",'group',"15:15","仔仔：刚看到巴黎一个服装展的消息|仔仔：票价比我想的贵|胡枫：先存起来，回来再看要不要去|小辛：到时候大设计师记得我们"),
 scene("night",'group',"22:20","胡枫：我明天还得赶作业|阿威：明早练腿|小辛：我再打一局就睡|熙旺：阿蒙这两天好像挺忙的|仔仔：他忙起来就不怎么回群|小辛：晚安啦")
];
export const D05_PRIVATE=[
 scene("wang-morning","wang","08:05","熙旺：阿蒙，早|熙旺：我今天车排得满，晚上才收|熙旺：你那边有事打电话，别只发消息"),
 scene("hufeng-check","hufeng","10:00","胡枫：阿蒙，我人在首尔，电脑又开始发热|胡枫：我录个视频给你看，你有空帮我判断一下是不是风扇问题|胡枫：别急着回，知道你忙"),
 scene("zaizai-paris","zaizai","15:50","仔仔：阿蒙|仔仔：我想去巴黎看看服装和画展|仔仔：之前攒的钱又买布料了，得慢慢攒回来|仔仔：你要是看到便宜机票，记得告诉我"),
 scene("wang-evening","wang","20:50","熙旺：今天收车晚，刚吃上饭|熙旺：你晚上别一直盯电脑|熙旺：改天有空，哥带你出去走走")
];
export const D05_ALL=[...D05_GROUP,...D05_PRIVATE];
