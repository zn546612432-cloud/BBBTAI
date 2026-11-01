// Developer-only savepoints. Kept in separate storage so timeline resets never
// mutate or remove snapshots. These are NOT canonical story configuration files.
const INDEX_KEY='ximeng-phone-story55-snapshots-index-v1';
const DATA_PREFIX='ximeng-phone-story55-snapshot-v1:';
const clone=value=>structuredClone(value);

export function storySourceVersion(s){
  // Only immutable authored content belongs to a story version. Runtime chat
  // delivery, NPC replies, payouts and read receipts must NOT change it.
  const conversations=Object.fromEntries(
    Object.entries(s.content?.conversations||{}).map(([channel,items])=>[
      channel,items.map(c=>({
        id:c.id,
        ...(c.authored===true?{name:c.name,members:c.members}:{}),
        messages:(c.messages||[])
         .filter(m=>!m.story55&&!m.demo&&!/^preset-/.test(m.id||'')&&
           (m.authored===true||m.storyImported===true||m.schedule?.mode==='game-time'||typeof m.sentDate==='string'&&m.sentDate<'2025-05-19'))
         .map(m=>({id:m.id,from:m.from,text:m.text,sentDate:m.sentDate,schedule:m.schedule,kind:m.kind}))
      })).filter(c=>c.messages.length||c.name)
    ]).filter(([,items])=>items.length)
  );
  const linked=Object.values(s.content?.mirage?.linkedMissions||{}).map(m=>{
    const {stage,submitted,deliveredAt,failed,...definition}=m;
    return definition;
  }).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const source=JSON.stringify({
    config:s.story55?.config,
    presets:s.storyPresets?.rules,
    conversations,linked,
    moments:s.content?.moments?.posts
  });
  // FNV-1a change detector, NOT an authenticity or cryptographic signature.
  let hash=2166136261;
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return 'v2-'+(hash>>>0).toString(16).padStart(8,'0');
}
function readIndex(storage){
  try{const parsed=JSON.parse(storage.getItem(INDEX_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.id==='string'):[];}
  catch{return [];}
}
export function listTestSnapshots(storage){return readIndex(storage);}
function saveIndex(storage,index){storage.setItem(INDEX_KEY,JSON.stringify(index));}
export function saveTestSnapshot(storage,state,label='自动保存 · 日期跳转前'){
  if(!storage?.setItem)throw Error('没有可用的本机快照存储');
  const id=String(Date.now())+'-'+Math.random().toString(36).slice(2,9);
  const entry={id,label:String(label).slice(0,70),day:state.day,clock:state.clock,createdAt:new Date().toISOString(),sourceVersion:storySourceVersion(state)};
  const key=DATA_PREFIX+id;
  const data=JSON.stringify({format:'ximeng-story55-test-snapshot-v1',entry,state:clone(state)});
  try{
    storage.setItem(key,data);
    try{saveIndex(storage,[entry,...readIndex(storage)]);}catch(error){storage.removeItem?.(key);throw error;}
  }catch{
    throw Error('测试快照保存失败：本机空间可能不足。时间跳转已取消，请先导出存档备份。');
  }
  return entry;
}
export function getTestSnapshot(storage,id){
  const entry=readIndex(storage).find(x=>x.id===id);
  if(!entry)throw Error('找不到这份测试快照');
  let saved;
  try{saved=JSON.parse(storage.getItem(DATA_PREFIX+id)||'null');}catch{}
  if(saved?.format!=='ximeng-story55-test-snapshot-v1'||saved.entry?.id!==id||!saved.state)throw Error('快照文件缺失或已损坏');
  return saved;
}
export function restoreTestSnapshot(store,id,{allowDifferentVersion=false}={}){
  const saved=getTestSnapshot(store.storage,id);
  const currentVersion=storySourceVersion(store.get());
  if(saved.entry.sourceVersion!==currentVersion&&!allowDifferentVersion){
    throw Error('剧情版本不同：请选择按旧版恢复，或重新生成当前日期。');
  }
  // Always preserve the current authoring draft before replacing runtime state.
  saveTestSnapshot(store.storage,store.get(),'恢复前自动备份');
  store.replace(saved.state);
  return {entry:saved.entry,versionChanged:saved.entry.sourceVersion!==currentVersion};
}
export function deleteTestSnapshot(storage,id){
  const index=readIndex(storage);
  if(!index.some(x=>x.id===id))return false;
  saveIndex(storage,index.filter(x=>x.id!==id));
  storage.removeItem?.(DATA_PREFIX+id);
  return true;
}
