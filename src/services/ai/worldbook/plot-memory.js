// Read-only projection of *already played* author events into Xi Tai's existing
// worldbook. This creates no separate save, schedule, or competing memory store.
const hasText=value=>typeof value==='string'&&value.trim().length>0;
const d53Line=/^s55-d53-tai-night-\d+$/;
const d53Relevant=/逃不掉|計劃失敗|傅隆生|兩百個人|炸彈|警察|救出來|只要你還活著|活著/;
const actual=m=>m&&m.actual!==false&&!m.demo&&!m.authoredPending&&hasText(m.text);

// Source-linked, read-only long-memory milestones. An authored line unlocks
// only when the matching NoApp message has actually been delivered.
export function taiCanonicalMilestones(s,history){
 if(s?.story55?.version!==1)return [];
 const messages=history||s?.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages||[];
 const facts=[
  {id:'story55-paris-promise',day:43,pattern:/^s55-(?:d43-)?paris-\d+$/,text:'所以別讓我失望，熙蒙。我們巴黎見。',alternatives:['我們埃及見，或者巴黎見'],topic:'巴黎／埃及見面約定'},
  {id:'story55-rescue-promise',day:53,pattern:/^s55-d53-tai-night-\d+$/,text:'就算被抓了也沒關係，只要你還活著，我就有辦法把你救出來。',topic:'救援承諾'}
 ];
 return facts.flatMap(f=>{
  const m=messages.find(x=>actual(x)&&x.from==='tai'&&x.day===f.day&&x.day<=s.day&&
    f.pattern.test(String(x.id||''))&&(x.text===f.text||f.alternatives?.includes(x.text)));
  return m?[{id:f.id,kind:'milestone',category:'commitment',speaker:'tai',
   source:'NoApp 已送達的固定劇情',sourceId:m.id,day:m.day,visibility:'noapp',
   text:m.text,status:'unfulfilled',topic:f.topic,enabled:true}]:[];
 });
}


export function taiPlotMemory(s,history=[]){
 if(s?.story55?.version!==1)return '';
 const lines=[];
 // Facts are visible only after the corresponding messages were actually delivered.
 const gym=s.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages||history;
 const gymLine=(index,from,kind,text)=>gym.find(m=>actual(m)&&m.day<=s.day&&m.id==='s55-d37-noapp-gym-'+index&&m.from===from&&m.kind===kind&&(!text||m.text===text));
 const gymFacts=[];
 if(gymLine(2,'tai','video'))gymFacts.push('你曾經給熙蒙發過自己的健身影片');
 if(gymLine(4,'me','image'))gymFacts.push('熙蒙給你看過熙旺健身的照片');
 if(gymLine(7,'me','text','我哥單手就能把我抱起來'))gymFacts.push('熙蒙說熙旺單手就能把他抱起來');
 if(gymLine(9,'me','text','65kg啊'))gymFacts.push('熙蒙親口說他體重65kg');
 if(gymLine(12,'tai','text','下次見面試試'))gymFacts.push('你說下次見面試試');
 if(gymLine(14,'tai','text','那可由不得你'))gymFacts.push('熙蒙說誰要你抱了，你回那可由不得你；只是當時的聊天，尚未見面或實際抱過');
 if(gymFacts.length)lines.push('已發生的健身聊天：'+gymFacts.join('；')+'。');
 const canonical=taiCanonicalMilestones(s,history);
 if(canonical.length)lines.push('已說出口、尚未確認兌現的重要約定：\n'+
  canonical.map(m=>'D'+m.day+' '+m.topic+'（消息 '+m.sourceId+'）：「'+m.text+'」').join('\n'));
 // D53 is a real NoApp exchange. Never include later lines merely because
 // the game date has advanced: the player may still be midway through it.
 const shared=history.filter(m=>actual(m)&&d53Line.test(String(m.id||''))&&d53Relevant.test(m.text));
 if(shared.length)lines.push('D53 已實際說過的話（以記錄為準，不替玩家補完尚未發出的台詞）：\n'+shared.slice(-9).map(m=>(m.from==='me'?'熙蒙':'熙泰')+'：「'+m.text.slice(0,160)+'」').join('\n'));
 // The evacuation destination is author-confirmed operational context for
 // the tech partner, unlocked only AFTER its exact briefing line was sent.
 // This does not grant access to other private WeChat messages.
 const briefing=s.story55?.scenes?.['d55-briefing'];
 const wynnShared=s.day>=55&&(Number(briefing?.index)>=5||!!s.story55?.completed?.['d55-briefing']);
 if(wynnShared)lines.push('D55 已確認的行動背景：你參與技術配合，知道永利皇宮是事先安排的撤離地點；原計劃是晚上十點前混入撤展隊伍，離開澳門。這只代表計劃已提出，不代表撤離已成功。不要聲稱你偷看過微信群或知道熙蒙尚未告訴你的私事。計劃後續的變故、人物安危與實際結果，必須以已發生的通話和訊息為準。');
 return lines.length?'【熙泰已知的主線事實｜現有世界書的動態劇情記憶；不是未來預告】\n'+lines.join('\n')+'\n只承認已發生部分；知道不等於願意透露；不要把未發生的計劃結果當成事實。':'';
}

const terms=value=>{
 const normalized=String(value||'').normalize('NFKC').toLowerCase();
 const out=new Set(normalized.match(/[a-z0-9]{2,}/g)||[]);
 for(const word of normalized.match(/[\u3400-\u9fff]+/g)||[]){
  if(word.length<=2)out.add(word);
  for(let i=0;i<word.length-1;i++)out.add(word.slice(i,i+2));
 }
 return out;
};
const overlap=(a,b)=>[...a].filter(t=>b.has(t)).length;

// Search existing real NoApp history, rather than keeping a second copy.
// Source quotes remain available even when they fall outside the last 20 turns.
export function recallTaiOlderTalk(history=[],latestUser='',{recentCount=16,maxItems=7}={}){
 const query=terms(latestUser);
 if(!query.size)return '';
 const ordinary=history.filter(m=>actual(m)&&m.kind!=='call'&&m.kind!=='image'&&m.kind!=='video'&&m.kind!=='app_invitation');
 const older=ordinary.slice(0,Math.max(0,ordinary.length-recentCount));
 const calls=history.filter(m=>m?.kind==='call'&&hasText(m.transcript));
 const candidates=older.map((m,i)=>({m,i,score:overlap(query,terms(m.voiceCaption||m.text)),text:(m.voiceCaption||m.text).slice(0,230)}));
 for(let i=0;i<calls.length;i++){
  const m=calls[i],all=String(m.transcript).split('\n');
  const matching=all.filter(line=>overlap(query,terms(line))>0).slice(-5);
  if(matching.length)candidates.push({m,i:older.length+i,score:overlap(query,terms(m.transcript)),text:matching.join(' / ').slice(0,500)});
 }
 const ranked=candidates.filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.i-a.i).slice(0,maxItems).sort((a,b)=>a.i-b.i);
 return ranked.length?'【更早的真實聊天／通話原話（話題相關；僅供回憶，勿逐句複誦）】\n'+ranked.map(({m,text})=>'D'+m.day+' '+(m.kind==='call'?'已結束電話':m.from==='me'?'熙蒙':'熙泰')+'：'+text).join('\n'):'';
}
