import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('src/story/presets/days');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
if(manifest.format!=='ximeng-preset-manifest-v1'||!Array.isArray(manifest.files))throw Error('Invalid preset manifest');
const packs=[];
let count=0;
for(const entry of manifest.files){
 if(!/^D001\/wechat[a-z0-9/-]*\.json$/.test(entry))continue;
 const pack=JSON.parse(await readFile(path.join(root,entry),'utf8'));
 if(pack.channel!=='wechat')continue;
 const history=(pack.history||[]).map(h=>({...h,messages:(h.messages||[]).filter(m=>
  typeof m.sentDate==='string'&&m.sentDate<'2025-05-19'&&/^\d{4}-\d{2}-\d{2}$/.test(m.sentDate)
 )})).filter(h=>h.messages.length);
 if(history.length){count+=history.reduce((n,h)=>n+h.messages.length,0);packs.push({...pack,rules:[],history});}
}
if(count<30)throw Error('Missing pre-D01 WeChat history; refusing incomplete build');
const bundle={format:'ximeng-preset-bundle-v1',packs};
const target='dist/src/story/presets/days/pre-d01-wechat.json';
await mkdir(path.dirname(target),{recursive:true});
await writeFile(target,JSON.stringify(bundle));
console.log('Bundled '+count+' pre-D01 WeChat messages from '+packs.length+' historical packs.');
