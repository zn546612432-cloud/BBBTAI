import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('Pages releases isolate code while all public media URLs survive version rotation',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ximeng-pages-'));
 const put=async(name,text)=>{const file=path.join(folder,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
 try{
  await cp(new URL('../scripts/',import.meta.url),path.join(folder,'scripts'),{recursive:true});
  await put('src/services/public-assets.js',await readFile(new URL('../src/services/public-assets.js',import.meta.url),'utf8'));
  await put('package.json','{"type":"module"}');
  const source='<!doctype html><html><head><link rel="stylesheet" href="/src/styles/base.css"><script type="importmap">{"imports":{"chess.js":"/vendor/chess.js","opencc-js/cn2t":"/vendor/opencc-cn2t.js"}}</script></head><body><script type="module" src="/src/main.js"></script></body></html>';
  await put('index.html',source);
  await put('src/main.js',"import './child.js'; const image='/assets/icon.svg'; const ig='/apps/browser/room404/media/'; const logo='/apps/browser/room404/wordmark.svg'; const photos='/assets/story55/personal-files/'; const photo='/assets/story55/triplets-baby-photo.jpg'; const avatar='/apps/wechat/avatars/new-person.webp'; const wallpaper='/wallpapers/new.png'; const icon='/icons/new.png';");
  await put('src/child.js','export const value=1;');
  await put('src/styles/base.css',"@import './child.css'; body{background:url('/assets/icon.svg')}");
  await put('src/styles/child.css','body{color:black}');
  await put('public/assets/icon.svg','<svg/>');
  const evidence=['apps/browser/room404/media/avatar.webp','apps/browser/room404/wordmark.svg','assets/story55/personal-files/IMG_4982.jpg','assets/story55/triplets-baby-photo.jpg','apps/wechat/avatars/new-person.webp','wallpapers/new.png','icons/new.png'];
  const moment='apps/wechat/media/macau-morning.webp';
  await put('public/'+moment,'fixture: current Moments image');
  for(const item of evidence)await put('public/'+item,'fixture: '+item);
  await put('node_modules/chess.js/dist/esm/chess.js','export class Chess{}');
  await cp(new URL('../node_modules/opencc-js/',import.meta.url),path.join(folder,'node_modules/opencc-js'),{recursive:true});
  // Copy the real bundled engine, not simulated worker assets.
  for(const name of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm']){
   await mkdir(path.join(folder,'node_modules/stockfish/bin'),{recursive:true});
   await cp(new URL('../node_modules/stockfish/bin/'+name,import.meta.url),path.join(folder,'node_modules/stockfish/bin',name));
  }
  const build=()=>execFileSync(process.execPath,['scripts/build-pages.mjs'],{cwd:folder,env:{...process.env,GITHUB_REPOSITORY:'owner/AAATAI',GITHUB_PAGES_BASE:'/AAATAI/',GITHUB_SHA:'test-sha'},stdio:'pipe'});
  const read=name=>readFile(path.join(folder,name),'utf8');
  build();
  const release=JSON.parse(await read('dist/release.json'));
  const prefix=`/AAATAI/releases/${release.version}/`;
  assert.equal(release.url,prefix);
  assert.equal(release.source_commit,'test-sha');
  assert.equal(await read('index.html'),source);
  const html=await read('dist/index.html');
  assert.ok(html.includes(`${prefix}src/main.js`));
  assert.ok(html.includes(`${prefix}vendor/chess.js`));
  assert.match(html,/name="ximeng-release"/);
  const root=`dist/releases/${release.version}/`;
  assert.equal(await read(root+'index.html'),html);
  assert.match(await read(root+'src/main.js'),/import '\.\/child.js'/);
  assert.ok((await read(root+'src/main.js')).includes('/AAATAI/assets/icon.svg'));
  const oldCode=await read(root+'src/main.js');
  const manifest=JSON.parse((await read(root+'src/system/startup/image-manifest.js')).match(/export default (\[.*\]);/)[1]);
  assert.ok(manifest.includes('/AAATAI/assets/icon.svg'));
  assert.ok(!manifest.some(url=>url.includes('/releases/')),'no public images are tied to a release');
  for(const item of evidence)assert.ok(manifest.includes(`/AAATAI/${item}`),`preload must use the same stable media URL: ${item}`);
  assert.ok(manifest.includes('/AAATAI/'+moment),'Moments preload must warm the stable URL requested by its renderer');
  assert.ok(!manifest.includes(prefix+moment),'do not download a second release copy of the same photo');
  for(const item of evidence){
   const resource=item.includes('/media/')||item.includes('/personal-files/')?item.slice(0,item.lastIndexOf('/')+1):item;
   assert.ok(oldCode.includes(`'/AAATAI/${resource}'`),`stable media URL: ${resource}`);
   assert.equal(await read('dist/'+item),'fixture: '+item);
  }
  assert.equal(await read(root+'src/child.js'),'export const value=1;');
  assert.match(await read(root+'src/styles/base.css'),/@import '\.\/child.css'/);
  assert.ok((await read(root+'src/styles/base.css')).includes('/AAATAI/assets/icon.svg'));
  assert.equal(await read(root+'src/styles/child.css'),'body{color:black}');
  assert.equal(await read(root+'assets/icon.svg'),await read('dist/assets/icon.svg'));
  build();
  assert.equal(JSON.parse(await read('dist/release.json')).version,release.version);
  await put('src/child.js','export const value=2;');
  build();
  assert.notEqual(JSON.parse(await read('dist/release.json')).version,release.version);
  // A live phone from the prior release still requests valid public media.
  for(const item of evidence)assert.equal(await read('dist/'+item),'fixture: '+item);
 }finally{await rm(folder,{recursive:true,force:true});}
});

test('main Pages packaging only retains 3 approved sites and never rebuilds retired previews',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 const audit=await readFile(new URL('../scripts/audit-pages-site.mjs',import.meta.url),'utf8');
 // Production stays online; the duplicate latest preview is retired.
 assert.match(workflow,/branches: \[main\]/);
 assert.match(workflow,/npm run build:pages/);
 assert.doesNotMatch(workflow,/Build isolated preview|dist\/preview|production-dist\/preview/);
 assert.match(workflow,/review\/tai-vision-20261105/);
 assert.match(workflow,/review\/55-20261101/);
 assert.match(workflow,/ref: feat\/story55-dev-snapshot-safety-20261101/);
 assert.match(workflow,/audit-pages-site\.mjs dist/);
 assert.match(workflow,/actions\/deploy-pages@v4/);
 // Retired previews may still exist in git history; they must not be deployed.
 const oldReviewNames=[
  'd03-flow-20261101','d55-finale-20261101','ios-badges-20261102',
  'd01-cross-app-20261102','d01-20261102','d01-file-20261102',
  'd01-linkfix-20261102','xitai-bond-20261102','xitai-callfix-20261102',
  'xitai-calm-20261102','xitai-phone-20261102','xitai-v10-20261102',
  'noapp-v2-20261103','noapp-v3-20261103'
 ];
 assert.equal(oldReviewNames.length,14);
 for(const name of oldReviewNames)assert.equal(workflow.includes(name),false,'Old preview still packaged: '+name);
 assert.doesNotMatch(workflow,/Preserve isolated historical review sites/);
 assert.match(audit,/allowedReviews=\['55-20261101','tai-vision-20261105'\]/);
 assert.match(audit,/retired \/preview\/ must not be packaged/);
 assert.match(audit,/maxBytes=450\*1024\*1024/);
});

test('Pages audit rejects an accidentally packaged duplicate preview',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ximeng-pages-audit-'));
 try{
  await mkdir(path.join(folder,'preview'));
  assert.throws(()=>execFileSync(process.execPath,[new URL('../scripts/audit-pages-site.mjs',import.meta.url).pathname,folder],{stdio:'pipe'}),
   error=>error.stderr.toString().includes('retired /preview/ must not be packaged'));
 }finally{await rm(folder,{recursive:true,force:true});}
});
