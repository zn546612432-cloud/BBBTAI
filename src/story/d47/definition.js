import {D46_CHAT,D46_CONTACT} from '../d46/definition.js';

export const SOURCE_SCENE='d47-source';
export const SOURCE_FILE={id:'story-archive-d47-source',name:'SERVER_SOURCE.enc',day:47,messageId:'s55-d47-source-1',text:'SERVER_SOURCE\nPACKAGE: ENCRYPTED\nAUTHOR: Dr Ouroboros\nSTATUS: Awaiting TAI deployment'};
export const SOURCE_RESULT='程序已部署完畢，將電腦與入侵伺服器連接即可激活使用。';
export const DEPOSIT_SCENE='d50-deposit-request';
export const DEPOSIT_REPLY='d50-deposit-receipt';
export const DEPOSIT_ACCOUNT='000050004750';
export const DEPOSIT_HKD=5000000;
export const DEPOSIT_ID='s55-payment-mercenary';
export const DEPOSIT_USD=641025.64;

export function applyD47Definition(c){
 if(c.d47Revision)return false;
 const scene=(id,day,at,title,channel,conversationId,requires,lines,extra={})=>{
  c.nodes.push({id,day,at,title,channel,conversationId,requires,kind:'scene',delivery:'queued',gateDay:day,pauseTimeUntilComplete:true,messagePrefix:'s55-'+id,initialDelayMs:0,pauseMs:3000,...extra});
  c.scenes[id]=lines;
 };
 scene('d47-group',47,'16:25','被盯上了','wechat','group',['d46-group'],[
  ['me','干爹剛才傳了消息過來。'],['me','黃德忠和那個女警察搬到他隔壁了。'],
  ['小辛','？？？'],['胡枫','果然是警察。'],['仔仔','那干爹怎麼辦？'],['阿威','我們得想辦法把他接出來。'],
  ['me','巴黎畫展馬上就要撤展了，到時候我們必須走。'],['小辛','那干爹呢？'],
  ['me','換作今天被盯上的是我們，老頭子也會棄卒保帥。'],['me','相信我，聽我的安排。']
 ]);
 scene('d47-wang',47,'16:40','一次機會','wechat','wang',['d47-group'],[
  ['熙旺','蒙蒙，你打算怎麼做？'],['me','哥，我知道你狠不下心。'],
  ['me','警察暫時不會動干爹，他們想順藤摸瓜找到我們。'],['me','我給你一次機會。'],
  ['me','明天晚上，你去暗殺黃德忠。'],['me','如果成功了，我們就趁機救走老頭子。'],
  ['me','如果失敗了，你就得聽我的。'],['熙旺','好。'],['熙旺','謝謝。']
 ]);
 scene(SOURCE_SCENE,47,'21:30','源代碼','noapp','tai',['recognition','d47-wang'],[
  ['tai','源代碼已經寫好了。'],['tai',SOURCE_FILE.name],['tai','交給銜尾蛇之淚，剩下的工作由它完成。']
 ],{fileLines:[1],attachments:{1:{storyArchiveId:SOURCE_FILE.id}}});
 scene(DEPOSIT_SCENE,50,'10:00','委託訂金','mirage',D46_CONTACT,[D46_CHAT],[
  ['isolde','人已經安排好了。先付一半訂金。'],['isolde','收款人：Isolde'],['isolde','銀行帳號：'+DEPOSIT_ACCOUNT],['isolde','五百萬港幣。']
 ],{requiresContact:true});
 scene(DEPOSIT_REPLY,50,null,'訂金回執','mirage',D46_CONTACT,['mercenary'],[
  ['isolde','錢已收到。'],['me','等我通知。']
 ],{requiresContact:true,initialDelayMs:3000,pauseTimeUntilComplete:false});
 const payment=c.nodes.find(n=>n.id==='mercenary');
 if(payment){payment.cost=DEPOSIT_USD;payment.quotedAmount=DEPOSIT_HKD;payment.quotedCurrency='HKD';payment.requires=[...new Set([...payment.requires,DEPOSIT_SCENE])];}
 const second=c.nodes.find(n=>n.id==='second');
 if(second){second.day=47;second.requires=[SOURCE_SCENE];}
 const project=c.projects.find(p=>p.id==='second');if(project)project.day=47;
 c.d47Revision=1;
 return true;
}
