export const D45_WALLET_SCENE='d45-wallet-gift';
export const D45_PUBLISH='d45-private-publish';
export const D46_ACCEPT='d46-isolde-accept';
export const D46_CHAT='d46-isolde-chat';
export const D46_CONTACT='mc-isolde-mirage';
export const D46_MAIL='s55-d46-isolde-mail';
export const PRIVATE_ORDER='s55-private-contract';
export const PRIVATE_REMINDER='s55-private-contract-reminder';
export const PRIVATE_CONTRACT={id:PRIVATE_ORDER,title:'私人委託',owner:'@nya',category:'PRIVATE CONTRACT',risk:'HIGH',reward:'面議',description:'尋求外勤人員協助處理一項私人事務。具體委託內容另議。',playerPublished:true};

export const D45_WALLET_DIALOGUE=[
 ['tai','你的電子錢包我解凍了，裡面的50枚比特幣歸你了。'],
 ['me','那可是五百多萬美金啊，你要給我？'],
 ['tai','僱傭兵只會為錢賣命。'],
 ['tai','以防萬一，畢竟你比較窮。'],
 ['me','在你眼裡我到底是什麼形象？'],
 ['tai','你那件外套至少有一個星期沒換過了。'],
 ['tai','〔照片〕'],
 ['me','你怎麼會有這張照片？？？？？？？？？'],
 ['tai','我入侵過的可不止你的手機。'],
 ['me','快點刪掉！！！！！'],
 ['tai','噢？可這張是我的手機壁紙。'],
 ['me','你變態得讓我有點害怕了'],
 ['tai','50枚比特幣買一張照片，這麼划算的交易，你要拒絕嗎？'],
 ['me','……'],
 ['me','如果我發裸照的話可以加錢嗎？'],
 ['tai','……'],
 ['tai','你以為我沒有嗎？'],
 ['me','？？'],
 ['me','我現在後悔去巴黎了'],
 ['tai','另外，MIRAGE 還有不少委託。沒事的時候接幾個，總比搶劫安全。']
];
export const D46_DIALOGUE=[
 ['isolde','Hi.'],
 ['me','我需要一批澳門本地的打手。'],
 ['isolde','我是專業的蛇頭，你想要什麼樣的人，我都能找來。'],
 ['me','我要兩百個。'],
 ['isolde','對方什麼來頭？有多少人？'],
 ['me','就一個快七十歲的老頭。'],
 ['isolde','你在開玩笑？'],
 ['isolde','兩百個人對付一個老頭？'],
 ['me','做交易，最忌諱的就是問得太多。'],
 ['isolde','你說得對。'],
 ['isolde','那麼，你打算花多少錢招待這位老人家？'],
 ['me','既然只是個老頭，一個人五萬港幣。'],
 ['me','兩百個人就是一千萬，這筆生意可不小。'],
 ['isolde','成交。'],
 ['isolde','給我兩天時間。'],
 ['me','具體的時間和地點，到時候我會發給你。'],
 ['isolde','等你消息。']
];
export function applyD46Definition(c){
 if(c.d46Revision)return;
 const scene=(id,day,at,title,channel,conversationId,requires,lines,extra={})=>{
  c.nodes.push({id,day,at,title,channel,conversationId,requires,kind:'scene',delivery:'queued',gateDay:day,pauseTimeUntilComplete:true,messagePrefix:'s55-'+id,initialDelayMs:0,pauseMs:3000,...extra});
  c.scenes[id]=structuredClone(lines);
 };
 scene(D45_WALLET_SCENE,45,'10:30','電子錢包解凍','noapp','tai',['confide','recognition'],D45_WALLET_DIALOGUE,{imageLines:{6:'/assets/story55/d45-ximeng-photo.jpg'}});
 const morning=c.nodes.pop(),groupIndex=c.nodes.findIndex(n=>n.id==='d45-group');
 if(groupIndex>=0){c.nodes.splice(groupIndex,0,morning);c.nodes[groupIndex+1].requires.push(D45_WALLET_SCENE);}else c.nodes.push(morning);
 c.nodes.push({id:D45_PUBLISH,day:45,title:'發佈僱傭兵招募訂單',kind:'private-contract',requires:[D45_WALLET_SCENE],gateDay:45});
 c.nodes.push({id:D46_ACCEPT,day:46,at:'14:20',title:'委託已被接取',kind:'mail',requires:[D45_PUBLISH],autoComplete:true});
 c.mails.push({id:D46_MAIL,node:D46_ACCEPT,from:'MIRAGE',subject:'委託已被接取',body:'您的委託已由 Isolde Mirage 接取。\n\nMIRAGE 已為雙方建立加密通訊，請前往訊息頁面聯繫接單人。\n\n— MIRAGE'});
 scene(D46_CHAT,46,'14:23','Isolde Mirage','mirage',D46_CONTACT,[D46_ACCEPT],D46_DIALOGUE,{requiresContact:true});
 const payment=c.nodes.find(n=>n.id==='mercenary');
 if(payment){payment.day=48;payment.requires=[...new Set([...payment.requires,D46_CHAT])];payment.cost=1282051.28;payment.quotedAmount=10000000;payment.quotedCurrency='HKD';}
 c.d46Revision=1;
}
