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
 {id:'d41-opening',day:41,at:'23:30',title:'行動開始前',chat:'group',requires:['prep','recognition'],gateDay:41,holdAt03:true,lines:[
  ['小辛','我們就位了'],['熙旺','好，我和干爹也就位了'],['me','我在碼頭，連線正常'],['胡枫','Good show.']]},
 // The shared overnight ledger keeps D41 playable through D42 03:00.
 {id:'show',day:41,at:'02:00',afterMidnight:true,title:'行動結束',chat:'group',requires:['d41-opening'],gateDay:41,holdAt03:true,messagePrefix:'s55-d42-celebration',imageLines:{5:xinDogSticker('xin-dog-057')},lines:[
  ['熙旺','大家都配合得很好，很順利。'],['熙旺','恭喜，早點休息，明天按計劃。'],['小辛','這些警察真是比我想像中還笨誒，被蒙哥耍得團團轉，還得是蒙哥'],['me','崇拜我了？'],['小辛','你是我的神好吧'],['me','〔表情包〕'],['仔仔','蒙哥你也是我的神'],['阿威','蒙哥你也是我的神'],['胡枫','蒙哥你也是我的神']]}
];

export const D42_CALL={id:'d42-morning-call',day:42,at:'09:25',gapMs:2500,lines:[
 '昨天幹得不錯，nya。看著那些警察追著不存在的車，真是好戲一場。怎麼樣？現在想誇我還來得及。',
 '警察已經盯上你們了，一大早就去了汪杰家。',
 '不過別擔心，一切都在我的掌控之中。'
]};
export const RETIRED_SCENES=['target','confide','failure','ready'];
export function applyD34D42Definition(c){
 for(const {id,chat,lines,...data} of scenes){
  const n={id,kind:'scene',requires:['plan'],delivery:'queued',channel:'wechat',conversationId:chat,messagePrefix:'s55-'+id,...(data.gateDay?{}:{optional:true,throughDay:data.day}),...data};
  const old=c.nodes.findIndex(x=>x.id===id);
  if(old<0)c.nodes.push(n);else if(!c.nodes[old].authoredD34D42)c.nodes[old]=n;
  c.nodes.find(x=>x.id===id).authoredD34D42=true;
  if(id==='show'&&!c.d34D42Revision)c.scenes[id]=structuredClone(lines);
  else c.scenes[id]??=structuredClone(lines);
 }
 for(const id of RETIRED_SCENES)if(!c.d34D42Revision){
  const node=c.nodes.find(n=>n.id===id);if(node)node.authoredPending=true;
  c.scenes[id]=[];
 }
 c.d34D42Revision=1;
}
