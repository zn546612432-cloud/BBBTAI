// Confirmed cinematic phone call. Xi Meng's lines are captions, not chat sends.
const voice=n=>`/assets/story55/d53/fu-${n}.mp3`;
export const D53_CALL={
 id:'d53-fulongsheng-call',day:53,at:'21:30',title:'傅隆生來電',
 displayName:'傅隆生',number:'',triggerKey:'d53FuCallTriggered',pauseTimeUntilComplete:true,
 steps:[
  {speaker:'傅隆生',text:'那對父女的底細你查了嗎？',audio:voice(1),delayMs:0},
  {speaker:'熙蒙',text:'查了。',delayMs:2000},
  {speaker:'熙蒙',text:'沒什麼可擔心的。',delayMs:2000},
  {speaker:'傅隆生',text:'那可能是我多慮了。',audio:voice(2),delayMs:2000},
  {speaker:'熙蒙',text:'你是不是察覺到什麼了？',delayMs:3000},
  {speaker:'傅隆生',text:'我察覺到，你長大了，是時候該放手了。',audio:voice(3),delayMs:0},
  {speaker:'傅隆生',text:'就按你的計劃進行。',audio:voice(6),delayMs:2000},
  {speaker:'熙蒙',text:'知道了。',delayMs:0},
  {speaker:'傅隆生',text:'有把握嗎？',audio:voice(7),delayMs:0},
  {speaker:'熙蒙',text:'放心吧。',delayMs:2000}
 ]
};
