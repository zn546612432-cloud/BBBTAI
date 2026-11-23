// Author-first NoApp graph, derived only from delivered messages or played
// call speech. No parallel clock, save, queue, alternate UI or relationship score.
import {APPROVED_ROMANCE_GRAPH,approvedRomanceLine} from './authored-lines.js';
export const ROMANCE_OPENINGS=Object.freeze({
 love_request:approvedRomanceLine('love_request'),
 feelings_question:approvedRomanceLine('feelings_question')
});
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().trim()
 .replace(/[\s，,。！？!?、：:；;「」『』“”"'（）()]/g,'');
const speaker=m=>m?.from==='tai'||m?.role==='assistant'?'tai':m?.from==='me'||m?.role==='user'?'me':'';
const content=m=>String(m?.voiceCaption||m?.text||m?.content||'');
const delivered=m=>m&&m.actual!==false&&!m.demo&&!m.authoredPending&&!m.testOnly&&
 (m.role!=='assistant'||Number.isFinite(m.playedAt));
export function romanceQuestionIntent(value){
 const t=normalize(value).replace(/^(?:熙泰|陳熙泰|陈熙泰|nya)/i,'');
 if(/^(?:你)?(?:(?:可不可以|能不能|可以|求你|麻煩你|麻烦你|現在|现在|跟我|對我|对我|給我|给我))?(?:說|说|講|讲)(?:一句|一聲|一声)?(?:你愛我|你爱我|愛我|爱我|我愛你|我爱你)(?:吧|嘛|好嗎|好吗)?$/.test(t))return 'love_request';
 if(/^(?:你)?(?:(?:到底|真的|是不是|有沒有|有没有|究竟|難道|难道|其實|其实))?(?:喜歡|喜欢|愛|爱)(?:上)?我(?:了)?(?:嗎|吗)?$/.test(t)||
  /^你(?:對|对)我(?:有沒有|有没有)?感覺(?:嗎|吗)?$/.test(t))return 'feelings_question';
 return '';
}
export function romanceReplyIntent(value){
 const t=normalize(value);
 if(!t||/^(?:…+|\.+|沉默|我不說話|我不说话)$/.test(t))return 'silence';
 if(/(?:別說了|别说了|別問|别问|不想聊|不要再問|不要再问|算了不說|算了不说|我不喜歡你|我不喜欢你|我不愛你|我不爱你|拒絕|拒绝)/.test(t))return 'boundary';
 if(/(?:我(?:是|真的|很)?認真|我(?:是|真的|很)?认真|沒有開玩笑|没有开玩笑|沒開玩笑|没开玩笑|真想聽|真想听|真的想聽|真的想听|我喜歡你|我喜欢你|我愛你|我爱你|我問真的|我问真的)/.test(t))return 'serious';
 if(/(?:逗你|開玩笑|开玩笑|騙你|骗你|別當真|别当真|鬧著玩|闹着玩|哈哈|嘻嘻)/.test(t))return 'joke';
 if(/^(?:對|对|對啊|对啊|嗯|是|想聽|想听|你猜|當然|当然|是啊|對呀|对呀|想知道|你說|你说|不然呢|你說呢|你说呢|必須|必须)$/.test(t))return 'playful';
 if(/(?:怎麼|怎么|為什麼|为什么|喜歡|喜欢|愛|爱|真的|所以|那你呢|你呢|答我)/.test(t))return 'serious';
 return 'offtopic';
}
const instructions={
 playful:'熙蒙順著玩笑說下去；照真實互動接話，不推進關係。',
 serious:'熙蒙認真談這件事；可正面回應，但不得即興創造第一次告白或新的感情承諾。',
 joke:'熙蒙說只是開玩笑；自然收住，不反問、不突然表白。'
};
const bridgePrompt='【自由打字對話圖：普通銜接】下一個重要情感節點尚無作者核准台詞。這一輪僅能普通接話，不能自行創作首次表白、確認交往、說愛、共同回憶或新劇情承諾。最多兩個完整氣泡，說完停下等玩家打字。';
export function bridgeRelationshipPermissions(relationship,beat){
 return beat?.mode==='continue'&&beat.bridgeOnly&&relationship
  ?{...relationship,canDeclareLike:false,canDeclareLove:false,canInitiateLike:false}
  :relationship;
}
const updateTag=(note,beat,node)=>({
 version:2,sceneId:note.sceneId,topic:note.topic,step:(note.step||0)+1,
 beat,node:node||note.node||(note.topic==='love_request'?'askLove':'askSerious')
});
export function planTaiRomanceScene({input='',history=[],relationship=null,available=true}={}){
 if(!available||!relationship||!Array.isArray(history))return null;
 const last=history.at(-1);
 if(!delivered(last)||speaker(last)!=='me'||normalize(content(last))!==normalize(input))return null;
 const earlier=history.slice(0,-1).filter(delivered),previous=earlier.at(-1);
 const note=speaker(previous)==='tai'?previous?.taiRomanceScene:null;
 if(note&&[1,2].includes(note.version)&&APPROVED_ROMANCE_GRAPH[note.topic]&&note.beat!=='closed'){
  const branch=romanceReplyIntent(input);
  if(branch==='offtopic')return null;
  if(branch==='silence'||branch==='boundary')return {mode:'silent',topic:note.topic,branch,tag:updateTag(note,'closed')};
  const from=note.node||(note.topic==='love_request'?'askLove':'askSerious');
  const to=APPROVED_ROMANCE_GRAPH[note.topic].edges[from]?.[branch];
  if(to&&branch==='playful'&&!relationship.rejected&&!relationship.crisis){
   return {mode:'preset',topic:note.topic,branch,preset:approvedRomanceLine(note.topic,to),
    tag:updateTag(note,'confirm',to)};
  }
  return {mode:'continue',topic:note.topic,branch,bridgeOnly:true,
   prompt:bridgePrompt+' '+(instructions[branch]||'只回答當前真實輸入。'),
   tag:updateTag(note,branch==='joke'?'closed':branch)};
 }
 const topic=romanceQuestionIntent(input);
 if(!topic||relationship.stage<3||relationship.stage>4||relationship.rejected||relationship.crisis)return null;
 const preset=approvedRomanceLine(topic);
 if(earlier.slice(-12).some(m=>speaker(m)==='tai'&&m.aiPresetId===preset.id))return null;
 return {mode:'preset',topic,preset,tag:{
  version:2,sceneId:'romance:'+String(last.id||'').slice(0,96),
  topic,step:1,beat:'opening',node:preset.key}};
}
export function romanceSceneAwaitingPlayer(messages=[]){
 const last=(Array.isArray(messages)?messages:[]).filter(delivered).at(-1);
 return speaker(last)==='tai'&&[1,2].includes(last?.taiRomanceScene?.version)&&last.taiRomanceScene.beat!=='closed';
}
