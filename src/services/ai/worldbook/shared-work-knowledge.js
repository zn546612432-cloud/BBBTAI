// Read-only projection of GHOST work the player actually shared with
// Dr Ouroboros. The native MIRAGE messages remain the only source of truth:
// this is neither another memory store nor a work-progress simulator.
const relevance=/(?:ghost|ouroboros|[銜衔]尾蛇(?:之[淚泪])?|\btai\b|narrenschiff|[項项]目|工程|框架|[進进]度|部署|[測测][試试]|[連连][結结]|[鏈链][接接]|[發发][給给]|[分发][享享]|上次|之前|[記记]得|工作)/i;
const eligible=(m,s)=>m&&m.from==='me'&&m.actual===true&&!m.demo&&!m.testOnly&&!m.authoredPending&&
 ['ghost-project','ghost-order'].includes(m.kind)&&Number.isInteger(m.day)&&m.day>=1&&m.day<=s.day&&
 (m.day<s.day||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(m.time||''))||m.time<=s.clock);
export function projectTaiSharedWorkKnowledge(s,{channel='mirage',query=''}={}){
 if(s?.story55?.version!==1||s.story55.ended||!['mirage','noapp'].includes(channel))return [];
 // NoApp is not accessible before recognition. Do not leak MIRAGE-only
 // knowledge to an unrecognized, scripted persona.
 if(channel==='noapp'&&!s.story55.completed?.recognition)return [];
 const relevant=relevance.test(String(query||''));
 if(channel==='noapp'&&!relevant)return [];
 const chat=s.content?.conversations?.mirage?.find(c=>c.id==='s55-ouroboros');
 const cards=(chat?.messages||[]).filter(m=>eligible(m,s)&&
  (m.attachment?.type==='ghost-project'||m.attachment?.type==='ghost-order'));
 const cap=relevant?3:1;
 return cards.slice(-cap).reverse().map(m=>{
  const a=m.attachment;
  const title=String(a.title||a.projectId||a.orderId||'GHOST').slice(0,90);
  const percent=Number.isFinite(a.percent)?Math.max(0,Math.min(100,Math.round(a.percent))):null;
  const status=typeof a.status==='string'?String(a.status).slice(0,40):null;
  return {id:'shared-ghost-work:'+m.id,sourceIds:[m.id],content:
   '熙蒙確實曾在 MIRAGE 向你（Dr Ouroboros）分享 GHOST '+(a.type==='ghost-project'?'項目':'工作單')+
   '「'+title+'」；當時分享的卡片'+(percent!==null?'顯示 '+percent+'% 進度':status?'狀態是 '+status:'未顯示進度')+
   '。你已收到這張卡片，之後可以自然記得他曾發來、問他驗證情況，不可假裝初次聽說。這只是分享當時的快照，不代表現在已完成、今天又傳了一份或你親眼見過其他未分享的內部工作。'
  };
 });
}
