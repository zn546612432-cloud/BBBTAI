// One small NoApp romance scene director. This is a projection of the actual
// conversation, not a new relationship score, game clock, or parallel queue.
// Only author-approved opening lines are fixed; follow-ups use gated AI.
export const ROMANCE_OPENINGS=Object.freeze({
 love_request:Object.freeze({id:'tai-romance-love-question-v1',text:'你就這麼想聽？'}),
 feelings_question:Object.freeze({id:'tai-romance-feelings-question-v1',text:'……你認真的？'})
});
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().trim()
 .replace(/[\s，,。！？!?、：:；;「」『』“”"'（）()]/g,'');
const toSpeaker=message=>message?.from==='tai'||message?.role==='assistant'?'tai':message?.from==='me'||message?.role==='user'?'me':'';
const content=message=>String(message?.voiceCaption||message?.text||message?.content||'');
const visible=message=>message&&message.actual!==false&&!message.demo&&!message.authoredPending;

export function romanceQuestionIntent(input){
 const text=normalize(input).replace(/^(?:熙泰|陳熙泰|陈熙泰|nya)/i,'');
 if(/^(?:你)?(?:(?:可不可以|能不能|可以|求你|麻煩你|麻烦你|現在|现在|跟我|對我|对我|給我|给我))?(?:說|说|講|讲)(?:一句|一聲|一声)?(?:你愛我|你爱我|愛我|爱我|我愛你|我爱你)(?:吧|嘛|好嗎|好吗)?$/.test(text))return 'love_request';
 if(/^(?:你)?(?:到底|真的|是不是|有沒有|有没有)?(?:喜歡|喜欢|愛|爱)(?:我)(?:嗎|吗)?$/.test(text)||
  /^你(?:是不是|真的|有點|有点|其實|其实)?(?:喜歡|喜欢|愛|爱)我(?:嗎|吗)?$/.test(text)||
  /^你(?:對|对)我(?:有沒有|有没有)?感覺(?:嗎|吗)?$/.test(text))return 'feelings_question';
 return '';
}
const branchFor=value=>{
 const text=normalize(value);
 if(!text)return 'silence';
 if(/^(?:…+|\.+|沉默|我不說話|我不说话)$/.test(text))return 'silence';
 if(/(?:逗你|開玩笑|开玩笑|騙你|骗你|別當真|别当真|鬧著玩|闹着玩|哈哈|嘻嘻)/.test(text))return 'joke';
 if(/(?:我不喜歡你|我不喜欢你|我不愛你|我不爱你|別說了|别说了|別問|别问|不想聊|算了不說|算了不说|拒絕|拒绝)/.test(text))return 'boundary';
 if(/(?:認真的|认真的|沒開玩笑|没开玩笑|我很認真|我很认真|真的想聽|真的想听|我是認真|我是认真|我喜歡你|我喜欢你|我愛你|我爱你)/.test(text))return 'serious';
 if(/^(?:對|对|對啊|对啊|嗯|是|想聽|想听|你猜|當然|当然|是啊|對呀|对呀|想知道|你說|你说|不然呢)$/.test(text))return 'playful';
 if(/(?:怎麼|怎么|為什麼|为什么|喜歡|喜欢|愛|爱|真的|所以|那你呢|你呢|答我)/.test(text))return 'serious';
 return 'offtopic';
};
const styleHint='這是正在進行的雙人對話，不是獨白。只接熙蒙當前一句，最多兩個完整自然氣泡，然後停下等他下一句。不寫情緒分析、戀愛大道理或服務式安慰，不靠反問代替回答，不捏造回憶。愛與喜歡的許可始終由已核實的關係階段決定。';
const hints={
 playful:'他現在順著玩笑接話；熙泰可以有自己的小心思與語氣，不必立刻攤牌或強迫對方表態。',
 serious:'他已經認真接下這個話題。熙泰應正面接住這份認真，可以有猶豫、停頓或有意義的坦白；沒有相應感情證據就不能承諾愛。',
 joke:'對方說只是玩笑。熙泰可以自然收住或輕輕調侃一下，不追問，不突然表白。這一輪結束。',
 boundary:'玩家明確收回或拒絕。尊重邊界，允許沉默或一句簡短回應，不能施壓。這一輪結束。'
};
// A scene starts only with a REAL free-text user message. Continuing it
// requires the immediately preceding Tai reply to carry scene metadata.
// Storing a tiny marker on that delivered message makes save/reload safe.
export function planTaiRomanceScene({input='',history=[],relationship=null,available=true}={}){
 if(!available||!relationship||!Array.isArray(history))return null;
 const last=history.at(-1);
 if(!visible(last)||toSpeaker(last)!=='me'||normalize(content(last))!==normalize(input))return null;
 const earlier=history.slice(0,-1).filter(visible);
 const previous=earlier.at(-1);
 const note=toSpeaker(previous)==='tai'?previous?.taiRomanceScene:null;
 if(note&&note.version===1&&note.step>=1&&note.step<3&&note.beat!=='closed'){
  const branch=branchFor(input);
  if(branch==='offtopic')return null;
  if(branch==='silence')return {mode:'silent',tag:{...note,step:note.step+1,beat:'closed'}};
  const closing=branch==='boundary'||branch==='joke'||note.step>=2;
  return {mode:'continue',topic:note.topic,branch,
   prompt:'【已核實的 NoApp 情感談話分鏡】'+hints[branch]+' '+styleHint,
   tag:{version:1,sceneId:note.sceneId,topic:note.topic,step:note.step+1,beat:closing?'closed':branch}};
 }
 const topic=romanceQuestionIntent(input);
 // The carefully reviewed openings are for R3-R4. R1-R2 and R5-R6
 // continue through the existing relationship-gated DeepSeek path.
 if(!topic||relationship.stage<3||relationship.stage>4||relationship.rejected||relationship.crisis)return null;
 const preset=ROMANCE_OPENINGS[topic];
 if(earlier.slice(-12).some(m=>toSpeaker(m)==='tai'&&m.aiPresetId===preset.id))return null;
 const sceneId='romance:'+String(last.id||'').slice(0,96);
 return {mode:'preset',topic,preset,
  tag:{version:1,sceneId,topic,step:1,beat:'opening'}};
}
export function romanceSceneAwaitingPlayer(messages=[]){
 const latest=(Array.isArray(messages)?messages:[]).filter(visible).at(-1);
 return toSpeaker(latest)==='tai'&&latest?.taiRomanceScene?.beat==='opening';
}
