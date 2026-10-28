import {parsePresetPayload} from './io/format.js';
import {applyPresetImport} from './io/import.js';

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

/** Initial fixture loading is additive and idempotent; local authored edits win. */
export async function hydrateBuiltInPresets(store,fetcher=fetch){
 const packs=await loadBuiltInPresets(fetcher),s=store.get();
 const known=new Set((s.storyPresets?.rules||[]).map(r=>r.id));
 const deleted=new Set(s.storyPresets?.deletedRuleIds||[]);
 if(!packs.some(pack=>pack.rules.some(rule=>!known.has(rule.id)&&!deleted.has(rule.id))||pack.history.some(h=>h.messages.some(m=>!s.content.conversations[pack.channel]?.find(c=>c.id===h.conversationId)?.messages.some(x=>x.id===m.id)))))return;
 store.update(next=>applyPresetImport(next,packs,{mode:'merge'}));
}
