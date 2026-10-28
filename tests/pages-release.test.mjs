import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('Pages releases isolate cached modules, CSS and assets without changing source or saved-data paths',async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'ximeng-pages-'));
 const put=async(name,text)=>{const file=path.join(folder,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);};
 try{
  await cp(new URL('../scripts/',import.meta.url),path.join(folder,'scripts'),{recursive:true});
  await put('package.json','{"type":"module"}');
  const source='<!doctype html><html><head><link rel="stylesheet" href="/src/styles/base.css"><script type="importmap">{"imports":{"chess.js":"/vendor/chess.js"}}</script></head><body><script type="module" src="/src/main.js"></script></body></html>';
  await put('index.html',source);
  await put('src/main.js',"import './child.js'; const image='/assets/icon.svg';");
  await put('src/child.js','export const value=1;');
  await put('src/styles/base.css',"@import './child.css'; body{background:url('/assets/icon.svg')}");
  await put('src/styles/child.css','body{color:black}');
  await put('public/assets/icon.svg','<svg/>');
  await put('node_modules/chess.js/dist/esm/chess.js','export class Chess{}');
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
  assert.ok((await read(root+'src/main.js')).includes(`${prefix}assets/icon.svg`));
  assert.equal(await read(root+'src/child.js'),'export const value=1;');
  assert.match(await read(root+'src/styles/base.css'),/@import '\.\/child.css'/);
  assert.equal(await read(root+'src/styles/child.css'),'body{color:black}');
  assert.equal(await read(root+'assets/icon.svg'),await read('dist/assets/icon.svg'));
  build();
  assert.equal(JSON.parse(await read('dist/release.json')).version,release.version);
  await put('src/child.js','export const value=2;');
  build();
  assert.notEqual(JSON.parse(await read('dist/release.json')).version,release.version);
 }finally{await rm(folder,{recursive:true,force:true});}
});
