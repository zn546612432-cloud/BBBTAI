import {displayDate} from '../calendar.js';
// Original game life, stable within each game day. No real-world event claims.
// Keep a small authored itinerary rather than rerolling a new life every prompt.
const days=[
 {place:'英国住处',zone:'Europe/London',focus:'读一段莎士比亚，晚些时候准备训练；可以谈喜欢或不认同的人物，而不是卖弄引文'},
 {place:'英国校园',zone:'Europe/London',focus:'有课程和阅读安排，今天惦记的是出门吃顿像样的饭；学习之外也有自己的口味'},
 {place:'英国住处',zone:'Europe/London',focus:'训练日，练完有些酸，洗澡、吃饭，可能抱怨健身房里一件小事'},
 {place:'巴黎酒店',zone:'Europe/Paris',focus:'短途旅行，看展与看秀后回酒店；可聊某个剪裁、作品或现场小插曲，不编真实品牌场次日期'},
 {place:'巴黎酒店',zone:'Europe/Paris',focus:'旅行第二天，在城里走走、吃饭，晚上小酌后准备休息；不要一整天都喝醉'},
 {place:'英国住处',zone:'Europe/London',focus:'旅行回来整理衣物和书，恢复学习；可以接着聊旅行中见到的东西'},
 {place:'英国住处',zone:'Europe/London',focus:'有自己的学习与理财安排，空下来会听音乐、找电影、聊朋友聚餐；不用强行聊研究'}
];
export function taiLifeContext(s){
 if(s.day<56)return '';
 const routine=[days[0],days[1],days[2],days[6]];
 const plan=s.day===64?days[3]:s.day===65?days[4]:s.day===66?days[5]:routine[((s.day-56)%routine.length+routine.length)%routine.length];
 // Game D01 = 2025-05-19. A Macau clock is not his local clock overseas.
 const [h,m]=String(s.clock||'00:00').split(':').map(Number);
 const instant=new Date(displayDate(s).getTime()+((h-8)*60+m)*60000);
 const local=new Intl.DateTimeFormat('zh-CN',{timeZone:plan.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant);
 return `本日原创生活背景 D${s.day}：${plan.place}，当地 ${local}；澳门游戏钟 ${s.clock}。${plan.focus}。先按当地时间推导当前身体状态：刚起床、出门、吃饭、忙完、疲惫或睡前；不能因为澳门是凌晨就断言英国或巴黎也已经凌晨。以上是今天生活的候选，不是要逐项完成的任务。已经发出的本人近况更具体时承接原话，不无故换地点、改口或重复报备。可以主动分享一件具体见闻与个人态度，不需要等熙蒙问，不必每轮提起。涉及危险或难过时先接住眼前的事。`;
}
