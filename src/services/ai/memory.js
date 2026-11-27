import {taiRecognized} from '../story55/state.js';
// One existing save collection. A quotation proves words were said, not that
// the statement is true or a promise has been fulfilled.
const SOURCE='NoApp · 熙蒙亲口所说',TAI_SOURCE='NoApp · 熙泰親口所說',CALL_SOURCE='NoApp已发生通话',REFLECTION='NoApp · 熙泰主觀記憶';
const preference=/(我(?:最)?喜[欢歡]|我(?:不喜[欢歡]|[讨討][厌厭])|我[爱愛]|我害怕|我怕|我[习習][惯慣]|我生日|我想要)/;
const commitment=/(我答[应應]|我保[证證]|我承[诺諾]|我一定[会會]|我[们們][约約]好|[说說]好了|下次我[们們]|[别別]忘了|[记記]住)/;
const boundary=/(不要再|不[许許]再|[别別]再|我不想|不要[这样這樣])/;
const disclosure=/(我[会會]在|我[准準][备備]|我[读讀][过過]|我一直|我最近|我以前)/;
const clean=v=>typeof v==='string'?v.trim():'';
const key=v=>clean(v).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}]/gu,'');
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);};
const list=s=>s.aiDraft?.memories;
const isVisible=(m,day,channel)=>m&&m.enabled!==false&&Number.isInteger(m.day)&&m.day>=1&&m.day<=day&&['shared',channel].includes(m.visibility)&&clean(m.text);
const isEpisode=m=>m.kind==='episode';
export function migrateTaiMemories(items){
 if(!Array.isArray(items))return false;let changed=false;
 for(let i=0;i<items.length;i++){const m=items[i];if(!m||m.kind||![SOURCE,CALL_SOURCE].includes(m.source))continue;
  const call=m.source===CALL_SOURCE,category=commitment.test(m.text)?'commitment':preference.test(m.text)?'preference':boundary.test(m.text)?'boundary':'disclosure';
  items[i]={...m,id:m.id||'legacy-'+hash(m.source+'|'+m.day+'|'+i+'|'+m.text),kind:call?'call':'quote',...(!call?{category,speaker:'player'}:{})};changed=true;
 }return changed;
}
const limitBy=(items,predicate,max)=>{const matches=items.filter(predicate);for(const m of matches.slice(0,Math.max(0,matches.length-max))){const i=items.indexOf(m);if(i>=0)items.splice(i,1);}};
function addQuote(s,text,{sourceId='',speaker='player',category,source='noapp'}={}){
 if(!taiRecognized(s)||source!=='noapp'||!Array.isArray(list(s)))return false;
 const quote=clean(text).slice(0,360);
 if(!quote||quote.length<5||!category)return false;
 const name=speaker==='tai'?TAI_SOURCE:SOURCE,items=list(s);
 if(sourceId&&items.some(x=>x.source===name&&x.sourceId===sourceId)||key(items.filter(x=>x.source===name).at(-1)?.text)===key(quote))return false;
 items.push({id:'quote-'+hash(name+'|'+(sourceId||quote+'|'+s.day+'|'+items.length)),kind:'quote',category,speaker,sourceId,day:s.day,clock:s.clock,visibility:'noapp',source:name,text:quote,enabled:true});
 limitBy(items,m=>m.source===name,100);return true;
}
export function rememberTaiConversation(s,text,{source='noapp',sourceId=''}={}){
 const t=clean(text),category=commitment.test(t)?'commitment':preference.test(t)?'preference':boundary.test(t)?'boundary':disclosure.test(t)?'disclosure':'';
 return addQuote(s,t,{sourceId,category,source});
}
export function rememberTaiDelivered(s,text,{sourceId=''}={}){
 const t=clean(text);
 if(!/我(?:答[应應]你|保[证證]|承[诺諾]|一定[会會])|[说說]好了[，,。！!：:]|下次我[们們]/.test(t)||/[?？]|如果|假如|不答[应應]|不保[证證]/.test(t))return false;
 return addQuote(s,t,{speaker:'tai',category:'commitment',sourceId});
}
export function rememberTaiCall(s,record){
 const evidence=record?.callType==='video'&&record?.callStatus==='ended'&&record?.story55&&record?.endedBy==='tai'?record.memoryFact:record?.transcript;
 if(!taiRecognized(s)||!record?.id||!clean(evidence)||!Array.isArray(list(s)))return false;
 const items=list(s);
 if(items.some(m=>m.kind==='call'&&m.sourceId===record.id))return false;
 items.push({id:'call-'+hash(record.id),kind:'call',sourceId:record.id,day:s.day,clock:s.clock,visibility:'noapp',source:CALL_SOURCE,text:evidence.slice(0,900),enabled:true});
 // Only retire generated call transcripts; never truncate author lore.
 limitBy(items,m=>m.source===CALL_SOURCE,30);return true;
}
const EPISODES=['conflict','concern','boundary','unfinished'];
export function normalizeTaiMemoryUpdate(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const evidence=clean(value.evidence),reason=clean(value.reason);
 if(evidence.length<4||evidence.length>160||!reason||reason.length>180)return null;
 if(value.op==='open'&&EPISODES.includes(value.category))return {op:'open',category:value.category,evidence,reason};
 if(value.op==='resolve'&&/^episode-[a-z0-9]+$/.test(value.id))return {op:'resolve',id:value.id,evidence,reason};
 return null;
}
export function applyTaiMemoryUpdate(s,update,{sourceId='',evidence=''}={}){
 const u=normalizeTaiMemoryUpdate(update);
 if(!taiRecognized(s)||!Array.isArray(list(s))||!u||!sourceId||!clean(evidence).includes(u.evidence))return false;
 const items=list(s);
 if(u.op==='resolve'){
  const m=items.find(m=>m.id===u.id&&isEpisode(m)&&m.status==='open'&&m.enabled!==false&&m.day<=s.day);
  if(!m||m.sourceId===sourceId)return false;
  const previous=tokens(m.text),related=[...tokens(u.evidence)].some(x=>previous.has(x));
  if(!related&&!/道歉|[对對]不起|原[谅諒]|不是這個意思|不是这个意思|[误誤][会會]|[刚剛]才|[说說]重了|[说說]清楚|[没沒]事了|不生[气氣]了|[释釋][怀懷]|和好|算了|明白了/.test(u.evidence))return false;
  m.status='resolved';m.resolution={day:s.day,clock:s.clock,sourceId,evidence:u.evidence,reason:u.reason};return true;
 }
 const id='episode-'+hash(sourceId);
 if(items.some(m=>m.id===id||isEpisode(m)&&m.status==='open'&&m.category===u.category&&key(m.text)===key(u.evidence)))return false;
 items.push({id,kind:'episode',category:u.category,status:'open',source:REFLECTION,sourceId,day:s.day,clock:s.clock,visibility:'noapp',text:u.evidence,reason:u.reason,enabled:true});
 limitBy(items,m=>isEpisode(m)&&m.status==='resolved',60);
 // Do not evict unresolved episodes to make room for new ones.
 if(items.filter(isEpisode).length>140){items.pop();return false;}return true;
}
const tokens=value=>{const t=key(value),out=new Set(t.match(/[a-z0-9]{2,}/g)||[]);for(const word of t.match(/[\u3400-\u9fff]+/g)||[])for(let i=0;i<word.length-1;i++)out.add(word.slice(i,i+2));return out;};
export function selectTaiLongMemories(memories,{day,channel='noapp',recognized=true,messages=[],limit=12,maxChars=3200}={}){
 if(!Array.isArray(memories))return [];
 const query=tokens(messages.filter(m=>m.role==='user'&&!/^\s*\[(?:游戏|遊戲|电话|電話|系统|系統|語音|语音)/.test(m.content||'')).slice(-3).map(m=>m.content).join('\n'));
 const ranked=memories.map((m,i)=>({m,i})).filter(({m})=>isVisible(m,day,channel)&&(!isEpisode(m)||recognized&&channel==='noapp')&&(!m.kind||m.visibility!=='noapp'||recognized))
  .map(({m,i})=>{const words=tokens(m.text+' '+(m.reason||'')),overlap=[...query].filter(x=>words.has(x)).length;return {m,i,score:overlap*8+(isEpisode(m)&&m.status==='open'?35:0)+(m.category==='commitment'?12:0)+(m.category==='boundary'?8:0)+Math.max(0,10-(day-m.day))+(m.kind?0:6)};})
  .sort((a,b)=>b.score-a.score||b.i-a.i);
 const selected=[];let size=0,open=0;
 for(const {m,i} of ranked){
  const unresolved=isEpisode(m)&&m.status==='open';if(unresolved&&open>=5)continue;
  const compact={id:m.id,kind:m.kind,category:m.category,speaker:m.speaker,status:m.status,sourceId:m.sourceId,day:m.day,visibility:m.visibility,source:m.source,text:clean(m.text).slice(0,m.kind==='call'?240:360),reason:m.reason,resolution:m.resolution};
  const cost=JSON.stringify(compact).length;if(size+cost>maxChars)continue;
  selected.push({m:compact,i});size+=cost;if(unresolved)open++;if(selected.length>=limit)break;
 }
 return selected.sort((a,b)=>a.i-b.i).map(({m})=>m);
}
export function taiLongMemoryPrompt(entries){
 if(!entries?.length)return '';
 return '【跨日記憶｜只供判斷，不是当前对话】\n'+entries.map(m=>{
  if(isEpisode(m))return 'D'+m.day+' ['+m.id+'／'+(m.status==='open'?'尚未釐清':'已釐清')+'／'+m.category+'] 實際原話：「'+m.text+'」；熙泰當時主觀感受：'+m.reason+(m.resolution?'；D'+m.resolution.day+' 後續原話：「'+m.resolution.evidence+'」，熙泰判斷：'+m.resolution.reason:'');
  return 'D'+m.day+' ['+(m.kind==='quote'?(m.speaker==='tai'?'熙泰曾說':'熙蒙曾說')+'／'+m.category:m.source||'作者記錄')+'] '+m.text;
 }).join('\n')+'\n原話僅證明曾說過，不等於已履約；近期明確修正優先。未釐清不等於持續生氣，可以先放下、自然聊別的；有合適契機才修復。不要每輪重提，不要把主觀感受說成客觀事實。';
}
