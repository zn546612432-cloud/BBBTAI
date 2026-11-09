import {validDate} from '../../../../services/calendar.js';
import {conversations,chatApps} from './model.js';
import {STORY_START,HISTORY_START,dayDate,messageEditorDate,isEditableMessage,isPortableMessage,isProtectedMessage,selection} from './navigation.js';
import {trackKey,trackSource,tracksForDay,trackValues,validateTrackValues,trackEditReason,saveTrackValues} from '../../../../story/d14-d24/editor-overrides.js';
import {readChatSources,saveChatSource} from './source-model.js';
import {defaultStory55Config} from '../../../../services/story55/config.js';

export const CHAT_BUNDLE_FORMAT='ximeng-chat-editor-v1';
const CHANNELS=new Set(chatApps.map(([id])=>id));
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const fail=message=>{throw Error('聊天劇情檔案格式錯誤：'+message);};
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const validId=v=>typeof v==='string'&&v.length>0&&v.length<=160;
const LAST_DATE=dayDate(55);
function inScope(m,scope,selected){
 const d=messageEditorDate(m);
 if(scope==='all')return true;
 if(scope==='history')return !!d&&d>=HISTORY_START&&d<STORY_START;
 if(scope==='story')return !!d&&d>=STORY_START&&d<=LAST_DATE;
 if(scope==='date')return selected.scope==='other'?!d||d<HISTORY_START||d>LAST_DATE:d===selected.date;
 return false;
}
export function makeChatBundle(s,{scope='all'}={}){
 if(!['all','history','story','date'].includes(scope))throw Error('未知的匯出範圍');
 const selected=selection(s),items=[];
 for(const {channel,c} of conversations(s)){
  const messages=(c.messages||[]).filter(m=>isPortableMessage(m)&&inScope(m,scope,selected)).map(m=>{
   const copy=structuredClone(m);
   // A screenplay export does not contain message-delivery/read state or game progress.
   delete copy.delivery;delete copy.deliveryRevision;delete copy.actual;
   return copy;
  });
  if(!messages.length)continue;
  items.push({channel,id:c.id,name:c.name,avatar:c.avatar||'',group:!!c.group,
   ...(Array.isArray(c.participants)?{participants:structuredClone(c.participants)}:{}),
   ...(plain(c.actorNames)?{actorNames:structuredClone(c.actorNames)}:{}),
   messages});
 }
 const tracks=s.story55?.version===1&&scope!=='history'?
  Array.from({length:11},(_,i)=>tracksForDay(i+14)).flat()
   .filter(scene=>scope!=='date'||selected.scope==='story'&&selected.day===scene.day)
   .map(scene=>({key:trackKey(scene),...trackValues(s,scene)})):[];
 const sourceDay=s.editor?.chatView==='source'?Number(s.editor?.chatSourceDay||s.day):selected.day;
 const sources=s.story55?.version===1&&scope!=='history'?
  Array.from({length:55},(_,i)=>i+1)
   .filter(day=>scope!=='date'||day===sourceDay)
   .flatMap(day=>readChatSources(s,day))
   .filter(item=>item.lines.length&&!(item.type==='track'&&trackSource(item.key)))
   .map(item=>({key:item.key,day:item.day,at:item.at,...(item.type==='track'?{atExplicit:item.atExplicit}:{}),lines:item.lines.map(line=>line.text)})):[];
 return {format:CHAT_BUNDLE_FORMAT,scope,exportedAt:new Date().toISOString(),conversations:items,tracks,sources};
}
export function parseChatBundle(raw){
 let value=raw;
 if(typeof raw==='string'){if(raw.length>8*1024*1024)fail('檔案超過 8MB');try{value=JSON.parse(raw);}catch{fail('不是有效的 JSON');}}
 if(!plain(value)||value.format!==CHAT_BUNDLE_FORMAT||!Array.isArray(value.conversations)||value.conversations.length>500)fail('版本或對話列表無效');
 if(value.tracks!==undefined){
  if(!Array.isArray(value.tracks)||value.tracks.length>300)fail('來源劇情條目過多');
  const keys=new Set();
  for(const scene of value.tracks){
   if(!plain(scene)||typeof scene.key!=='string'||!trackSource(scene.key))fail('來源劇情編號無效');
   if(keys.has(scene.key))fail('同一來源劇情重複：'+scene.key);
   keys.add(scene.key);
   try{validateTrackValues(scene.key,scene);}catch(error){fail(error.message);}
  }
 }
 if(value.sources!==undefined){
  if(!Array.isArray(value.sources)||value.sources.length>600)fail('來源原稿數量過多');
  const seen=new Set();
  for(const scene of value.sources){
   if(!plain(scene)||!validId(scene.key)||!Number.isInteger(scene.day)||scene.day<1||scene.day>55||
    (scene.at!==undefined&&typeof scene.at!=='string')||(scene.atExplicit!==undefined&&typeof scene.atExplicit!=='boolean')||!Array.isArray(scene.lines)||scene.lines.length>500||
    scene.lines.some(line=>typeof line!=='string'||line.length>3000))fail('來源原稿的日期、行數或正文無效');
   if(seen.has(scene.key))fail('來源原稿編號重複：'+scene.key);
   seen.add(scene.key);
  }
 }
 const chats=new Set();let total=0;
 for(const c of value.conversations){
  if(!plain(c)||!CHANNELS.has(c.channel)||!validId(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>120||!Array.isArray(c.messages)||c.messages.length>15000)fail('對話基本資料無效');
  const chatKey=JSON.stringify([c.channel,c.id]);
  if(chats.has(chatKey))fail('對話重複：'+c.id);chats.add(chatKey);
  if(c.participants!==undefined&&(!Array.isArray(c.participants)||c.participants.length>60||c.participants.some(p=>!plain(p)||!validId(p.id)||typeof p.name!=='string')))fail('群聊成員資料無效');
  if(c.actorNames!==undefined&&!plain(c.actorNames))fail('發言人資料無效');
  const seen=new Set();
  for(const m of c.messages){
   if(!plain(m)||!validId(m.id)||!validId(m.from)||typeof m.text!=='string'||m.text.length>10000||m.time!==undefined&&!TIME.test(m.time)||m.sentDate!==undefined&&!validDate(m.sentDate))fail('消息的編號、角色、日期或正文無效');
   if(m.kind!==undefined&&!['text','image','app_invitation','divider'].includes(m.kind))fail('不支持的消息類型：'+m.kind);
   if(!isPortableMessage(m)||isProtectedMessage(m)||m.delivery!==undefined||m.actual!==undefined)fail('匯入包含玩家實發或系統運行消息：'+m.id);
   if(seen.has(m.id))fail('同一對話消息編號重複：'+m.id);seen.add(m.id);
   if(m.schedule!==undefined){
    const x=m.schedule;
    if(!plain(x)||!['immediate','game-time','chat-delay'].includes(x.mode))fail('觸發方式無效：'+m.id);
    if(x.mode==='game-time'&&(!Number.isInteger(x.day)||x.day<1||x.day>90||!TIME.test(x.clock)))fail('遊戲日／時間無效：'+m.id);
    if(x.mode==='chat-delay'&&(!Number.isFinite(x.seconds)||x.seconds<0||x.seconds>3600))fail('等待秒數無效：'+m.id);
   }
   total++;
   if(total>50000)fail('消息總數超過上限');
  }
 }
 return structuredClone(value);
}
export function previewChatImport(s,raw){
 const bundle=parseChatBundle(raw),result={conversationsNew:0,messagesNew:0,conflicts:0,protected:0,unchanged:0,details:[]};
 if(bundle.tracks?.length){
  Object.assign(result,{tracksChanged:0,tracksUnchanged:0,tracksBlocked:0});
  for(const incoming of bundle.tracks){
   const scene=trackSource(incoming.key),reason=trackEditReason(s,scene);
   const current=trackValues(s,scene);
   const normalized=validateTrackValues(incoming.key,incoming);
   if(JSON.stringify(normalized)===JSON.stringify(current)){result.tracksUnchanged++;continue;}
   if(reason){
    result.tracksBlocked++;
    if(result.details.length<20)result.details.push(incoming.key+'：'+reason);
   }else result.tracksChanged++;
  }
 }
 if(bundle.sources?.length){
  Object.assign(result,{sourcesChanged:0,sourcesUnchanged:0,sourcesBlocked:0});
  for(const incoming of bundle.sources){
   const original=readChatSources(s,incoming.day).find(item=>item.key===incoming.key);
   if(!original||original.lines.length!==incoming.lines.length){result.sourcesBlocked++;if(result.details.length<20)result.details.push(incoming.key+'：來源版本不一致');continue;}
   const equal=(incoming.atExplicit===false||original.at===incoming.at)&&original.lines.every((line,i)=>line.text===incoming.lines[i]);
   if(equal){result.sourcesUnchanged++;continue;}
   if(original.reason){result.sourcesBlocked++;if(result.details.length<20)result.details.push(incoming.key+'：'+original.reason);continue;}
   result.sourcesChanged++;
  }
 }
 for(const item of bundle.conversations){
  const existing=s.content.conversations[item.channel]?.find(c=>c.id===item.id);
  if(!existing)result.conversationsNew++;
  const map=new Map((existing?.messages||[]).map(m=>[m.id,m]));
  for(const m of item.messages){
   const old=map.get(m.id);
   if(!old){result.messagesNew++;continue;}
   if(!isPortableMessage(old)){result.protected++;result.details.push(item.name+' / '+m.id+'：玩家／運行消息，禁止覆蓋');continue;}
   const a=structuredClone(old);delete a.delivery;delete a.deliveryRevision;delete a.actual;
   if(JSON.stringify(a)===JSON.stringify(m))result.unchanged++;
   else {result.conflicts++;if(result.details.length<20)result.details.push(item.name+' / '+m.id+'：內容不同');}
  }
 }
 return {bundle,report:result};
}
export function applyChatImport(s,raw,{mode='merge'}={}){
 if(!['merge','replace-conflicts'].includes(mode))throw Error('請選擇合併或覆蓋同編號作者消息');
 const {bundle,report}=previewChatImport(s,raw);
 const before=structuredClone(s.content.conversations),oldOverrides=structuredClone(s.story55?.chatSceneEdits||{}),
  oldConfig=s.story55?.config?structuredClone(s.story55.config):null;
 try{
  if(bundle.tracks?.length){
   if(!s.story55||s.story55.version!==1)throw Error('來源劇情需要 55 天周目');
   for(const entry of bundle.tracks){
    const scene=trackSource(entry.key),reason=trackEditReason(s,scene);
    if(reason)continue; // Never overwrite started/played source or real player messages.
    const hasOverride=Object.hasOwn(s.story55.chatSceneEdits||{},entry.key);
    if(mode==='merge'&&hasOverride)continue;
    saveTrackValues(s,entry.key,entry);
   }
  }
  for(const source of bundle.sources||[]){
   if(!s.story55||s.story55.version!==1)throw Error('來源劇情需在55天周目導入');
   const current=readChatSources(s,source.day).find(x=>x.key===source.key);
   if(!current||current.reason||current.lines.length!==source.lines.length)continue;
   // A full exported archive also contains original unedited copy. Re-importing
   // it must never replace a dynamic send-time calculation with a fixed clock.
   if((source.atExplicit===false||current.at===source.at)&&current.lines.every((l,i)=>l.text===source.lines[i]))continue;
   if(mode==='merge'&&(Object.hasOwn(s.story55.chatSceneEdits||{},source.key)
     ||current.type==='wish'&&current.lines.some(l=>Object.hasOwn(s.story55.chatSceneEdits||{},'wish:'+l.id))))continue;
   if(mode==='merge'&&current.type==='node'){
    const id=source.key.slice(5),defaults=defaultStory55Config(),baseNode=defaults.nodes.find(n=>n.id===id);
    const local=[...(s.story55.config?.scenes?.[id]||[])];
    const altered=JSON.stringify(local)!==JSON.stringify(defaults.scenes?.[id])
     ||(s.story55.config?.nodes?.find(n=>n.id===id)?.at||'')!==(baseNode?.at||'');
    if(altered||Object.hasOwn(s.story55.chatSceneEdits||{},source.key))continue;
   }
   saveChatSource(s,source.key,{at:source.atExplicit===false?undefined:source.at,lines:source.lines});
  }
  for(const item of bundle.conversations){
   const list=s.content.conversations[item.channel]||(s.content.conversations[item.channel]=[]);
   let c=list.find(x=>x.id===item.id);
   if(!c){
    c={id:item.id,name:item.name,avatar:item.avatar||item.name[0],group:!!item.group,
     ...(item.participants?{participants:structuredClone(item.participants)}:{}),
     ...(item.actorNames?{actorNames:structuredClone(item.actorNames)}:{}),
     authored:true,messages:[]};
    list.push(c);
   }
   for(const incoming of item.messages){
    const index=c.messages.findIndex(m=>m.id===incoming.id);
    if(index<0){c.messages.push(structuredClone(incoming));continue;}
    const old=c.messages[index];
    if(mode!=='replace-conflicts'||!isPortableMessage(old))continue;
    const copy=structuredClone(incoming);
    // A patched authored bubble never rewinds notification/read/delivery state.
    for(const key of ['delivery','deliveryRevision','read','unread'])if(old[key]!==undefined)copy[key]=structuredClone(old[key]);
    c.messages[index]=copy;
   }
  }
 }catch(error){
  s.content.conversations=before;
  if(s.story55){s.story55.chatSceneEdits=oldOverrides;if(oldConfig)s.story55.config=oldConfig;}
  throw error;
 }
 return report;
}
