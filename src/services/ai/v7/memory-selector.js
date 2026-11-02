// v7 memory selector. Pure retrieval: never mutate plot or infer unearned facts.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const getDay=m=>Number(m.first_game_day??m.day??1);
const getText=m=>String(m.summary??m.text??'').trim();
const getScope=m=>String(m.channel_scope??m.visibility??'shared').toLowerCase();
const allowedScopes=(channel,recognized)=>{
 if(channel==='mirage')return ['mirage','shared'];
 if(!recognized)return [];
 if(channel==='chess')return ['chess','shared'];
 if(channel==='noapp')return ['noapp','mirage','shared'];
 return [];
};
export function allowedTaiMemory(m,{day,channel,recognized=false}={}){
 if(!m||typeof m!=='object'||m.enabled===false||m.archived===true||m.demo===true||m.actual===false)return false;
 if(!Number.isInteger(Number(day))||!Number.isInteger(getDay(m))||getDay(m)<1||getDay(m)>day)return false;
 if(!allowedScopes(channel,recognized).includes(getScope(m)))return false;
 if(!getText(m)||getText(m).length>4000)return false;
 return !m.reliability||['canonical','observed','reported','inferred','planned'].includes(m.reliability);
}
function terms(value){
 const set=new Set(),words=String(value||'').toLowerCase().match(/[\u3400-\u9fff]+|[a-z0-9]{3,}/g)||[];
 for(const word of words){
  if(/^[a-z0-9]/.test(word)){set.add(word);continue;}
  if(word.length<=4&&word.length>1)set.add(word);
  for(let i=0;i<word.length-1;i++)set.add(word.slice(i,i+2));
 }
 return set;
}
function score(m,query,day){
 const hits=terms([getText(m),...(Array.isArray(m.tags)?m.tags:[])].join(' '));
 let n=0;for(const t of query)if(hits.has(t))n++;
 const importance=clamp(m.importance??50,0,100);
 const reliability=({canonical:12,observed:10,reported:7,inferred:-12,planned:-15})[m.reliability||'reported']??0;
 return 80*n/Math.max(1,query.size)+importance*.35+12/(1+Math.max(0,day-getDay(m))/5)+reliability;
}
export function selectTaiMemories(memories,context={}){
 if(!Array.isArray(memories))return [];
 const {day,query='',limit=8,maxChars=1800}=context;
 const q=terms(query),items=new Map();
 for(const m of memories){
  if(!allowedTaiMemory(m,context))continue;
  const key=getText(m).toLowerCase().replace(/[\s，。！？!?.,;；:："'“”‘’]/g,'');
  const rank=score(m,q,day);
  if(!items.has(key)||items.get(key).rank<rank)items.set(key,{m,rank});
 }
 const ordered=[...items.values()].sort((a,b)=>b.rank-a.rank||getDay(b.m)-getDay(a.m));
 const output=[];let chars=0;
 for(const {m} of ordered){
  if(output.length>=clamp(limit,1,24))break;
  const summary=getText(m).slice(0,600);
  if(chars+summary.length>clamp(maxChars,300,12000))continue;
  chars+=summary.length;
  output.push({id:m.id??null,day:getDay(m),summary,channel:getScope(m),reliability:m.reliability||'reported',category:m.category||'event',source:m.source||null,origin_message_id:m.origin_message_id||null});
 }
 return output;
}
