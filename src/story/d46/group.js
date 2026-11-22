export const D46_GROUP_ID='d46-group';
export const D46_GROUP_AT='18:10';
export const D46_GROUP=[
 ['胡枫','我今天出门看到有个很眼熟的人在摆摊，前几天好像也见过，在大街上喝水'],
 ['胡枫','我不知道是不是错觉'],
 ['阿威','可能是警察'],
 ['仔仔','我有点担心干爹，他才回来不久，对街道都不熟悉，他还喜欢自己出来买菜做饭'],
 ['熙旺','干爹那边我会看着的'],
 ['熙旺','大家这段时间都别出门，再坚持一会，等熙蒙安排']
];

export function applyD46Group(c){
 if(c.nodes.some(n=>n.id===D46_GROUP_ID))return false;
 c.nodes.push({id:D46_GROUP_ID,day:46,at:D46_GROUP_AT,title:'眼熟的人',channel:'wechat',conversationId:'group',requires:['d45-wang'],kind:'scene',delivery:'queued',gateDay:46,pauseTimeUntilComplete:true,messagePrefix:'s55-'+D46_GROUP_ID,initialDelayMs:0,pauseMs:3000,lineDelayMs:{1:5000,3:4500,4:5500}});
 c.scenes[D46_GROUP_ID]=structuredClone(D46_GROUP);
 return true;
}
