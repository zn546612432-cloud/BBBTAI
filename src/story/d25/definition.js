// D25 confirmed copy. Existing Story55 queue owns the delivery and Send gates.
const group=[
 ['阿威','蒙哥，這是澳亞銀行的監控系統高清圖，還有他們安保系統的採購清單，有些不太確定的地方我標好了。'],
 ['阿威','security_survey_0612.zip'],
 ['me','收到'],
 ['熙旺','蒙蒙，上次說的那個程序弄好了嗎？'],
 ['熙旺','叫蠍尾蛇還是什麼的'],
 ['me','部署好了，是銜尾蛇之淚。'],
 ['me','一個專門針對網絡安全訓練的AI模型，可以自主分析系統、識別漏洞，還能根據分析結果進行測試。'],
 ['小辛','這個名字好裝'],
 ['me','我也覺得'],
 ['胡枫','這麼厲害？蒙哥你自己做的？'],
 ['me','是一個叫銜尾蛇的傳奇裝逼王給我的框架代碼'],
 ['小辛','哈哈哈哈哈什麼鬼傳奇裝逼王'],
 ['熙旺','就是那個給你一百萬的人嗎？'],
 ['me','以後跟你們細講，總之，我需要更多資料'],
 ['阿威','接下來就要看胡楓的美男計了'],
 ['仔仔','或許還有小辛的美女計'],
 ['小辛','根本沒有這樣的東西']
];
const mirage=[
 ['ouroboros','傳奇裝逼王？'],
 ['me','？？'],
 ['me','你又竊聽我的手機？'],
 ['ouroboros','給我解釋一下，這是什麼意思？'],
 ['me','你看不懂嗎？'],
 ['me','噢，差點忘了你是個小老外。'],
 ['me','英國佬還是葡萄牙人？'],
 ['ouroboros','查了這麼久，就查到這些？'],
 ['me','誰有空調查你。'],
 ['ouroboros','先顧好你手上的事吧，熙蒙。'],
 ['me','你連我的真名都知道，我卻連你叫什麼都不知道。'],
 ['me','不太公平吧？'],
 ['ouroboros','你什麼時候開始講究公平了？'],
 ['ouroboros','好好用我送你的東西。'],
 ['ouroboros','祝你好運，熙蒙。']
];
const definitions=[
 [{id:'d25-survey',day:25,title:'阿威的資料',kind:'scene',requires:['base'],at:'10:26',gateDay:25,holdAt03:true,delivery:'queued',channel:'wechat',conversationId:'group',messagePrefix:'s55-d25-survey',fileLines:[1]},group],
 [{id:'d25-ouroboros',day:25,title:'傳奇裝逼王',kind:'scene',requires:['d25-survey'],gateDay:25,holdAt03:true,delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',requiresContact:true,messagePrefix:'s55-d25-ouroboros'},mirage]
];
export function applyD25Definition(c){
 for(const [node,lines] of definitions){
  if(!c.nodes.some(n=>n.id===node.id))c.nodes.push(structuredClone(node));
  c.scenes[node.id]??=structuredClone(lines);
 }
}
