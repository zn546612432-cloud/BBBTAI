import {ensurePresets} from '../engine.js';
import {parsePresetPayload} from './format.js';

const historyKey=(channel,conversationId,id)=>`${channel}:${conversationId}:${id}`;
// One published March 2024 message used a temporary placeholder. Migrate only
// that exact shipped value; never replace a player's or editor's custom text.
const correctedHistoryLink={id:'wx-group-20240310-019',previous:'【小红书分享链接 · 待补】',next:'https://www.whatyi.con'};
const isCorrectableHistoryLink=(conversationId,message)=>conversationId==='group'&&message.id===correctedHistoryLink.id&&message.text===correctedHistoryLink.previous&&message.storyImported===true&&!message.actual;
export const correctedBuiltInMessages=[
 {conversationId:'hufeng',id:'wx-hufeng-20250505-003',previous:'小辛躺客厅沙发睡着了，空调开得好冷',next:'我电脑突然连不上内网了，明早还要看演习录像'},
 {conversationId:'hufeng',id:'wx-hufeng-20250505-004',previous:'给他盖件衣服，别又感冒',next:'你是不是又把网线踩松了'},
 {conversationId:'zaizai',id:'wx-zaizai-20250420-001',previous:'蒙哥，能帮我看看这张设计图吗',next:'找到一件好适合你穿的西服'},
 {conversationId:'zaizai',id:'wx-zaizai-20250420-design',previous:'/apps/wechat/media/zaizai-fashion-design.webp',next:'/apps/wechat/media/zaizai-suit-20250420.webp',image:true},
 {conversationId:'zaizai',id:'wx-zaizai-20250420-002',previous:'颜色挺好，袖口是不是太窄了',next:'你这是损我呢？'},
 {conversationId:'zaizai',id:'wx-zaizai-20250420-003',previous:'对！我也觉得',next:'哈哈'},
 {conversationId:'zaizai',id:'wx-zaizai-20250420-004',previous:'别给我做，穿不了那么花',next:'天天穿格子，想看你穿不一样的风格',previousFrom:'me',nextFrom:'仔仔'}
];
const matchesCorrection=(m,rule)=>m?.id===rule.id&&m.storyImported===true&&!m.actual&&(!rule.previousFrom||m.from===rule.previousFrom)&&(m.text===rule.previous||rule.image&&m.kind==='image'&&m.text.endsWith(rule.previous));
export function hasBuiltInTextCorrections(state){
 return (state.content.conversations.wechat||[]).some(c=>c.messages.some(m=>isRetiredSavedHistory(c.id,m)))||correctedBuiltInMessages.some(rule=>state.content.conversations.wechat?.find(c=>c.id===rule.conversationId)?.messages.some(m=>matchesCorrection(m,rule)));
}
// Revised author-approved pre-D01 threads use fresh stable IDs. Retire only
// exact shipped history rows (not player messages or editor-customized copy).
const retiredBuiltInHistory = new Map([
 ["wechat:xiaoxin:wx-xiaoxin-20250109-001",{"from":"小辛","text":"蒙哥你说我练德语怎么记不住这些词"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250109-002",{"from":"me","text":"你上次不是说自己语言天赋一流"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250109-003",{"from":"小辛","text":"天才也是需要一个适应期的"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250109-004",{"from":"me","text":"适应了半年了"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250109-005",{"from":"小辛","text":"哈哈哈哈哈哈你说话好伤人"}],
 ["wechat:awei:wx-awei-20250219-001",{"from":"阿威","text":"蒙哥，上次你说的监控延迟还没好？"}],
 ["wechat:awei:wx-awei-20250219-002",{"from":"me","text":"好了，昨天改完了"}],
 ["wechat:awei:wx-awei-20250219-003",{"from":"阿威","text":"辛苦了"}],
 ["wechat:awei:wx-awei-20250219-004",{"from":"me","text":"记得请我喝奶茶"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250323-001",{"from":"小辛","text":"蒙哥帮我看个视频"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250323-002",{"from":"me","text":"你自己看"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250323-003",{"from":"小辛","text":"是我昨天训练那段！我觉得自己超帅"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250323-004",{"from":"me","text":"看到你摔倒的部分了"}],
 ["wechat:xiaoxin:wx-xiaoxin-20250323-005",{"from":"小辛","text":"那个不算啊啊啊啊"}],
]);
const isRetiredHistory=(conversationId,message)=>{
 const previous=retiredBuiltInHistory.get(historyKey('wechat',conversationId,message.id));
 return previous&&message.from===previous.from&&message.text===previous.text;
};
const isRetiredSavedHistory=(conversationId,message)=>message.storyImported===true&&!message.actual&&isRetiredHistory(conversationId,message);
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
 if(packs.some(pack=>pack.channel==='wechat'))for(const conversation of state.content.conversations.wechat||[]){
  conversation.messages=conversation.messages.filter(message=>!isRetiredSavedHistory(conversation.id,message));
 }
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
   // An explicitly deleted SMS conversation must not reappear at next boot.
   if(pack.channel==='messages'&&state.content.deletedSmsConversationIds?.includes(h.conversationId))continue;
   let conversation=conversations.find(c=>c.id===h.conversationId);
   if(!conversation){conversation={id:h.conversationId,name:h.conversationName||h.conversationId,avatar:(h.conversationName||h.conversationId).slice(0,1),messages:[]};conversations.push(conversation);}
   const known=new Set(conversation.messages.map(m=>m.id));
   for(const message of h.messages){
    if(pack.channel==='wechat'&&isRetiredHistory(h.conversationId,message))continue;
    if(known.has(message.id)){
     const current=conversation.messages.find(m=>m.id===message.id);
     if(message.text===correctedHistoryLink.next&&isCorrectableHistoryLink(h.conversationId,current))current.text=correctedHistoryLink.next;
     const correction=correctedBuiltInMessages.find(x=>x.id===message.id&&x.conversationId===h.conversationId);
     if(correction&&matchesCorrection(current,correction)&&message.text===correction.next){
      current.text=correction.next;
      if(correction.nextFrom&&message.from===correction.nextFrom)current.from=correction.nextFrom;
     }
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
