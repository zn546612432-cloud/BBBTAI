// D55 NoApp calls are stages of one continuous call. Never start parallel
// NoApp sessions; the native Father call interrupts/holds the same session.
export const D55_OPENING_CALL={
 id:'d55-noapp-opening',day:55,at:'22:00',triggerKey:'d55NoappOpeningTriggered',
 pauseTimeUntilComplete:true,keepConnected:true,handoffToFree:true,gapMs:1600,
 steps:[
  ['me','你應該都看到了。'],
  ['me','我千算萬算……怎麼偏偏就沒算到這一步。'],
  ['me','我是不是做錯了，熙泰？'],
  ['me','我是不是……真的錯了？'],
  ['tai','熙蒙，打起精神來。'],
  ['tai','現在不是想這些的時候。你還沒離開澳門。'],
  ['tai','就算是為了熙旺，你也必須活著離開。'],
  ['me','……好。'],
  ['me','熙泰，如果……'],
  ['tai','別說如果。我不想聽。'],
  ['tai','你現在只管往前走。剩下的事，等我們見面再說。'],
  ['tai','我會一直陪著你，直到你站到我面前。']
 ]
};
export const D55_WARNING_CALL={
 id:'d55-noapp-warning',day:55,at:'22:30',triggerKey:'d55WarningTriggered',
 handoffToHold:true,gapMs:1400,
 steps:[
  ['tai','警察來了，你從洗衣房繞出來。'],
  ['tai','草坪今晚會舉辦賽車展，讓你的弟弟們分頭走，混進人群。'],
  ['me','我需要一點時間啟動信號干擾器。'],
  ['me','等一下，干爹電話。']
 ]
};
export const D55_FINAL_CALL={
 id:'d55-final-cut',day:55,at:'22:43',triggerKey:'d55FinalCutTriggered',
 pauseTimeUntilComplete:true,disconnectOnComplete:true,gapMs:1550,
 gapAfterMs:{23:2000},
 steps:[
  ['tai','老頭把你的長相透露給警察了。把頭髮剪短，換件外套，走輕軌站。'],
  ['me','帶著電腦太明顯了。我把它留在這裡，讓你的人來拿。'],
  ['tai','什麼？'],
  ['me','熙泰，別真把我當笨蛋了。'],
  ['me','我知道你在澳門布了眼線。那些僱傭兵，也是你特意安排的。'],
  ['tai','……不愧是 nya。我小瞧你了。'],
  ['me','不管怎麼樣，你之前說過，只要我活著，你就有辦法救我出去。'],
  ['me','這話還算數嗎？'],
  ['tai','你從輕軌站出去，我的人會接應你。'],
  ['me','不。我要拿段志鴻的密鑰和你做交易。'],
  ['tai','你要做什麼？'],
  ['me','弟弟們為了我，都去當誘餌引開警察。他們一定會被抓。'],
  ['me','幫我把他們救出來。'],
  ['me','干爹有一句話說得很對。'],
  ['me','自由比金錢更珍貴。'],
  ['tai','我會幫你。'],
  ['tai','但是密鑰，我要你站到我面前，親口告訴我。'],
  ['pause','（沉默）'],
  ['me','熙泰，其實我很高興，知道這個世界上還有一個弟弟。'],
  ['me','可惜沒有早點找到你。'],
  ['tai','別說了，快走！'],
  ['me','我……']
 ]
};
export const D55_RECALL={id:'d55-noapp-unanswered',day:55,at:'22:46',triggerKey:'d55RecallTriggered',
 unanswerable:true,steps:[]};
export const D55_FATHER_CALL={
 id:'d55-fulongsheng-last',day:55,at:'22:30',title:'傅隆生來電',
 displayName:'傅隆生',number:'',triggerKey:'d55FatherTriggered',pauseTimeUntilComplete:true,
 requiresFlag:'d55FatherReady',allowHangup:false,hangupDelayMs:3000,
 steps:[
  {speaker:'傅隆生',text:'熙蒙，警察在釣你。如果你今天被警察抓到，我會很失望的。',audio:'/assets/story55/d55/fu-1.mp3',delayMs:0},
  {speaker:'熙蒙',text:'可能已經讓你失望了。',delayMs:1000},
  {speaker:'傅隆生',text:'你今天的計劃很好，我很欣賞。',audio:'/assets/story55/d55/fu-2.mp3',delayMs:0},
  {speaker:'熙蒙',text:'謝謝你，干爹。',delayMs:400},
  {speaker:'傅隆生',text:'但是，想要做事有把握，必須自己動手。',audio:'/assets/story55/d55/fu-3.mp3',delayMs:0},
  {speaker:'熙蒙',text:'記住了。',delayMs:800},
  {speaker:'傅隆生',text:'這方面，阿旺做得比你好。',audio:'/assets/story55/d55/fu-4.mp3',delayMs:0},
  {speaker:'傅隆生',text:'我希望你們都能過上你們想要的生活。',audio:'/assets/story55/d55/fu-5.mp3',delayMs:600},
  {speaker:'傅隆生',text:'最後一次幫你了。',audio:'/assets/story55/d55/fu-6.mp3',delayMs:300}
 ]
};
