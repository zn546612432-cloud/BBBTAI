// Existing D03 dialogue, unchanged.
import {D03_ORDER} from './contract.js';
const pc='/apps/wechat/media/d03-computer.webp';
const t=(who,text)=>({who,text,kind:'text'});
const image=(who,url)=>({who,text:url,kind:'image'});
export const D03_SCENES=[
 {id:'morning',chat:'group',early:'08:20',fallback:'08:40',trigger:s=>!!s.story55?.flowD03?.submitted,lines:[
  t('小辛','我真的服了，樓下那家店裝修是不是不用睡覺的'),t('小辛','八點不到就在那鑽鑽鑽'),
  t('仔仔','你昨晚幾點睡的？'),t('小辛','四點'),t('胡楓','那你睡不著跟裝修有什麼關係哈哈哈哈'),
  t('小辛','有沒有一點同情心'),t('阿威','沒有'),
  t('熙旺','下午誰有空去把之前訂的東西拿回來？到了。'),t('小辛','1'),
  t('熙旺','行，那你下午去一趟。')
 ]},
 {id:'xiaoxin',chat:'xiaoxin',early:'14:00',fallback:'14:25',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),lines:[
  t('小辛','蒙哥蒙哥'),t('小辛','幫我看看這台怎麼樣'),image('小辛',pc),
  t('me','你又要買電腦？'),t('小辛','我就看看'),t('小辛','這個燈是不是特別帥'),
  t('me','你買電腦還是買燈'),t('小辛','主要是性能'),t('小辛','燈只是順便的'),
  t('me','把配置發我'),t('小辛','等下等下'),t('小辛','我找找'),
  t('me','你連配置都沒看就想買？'),t('小辛','我這不是先找專業人士把關嗎🥺'),
  t('me','預算多少'),t('小辛','最好不要超過八千'),t('me','澳門幣？'),
  t('小辛','不然呢大哥'),t('me','那你先別買'),t('小辛','啊？'),
  t('me','我給你配一套，比這個划算'),t('小辛','！！！'),
  t('小辛','蒙哥我真是全天下最愛你的人🥺'),t('me','滾')
 ]},
 {id:'afternoon',chat:'group',early:'15:30',fallback:'16:10',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),lines:[
  t('小辛','誰拿快遞去了？'),t('仔仔','不是你去嗎？'),t('小辛','？？？'),
  t('阿威','哥早上問誰有空，你自己回了個1'),t('小辛','我以為在點名'),
  t('胡楓','哈哈哈哈哈哈哈哈'),t('仔仔','你到底醒了沒有'),t('小辛','我現在就去行了吧！')
 ]},
 {id:'wang',chat:'wang',early:'17:10',fallback:'17:36',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&['READY','COMPLETED'].includes(o.status)),lines:[
  t('熙旺','阿蒙'),t('熙旺','這兩天老下雨，晚上有點涼'),t('熙旺','你之前那幾件厚衣服拿出來洗了沒？'),
  t('me','沒有🥺'),t('熙旺','我就知道'),t('熙旺','上次叫你收拾衣櫃，你是不是也沒收拾'),
  t('me','哥～～'),t('me','你幫我洗嘛'),t('熙旺','你多大了還讓我幫你洗衣服😂'),
  t('me','三歲'),t('me','哥哥最好了😘'),t('熙旺','少來這套'),
  t('熙旺','放洗衣籃裡，晚上我拿去洗'),t('me','愛你哥❤️'),t('熙旺','😂')
 ]}
];
