import {normalizeSettings} from './format.js';
import {localWorldbookVectorScores} from './vector.js';

const systemMarker=/^\s*\[(?:游戏系统事件|遊戲系統事件|电话系统事件|電話系統事件|系统记录|系統記錄|系统可信通话回执|系統可信通話回執|语音消息|語音消息)/;
const hash=value=>{let h=2166136261;for(const c of String(value)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;};
const roll=(seed,key)=>hash(`${seed}:${key}`)/4294967296;
// Conservative local estimate. Callers may provide a real tokenizer; never advertise this as provider usage.
export function estimateTokens(text){return Math.ceil([...String(text)].reduce((sum,c)=>sum+(/[\u2e80-\uffef]/u.test(c)?1.25:/[\x00-\x7f]/.test(c)?0.38:2),0))+4;}
const signature=e=>hash(JSON.stringify(e));
const groups=e=>String(e.group||'').split(',').map(x=>x.trim()).filter(Boolean);
const norm=(x,cs)=>{const s=String(x).normalize('NFKC');return cs?s:s.toLowerCase();};
const order=(a,b)=>Number(!!b.e.protected)-Number(!!a.e.protected)||Number(!!b.e.constant)-Number(!!a.e.constant)||Number(b.sticky)-Number(a.sticky)||a.level-b.level||b.e.order-a.e.order||a.e.id.localeCompare(b.e.id);
function keywordMatch(key,source,cs,whole){
 const slash=String(key).match(/^\/(.*)\/([gimsuy]*)$/s);
 if(slash){
  // Avoid expensive nested-quantifier patterns and bound scanned text.
  if(slash[1].length>220||/\([^)]*[+*][^)]*\)[+*{]/.test(slash[1]))return false;
  try{return new RegExp(slash[1],slash[2].replace(/[gy]/g,'')).test(source.slice(0,16000));}catch{return false;}
 }
 const needle=norm(key,cs),hay=norm(source,cs);if(!needle)return false;
 // CJK phrases have no whitespace word-boundary requirement.
 if(!whole||/[\u2e80-\uffef]/u.test(needle))return hay.includes(needle);
 const escaped=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`,'u').test(hay);
}
function keyScore(e,source,settings){
 const matches=k=>keywordMatch(k,source,e.caseSensitive??settings.caseSensitive,e.matchWholeWords??settings.matchWholeWords);
 const primary=e.key.filter(matches).length,secondary=e.keysecondary.filter(matches).length,n=e.keysecondary.length;
 const allowed=!e.selective||!n||[secondary>0,secondary!==n,secondary===0,secondary===n][e.selectiveLogic];
 return {hit:primary>0&&allowed,score:primary+(e.selective&&[0,3].includes(e.selectiveLogic)?secondary:0)};
}
function allowed(e,ctx){
 if(e.disable||!e.content||e.channels.length&&!e.channels.includes(ctx.channel)||e.recognized!==null&&e.recognized!==ctx.recognized||ctx.day<e.minDay||ctx.day>e.maxDay)return false;
 if(e.triggers.length&&!e.triggers.includes(ctx.trigger))return false;
 const f=e.characterFilter,has=f.names.length||f.tags.length;
 const match=f.names.includes(ctx.character)||f.tags.some(t=>(ctx.tags||[]).includes(t));
 return !has||(f.isExclude?!match:match);
}
const contextFields={matchPersonaDescription:'personaDescription',matchCharacterDescription:'characterDescription',matchCharacterPersonality:'characterPersonality',matchCharacterDepthPrompt:'characterDepthPrompt',matchScenario:'scenario',matchCreatorNotes:'creatorNotes'};
function buffer(e,ctx,settings,depth,recursion){
 const recent=ctx.messages.slice(-depth).map(m=>`${settings.includeNames?(m.name|| (m.role==='user'?'熙蒙':'陳熙泰'))+': ':''}${m.content}`).join('\n');
 const extras=Object.entries(contextFields).filter(([flag])=>e[flag]).map(([,field])=>String(ctx[field]||''));
 return [depth?recent:'',...extras,ctx.authorNote||'',...(!e.excludeRecursion?recursion:[])].join('\n');
}
function groupWinners(candidates,claimed,seed,settings,trace){
 let pool=[...candidates].sort(order),winners=[];
 while(pool.length){
  const first=pool[0],keys=groups(first.e);
  if(keys.some(g=>claimed.has(g))){trace[first.e.id]='group-conflict';pool.shift();continue;}
  let related=pool.filter(x=>x===first||groups(x.e).some(g=>keys.includes(g)));
  if(related.length>1&&related.some(x=>x.e.useGroupScoring??settings.useGroupScoring)){
   const max=Math.max(...related.map(x=>x.score));related=related.filter(x=>x.score===max);
  }
  const fixed=related.filter(x=>x.sticky||x.e.groupOverride||x.e.protected).sort(order);
  let winner=fixed[0];
  if(!winner){const total=related.reduce((n,x)=>n+x.e.groupWeight,0);let pick=roll(seed,'group:'+keys.join(','))*total;winner=related.find(x=>(pick-=x.e.groupWeight)<0)||related[0];}
  winners.push(winner);const won=groups(winner.e);
  won.forEach(g=>claimed.add(g));
  pool=pool.filter(x=>{if(x===winner)return false;if(groups(x.e).some(g=>won.includes(g))){trace[x.e.id]='group-conflict';return false;}return true;});
 }
 return winners.sort(order);
}

export function evaluateWorldbook(entries,input={},settingsInput={},effects={},countTokens=estimateTokens){
 const settings=normalizeSettings(settingsInput),ctx={channel:'noapp',recognized:false,day:1,character:'陳熙泰',trigger:'normal',...input};
 ctx.messages=(Array.isArray(ctx.messages)?ctx.messages:[]).filter(m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string'&&!systemMarker.test(m.content)).slice(-100);
 const index=Number.isInteger(ctx.messageIndex)?ctx.messageIndex:ctx.messages.length,seed=ctx.turnId||String(index),events=new Set(ctx.worldbookEvents||[]);
 if(ctx.outputMode==='call'&&ctx.channel==='noapp')events.add('call_connected');
 const limit=Number.isFinite(ctx.budgetLimit)?Math.max(0,ctx.budgetLimit):Math.min(settings.budgetTokens,Math.floor(settings.contextTokens*settings.budgetPercent/100));
 const prior={};for(const e of entries){const p=effects[e.id];if(p?.signature===signature(e)&&index>=p.start&&index<=p.cooldownEnd)prior[e.id]=p;}
 const next={...prior},selected=[],trace={},claimed=new Set(),attempted=new Set();let used=0;
 const vectors=Object.entries(ctx.vectorScores||localWorldbookVectorScores(entries,ctx.messages)).filter(([,score])=>score>=settings.vectorThreshold).sort((a,b)=>b[1]-a[1]).slice(0,settings.vectorMax).map(([id])=>id);
 const scan=(level,depth,recursion)=>{
  const candidates=[];
  for(const e of entries){
   if(attempted.has(e.id))continue;
   if(!allowed(e,ctx)){trace[e.id]='filtered';continue;}
   const p=prior[e.id],sticky=!!p&&index>p.start&&index<=p.stickyEnd;
   if(index<e.delay){trace[e.id]='delay';continue;}
   if(p&&!sticky&&index>p.stickyEnd&&index<=p.cooldownEnd){trace[e.id]='cooldown';continue;}
   if(!sticky&&level<e.delayUntilRecursion){trace[e.id]='recursion-delay';continue;}
   const match=keyScore(e,buffer(e,ctx,settings,e.scanDepth??depth,recursion),settings);
   const vector=e.vectorized&&vectors.includes(e.id),event=e.events.some(x=>events.has(x));
   if(!(sticky||e.constant||match.hit||event||vector)){trace[e.id]='no-match';continue;}
   attempted.add(e.id);
   if(!sticky&&e.useProbability&&roll(seed,e.id)*100>=e.probability){trace[e.id]='probability';continue;}
   candidates.push({e,sticky,level,score:match.score,reason:sticky?'sticky':e.constant?'constant':event?'event':vector?'vector':level?'recursive':'key'});
  }
  const newly=[];
  for(const item of groupWinners(candidates,new Set(claimed),seed,settings,trace)){
   const e=item.e,cost=countTokens(e.content);
   if(!e.protected&&((!e.ignoreBudget&&used+cost>limit)||used+cost>10000)){trace[e.id]='budget';continue;}
   if(groups(e).some(g=>claimed.has(g))){trace[e.id]='group-conflict';continue;}
   groups(e).forEach(g=>claimed.add(g));used+=cost;selected.push(e);trace[e.id]=item.reason;newly.push(e);
   if(!item.sticky&&(e.sticky||e.cooldown))next[e.id]={signature:signature(e),start:index,stickyEnd:index+e.sticky,cooldownEnd:index+e.sticky+e.cooldown};
  }
  return newly;
 };
 let newly=scan(0,settings.scanDepth,[]),recursiveText=[];
 if(settings.recursive){for(let level=1;level<=settings.maxRecursion;level++){
  recursiveText.push(...newly.filter(e=>!e.preventRecursion).map(e=>e.content));
  if(!newly.length&&!entries.some(e=>e.delayUntilRecursion>=level&&!attempted.has(e.id)))break;
  newly=scan(level,settings.scanDepth,recursiveText);
 }}
 if(settings.minActivations>0&&selected.length<settings.minActivations){for(let depth=settings.scanDepth+1;depth<=Math.min(settings.maxScanDepth,ctx.messages.length)&&selected.length<settings.minActivations;depth++)scan(0,depth,[]);}
 return {entries:selected,trace,omitted:Object.keys(trace).filter(id=>trace[id]==='budget'),used,budget:limit,effects:next,messageIndex:index,automationIds:[...new Set(selected.map(e=>e.automationId).filter(Boolean))]};
}
