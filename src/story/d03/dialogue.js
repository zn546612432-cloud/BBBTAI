// D03 · 2025-05-21. 新文案，角色分散在澳门/首尔；Flow 08:15任务仍属已有系统。
import {D03_ORDER} from './contract.js';
const t=(who,text)=>({who,text,kind:'text'});
export const D03_SCENES=[
 {id:'morning',chat:'group',early:'08:20',fallback:'08:40',
  trigger:s=>!!s.story55?.flowD03?.submitted,
  lines:[
   t('小辛','今天起晚了，刚赶上车'),t('阿威','我准备去爬山'),
   t('胡枫','首尔这边快下课了，你们慢慢聊'),
   t('仔仔','上午得去买纽扣'),t('熙旺','出车路上记得看车，别老看手机')
  ]},
 {id:'hufeng',chat:'hufeng',early:'10:00',fallback:'10:45',
  trigger:s=>!!s.story55?.flowD03?.submitted,
  lines:[
   t('胡枫','阿蒙，我学校的电脑每次开视频剪辑就特别卡'),
   t('胡枫','你有空帮我远程看看配置吗？我还在韩国，电脑带不回去'),
   t('me','把系统日志和配置发来，我看看'),
   t('胡枫','好，我整理完发你'),
   t('胡枫','不急，你先忙')
  ]},
 {id:'xiaoxin',chat:'xiaoxin',early:'14:00',fallback:'14:25',
  trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),
  lines:[
   t('小辛','蒙哥，刚看到一张显卡打折的截图'),
   t('小辛','我有点心动，但怕买回来又放着'),
   t('me','型号发来，别光看折扣'),
   t('小辛','知道啦，我再看两家')
  ]},
 {id:'afternoon',chat:'group',early:'15:30',fallback:'16:10',
  trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),
  lines:[
   t('阿威','今天山上雾有点大'),
   t('阿威','走到一半就下来了'),
   t('胡枫','我这边雨也下个没完'),
   t('仔仔','刚拿到布料色卡，颜色比照片浅'),
   t('小辛','我还在纠结要不要买显卡')
  ]},
 {id:'wang',chat:'wang',early:'17:10',fallback:'17:36',
  trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&['READY','COMPLETED'].includes(o.status)),
  lines:[
   t('熙旺','阿蒙，你前两天说电脑一直开着'),
   t('熙旺','抽空休息一下，别熬到头疼'),
   t('me','知道啦哥，今天早点睡'),
   t('熙旺','好。我晚上还要跑两单，有事打我电话')
  ]}
];
