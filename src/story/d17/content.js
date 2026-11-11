// User-approved D17 copy. These are content definitions, never another scheduler.
export const D17_INVITATION_ID='azathoth-invitation';
export const D17_INVITATION_NODE={
 id:D17_INVITATION_ID,day:17,at:'19:00',title:'Azathoth 的邀請',kind:'scene',
 requires:['intrusion','code','loan'],delivery:'queued',channel:'mirage',
 conversationId:'s55-ouroboros',messagePrefix:'s55-d17-invitation'
};
export const D17_INVITATION_LINES=[
 ['ouroboros','部署得如何？'],
 ['me','剛訂了設備，還沒那麼快到。'],
 ['me','不過不得不說，你還挺有本事。我記得「NS」是 Azathoth 的內部項目吧？那東西從來沒公開過源碼。'],
 ['me','你是自己復刻的，還是有人幫你？'],
 ['ouroboros','那就是我寫的。'],
 ['me','你寫的？'],
 ['me','你也是 Azathoth 的成員？'],
 ['ouroboros','聽起來你對這個組織很熟悉。'],
 ['ouroboros','為什麼？'],
 ['me','我以前自學的時候，看過他們公開的很多項目和教程。'],
 ['me','說實話，幫了我不少忙。'],
 ['me','他們有自己的內部論壇，只有會員才能進。裡面的資料很難找，外面甚至有人高價倒賣。'],
 ['ouroboros','倒賣的，一經發現就會被除名。'],
 ['me','你怎麼知道得這麼清楚？'],
 ['me','等等，你真的是他們的人？'],
 ['ouroboros','準確地說。'],
 ['ouroboros','Azathoth 的現任管理員，是我。'],
 ['me','……你？'],
 ['me','真的假的？'],
 ['ouroboros','我有必要騙你？'],
 ['me','你騙我的事還少嗎？'],
 ['ouroboros','呵。'],
 ['ouroboros','既然你叫 NYARLATHOTEP，應該知道祂與 Azathoth 的關係吧？'],
 ['ouroboros','怎麼樣，有沒有興趣來當我的使者？'],
 ['ouroboros','我的千面之神。'],
 ['me','你是說……加入 Azathoth？'],
 ['ouroboros','不然呢？'],
 ['me','你先證明你真的是管理員。'],
 ['ouroboros','呵呵……'],
 ['ouroboros','等你把程序部署完，我會讓你親眼看看。']
];

export const D17_FORUM={
 id:'d17-xingyue',title:'求助，男朋友的手機是不是中病毒了？',
 date:'2024-11-08',author:'樓主',code:'TWlyYWdl',
 excerpt:'男朋友的手機最近收到好多奇怪的亂碼短信，看起來像一串串代碼。是不是中病毒了？有人知道這是怎麼回事嗎？',
 comments:[
  {id:'fish',author:'憂傷的魚',text:'這串不是亂碼，是 Base64 編碼。像「TWlyYWdl」這一串，解碼後就是 Mirage。這是一個暗網論壇的名字，你男朋友是不是有什麼事背著你？不會在暗網下過單吧？很恐怖欸！樓主要小心，快分了吧。'},
  {id:'op-reply',parent:'fish',author:'樓主',text:'Mirage 嗎？我搜不到這個網站。'},
  {id:'fish-reply',parent:'op-reply',author:'憂傷的魚',text:'暗網怎麼可能用正常途徑搜得到嘛！我猜樓樓應該對這些了解很少。偷偷告訴你，有一個很龐大的黑客組織叫「Azathoth」，會用釣魚網站偽裝成暗網入口，誘騙你們點擊，然後盜刷你們的銀行卡……所以千萬不要隨便點擊啊！'}
 ]
};
export const D17_WEB_PAGES=[
 {id:'d17-mirage-old',title:'Mirage — Community Portal',url:'https://mirage-archive.example/',label:'Mirage',keywords:['mirage'],desc:'Mirage 社群入口與會員登入。',failure:'expired'},
 {id:'d17-mirage-fake',title:'Mirage｜登入',url:'https://mirage-access.example/login',label:'Mirage',keywords:['mirage'],desc:'會員專用入口。登入以繼續瀏覽。',failure:'unsafe'},
 {id:D17_FORUM.id,title:D17_FORUM.title+' — 星月論壇',url:'https://xingyue.example/thread/18427',label:'星月論壇',keywords:['mirage','星月論壇'],desc:'憂傷的魚：這串不是亂碼，是 Base64 編碼。解碼後就是 Mirage……',forum:true},
 {id:'d17-mirage-outdated',title:'MIRAGE / 舊版入口',url:'https://mirage-old.example/index.html',label:'MIRAGE',keywords:['mirage'],desc:'社群公告、舊版入口與連線資訊。',failure:'outdated'},
 {id:'d17-azathoth',title:'Azathoth',url:'https://reference.example/entry/azathoth',label:'詞條',keywords:['azathoth'],reference:true}
];
export const D17_NOTE_TEXT=[
 '星月論壇舊帖：'+D17_FORUM.title,
 '樓主稱男友收到多封奇怪的編碼短信。',
 ...D17_FORUM.comments.map(c=>c.author+'：'+c.text),
 'TWlyYWdl → Mirage。Base64 是編碼，不是加密。',
 '關於暗網、釣魚入口、盜刷及 Azathoth 的說法均來自「憂傷的魚」，尚未核實。'
].join('\n\n');
