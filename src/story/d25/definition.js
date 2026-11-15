// D25 confirmed copy. Existing Story55 queue owns the delivery and Send gates.
const group=[
 ['阿威','蒙哥，你要的資料都整理好了。'],
 ['阿威','有監控系統的高清圖，還有設備採購清單。'],
 ['阿威','security_survey_0612.zip'],
 ['me','收到。'],
 ['me','有設備型號就好辦多了。'],
 ['阿威','有幾個沒確認的，我在裡面標出來了。'],
 ['me','行，我先讓程序跑一遍。'],
 ['熙旺','蒙蒙，你上次說的那個程序弄好了？'],
 ['熙旺','叫蠍尾蛇還是什麼的。'],
 ['me','……銜尾蛇之淚。'],
 ['小辛','哈哈哈哈哈哈。'],
 ['me','部署好了，昨天做完的最後一輪測試。'],
 ['胡枫','它能做什麼？'],
 ['me','專門針對網絡安全訓練的 AI，可以自己收集資料、分析軟件、寫程序。'],
 ['me','以前要花幾個星期做的研究，現在可以交給它跑。'],
 ['阿威','那我給你的這些資料有用嗎？'],
 ['me','當然。'],
 ['me','我得先弄清楚銀行究竟在用什麼設備，才能知道我們之前的想法可不可行。'],
 ['仔仔','安保公司的資料也幫我留意一下。'],
 ['仔仔','衣服還沒全部做完。'],
 ['胡枫','我這兩天再確認一下。'],
 ['小辛','還得看我們阿楓的美男計。'],
 ['仔仔','或許還有你的美女計。'],
 ['小辛','根本沒有這樣的東西。'],
 ['胡枫','……'],
 ['熙旺','蒙蒙，這個程序是你自己做的？'],
 ['me','是一個叫銜尾蛇的傳奇裝逼王給我的框架代碼。'],
 ['小辛','哈哈哈哈哈哈什麼鬼傳奇裝逼王。'],
 ['熙旺','就是那個給你一百萬的人？'],
 ['me','對，以後跟你們細講。']
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
 [{id:'d25-survey',day:25,title:'阿威的資料',kind:'scene',requires:['base'],at:'10:26',gateDay:25,holdAt03:true,delivery:'queued',channel:'wechat',conversationId:'group',messagePrefix:'s55-d25-survey',fileLines:[2]},group],
 [{id:'d25-ouroboros',day:25,title:'傳奇裝逼王',kind:'scene',requires:['d25-survey'],gateDay:25,holdAt03:true,delivery:'queued',channel:'mirage',conversationId:'s55-ouroboros',requiresContact:true,messagePrefix:'s55-d25-ouroboros'},mirage]
];
export function applyD25Definition(c){
 for(const [node,lines] of definitions){
  if(!c.nodes.some(n=>n.id===node.id))c.nodes.push(structuredClone(node));
  c.scenes[node.id]??=structuredClone(lines);
 }
}
