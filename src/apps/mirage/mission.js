// Fictional, local-only mission bridge. The other apps own their eventual gameplay.
export const HACKER_BOUNTY_ID='mirage-recruit-hacker';
export const HACKER_MAIL_ID='mirage-new-order';
export const HACKER_TARGET='xxx';
export const hackerBounty={id:HACKER_BOUNTY_ID,title:'招募黑客',owner:'xxx',reward:'$ 3,000,000',category:'CYBER',status:'OPEN',description:'窃取目标信息。'};
export const phishingThemes=[
 {id:'board-meeting',label:'董事会会议资料',subject:'董事会会议资料查阅',correct:true},
 {id:'entertainment',label:'娱乐新闻推送',subject:'今日娱乐快讯'},
 {id:'invoice',label:'私人账单提醒',subject:'账单提醒'}
];
export const hackerMail=()=>({id:HACKER_MAIL_ID,orderId:HACKER_BOUNTY_ID,from:'xxx · MIRAGE',subject:'【mirage】新订单',body:'xxx：hi，大名鼎鼎的 NYARLATHOTEP，我有一个三百万的大单子，你肯定感兴趣。非常简单。大人物们在打商战，其中一名主席候选人想知道自己的对手 xxx 是否有一些黑料。我相信你很擅长。\n\n任务具体步骤：\n1. 在浏览器搜索 xxx。\n2. 编辑一条与目标有关的钓鱼邮件，选择主题并亲自发送。\n3. 在 GHOST 工具箱中完成防火墙密钥重组。',read:false,missionStep:1});
export function acceptHackerBounty(store){store.update(s=>{const order=s.content.orders.find(o=>o.id===HACKER_BOUNTY_ID);if(!order||order.status==='ACCEPTED'||order.status==='COMPLETED')return;order.status='ACCEPTED';if(!s.content.mail.some(m=>m.id===HACKER_MAIL_ID))s.content.mail.unshift(hackerMail());});}
export function advanceHackerMission(store,step){store.update(s=>{const mail=s.content.mail.find(m=>m.id===HACKER_MAIL_ID);if(mail)mail.missionStep=Math.max(mail.missionStep||1,step);});}
