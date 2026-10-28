export const apps = [
{id:'wechat',name:'微信',icon:0},{id:'camera',name:'相機',icon:1},{id:'photos',name:'相片',icon:2},{id:'notes',name:'備忘錄',icon:3},{id:'calendar',name:'日曆',glyph:'calendar'},{id:'weather',name:'天氣',glyph:'weather'},{id:'maps',name:'Google Maps',glyph:'maps'},{id:'clock',name:'時鐘',glyph:'clock'},
{id:'mirage',name:'MIRAGE',icon:8},{id:'ghost',name:'GHOST',icon:9},{id:'kira',name:'KIRA',icon:10},{id:'bank',name:'Pacific',icon:11},{id:'noapp',name:'NoApp',icon:12},{id:'chess',name:'國際象棋',icon:13},{id:'music',name:'音樂',icon:14},{id:'files',name:'檔案',icon:15},
{id:'mail',name:'郵件',icon:4},{id:'messages',name:'訊息',glyph:'messages'},{id:'reminders',name:'提醒事項',glyph:'reminders'},{id:'ig',name:'Instagram',glyph:'ig'},{id:'aomi',name:'澳覓',glyph:'aomi'},
{id:'phone',name:'電話',icon:7},{id:'safari',name:'Safari',icon:5},{id:'settings',name:'設定',icon:6}];
export const dock=['phone','wechat','safari','settings'];
export const defaultPages=[['photos','camera','notes','calendar','weather','maps','clock','music'],['mirage','ghost','kira','bank','noapp','chess','files','reminders'],['mail','messages','ig','aomi']];
const msg=(id,from,text,time='22:35')=>({id,from,text,time,kind:'text'});
export const seed={schemaVersion:1,revision:1,day:20,clock:'22:41',theme:'dark',wallpaper:'assets/wallpaper.png',icons:{},pages:defaultPages,focus:false,
conversations:[{id:'wang',name:'哥',subtitle:'熙旺',app:'wechat',avatar:'旺',unread:1,messages:[msg('w1','哥','阿蒙，食咗飯未？','22:18'),msg('w2','me','食咗啦。你呢？','22:20'),msg('w3','哥','我買咗宵夜。返嚟記得食。','22:39')]},
{id:'group',name:'GROUP',subtitle:'熙旺、熙蒙、胡楓、小辛、阿威、仔仔',app:'wechat',avatar:'六',unread:2,messages:[msg('g1','胡楓','聽日邊個得閒？','21:10'),msg('g2','小辛','先講做咩。','21:11'),msg('g3','阿威','食飯都要開會？','21:11'),msg('g4','哥','@熙蒙 記得落嚟，唔好又對住部電腦。','22:36')]},
{id:'xin',name:'小辛',subtitle:'微信',app:'wechat',avatar:'辛',unread:0,messages:[msg('x1','小辛','相片放喺共享資料夾。','昨天')]},
{id:'dr',name:'Dr. Ouroboros',subtitle:'加密連線 · 在線',app:'mirage',avatar:'◎',unread:1,messages:[msg('d1','Dr. Ouroboros','還沒睡？'),msg('d2','me','剛看完一部電影。'),msg('d3','Dr. Ouroboros','哪一部？','22:36')]},
{id:'rook',name:'Rookery 13',subtitle:'上次在線 18:24',app:'mirage',avatar:'R',unread:0,messages:[msg('r1','Rookery 13','附件已收到。多謝。','18:24')]},
{id:'nyx',name:'Nyx Voidwalker',subtitle:'離線',app:'mirage',avatar:'N',unread:0,messages:[msg('n1','Nyx Voidwalker','舊委託已經封存。','昨天')]},
{id:'tai',name:'熙泰',subtitle:'NoApp · 私人頻道',app:'noapp',avatar:'',unread:0,messages:[]},
{id:'sms',name:'Pacific Bank',subtitle:'系統通知',app:'messages',avatar:'P',unread:0,messages:[msg('s1','Pacific Bank','您有一份新的電子月結單。請於銀行 App 內查看。','昨天')]}],
notes:[{id:'note1',title:'留到下次',text:'那盤棋還沒有下完。\n\n下次記得問他，平時還看什麼電影。',fixed:true},{id:'note2',title:'要買的東西',text:'電池\n咖啡\n哥說的那間麵包',fixed:false}],
photos:[{id:'p1',title:'流光',src:'assets/wallpaper.png',favorite:false,deleted:false}],
reminders:[{id:'todo1',text:'返去記得食宵夜',done:false},{id:'todo2',text:'買電池',done:false}],
orders:[{id:'ORDER/3',title:'舊檔案校驗',owner:'Dr. Ouroboros',tag:'資料',reward:'工具資格',status:'開放',saved:true,body:'比對三組虛構檔案的校驗標記。保留異常記錄，附上來源。此為介面演示委託。'},{id:'ARCHIVE/12',title:'離線資料整理',owner:'Rookery 13',tag:'歸檔',reward:'MOP 240',status:'開放',saved:false,body:'整理舊資料夾中的索引，將重複版本分開。介面演示，不觸發正式劇情結算。'},{id:'WALL-83-R',title:'獨立子委託',owner:'Dr. Ouroboros',tag:'已完成',reward:'MOP 1,200',status:'已完成',saved:false,body:'D17 平台結算記錄。'}],
mail:[{id:'m1',from:'Pacific Bank',subject:'Your statement is ready',body:'Your fictional account statement is available in Pacific Bank.',read:false},{id:'m2',from:'MIRAGE · Settlement',subject:'WALL-83-R / settlement confirmed',body:'D17 · MOP 1,200. Payment settled through the platform.',read:true}],
transactions:[{id:'t1',title:'WALL-83-R',amount:1200,day:17}],calls:[],drafts:{},notifications:[{id:'nt1',title:'哥',body:'我買咗宵夜。返嚟記得食。',app:'wechat',chat:'wang'}],chessPgn:'',chessHistory:[],musicPlaying:false};
