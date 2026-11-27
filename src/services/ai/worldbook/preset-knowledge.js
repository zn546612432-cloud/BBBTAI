// Authored-scene knowledge index. Every Story55 scene is indexed when its
// approved script is loaded; no parallel memory store or scene scheduler.
// Only messages actually delivered to Xi Tai are projected into his worldbook.
import {STORY55_CONFIG} from '../../../story/story55/catalog.js';

const NOAPP_DEFAULT=new Set(['recognition','paris','ending']);
const WECHAT_DEFAULT=new Set(['intro','return','move','show','target','confide','failure','ready']);
const TOPICS=[
 ['father',/(傅隆生|干爹|乾爹|老頭子|老头子)/i],
 ['housing',/(買房|买房|大房子|一起住)/i],
 ['brother',/(熙旺|大哥|我哥|哥哥|兄弟)/i],
 ['wynn',/(永利|撤展|撤離|撤离|離開澳門|离开澳门)/i],
 ['mercenary',/(僱傭兵|雇佣兵|傭兵|佣兵|打手|兩百個人|两百个人)/i],
 ['police',/(警察|警方|特警|黃德忠|黄德忠|金庫|金库)/i],
 ['orphanage',/(孤兒院|孤儿院|童年|小時候|小时候)/i],
 ['paris',/(巴黎|paris|埃及|金字塔|鐵塔|铁塔)/i],
 ['d43-appearance',/(髮型|发型|挑染|染髮|染发|染著頭髮|学术会议|學術會議|讀博|读博)/i],
 ['d43-address',/(網名|网名|nya|稱呼|称呼|並肩|并肩|員工|员工|老闆|老板)/i],
 ['d43-consultation',/(諮詢|咨询|港幣|港币|倒貼|倒贴|收費|收费)/i],
 ['wallet',/(比特幣|比特币|電子錢包|电子钱包|數字資產|数字资产)/i],
 ['ghost-car',/(鬼車|鬼车|數字人|数字人)/i],
 // D32–D34 approved public preparation facts: retrieved only from delivered lines.
 ['prep-rehearsal',/(原計劃|原计划|演練|演练|對練|对练|走一遍流程)/i],
 ['prep-truck',/(貨車|货车|車裡的設備|车里的设备|設備搬運|设备搬运|搬設備|搬设备|車上打遊戲|车上打游戏)/i],
 ['prep-investigation',/(在查一些東西|在查一些东西|最近接了很多單|最近接了很多单)/i],
 ['tai',/(銜尾蛇|衔尾蛇|ouroboros|narrenschiff|mirage|ghost|\btai\b)/i]
];
const IGNORE=new Set(['你知','知道','道嗎','道吗','什麼','什么','怎麼','怎么','這個','这个','那個','那个','你們','你们','我們','我们','他們','他们','是不是','有沒','没有','沒有','說過','说过','請問','请问','為什','为什','今天','現在','现在','事情','可以','所以','真的','就是']);
const normal=x=>String(x||'').normalize('NFKC').toLowerCase().trim();
const actual=m=>m&&m.actual!==false&&!m.demo&&!m.authoredPending&&!m.testOnly&&typeof m.text==='string';
function scopeOf(n){
 const channel=n.channel||(NOAPP_DEFAULT.has(n.id)?'noapp':WECHAT_DEFAULT.has(n.id)?'wechat':'mirage');
 const contact=n.conversationId||(channel==='noapp'?'tai':channel==='mirage'?'s55-ouroboros':'group');
 return channel==='noapp'&&contact==='tai'?'tai-direct':
  channel==='mirage'&&contact==='s55-ouroboros'?'tai-mirage':'private';
}
export function indexAuthoredPresetKnowledge(config=STORY55_CONFIG){
 const nodes=(config.nodes||[]).filter(n=>n.kind==='scene');
 return nodes.flatMap(n=>(config.scenes?.[n.id]||[]).flatMap((line,index)=>{
  const [actor,text]=line||[];
  if(typeof text!=='string'||!text.trim()||['system','call','watch','camera','disconnect','credit','offline'].includes(actor))return [];
  return [{
   id:String(n.messagePrefix||'s55-'+n.id)+'-'+index,
   sceneId:n.id,day:n.day,title:n.title||n.id,
   actor,text,scope:scopeOf(n)
  }];
 }));
}

const textTokens=x=>{
 const s=normal(x),result=new Set(s.match(/[a-z][a-z0-9]{2,}/g)||[]);
 for(const word of s.match(/[\u3400-\u9fff]+/g)||[])
  for(let i=0;i<word.length-1;i++){
   const pair=word.slice(i,i+2);
   if(!IGNORE.has(pair))result.add(pair);
  }
 return result;
};
const similarity=(queryTokens,text)=>{
 const tokens=textTokens(text);
 return [...queryTokens].reduce((n,t)=>n+Number(tokens.has(t)),0);
};
function availableEvidence(s){
 // Use each save's current authored configuration (including late D54/D55
 // additions and editor revisions), not a frozen default catalog.
 const byId=new Map(indexAuthoredPresetKnowledge(s.story55?.config||STORY55_CONFIG).map(e=>[e.id,e]));
 const result=[];
 for(const [channel,id,scope] of [['noapp','tai','tai-direct'],['mirage','s55-ouroboros','tai-mirage']]){
  const messages=s.content?.conversations?.[channel]?.find(c=>c.id===id)?.messages||[];
  for(const m of messages){
   if(!actual(m)||m.day>s.day||m.kind&&m.kind!=='text')continue;
   const e=byId.get(String(m.id||''));
   // A delivered ID alone is not evidence: check actual text against the
   // authored source. Private chats and staged/preview data never qualify.
   if(e?.scope===scope&&normal(e.text)===normal(m.text))result.push(e);
  }
 }
 return result;
}
export function selectTaiDeliveredPresetKnowledge(s,query,{maxScenes=2,maxLines=3,maxChars=540}={}){
 if(s?.story55?.version!==1||s.story55?.ended)return [];
 const input=normal(query).slice(0,380);
 if(!input)return [];
 const topics=TOPICS.filter(([,pattern])=>pattern.test(input)).map(([name])=>name);
 const queryTokens=textTokens(input);
 if(!queryTokens.size&&!topics.length)return [];
 const scored=availableEvidence(s).map(e=>{
  const common=similarity(queryTokens,e.text);
  const matched=TOPICS.some(([name,pattern])=>topics.includes(name)&&pattern.test(e.text));
  return {...e,score:(matched?18:0)+common*3};
 }).filter(e=>e.score>=6).sort((a,b)=>b.score-a.score||b.day-a.day||b.id.localeCompare(a.id));
 const selected=[],scenes=new Set(),chars={value:0};
 for(const e of scored){
  if(!scenes.has(e.sceneId)&&scenes.size>=maxScenes)continue;
  if(selected.filter(x=>x.sceneId===e.sceneId).length>=maxLines)continue;
  const fragment=e.text.slice(0,160);
  if(chars.value+fragment.length>maxChars)continue;
  selected.push({...e,text:fragment});scenes.add(e.sceneId);chars.value+=fragment.length;
 }
 return [...scenes].map(sceneId=>{
  const rows=selected.filter(e=>e.sceneId===sceneId).sort((a,b)=>Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1)));
  const first=rows[0];
  return {
   id:'preset-'+sceneId,
   sourceIds:rows.map(e=>e.id),
   content:'D'+first.day+'《'+first.title+'》已實際傳達給熙泰的預設對話：'+
    rows.map(e=>(e.actor==='me'?'熙蒙':'熙泰')+'：「'+e.text+'」').join('；')+
    '。只把這些話當作當時雙方已知的內容；說過不等於完成、成功或已經兌現。'
  };
 });
}

// Shared lexical retrieval over only the supplied, already delivered public evidence.
// Callers must enforce audience and delivery boundaries before passing evidence.
export function selectPublicPresetKnowledge(evidence,query,{maxLines=6,maxChars=720}={}){
 const input=normal(query).slice(0,600),tokens=textTokens(input);
 if(!tokens.size)return [];
 const topics=TOPICS.filter(([,pattern])=>pattern.test(input)).map(([name])=>name);
 const ranked=evidence.filter(actual).map((e,i)=>({e,i,score:similarity(tokens,e.text)*3+(TOPICS.some(([name,pattern])=>topics.includes(name)&&pattern.test(e.text))?18:0)})).filter(x=>x.score>=6).sort((a,b)=>b.score-a.score||b.i-a.i);
 let chars=0;const picked=[];
 for(const {e,i} of ranked){const text=e.text.slice(0,160);if(chars+text.length>maxChars)continue;chars+=text.length;picked.push({i,id:String(e.id||''),by:String(e.by||e.from||''),text});if(picked.length>=maxLines)break;}
 return picked.sort((a,b)=>a.i-b.i).map(({i,...e})=>e);
}
