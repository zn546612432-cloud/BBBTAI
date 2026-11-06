// Audits the assembled GitHub Pages output without deleting source files.
// This is the only permitted site inventory for the conservative cleanup:
// main, /preview/, /review/55-20261101/, /review/tai-vision-20261105/.
// Source branches, game content, photos, audio and maps remain untouched.
import {readdir,readFile,stat,lstat} from 'node:fs/promises';
import path from 'node:path';

const dir=process.argv[2]||'dist';
const allowedReviews=['55-20261101','tai-vision-20261105'];
const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));
const check=(condition,message)=>{if(!condition)throw Error('Pages cleanup audit: '+message);};

const actualReviews=(await readdir(path.join(dir,'review'))).sort();
check(JSON.stringify(actualReviews)===JSON.stringify([...allowedReviews].sort()),
 'only Story55 and Tai Vision are allowed in /review/: '+actualReviews.join(', '));
const roots=[
 {key:'production',folder:dir,expected:'/BBBTAI/'},
 {key:'latest-preview',folder:path.join(dir,'preview'),expected:'/BBBTAI/preview/'},
 {key:'story55',folder:path.join(dir,'review','55-20261101'),expected:'/BBBTAI/review/55-20261101/'},
 {key:'tai-vision',folder:path.join(dir,'review','tai-vision-20261105'),expected:'/BBBTAI/review/tai-vision-20261105/'}
];
const sizes={};
async function walk(folder){
 let total=0,files=0;
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const item=path.join(folder,entry.name);
  if(entry.isDirectory()){
   const result=await walk(item);total+=result.bytes;files+=result.files;
  }else if(entry.isFile()){
   total+=(await stat(item)).size;files++;
  }else if(entry.isSymbolicLink()){
   throw Error('Unexpected symlink in Pages artifact: '+item);
  }
 }
 return {bytes:total,files};
}
for(const root of roots){
 const html=await readFile(path.join(root.folder,'index.html'),'utf8');
 const release=await readJSON(path.join(root.folder,'release.json'));
 check(html.includes('ximeng-release'),'missing release marker at '+root.key);
 check(release.url.startsWith(root.expected+'releases/'),'wrong release base at '+root.key+': '+release.url);
 check(html.includes(release.url+'src/main.js'),'unversioned JS entry at '+root.key);
 check((await lstat(path.join(root.folder,'releases',release.version,'src','main.js'))).isFile(),
  'missing versioned application at '+root.key);
 if(root.key!=='production')check(html.includes('phone-preview'),'preview banner missing: '+root.key);
 if(root.key!=='production')sizes[root.key]=await walk(root.folder);
}
const total=await walk(dir);
// The production tree is dist minus its nested preview trees; avoid
// double-counting those nested bytes in the per-site breakdown.
sizes.production={
 bytes:total.bytes-sizes['latest-preview'].bytes-sizes.story55.bytes-sizes['tai-vision'].bytes,
 files:total.files-sizes['latest-preview'].files-sizes.story55.files-sizes['tai-vision'].files
};
// Keep enough headroom for assets, but prohibit accidentally republishing the
// 14 old snapshots (previous upload: ~828 MB compressed).
const maxBytes=450*1024*1024;
check(total.bytes<maxBytes,
 'artifact grew too large: '+(total.bytes/1048576).toFixed(1)+' MiB (limit 450 MiB)');
check(sizes['story55'].files>100,'Story55 reference was not built');
check(sizes['tai-vision'].files>100,'Tai Vision was not built');
console.log('PAGES_CLEANUP_AUDIT '+JSON.stringify({
 sites:['/', '/preview/', '/review/55-20261101/','/review/tai-vision-20261105/'],
 retiredReviewCount:14,bytes:total.bytes,files:total.files,
 megabytes:Number((total.bytes/1048576).toFixed(2)),
 maxMiB:450,details:sizes
}));
