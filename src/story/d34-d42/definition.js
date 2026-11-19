import {xinDogSticker} from '../../services/assets/xin-dog-stickers.js';

// Confirmed copy only. All dialogue uses the existing native Send / reply cadence.
const scenes=[
 {id:'d34-wang',day:34,at:'00:00',throughDay:38,title:'心事',chat:'wang',requires:['recognition'],lines:[
  ['熙旺','蒙蒙，你這兩天有心事？'],['me','沒有啊'],['熙旺','今天吃飯叫了你好幾聲都沒聽見。'],['me','在想事情。'],['熙旺','計劃的事？'],['me','算是吧。'],['熙旺','有什麼想不明白的，跟哥說說。'],['me','哥'],['me','算了，沒事。'],['熙旺','好。'],['熙旺','想說的時候再來找我。']]},
 {id:'d35-training',day:35,at:'17:42',title:'訓練',chat:'group',lines:[
  ['小辛','我今天又沒做錯'],['熙旺','你停下來等仔仔了。'],['小辛','那我總不能丟下他吧？'],['仔仔','誰要你等我了😑'],['熙旺','再練一次，下次不用等。'],['小辛','哥！！'],['胡枫','你還是聽大哥的吧。'],['仔仔','你也閉嘴，今天念了我一下午。'],['阿威','可以吃飯了嗎'],['me','我餓了'],['熙旺','收拾一下，回家吃飯。'],['小辛','好耶']]},
 {id:'d36-awei',day:36,at:'18:36',title:'宵夜',chat:'awei',lines:[
  ['阿威','仔仔說我們弄了一下午的網吧'],['me','他有本事別連我的WiFi'],['阿威','哈哈哈哈哈哈'],['阿威','蒙哥，一會去吃宵夜嗎？'],['me','吃什麼'],['阿威','牛雜？'],['me','行'],['阿威','叫上大哥？'],['me','他今晚跟干爹出去'],['阿威','那就我們兩個'],['me','等我洗個澡，身上全是灰'],['阿威','好，我樓下等你']]},
 {id:'d37-workstation',day:37,at:'16:21',title:'大功告成',chat:'group',imageLines:{1:'/apps/wechat/media/d37-workstation.webp'},lines:[
  ['me','大功告成😎'],['me','〔移動工作站照片〕'],['小辛','這一車值多少錢？'],['me','反正比你的車貴'],['小辛','……'],['小辛','@熙旺 哥你看他'],['熙旺','你二哥自己掙的錢。'],['小辛','我也想要個有錢的哥哥。'],['me','？'],['仔仔','你不是已經有了嗎'],['小辛','他不給我花😭'],['me','上個月誰找我要的十萬塊？'],['小辛','撤回'],['阿威','笑死']]},
 {id:'d38-clothes',day:38,at:'18:12',title:'一家人',chat:'group',lines:[
  ['仔仔','@所有人 衣服放在你們各自的房間了'],['me','怎麼我也有？'],['仔仔','你的尺寸又沒變，順手做了一套。'],['me','我又不用跟你們一起進去'],['仔仔','一家人就要穿得整整齊齊。'],['小辛','哈哈哈哈哈哈一家人'],['me','神經病'],['仔仔','穿上給我看看。'],['me','不要'],['仔仔','二哥🥺'],['me','……'],['me','來我房間。'],['仔仔','❤️']]},
 {id:'d39-wang',day:39,at:'16:48',title:'數字人',chat:'wang',requires:['recognition','plan'],requiresModels:true,lines:[
  ['me','哥你在哪'],['熙旺','樓下。'],['me','上來上來'],['熙旺','怎麼了？'],['me','給你看個東西'],['me','之前跟你說的數字人做出來了'],['熙旺','等我一下。'],['me','別叫小辛上來，他又要碰我電腦'],['熙旺','哈哈，好。']]},
 {id:'d41-opening',day:41,pauseTimeUntilComplete:true,at:'23:30',title:'行動開始前',chat:'group',requires:['prep','recognition'],gateDay:41,holdAt03:true,lines:[
  ['小辛','我們就位了'],['熙旺','好，我和干爹也就位了'],['me','我在碼頭，連線正常'],['胡枫','Good show.']]},
 // The shared overnight ledger keeps D41 playable through D42 03:00.
 {id:'show',day:41,pauseTimeUntilComplete:true,at:'02:00',afterMidnight:true,title:'行動結束',chat:'group',requires:['d41-opening'],gateDay:41,holdAt03:true,messagePrefix:'s55-d42-celebration',imageLines:{5:xinDogSticker('xin-dog-057')},lines:[
  ['熙旺','大家都配合得很好，很順利。'],['熙旺','恭喜，早點休息，明天按計劃。'],['小辛','這些警察真是比我想像中還笨誒，被蒙哥耍得團團轉，還得是蒙哥'],['me','崇拜我了？'],['小辛','你是我的神好吧'],['me','〔表情包〕'],['仔仔','蒙哥你也是我的神'],['阿威','蒙哥你也是我的神'],['胡枫','蒙哥你也是我的神']]},
 {id:'d42-wang',day:42,at:'10:06',title:'那個黑客',chat:'wang',requires:['show'],lines:[
  ['me','哥，警察今早去汪杰家了。'],['熙旺','你怎麼知道的？'],['me','有人告訴我的。'],['熙旺','還是那個黑客？'],['me','聰明'],['熙旺','你最近好像跟他走得很近。'],['me','怎麼，吃醋了？'],['熙旺','少貧嘴。'],['me','嘻嘻'],['me','等這次行動結束，我介紹你們認識。'],['me','說不定你會喜歡他。']]},
 {id:'d42-operation-1',day:42,pauseTimeUntilComplete:true,at:'14:30',title:'行動中',channel:'noapp',chat:'tai',gateDay:42,requires:['show'],lines:[
  ['tai','TAI已經寫好程序了。'],['me','好']]},
 {id:'d42-operation-2',day:42,pauseTimeUntilComplete:true,at:'14:35',title:'段志鴻',channel:'noapp',chat:'tai',gateDay:42,requires:['d42-operation-1'],lines:[
  ['tai','段志鴻？把他的資料拷貝下來。他的密鑰一定在裡面。'],['me','我和你想法一樣。']]},
 {id:'d42-operation-3',day:42,pauseTimeUntilComplete:true,at:'15:05',title:'有驚無險',channel:'noapp',chat:'tai',gateDay:42,requires:['d42-operation-2'],lines:[
  ['tai','有驚無險。'],['tai','接下來我們還要拿到他的錢包帳戶。'],['me','你有想法嗎？'],['tai','大概有了。回來再說。']]},
 {id:'target',day:42,pauseTimeUntilComplete:true,at:'15:50',title:'傅隆生',channel:'noapp',chat:'tai',gateDay:42,requires:['d42-operation-3'],messagePrefix:'s55-d42-operation-4',lines:[
  ['tai','傅隆生是瘋子'],['tai','我對他的判斷錯了，他是一個危險人物，而且不會信任任何人。'],['me','這一點你和他倒是很像。到現在為止，你都沒有對我透露過你自己的事'],['tai','你是黑客，靠你自己的本事查'],['me','你只是在迴避話題。不肯透露自己的事，卻對我那麼感興趣'],['me','你真的是我弟弟？還是說，你其實是一個暗戀分子'],['tai','nya，我看你被打傻了'],['tai','認真的。等這件事情結束，離開澳門吧。英國也好葡萄牙也好，我可以給你們辦好護照。傅隆生很危險。'],['me','我當然想走，但是很棘手。我要做一個計劃，還有關於熙旺。我還沒真正問過他的想法'],['tai','他會聽你的話的']]},
 {id:'d42-group',day:42,pauseTimeUntilComplete:true,at:'16:30',title:'干爹',chat:'group',gateDay:42,requires:['target'],lines:[
  ['阿威','蒙哥沒事吧？'],['仔仔','嚇死我了，我從來沒見過干爹發那麼大脾氣'],['小辛','我差點被踹死了……'],['仔仔','還好我們拉著啊不然這要怎麼搞'],['小辛','其實都怪我，是我要拷貝'],['阿威','我們一起的主意，不是你的錯'],['胡枫','有驚無險只能說，我預料到干爹會生氣，但沒想到他動手打蒙哥'],['胡枫','@熙蒙你還好嗎？'],['me','沒事'],['me','老頭子年紀大了，遇到不懂的事情只會發脾氣'],['熙旺','干爹也是擔心我們'],['me','可我今天差點就死了，哥，你也看到了'],['me','你還要幫他說話'],['熙旺','我不是這個意思蒙蒙'],['小辛','真的，蒙哥差一點死了，這次我覺得干爹真的太過了'],['熙旺','嗯…'],['熙旺','阿蒙，晚點我過來']]},
 {id:'d42-zai',day:42,at:'16:30',title:'沒事就好',chat:'zaizai',requires:['d42-group'],lines:[
  ['仔仔','哥你沒事吧？'],['me','沒事，放心'],['仔仔','嚇死我了，沒事就好']]},
 {id:'d43-xin',day:43,at:'09:40',title:'開團秒跟',chat:'xiaoxin',requires:['d42-group'],lines:[
  ['小辛','哥，你的臉沒事吧？'],['me','沒事'],['小辛','蒙哥'],['小辛','就是想告訴你，不管你做什麼決定，我都會開團秒跟'],['me','好'],['me','我們都會過上自己想要的人生。']]}
];

export const D41_CALL={id:'d41-night-call',day:41,pauseTimeUntilComplete:true,at:'23:40',completionMatch:'s55-d41-chess-invite',gapMs:2500,triggerKey:'d41CallTriggered',steps:[
 ['tai','我已經連上了附近監控，目前一切安全。不信的，你可以自己來看。'],
 ['me','可我眼皮總跳。左眼跳財右眼跳災，我們真的安全？'],
 ['me','忘了你是外國人，聽不懂'],
 ['tai','相信我'],
 ['tai','對了 既然是鬼車陷阱，要不要來跟我下一盤國際象棋？'],
 ['invite','s55-d41-chess-invite'],
 ['tai','別告訴我你還沒搞明白國際象棋怎麼下。']
]};
export const D42_CALL={id:'d42-morning-call',day:42,pauseTimeUntilComplete:true,at:'09:25',triggerKey:'d42CallTriggered',gapMs:2500,lines:[
 '昨天幹得不錯，nya。看著那些警察追著不存在的車，真是好戲一場。怎麼樣？現在想誇我還來得及。',
 '警察已經盯上你們了，一大早就去了汪杰家。',
 '不過別擔心，一切都在我的掌控之中。'
]};
export const RETIRED_SCENES=['confide','failure','ready'];
export const TIMED_SCRIPTED_CALLS=[D41_CALL,D42_CALL];
export function applyD34D42Definition(c){
 for(const {id,chat,lines,...data} of scenes){
  const n={id,kind:'scene',requires:['plan'],delivery:'queued',channel:'wechat',conversationId:chat,messagePrefix:'s55-'+id,...(data.gateDay?{}:{optional:true,throughDay:data.day}),...data};
  const old=c.nodes.findIndex(x=>x.id===id);
  if(old<0)c.nodes.push(n);else if(!c.nodes[old].authoredD34D42||id==='target'&&!c.d42OperationRevision)c.nodes[old]=n;
  c.nodes.find(x=>x.id===id).authoredD34D42=true;
  if(data.pauseTimeUntilComplete){
   const node=c.nodes.find(x=>x.id===id);
   // Apply the new timing flag to existing authored saves without replacing dialogue.
   Object.assign(node,{pauseTimeUntilComplete:true,day:data.day,at:data.at,gateDay:data.gateDay,afterMidnight:!!data.afterMidnight,optional:false});
  }
  if(id==='show'&&!c.d34D42Revision||id==='target'&&!c.d42OperationRevision)c.scenes[id]=structuredClone(lines);
  else c.scenes[id]??=structuredClone(lines);
 }
 for(const id of RETIRED_SCENES)if(!c.d34D42Revision){
  const node=c.nodes.find(n=>n.id===id);if(node)node.authoredPending=true;
  c.scenes[id]=[];
 }
 c.d34D42Revision=1;
 c.d42OperationRevision=1;
}
