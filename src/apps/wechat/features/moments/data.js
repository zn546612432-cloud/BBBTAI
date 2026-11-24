// Fictional in-game posts. D01 = 2025-05-19, D90 = 2025-08-16.
export const profiles={
 '熙蒙':{bio:'',cover:'ximengCover'},
 '熙旺':{bio:'平安是福',cover:'dawn'},
 '胡枫':{bio:'눈을 한 번 더 보자',cover:'hufengCover'},
 '小辛':{bio:'帅哥无所畏惧✌️',cover:'xiaoxinCover',coverPosition:'center top'},
 '阿威':{bio:'今天也要好好练。',cover:'gym'},
 '仔仔':{bio:'缝缝补补的日常 🧵',cover:'seoul'},
 '傅隆生':{bio:'',cover:'harbor'}
};
const dayDate=day=>new Date(Date.UTC(2025,4,19)+(day-1)*86400000).toISOString().slice(0,10);
const c=(by,text)=>({by,text});
const p=(id,day,time,author,text,media,comments,options={})=>({
 id,storyDay:day,author,publishedAt:dayDate(day)+'T'+time,text,media,comments,...options
});
export const authoredMoments=[
 p('xw-0519',1,'07:30','熙旺','今天的云很好看。',['morning'],[c('阿威','天气真好')],{likes:['小辛','阿威']}),
 p('xs-0519',1,'23:05','小辛','笑死，今天有人出门忘记带鞋。',[],[c('胡枫','你直接报我身份证好了'),c('仔仔','怎么做到的哈哈哈')]),
 p('xs-d03',3,'11:25','小辛','早飯午飯一起解決了',['d03Breakfast'],[c('仔仔','你不是說要減肥嗎'),c('小辛','明天開始')]),
 p('xw-d03',3,'19:15','熙旺','今天難得收工早。',['d03Street'],[],{likes:['胡楓','仔仔','小辛','阿威'],replyOptions:['想你了快回來']}),
 p('xs-d04',4,'14:20','小辛','偷拍成功✌️ 蒙蒙哥工作模式 ON，喊了三次都不理我。',['xmCaught'],[c('胡枫','照片發我'),c('熙旺','讓他休息一會兒')],{replyOptions:['刪掉'],replyRules:[{id:'d04-xiaoxin-not-delete',trigger:'刪掉',by:'小辛',text:'不刪，多帥啊哥',once:true}]}),
 p('xw-d04',4,'20:31','熙旺','和阿蒙出來吃飯。',['xmDinner','dinnerDish'],[c('小辛','好啊你們，偷偷吃好的'),c('阿威','下次叫我')],{replyOptions:['第二張照片看起來很帥。']}),
 p('xs-d05',5,'10:45','小辛','相册里有个人长得好帅，原来是我',['xiaoxinMirror'],[c('胡枫','猪来的。'),c('小辛','不接受反駁')],{likes:['仔仔','阿威']}),
 p('aw-d05',5,'16:40','阿威','练完。',['aweiTraining'],[c('小辛','借我拍一張'),c('阿威','自己練')],{pinned:true,likes:['熙旺','仔仔']}),
 p('xm-d05',5,'22:10','熙蒙','今天先這樣。剩下的明天再說。',[],[c('熙旺','早點休息')],{likes:['仔仔']}),
 p('xs-d06',6,'18:24','小辛','一起看个日落叭',['xiaoxinSunsetCover'],[c('仔仔','你什么时候拍的？！！'),{by:'小辛',to:'仔仔',text:'🕶️路过黑沙滩不得不来整一下'},c('胡枫','这么韩，过来韩国陪我'),{by:'小辛',to:'胡枫',text:'给我买头等舱机票我全天候可✈️'}],{kind:'video',video:'xiaoxinSunsetVideo',pinned:true,likes:['熙蒙','熙旺','胡枫','仔仔','阿威']}),
 p('xs-d07',7,'22:14','小辛','这首才叫真正的音乐。今天循环到耳机发烫。',[],[c('胡枫','你又在安利 SEVENTEEN'),c('仔仔','歌名收下了')],{kind:'music',music:{trackId:'fuck-my-life',title:'fu*k my life',artist:'SEVENTEEN',album:'FML'}}),
 p('xw-d11',11,'06:18','熙旺','出车前的街道，安静得像还没醒。',[],[c('熙蒙','路上小心')]),
 p('hf-d12-homecoming',12,'15:00','胡枫','집에 간다. 마카오가 그리웠어.',['hufengD12Homecoming'],[]),
 p('xm-d13',13,'01:12','熙蒙','我讨厌大扫除',[],[c('仔仔','可是蒙哥你的东西都是我们帮你搬的！'),c('熙蒙','我站在那里也累到了')],{likes:['小辛','仔仔']}),
 p('zz-d15',15,'18:35','仔仔','猜猜谁该减肥了。',['brothers'],[c('熙蒙','你说谁？'),c('熙旺','我没说累'),c('小辛','这题我不敢答')],{pinned:true,likes:['小辛']}),
 p('aw-d17',17,'20:10','阿威','走在路上被健身房招去当教练，哈哈。',[],[c('小辛','该出卖身体赚钱了'),{by:'阿威',to:'小辛',text:'为什么从你嘴里说出来的话都那么奇怪'}]),
 p('xw-d23',23,'12:28','熙旺','窗边这个位置，能坐一下午。',['fountain'],[c('熙蒙','你不是说只喝杯茶？'),c('阿威','风景真好')]),
 p('aw-d24',24,'17:20','阿威','新造型……仔仔说看起来很男大',['aweiStyle'],[c('小辛','这眼镜好眼熟好像是我的'),c('仔仔','超适合你的！')],{likes:['仔仔','小辛','阿威','熙旺','胡枫']}),
 p('xs-d25',25,'17:46','小辛','发一张今天最满意的照片。',['xiaoxinD25Selfie'],[c('胡枫','还行吧'),c('仔仔','帅的')]),
 p('xm-d27',27,'02:11','熙蒙','凌晨两点。键盘的声音有点像下雨。',[],[c('熙旺','早点睡'),c('小辛','你真的需要休息')]),
 p('aw-d29',29,'19:30','阿威','耍起！',['aweiFriends'],[],{likes:['熙蒙','熙旺','胡枫','仔仔','小辛']}),
 p('xw-d30',30,'12:08','熙旺','菜单翻了半天，最后还是先点了这盘。下次带你们吃烧腊。',['foodMenu','foodRice'],[c('熙蒙','说好了'),c('小辛','烧腊我要加饭')]),
 p('xw-d35',35,'07:30','熙旺','原來澳門真的有大熊貓',['park'],[c('熙蒙','它刚才看我了'),c('阿威','下次我也去')]),
 p('xs-d37',37,'00:02','小辛','我只是想刷十分钟手机。',[],[c('胡枫','然后刷到了现在？')]),
 p('aw-d39',39,'19:17','阿威','风景好，心情靓到想打一套拳',['aweiFountainFront','aweiFountainBack'],[c('熙旺','阿威又瘦了'),{by:'阿威',to:'熙旺',text:'现在流行薄肌😎'}],{likes:['熙蒙','仔仔','小辛','阿威','熙旺','胡枫']}),
 p('hf-d41',41,'23:35','胡枫','good show.',['d41GoodShow'],[c('仔仔','帅气逼人组合'),{by:'小辛',to:'仔仔',text:'原地出道。'}],{likes:['小辛','仔仔','阿威','熙旺'],reactionsAt:dayDate(42)+'T02:00'}),
 p('xm-d44',44,'13:08','熙蒙','我讨厌西湖醋鱼。',[],[c('胡枫','我也讨厌西湖醋鱼'),c('仔仔','+1')],{likes:['熙旺']}),
 p('xw-d49',49,'08:25','熙旺','',['d49Moon'],[c('胡枫','好看好看。')],{kind:'music',likes:['熙蒙','小辛','仔仔','阿威','胡枫'],music:{trackId:'fuck-my-life',title:'fu*k my life',artist:'SEVENTEEN',album:'FML'}}),
 p('xs-d51',51,'00:21','小辛','愛上你 是命是病 是明知得不到的回應\n\n我最親愛的炸雞🍗',[],[],{kind:'music',likes:[],music:{trackId:'ten-thousand-and-one',title:'一万零一次沉溺',artist:'李佳薇'}}),
 p('xs-d58',58,'16:35','小辛','刚剪完头发，允许你们夸三句。',['xiaoxinSelfie'],[c('胡枫','第一句：还行'),c('阿威','第二句：不错'),c('熙蒙','第三句：去吃饭')]),
 p('xw-d61',61,'09:12','熙旺','今天不出车，带弟弟们吃饭。',['foodSashimi','foodScallop'],[c('熙蒙','好'),c('小辛','我第一个到'),c('阿威','等我训练完')]),
 p('xm-d63',63,'01:45','熙蒙','终于把那个一直报错的东西修好了。',[],[c('胡枫','可以先帮我看一下吗'),c('熙旺','明天再说')]),
 p('xs-d66',66,'18:39','小辛','吃饭前最后自拍一张。相册里这张先不要删。',['xiaoxinMirror'],[c('胡枫','你相册里有删过自拍吗'),c('仔仔','这张可以留')]),
 p('xw-d70',70,'18:18','熙旺','我希望大家都能过上想要的日子。',['groupPhoto'],[c('熙蒙','会的，哥'),c('胡枫','合照发群里！'),c('小辛','我好像闭眼了'),c('仔仔','这张很好')],{pinned:true}),
 p('xs-d73',73,'18:42','小辛','先吃饭！！其他的回头再说。',['foodRice','foodCheesecake'],[c('阿威','给我留点'),c('胡枫','终于有人说了')]),
 p('xm-d78',78,'16:28','熙蒙','我哥真厉害！',['arcade'],[c('熙旺','你拍了多少张'),c('胡枫','战利品呢？'),c('小辛','下次带我去')]),
 p('xw-d82',82,'08:32','熙旺','窗外这片光很好，想留给你们看。',['fountain','dawn'],[c('熙蒙','收到'),c('阿威','早安')]),
 p('xm-d90',90,'08:02','熙蒙','今天，先把手机放下，去见想见的人。',[],[c('熙旺','我在楼下'),c('胡枫','马上到'),c('小辛','等等我！')])
];
// 仔仔很少发动态，更多时候只是刷到朋友的照片顺手点赞。
const zaizaiLiked=new Set(['xs-d04','xw-d04','xm-d15','xs-d25','xw-d35','xs-d58','xw-d61','xw-d70','xm-d78']);
for(const post of authoredMoments)if(zaizaiLiked.has(post.id))post.likes=[...new Set([...(post.likes||[]),'仔仔'])];
export const dayDifference=(later,earlier)=>Math.floor((Date.parse(later+'T00:00:00Z')-Date.parse(earlier+'T00:00:00Z'))/86400000);
export function momentReactionsAt(post,viewerDate,clock='23:59'){
 return post.reactionsAt&&viewerDate+'T'+clock<post.reactionsAt?{likes:[],comments:[]}:post;
}
export function visibleMoments(posts,viewerDate,{author=null,includePinned=true,clock='23:59'}={}){
 const now=Date.parse(viewerDate+'T'+clock+':00Z');
 return posts.filter(post=>{
  if(author&&post.author!==author)return false;
  const age=now-Date.parse(post.publishedAt+':00Z');
  return age>=0&&((includePinned&&post.pinned)||age<72*60*60*1000);
 }).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
}
