import {D13_LINES,D13_LEGACY_LINES,D13_VOICE_INDICES} from './content.js';
export const D13_WALLET_ID='s55-d13-wallet-50btc';
export const D13_MAIL_ID='s55-d13-wallet-mail';
export const D13_NODES=[
 {id:'d13-wallet-mail',day:13,at:'22:10',title:'MIRAGE 錢包通知',kind:'mail',requires:['exhibition'],mail:D13_MAIL_ID,gateDay:13},
 {id:'d13-wallet-bind',day:13,title:'綁定電子錢包',kind:'wallet',requires:['d13-wallet-mail'],gateDay:13},
 {id:'d13-wallet-transfer',day:13,title:'電子錢包轉帳',kind:'wallet',requires:['d13-wallet-bind'],gateDay:13}
];
export function applyD13Definition(c){
 const current=c.scenes.intrusion,old=structuredClone(D13_LEGACY_LINES);
 old[5][1]='你的日程里写着汪杰和他的电子钱包，我想我们有必要把接下来的事情谈清楚。';
 const replace=[D13_LEGACY_LINES,old].some(lines=>JSON.stringify(current)===JSON.stringify(lines));
 if(replace)c.scenes.intrusion=structuredClone(D13_LINES);

 for(const node of D13_NODES)if(!c.nodes.some(n=>n.id===node.id))c.nodes.push(structuredClone(node));
 const n=c.nodes.find(n=>n.id==='intrusion');
 if(n){
  if(JSON.stringify(n.requires)==='["exhibition"]')n.requires=['d13-wallet-transfer'];
  Object.assign(n,{at:'22:10',delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',messagePrefix:'s55-intrusion-v2',systemMessages:true,call:{id:'s55-d13-call-v2',displayName:'未知號碼',forced:true,autoAnswerMs:8000}});
 }
 if(!c.mails.some(m=>m.id===D13_MAIL_ID))c.mails.push({
  id:D13_MAIL_ID,node:'d13-wallet-mail',from:'MIRAGE',subject:'[MIRAGE] 50 BTC',
  body:'之前懸賞贏的那個錢包入帳 50 枚比特幣，登入 MIRAGE 錢包快速綁定後可取款。',
  link:{appId:'mirage',route:'/wallet',params:{}}
 });
 c.voiceAssets??={};c.voiceAssets.intrusion??={};
 if(replace){delete c.voiceAssets.intrusion[7];delete c.voiceAssets.intrusion[9];}
 for(const i of D13_VOICE_INDICES)c.voiceAssets.intrusion[i]??=`/assets/story55/d13/call-${i}.mp3`;
}
