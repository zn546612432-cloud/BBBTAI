// D04 · 2025-05-22. 重写独立生活文案，保留稳定场景ID及一次性剧情分支。
const parse=body=>body.split('|').map(part=>{const at=part.indexOf('：');if(at<0)throw Error('缺少角色');const who=part.slice(0,at),text=part.slice(at+1);return {who:who==='熙蒙'?'me':who,text,kind:'text'};});
const scene=(id,chat,at,body,extra={})=>({id,chat,at,lines:parse(body),...extra});
export const D04_GROUP=[
 scene("morning","group","08:20","小辛：谁醒了|阿威：我刚从健身房出来|胡枫：我还在韩国图书馆|小辛：你们怎么都这么自律|熙旺：我已经出车了"),
 scene("earbuds","group","09:35","胡枫：在学校找了半天耳机，原来在书包夹层"),
 scene("video","group","10:50","胡枫：韩国这边小组作业要交视频了|仔仔：你拍完了吗|胡枫：剪到一半，电脑有点卡"),
 scene("lunch","group","12:10","小辛：中午点了咖喱鸡饭|阿威：我自己煮面|仔仔：我还在改图，等会再吃|熙旺：忙也记得按时吃"),
 scene("cat","group","13:25","小辛：楼下有只猫每天都蹲在那辆车上|小辛：今天居然让我摸了|阿威：运气不错"),
 scene("caught","group","14:30","胡枫：视频终于导出来了|胡枫：我要去睡几个小时"),
 scene("outfit","group","16:15","仔仔：试了半下午布料，还是不满意|小辛：我觉得你上次那件就挺好|仔仔：上次的版型跟这个不一样"),
 scene("dinner-plan","group","18:20","小辛：今晚有人出去吃吗|阿威：我练完直接回去了"),
 scene("dinner-confirmed","group","18:26","熙旺：我和阿蒙约了吃饭|小辛：行，给你们留个二人世界|胡枫：羡慕，我在首尔吃便利店",{"condition":"dinner"}),
 scene("dinner-unanswered","group","18:26","熙旺：阿蒙今天忙，改天再约|小辛：那我点外卖",{"condition":"no-dinner"}),
 scene("dinner-post","group","20:45","熙旺：吃过了，阿蒙还买了瓶水带回去|小辛：这有什么好汇报的哈哈|仔仔：挺好的",{"condition":"dinner"}),
 scene("night-games","group","22:30","小辛：有人打两把游戏吗|胡枫：我刚醒，今天真不行|阿威：我也要睡|小辛：好吧")
];
export const D04_PRIVATE=[
 scene("hufeng-am","hufeng","09:50","胡枫：阿蒙，我在首尔学校的电脑开视频总卡|胡枫：有空帮我看看是哪儿有问题|胡枫：我把参数发你，不急"),
 scene("hufeng-pm","hufeng","16:50","胡枫：刚才换了个设置，好多了|胡枫：你上次说先备份，我已经弄好了"),
 scene("wang-dinner","wang","17:55","熙旺：阿蒙，今晚你有空的话，哥带你去吃点东西|me：哥，我去|熙旺：那等我收车给你电话"),
 scene("wang-night","wang","22:10","熙旺：阿蒙，到家了记得发个消息|熙旺：今天我收得有点晚")
];
