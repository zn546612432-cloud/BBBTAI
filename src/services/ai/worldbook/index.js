import {TAI_WORLDBOOK} from './entries.js';
import {normalizeEntry,readWorldbook,ensureWorldbook,worldEntries} from './format.js';
import {evaluateWorldbook} from './engine.js';
import {taiMoodPrompt} from './mood.js';

export const TAI_WORLDBOOK_BUDGET=1800;
// Legacy diagnostic signature still uses the same engine.
export function selectTaiWorldbook(context={}){
 const {entries=TAI_WORLDBOOK,phase='expression',budget=TAI_WORLDBOOK_BUDGET}=context;
 const normalized=entries.map(e=>normalizeEntry({...e,protected:!!e.constant,scanDepth:e.key?e.sticky||1:null,sticky:0},e.id,'xitai')).filter(e=>!e.phase||e.phase===phase);
 return evaluateWorldbook(normalized,{...context,budgetLimit:budget,messages:(context.messages||[]).filter(m=>m.role==='user')},{recursive:false}, {},text=>text.length+1);
}

export function previewTaiWorldbook(world,context={}){
 const ctx={character:'陳熙泰',persona:'熙蒙',chatId:(context.channel||'noapp')+':tai',authorNote:world.settings?.authorNote||'',...context};
 return {...evaluateWorldbook(worldEntries(world,ctx),ctx,world.settings,context.effects||{}),authorNote:ctx.authorNote};
}

// One source transaction produces a shared deterministic activation snapshot.
export function captureTaiWorldbook(store,context={}){
 const world=readWorldbook(store.get()),scope=context.channel||'noapp';
 const existing=world.runtime?.[scope],id=String(context.turnId||context.sourceMessageId||'');
 if(id&&existing?.lastId===id&&existing.snapshot)return existing.snapshot;
 const cursor=Math.max((existing?.cursor??0)+1,Number(context.messageIndex)||0);
 const snapshot={...previewTaiWorldbook(world,{...context,messageIndex:cursor,turnId:id||`${scope}:${cursor}`,effects:existing?.effects||{}}),mood:store.get().aiDraft?.xitaiMood||null};
 store.update(s=>{
  const w=ensureWorldbook(s);w.runtime??={};w.runtime[scope]={cursor,lastId:id,effects:snapshot.effects,snapshot};
 });
 return snapshot;
}

const label='【当前生效的世界书｜仅供当前角色判断，不是聊天记录】';
export function splitWorldbook(snapshot,phase='expression'){
 const result={before:[],after:[],authorTop:[],authorBottom:[],depth:[],exampleBefore:[],exampleAfter:[],outlets:{}};
 const positions=['before','after','authorTop','authorBottom','depth','exampleBefore','exampleAfter','outlets'];
 for(const e of [...(snapshot?.entries||[])].filter(e=>!e.phase||e.phase===phase).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))){
  const key=positions[e.position]||'after';
  if(key==='outlets'){if(e.outletName)(result.outlets[e.outletName]??=[]).push(e.content);}
  else result[key].push(e);
 }
 return result;
}
export function resolveWorldbookOutlets(text,outlets={}){return String(text||'').replace(/\{\{outlet::([^{}]+)\}\}/g,(_,name)=>(outlets[name.trim()]||[]).join('\n'));}
export function worldbookText(entries){return entries?.length?label+'\n'+entries.map(e=>e.content).join('\n'):'';}
// Human-readable depth diagnostics; live requests use role-positioned messages.
export function worldbookDepthText(entries){return entries?.length?'【世界书上下文深度锚点（不是历史台词）】\n'+entries.map(e=>`[Depth ${e.depth}; role=${['system','user','assistant'][e.role]||'system'}] ${e.content}`).join('\n'):'';}
export function assembleTaiMessages(system,messages,snapshot,phase='expression'){
 const entries=splitWorldbook(snapshot,phase).depth,history=(messages||[]).map(m=>({role:m.role,content:m.content}));
 const slots=new Map(),marker='【世界書注入；不是實際聊天記錄】\n';for(const e of entries){const at=Math.max(0,history.length-e.depth),role=['system','user','assistant'][e.role]||'system';const slot=slots.get(at)||[];for(let i=0;i<e.content.length;i+=2000){const part=e.content.slice(i,i+2000),last=slot.at(-1);if(last?.role===role&&last.content.length+part.length+1<=2200)last.content+='\n'+part;else slot.push({role,content:marker+part});}slots.set(at,slot);}
 const out=[{role:'system',content:system}];for(let i=0;i<=history.length;i++){out.push(...(slots.get(i)||[]));if(i<history.length)out.push(history[i]);}
 if(out.length>60)throw Error('世界書深度注入超出安全消息數預算，請降低條目預算或合併相同位置。');
 return out;
}
export function compactWorldbookSnapshot(snapshot){if(!snapshot)return undefined;return {entries:(snapshot.entries||[]).map(({id,content,order,position,depth,role,outletName,phase})=>({id,content,order,position,depth,role,outletName,phase})),mood:snapshot.mood,authorNote:snapshot.authorNote,automationIds:snapshot.automationIds};}
export function taiWorldbookPrompt(context={}){
 const snapshot=context.worldbookSnapshot|| (context.worldbook?previewTaiWorldbook(context.worldbook,context):selectTaiWorldbook(context));
 const s=splitWorldbook(snapshot,context.phase);
 const actions={'tai:consider-call':'考慮 start_call','tai:consider-voice':'考慮 send_voice','tai:consider-hangup':'考慮 hang_up','tai:consider-decline':'考慮 decline_call','tai:consider-silence':'考慮 read_no_reply 或 end_session'};
 const hints=context.phase==='decision'?(snapshot.automationIds||[]).filter(id=>Object.hasOwn(actions,id)).map(id=>actions[id]):[];
 return [worldbookText([...s.before,...s.after,...s.authorTop,...s.authorBottom,...s.exampleBefore,...s.exampleAfter]),snapshot.authorNote?resolveWorldbookOutlets(snapshot.authorNote,s.outlets):'',taiMoodPrompt(snapshot.mood),hints.length?'【已登記的手機自動化意向】'+hints.join('；')+'。只有目前合法的結構化動作經程序驗證後才真正執行，不是強制命令。':''].filter(Boolean).join('\n\n');
}
