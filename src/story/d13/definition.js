import {D13_LINES,D13_PREVIOUS_LINES,D13_LEGACY_LINES,D13_VOICE_INDICES} from './content.js';
export const D13_WALLET_ID='s55-d13-wallet-50btc';
export const D13_MAIL_ID='s55-d13-wallet-mail';
export const D13_NODES=[
 {id:'d13-wallet-mail',day:13,at:'22:10',title:'MIRAGE 錢包通知',kind:'mail',requires:[],mail:D13_MAIL_ID,gateDay:13},
 {id:'d13-wallet-bind',day:13,title:'綁定電子錢包',kind:'wallet',requires:['d13-wallet-mail'],gateDay:13},
 {id:'d13-wallet-transfer',day:13,title:'電子錢包轉帳',kind:'wallet',requires:['d13-wallet-bind'],gateDay:13}
];
export function applyD13Definition(c){
 const current=c.scenes.intrusion,old=structuredClone(D13_LEGACY_LINES);
 old[5][1]='你的日程里写着汪杰和他的电子钱包，我想我们有必要把接下来的事情谈清楚。';
 const replace=[D13_LEGACY_LINES,old,D13_PREVIOUS_LINES].some(lines=>JSON.stringify(current)===JSON.stringify(lines));
 if(replace)c.scenes.intrusion=structuredClone(D13_LINES);

 for(const node of D13_NODES)if(!c.nodes.some(n=>n.id===node.id))c.nodes.push(structuredClone(node));
 // The 22:10 notification is a clock event, not a reward for completing the
 // daytime exhibition. Upgrade only the former default prerequisite on saves.
 const scheduledMail=c.nodes.find(n=>n.id==='d13-wallet-mail');
 if(JSON.stringify(scheduledMail?.requires)==='["exhibition"]')scheduledMail.requires=[];
 // The independently readable 29-day planning note must not block the
 // phone's overnight charge after the wallet call. Upgrade only legacy
 // default node config; leave custom author-authored gating alone.
 const planning=c.nodes.find(n=>n.id==='exhibition');
 if(planning?.gateDay===13&&planning.kind==='scene'&&
    JSON.stringify(planning.requires)==='["move"]')delete planning.gateDay;
 // Wallet transfer is triggered by the player after reading the mail and
 // binding the wallet; the earlier planning note is an independent event.
 const transfer=c.nodes.find(n=>n.id==='d13-wallet-transfer');
 if(JSON.stringify(transfer?.requires)==='["d13-wallet-bind","exhibition"]')
  transfer.requires=['d13-wallet-bind'];
 const n=c.nodes.find(n=>n.id==='intrusion');
 if(n){
  if(['["exhibition"]','["exhibition","d13-wallet-transfer"]'].includes(JSON.stringify(n.requires)))
   n.requires=['d13-wallet-transfer'];
  Object.assign(n,{at:'22:10',delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',messagePrefix:'s55-intrusion-v2',systemMessages:true,call:{id:'s55-d13-call-v2',displayName:'未知號碼',forced:true,autoAnswerMs:8000}});
 }
 const walletMail=c.mails.find(m=>m.id===D13_MAIL_ID);
 const target={id:D13_MAIL_ID,node:'d13-wallet-mail',from:'Mirage Wallet',subject:'待領取資產通知',body:'您有一筆數位資產待確認。\n資產數量：50.00000000 BTC\n狀態：待綁定錢包\n請登入 Mirage Wallet，綁定指定錢包以查看資產詳情及辦理後續操作。\n此郵件由系統自動發送，請勿直接回覆。',attachmentName:'wallet-binding.key',link:{appId:'mirage',route:'/wallet',params:{}}};
 if(!walletMail)c.mails.push(target);
 else if(['[MIRAGE] 50 BTC','數位資產入帳通知','待領取資產通知'].includes(walletMail.subject))Object.assign(walletMail,target);
 c.voiceAssets??={};c.voiceAssets.intrusion??={};
 if(replace){delete c.voiceAssets.intrusion[7];delete c.voiceAssets.intrusion[9];}
 for(const i of D13_VOICE_INDICES)c.voiceAssets.intrusion[i]??=`/assets/story55/d13/call-${i}.mp3`;
}
