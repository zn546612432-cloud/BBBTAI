// D11 · 2025-05-29. 傅隆生返澳门第三天：通过熙旺私聊召集；胡枫仍在韩国。
// 本模块只生产真实微信消息，不把线下会议里傅隆生说的话伪造成群聊。
const parse=body=>body.split('|').map(x=>{const i=x.indexOf('：');if(i<0)throw Error('Missing speaker');return {who:x.slice(0,i),text:x.slice(i+1),kind:'text'};});
const scene=(id,at,body,extra={})=>({id,chat:'group',at,lines:parse(body),...extra});
export const D11_GROUP=[
 scene('notice','09:15','熙旺：晚上七点半，老地方见|熙旺：干爹回来了，今天大家尽量过来|阿威：我晚上可以|仔仔：收到，我把手上的活弄完就去|小辛：啊？真的？|胡枫：我还在首尔，明晚才落地|熙旺：知道，航班号发我，我去接',{condition:s=>!!s.story55?.completed?.return}),
 scene('afternoon','15:20','阿威：我先去训练，结束直接过去|小辛：我带点喝的|仔仔：别买太多，我刚问过有人准备吃的',{condition:s=>!!s.story55?.completed?.return}),
 scene('after-meeting','22:20','仔仔：我到了|阿威：我也回去了|小辛：今天吃得够饱|胡枫：你们好歹给我留张照片|熙旺：胡枫，明晚机场见。早点休息',{condition:s=>!!s.story55?.completed?.return})
];
