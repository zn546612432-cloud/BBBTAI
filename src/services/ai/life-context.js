import {isStory55,taiRecognized} from '../story55/state.js';
import {dateParts} from '../calendar.js';

const londonFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
// Same game civil date/clock as the phone; Intl handles British summer time.
export function taiLife(s){
 const date=dateParts(s).iso,instant=new Date(`${date}T${s.clock||'00:00'}:00+08:00`);
 const p=Object.fromEntries(londonFormat.formatToParts(instant).map(p=>[p.type,p.value]));
 const local=`${p.hour}:${p.minute}`,minute=Number(p.hour)*60+Number(p.minute),localDate=`${p.year}-${p.month}-${p.day}`;
 const variant=(Number(p.day)+Number(p.month))%3;
 let activity,status='online';
 if(minute>=90&&minute<450){activity='睡覺';status='offline';}
 else if(minute<90||minute>=1260)activity=minute<90?'準備休息或私人時間':'私人時間';
 else if(minute<540)activity=['早餐','洗漱、早餐','起床後整理私事'][variant];
 else if(minute<720){activity=['處理工作','專注技術事務','工作與會議'][variant];status='busy';}
 else if(minute<840)activity=['午餐','休息','午餐及私人事務'][variant];
 else if(minute<1080){activity=['工作與會議','處理團隊事務','專注工作'][variant];status='busy';}
 else {activity=['晚餐','運動及休息','外出或私人事務'][variant];status=variant===1?'busy':'online';}
 if(isStory55(s)&&s.day===54&&taiRecognized(s))return {localDate,local,minute,activity:'預留全天時間與熙蒙聯絡',status:'online'};
 return {localDate,local,minute,activity,status};
}
export function taiLifeContext(s){
 if(!taiRecognized(s))return '';
 const life=taiLife(s);
 // Preserve the retired D64 preview's explicitly established trip context.
 const legacyTrip=!isStory55(s)&&[64,65].includes(s.day)?`舊預覽已設定巴黎酒店，当地 ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(`${dateParts(s).iso}T${s.clock}:00+08:00`))}。`:'';
 return `【當前生活狀態，隨遊戲時間更新】D${s.day} 澳門 ${s.clock}；英國 ${life.localDate} ${life.local}（Europe/London）。${legacyTrip}當前活動：${life.activity}；可用性：${life.status}。以上是內部狀態，不要報備或念出時間換算。空閒時可以即時回覆，忙時根據訊息重要程度決定延後、已讀不回或正常回覆；${isStory55(s)&&s.day===54?'今天對熙蒙承諾全天在線：不套用平常的休息、忙碌或睡眠限制；即使凌晨也可以接收並回覆他的訊息。':'睡眠 01:30–07:30 不收讀、不回覆、不接電話。'}不編造已發生的行程；只有熙蒙問及或確有必要時才透露一點近況。`;
}
