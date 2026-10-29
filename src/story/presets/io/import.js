import {ensurePresets} from '../engine.js';
import {parsePresetPayload} from './format.js';

const historyKey=(channel,conversationId,id)=>`${channel}:${conversationId}:${id}`;
// One published March 2024 message used a temporary placeholder. Migrate only
// that exact shipped value; never replace a player's or editor's custom text.
const correctedHistoryLink={id:'wx-group-20240310-019',previous:'【小红书分享链接 · 待补】',next:'https://www.whatyi.con'};
const isCorrectableHistoryLink=(conversationId,message)=>conversationId==='group'&&message.id===correctedHistoryLink.id&&message.text===correctedHistoryLink.previous&&message.storyImported===true&&!message.actual;
const authoredMessage=(pack,chat,message)=>({
 id:message.id,from:message.from,text:message.text,time:message.time,
 ...(message.assetId?{assetId:message.assetId}:{}),
 ...(message.sentDate?{sentDate:message.sentDate}:{}),
 day:pack.day,kind:message.kind||'text',authored:true,storyImported:true,
 ...(message.appearance==='game-time'?{schedule:{mode:'game-time',day:pack.day,clock:message.time}}:{})
});

// Legacy saves may have received later months before earlier days were authored.
// Keep historical messages in date order, while preserving all player messages.
function orderWeChatHistory(conversation){
 const historical=message=>message.storyImported&&/^\d{4}-\d{2}-\d{2}$/.test(message.sentDate||'')&&!message.schedule;
 const original=conversation.messages;
 const history=original.filter(historical).sort((a,b)=>
  (`${a.sentDate} ${a.time}`).localeCompare(`${b.sentDate} ${b.time}`));
 if(!history.length)return;
 conversation.messages=[...history,...original.filter(message=>!historical(message))];
}

/** Return a read-only conflict report. No changes are made to the game. */
export function previewPresetImport(state,payload){
 const packs=parsePresetPayload(payload),old=state.storyPresets?.rules||[],byId=new Map(old.map(r=>[r.id,r]));
 const report={packs:packs.length,rulesNew:0,rulesConflict:0,historyNew:0,historyConflict:0,newConversations:0,days:[...new Set(packs.map(p=>p.day))].sort((a,b)=>a-b),conflicts:[],warnings:[]};
 const seenHistory=new Set();
 for(const pack of packs){
  for(const r of pack.rules){if(byId.has(r.id)){report.rulesConflict++;report.conflicts.push({id:r.id,title:r.title});}else report.rulesNew++;}
  for(const h of pack.history){
   const convo=state.content?.conversations?.[pack.channel]?.find(c=>c.id===h.conversationId);
   if(!convo)report.newConversations++;
   const existing=new Set((convo?.messages||[]).map(m=>m.id));
   for(const m of h.messages){const key=historyKey(pack.channel,h.conversationId,m.id);if(seenHistory.has(key)||existing.has(m.id)){report.historyConflict++;}else report.historyNew++;seenHistory.add(key);}
  }
 }
 if(report.historyConflict)report.warnings.push('同编号历史消息保留已有记录，不会覆盖玩家发送的内容。');
 return report;
}

/**
 * mode=merge: matching IDs keep the local authored rule;
 * mode=replace-conflicts: only matching rule IDs are replaced. Actual chat history,
 * used-once flags and story progression are never overwritten.
 */
export function applyPresetImport(state,payload,{mode='merge',restoreDeleted=false}={}){
 if(!['merge','replace-conflicts'].includes(mode))throw Error('未知的导入方式');
 const packs=parsePresetPayload(payload),report=previewPresetImport(state,packs),presets=ensurePresets(state);
 const positions=new Map(presets.rules.map((r,i)=>[r.id,i]));
 presets.deletedRuleIds??=[];
 const deleted=new Set(presets.deletedRuleIds);
 for(const pack of packs){
  for(const rule of pack.rules){
   if(deleted.has(rule.id)&&!restoreDeleted)continue;
   const index=positions.get(rule.id);
   if(index===undefined){positions.set(rule.id,presets.rules.length);presets.rules.push(structuredClone(rule));}
   else if(mode==='replace-conflicts')presets.rules[index]=structuredClone(rule);
  }
  const conversations=state.content.conversations[pack.channel]??(state.content.conversations[pack.channel]=[]);
  for(const h of pack.history){
   let conversation=conversations.find(c=>c.id===h.conversationId);
   if(!conversation){conversation={id:h.conversationId,name:h.conversationName||h.conversationId,avatar:(h.conversationName||h.conversationId).slice(0,1),messages:[]};conversations.push(conversation);}
   const known=new Set(conversation.messages.map(m=>m.id));
   for(const message of h.messages){
    if(known.has(message.id)){
     const current=conversation.messages.find(m=>m.id===message.id);
     if(message.text===correctedHistoryLink.next&&isCorrectableHistoryLink(h.conversationId,current))current.text=correctedHistoryLink.next;
     continue;
    }
    conversation.messages.push(authoredMessage(pack,h,message));known.add(message.id);
   }
  }
 }
 if(packs.some(pack=>pack.channel==='wechat'))for(const conversation of state.content.conversations.wechat||[])orderWeChatHistory(conversation);
 if(restoreDeleted)presets.deletedRuleIds=presets.deletedRuleIds.filter(id=>!packs.some(pack=>pack.rules.some(r=>r.id===id)));
 return report;
}
