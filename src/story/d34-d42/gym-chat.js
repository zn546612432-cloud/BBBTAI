// Optional, player-initiated NoApp conversation. The existing Story55 scene
// scheduler, composer and saved scene progress own every subsequent message.
export const GYM_SCENE_ID='d37-noapp-gym';
export const GYM_SCENE={
 id:GYM_SCENE_ID,day:37,at:'19:30',throughDay:40,title:'健身',channel:'noapp',chat:'tai',
 requires:['recognition'],requiresPlayerTrigger:true,pauseMs:1600,
 videoLines:{2:'/assets/story55/d37/xitai-gym.mp4'},
 imageLines:{4:'/assets/story55/d37/xiwang-gym.webp'},
 lines:[
  ['me','你在幹嘛'],['tai','健身'],['tai','〔健身影片〕'],
  ['me','我哥也很喜歡健身'],['me','〔熙旺健身照片〕'],
  ['me','感覺我哥練得比你好'],['tai','你特意來氣我的？'],
  ['me','我哥單手就能把我抱起來'],['tai','你多重'],['me','65kg啊'],
  ['tai','那有甚麼難的'],['me','？'],['tai','下次見面試試'],
  ['me','誰要你抱了'],['tai','那可由不得你']
 ]
};
const opening=/^(?:你)?(?:現在|现在)?(?:在)?(?:幹嘛|干嘛|幹嗎|干吗|做甚麼|做什麼|做什么|做啥|忙甚麼|忙什麼|忙什么|忙啥|干啥|幹啥)(?:呢|啊|呀|嗎|吗)?[？?！!。]*$/u;
export function startGymScene(s,message,presence,now=Date.now()){
 const story=s.story55;
 if(story?.version!==1||story.ended||!story.completed?.recognition||story.completed?.[GYM_SCENE_ID]||
    story.scenes?.[GYM_SCENE_ID]?.triggerMessageId||s.day<37||s.day>40||
    s.clock<'19:30'||s.clock>='20:30'||!presence?.contactable||presence.status!=='online'||
    (story.activeScene&&!story.completed?.[story.activeScene])||
    !message?.id||message.from!=='me'||!opening.test(String(message.text||'').replace(/\s+/g,'')))return false;
 story.scenes??={};
 story.scenes[GYM_SCENE_ID]={index:1,accepted:false,triggerMessageId:message.id,nextAt:now+1600};
 message.taiHandledAction='gym_scene';
 delete message.taiPending;
 return true;
}
