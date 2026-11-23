// D53 action is conveyed through the existing WeChat scene engine.
export const D53_ACTION_START='d53-action-start';
export const D53_ACTION_END='failure';
export const D53_START_LINES=[
 ['熙旺','我準備好了。'],
 ['me','哥，我只給你這一次機會。'],
 ['me','警察來了必須要走。'],
 ['熙旺','明白。']
];
export const D53_END_LINES=[
 ['熙旺','都怪我。'],
 ['熙旺','就差一點，我本來可以制服那個警察的。'],
 ['me','好了，現在也別復盤了。'],
 ['me','天意如此。'],
 ['熙旺','你跟弟弟們都談過了嗎？'],
 ['me','嗯。'],
 ['me','他們相信我。'],
 ['熙旺','好。'],
 ['熙旺','我們一定會成功的。']
];
export function applyD53Definition(c){
 if(c.d53ActionRevision)return false;
 const scene=(id,at,title,requires,lines)=>{
  const node={id,day:53,at,title,channel:'wechat',conversationId:'wang',requires,kind:'scene',delivery:'queued',gateDay:53,pauseTimeUntilComplete:true,messagePrefix:'s55-'+id,initialDelayMs:0,pauseMs:3000};
  const i=c.nodes.findIndex(n=>n.id===id);
  if(i===-1)c.nodes.push(node);else c.nodes[i]=node;
  c.scenes[id]=structuredClone(lines);
 };
 scene(D53_ACTION_START,'20:00','行動前',['d47-wang'],D53_START_LINES);
 scene(D53_ACTION_END,'23:00','行動失敗',['confide','second','mercenary',D53_ACTION_START],D53_END_LINES);
 c.d53ActionRevision=1;
 return true;
}
