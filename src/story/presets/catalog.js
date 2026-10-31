import {isStory55} from '../../services/story55/state.js';
import {parsePresetPayload} from './io/format.js';
import {applyPresetImport,hasBuiltInTextCorrections} from './io/import.js';

/** Read only the authored files listed in the manifest; no player data is fetched. */
export async function loadBuiltInPresets(fetcher=fetch){
 const folder=new URL('./days/',import.meta.url);
 const manifestResponse=await fetcher(new URL('manifest.json',folder));
 if(!manifestResponse.ok)throw Error('无法读取内置剧情目录');
 const manifest=await manifestResponse.json();
 if(manifest.format!=='ximeng-preset-manifest-v1'||!Array.isArray(manifest.files)||manifest.files.length>360)throw Error('内置剧情目录格式无效');
 const packs=[];
 for(const filename of manifest.files){
  if(typeof filename!=='string'||!/^D\d{3}\/[a-z0-9-]+\.json$/.test(filename))throw Error('不安全的剧情文件路径');
  const response=await fetcher(new URL(filename,folder));
  if(!response.ok)throw Error('无法读取剧情文件 '+filename);
  const [pack]=parsePresetPayload(await response.json());
  if(`D${String(pack.day).padStart(3,'0')}`!==filename.slice(0,4))throw Error('剧情文件日期与路径不一致');
  packs.push(pack);
 }
 // Cross-file duplicate IDs are invalid, even if each individual file is valid.
 return parsePresetPayload({format:'ximeng-preset-bundle-v1',packs});
}

/** A fast, separately built historical-only bundle. Never load the 90-day packs
 * or gameplay rules in a 55-day run. Development falls back to a parallel fetch. */
export async function loadPreD01Wechat(fetcher=fetch){
 const folder=new URL('./days/',import.meta.url);
 let archive;
 try{
  const response=await fetcher(new URL('pre-d01-wechat.json',folder));
  if(response.ok)archive=parsePresetPayload(await response.json());
 }catch{ /* dev servers do not have the release-only bundled archive */ }
 if(!archive){
  const manifest=await fetcher(new URL('manifest.json',folder));
  if(!manifest.ok)throw Error('无法读取历史微信目录');
  const list=await manifest.json();
  const names=(list.files||[]).filter(x=>/^D001\/wechat[a-z0-9/-]*\.json$/.test(x));
  archive=await Promise.all(names.map(async name=>{
   const response=await fetcher(new URL(name,folder));
   if(!response.ok)throw Error('缺失历史聊天文件 '+name);
   return parsePresetPayload(await response.json())[0];
  }));
 }
 const historical=archive.filter(pack=>pack.channel==='wechat').map(pack=>({
  ...pack,rules:[],
  history:(pack.history||[]).map(h=>({
   ...h,messages:(h.messages||[]).filter(m=>
    m.sentDate&&m.sentDate<'2025-05-19'
   )
  })).filter(h=>h.messages.length)
 })).filter(pack=>pack.history.length);
 if(historical.reduce((n,p)=>n+p.history.reduce((k,h)=>k+h.messages.length,0),0)<30)
  throw Error('D01以前微信历史数据不完整，已阻止空记录覆盖');
 return historical;
}

/** Initial fixture loading is additive and idempotent; local authored edits win. */
export async function hydrateBuiltInPresets(store,fetcher=fetch){
 if(isStory55(store.get())){
  const historical=await loadPreD01Wechat(fetcher);
  store.update(s=>{
   const report=applyPresetImport(s,historical,{mode:'merge'});
   s.content.historicalWechat={loaded:true,count:(s.content.conversations.wechat||[]).reduce((n,c)=>n+c.messages.filter(m=>m.sentDate&&m.sentDate<'2025-05-19').length,0),source:'historical-pre-D01',newMessages:report.historyNew};
  });
  return;
 }
 const packs=await loadBuiltInPresets(fetcher),s=store.get();
 const known=new Set((s.storyPresets?.rules||[]).map(r=>r.id));
 const deleted=new Set(s.storyPresets?.deletedRuleIds||[]);
 const needsLegacyLinkCorrection=s.content.conversations.wechat?.find(c=>c.id==='group')?.messages.some(m=>
  m.id==='wx-group-20240310-019'&&m.storyImported===true&&!m.actual&&m.text==='【小红书分享链接 · 待补】');
 if(!needsLegacyLinkCorrection&&!hasBuiltInTextCorrections(s)&&!packs.some(pack=>pack.rules.some(rule=>!known.has(rule.id)&&!deleted.has(rule.id))||pack.history.some(h=>h.messages.some(m=>!s.content.conversations[pack.channel]?.find(c=>c.id===h.conversationId)?.messages.some(x=>x.id===m.id)))))return;
 store.update(next=>applyPresetImport(next,packs,{mode:'merge'}));
}
