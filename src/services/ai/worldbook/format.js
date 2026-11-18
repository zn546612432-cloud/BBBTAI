// SillyTavern World Info interoperability. Original BBBTAI implementation.
import {TAI_WORLDBOOK} from './entries.js';
import {XITAI_SITUATIONAL_LORE} from './xitai.js';

export const WORLD_INFO_VERSION=2;
export const POSITIONS=['before','after','an-top','an-bottom','depth','example-before','example-after','outlet'];
export const DEFAULT_WORLD_SETTINGS=Object.freeze({scanDepth:4,budgetTokens:1800,budgetPercent:15,contextTokens:32000,recursive:true,maxRecursion:4,minActivations:0,maxScanDepth:24,caseSensitive:false,matchWholeWords:false,includeNames:false,useGroupScoring:false,vectorThreshold:0.65,vectorMax:5});
const list=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean).slice(0,100):typeof v==='string'?v.split(',').map(x=>x.trim()).filter(Boolean):[];
const num=(v,d,min,max)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.floor(Number(v)))):d;
const bool=v=>v===true;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=(v,max=12000)=>typeof v==='string'?v.slice(0,max):'';
const nullable=(v,min,max)=>v===null||v===undefined?null:num(v,null,min,max);
const strBool=v=>typeof v==='boolean'?v:null;

export function normalizeEntry(raw,id,bookId='xitai'){
 const r=obj(raw),x=obj(r.extensions),field=(k,alias=k)=>r[k]??x[alias];
 const pos=['before_char','after_char'].includes(r.position)?x.position??r.position:r.position??x.position;
 const filter=obj(r.characterFilter);
 return {...r,id:String(id),bookId,uid:r.uid??id,
  comment:text(r.comment??r.name??r.title,120),content:text(r.content,r.protected?2000:12000),key:list(r.key??r.keys),keysecondary:list(r.keysecondary??r.secondary_keys),
  constant:bool(r.constant),disable:typeof r.disable==='boolean'?r.disable:r.enabled===false,vectorized:bool(field('vectorized')),selective:r.selective!==false,selectiveLogic:num(field('selectiveLogic','selectiveLogic'),0,0,3),
  order:num(r.order??r.insertion_order,100,-100000,100000),position:pos==='before_char'?0:pos==='after_char'?1:typeof pos==='string'&&POSITIONS.includes(pos)?POSITIONS.indexOf(pos):num(pos,1,0,7),depth:num(field('depth'),4,0,100),role:num(field('role'),0,0,2),outletName:text(field('outletName','outlet_name'),80),
  scanDepth:nullable(field('scanDepth','scan_depth'),0,100),caseSensitive:strBool(field('caseSensitive','case_sensitive')),matchWholeWords:strBool(field('matchWholeWords','match_whole_words')),
  sticky:num(field('sticky'),0,0,10000),cooldown:num(field('cooldown'),0,0,10000),delay:num(field('delay'),0,0,10000),
  probability:num(field('probability'),100,0,100),useProbability:field('useProbability','useProbability')!==false,ignoreBudget:bool(field('ignoreBudget','ignore_budget')),
  excludeRecursion:bool(field('excludeRecursion','exclude_recursion')),preventRecursion:bool(field('preventRecursion','prevent_recursion')),delayUntilRecursion:field('delayUntilRecursion','delay_until_recursion')===true?1:num(field('delayUntilRecursion','delay_until_recursion'),0,0,100),
  group:text(field('group'),200),groupOverride:bool(field('groupOverride','group_override')),groupWeight:num(field('groupWeight','group_weight'),100,0,100000),useGroupScoring:strBool(field('useGroupScoring','use_group_scoring')),
  characterFilter:{names:list(filter.names??r.characterFilterNames),tags:list(filter.tags??r.characterFilterTags),isExclude:bool(filter.isExclude??r.characterFilterExclude)},triggers:list(field('triggers')),automationId:text(field('automationId','automation_id'),80),
  matchPersonaDescription:bool(field('matchPersonaDescription','match_persona_description')),matchCharacterDescription:bool(field('matchCharacterDescription','match_character_description')),matchCharacterPersonality:bool(field('matchCharacterPersonality','match_character_personality')),matchCharacterDepthPrompt:bool(field('matchCharacterDepthPrompt','match_character_depth_prompt')),matchScenario:bool(field('matchScenario','match_scenario')),matchCreatorNotes:bool(field('matchCreatorNotes','match_creator_notes')),
  channels:list(r.channels),events:list(r.events),minDay:num(r.minDay,1,1,90),maxDay:num(r.maxDay,90,1,90),recognized:typeof r.recognized==='boolean'?r.recognized:null,phase:['decision','expression'].includes(r.phase)?r.phase:null,
  // Built-in entries are authored and can bypass optional budget, but imported content cannot acquire this privilege by naming itself a core entry.
  protected:bool(r.protected),extensions:x};
}

export function normalizeSettings(s={}){
 const r=obj(s);return {...DEFAULT_WORLD_SETTINGS,...r,scanDepth:num(r.scanDepth,4,0,100),budgetTokens:num(r.budgetTokens,1800,128,10000),budgetPercent:num(r.budgetPercent,15,1,100),contextTokens:num(r.contextTokens,32000,1024,128000),maxRecursion:num(r.maxRecursion,4,0,16),minActivations:num(r.minActivations,0,0,100),maxScanDepth:num(r.maxScanDepth,24,0,100),vectorMax:num(r.vectorMax,5,0,30),vectorThreshold:Math.max(0,Math.min(1,r.vectorThreshold!==''&&r.vectorThreshold!=null&&Number.isFinite(Number(r.vectorThreshold))?Number(r.vectorThreshold):0.65))};
}

export function defaultWorldbook(){return {version:WORLD_INFO_VERSION,settings:{...DEFAULT_WORLD_SETTINGS},books:[{id:'xitai',name:'陳熙泰 · 專屬世界書',enabled:true,scope:'character',entries:[...TAI_WORLDBOOK.map(e=>normalizeEntry({...e,comment:e.comment||e.id,protected:!!e.constant,scanDepth:e.key?e.sticky||1:null,sticky:e.key?0:e.sticky},e.id,'xitai')),...XITAI_SITUATIONAL_LORE.map(e=>normalizeEntry(e.id==='xi-relationship-boundary'?{...e,recognized:true,channels:['noapp','chess']}:e,e.id,'xitai'))]}],runtime:{}};}

// Retire the shipped older tone guidance, without replacing custom entries or settings.
const retiredToneFragments={
 affection:['可以接住、逗他、坦率一点或保留态度','可以自然接住、坦率一点或保留态度'],
 'xi-quiet':['調戲有對象和前因，點到即止','關心與不同意見都可直接表達'],
 'xi-misunderstanding':['可以嘴硬但具體地澄清','可以具體地澄清']
};
function migrateTone(world){
 let changed=false;
 const books=world.books.map(b=>b.id!=='xitai'?b:{...b,entries:b.entries.map(e=>{
  const pair=retiredToneFragments[e.id];
  if(!pair||!e.content?.includes(pair[0]))return e;
  changed=true;return {...e,content:e.content.replace(...pair)};
 })});
 if(!changed)return world;
 const runtime=Object.fromEntries(Object.entries(world.runtime||{}).map(([scope,state])=>[scope,{
  ...state,snapshot:state.snapshot?{...state.snapshot,entries:(state.snapshot.entries||[]).map(e=>{
   const pair=retiredToneFragments[e.id];
   return pair&&e.content?.includes(pair[0])?{...e,content:e.content.replace(...pair)}:e;
  })}:state.snapshot
 }]));
 return {...world,books,runtime};
}
export function readWorldbook(s){const w=s?.aiDraft?.worldbook;return w?.version===WORLD_INFO_VERSION&&Array.isArray(w.books)?migrateTone(w):defaultWorldbook();}
export function ensureWorldbook(s){s.aiDraft??={};s.aiDraft.worldbook=readWorldbook(s);return s.aiDraft.worldbook;}

// Native ST map and Character Card V2/V3 embedded lorebook, preserving unknown fields.
export function importWorldbook(input,{id,name}={}){
 const raw=typeof input==='string'?JSON.parse(input):input;
 const source=raw?.data?.character_book??raw?.character_book??raw;
 if(!source||!source.entries||typeof source.entries!=='object')throw Error('不是有效的酒馆世界书 JSON');
 const pairs=Array.isArray(source.entries)?source.entries.map((e,i)=>[String(e?.id??e?.uid??i),e]):Object.entries(source.entries);
 if(!pairs.length||pairs.length>1000)throw Error('世界书必须包含 1–1000 个条目');
 const bookId=id||'import-'+Date.now().toString(36);
 return {id:bookId,name:text(name??source.name??raw.name,100)||'匯入世界書',enabled:true,scope:'character',entries:pairs.map(([key,value],i)=>{
  if(!value||typeof value.content!=='string')throw Error('条目 '+key+' 缺少 content');
  const extension=obj(value.extensions?.bbbtai);
  const safe={...value,uid:value.uid??i,protected:false,recognized:Object.hasOwn(extension,'recognized')?extension.recognized:true,channels:Array.isArray(extension.channels)?list(extension.channels):['noapp'],events:list(extension.events),phase:extension.phase??null,minDay:extension.minDay,maxDay:extension.maxDay,automationId:text(value.automationId??value.extensions?.automation_id,80)};
  return normalizeEntry(safe,bookId+':'+key,bookId);
 })};
}

export function exportWorldbook(book){return {name:book.name,entries:Object.fromEntries(book.entries.map((e,i)=>{
 const {id,bookId,protected:locked,channels,events,minDay,maxDay,recognized,phase,...data}=e;
 return [String(i),{...data,uid:i,extensions:{...obj(data.extensions),bbbtai:{channels,events,minDay,maxDay,recognized,phase}}}];
 }))};}

export function worldEntries(world,context={}){return world.books.filter(b=>b.enabled!==false&&(!b.channels?.length||b.channels.includes(context.channel))&&(!b.character||b.character===context.character)&&(!b.chat||b.chat===context.chatId)&&(!b.persona||b.persona===context.persona)).flatMap(b=>b.entries.map(e=>normalizeEntry(e,e.id,b.id)));}
