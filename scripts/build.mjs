import {cp,mkdir,rm,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('src','dist/src',{recursive:true});
// Generate the manifest from the actual bundled images so new artwork is
// automatically included. Literal paths also use the Pages asset rewriter.
const imageUrls=[];
async function collectImages(folder='public',prefix=''){
 for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const relative=prefix+entry.name;
  if(entry.isDirectory())await collectImages(`${folder}/${entry.name}`,`${relative}/`);
  else if(/\.(?:png|jpe?g|webp|svg|gif|avif)$/i.test(entry.name))imageUrls.push('/'+relative);
 }
}
await collectImages();
const priority=url=>/\/room404\/|\/personal-files\/|triplets-baby-photo/.test(url)?0:/\/wechat\/media\/|\/browser\/|\/maps\//.test(url)?1:/\/stickers\//.test(url)?3:2;
imageUrls.sort((a,b)=>priority(a)-priority(b));
await mkdir('dist/src/system/startup',{recursive:true});
await writeFile('dist/src/system/startup/image-manifest.js',`export default ${JSON.stringify(imageUrls)};\n`);
console.log(`Startup: ${imageUrls.length} bundled images`);
// Archive is loaded as one file rather than dozens of sequential requests.
await import('./build-pre-d01-history.mjs');
await rm('dist/src/legacy',{recursive:true,force:true});
await cp('index.html','dist/index.html');
// Cloudflare Pages and GitHub Pages share this single friends-test entry.
// It reuses the production assets and runtime; the meta flag only hides
// author/developer controls (no parallel build or duplicated game files).
const friendsHtml=(await readFile('dist/index.html','utf8'))
 .replace('<head>','<head><meta name="phone-friends-test" content="true">')
 .replace('/assets/tai-app/manifest.webmanifest','/assets/tai-app/friends-test.webmanifest');
if(!friendsHtml.includes('<meta name="phone-friends-test" content="true">'))
 throw Error('Friends test isolation flag missing');
await mkdir('dist/review/friends-test',{recursive:true});
await writeFile('dist/review/friends-test/index.html',friendsHtml);
await mkdir('dist/vendor',{recursive:true});
await cp('node_modules/chess.js/dist/esm/chess.js','dist/vendor/chess.js');
await cp('node_modules/opencc-js/dist/esm/cn2t.js','dist/vendor/opencc-cn2t.js');
await cp('node_modules/opencc-js/LICENSE','dist/vendor/opencc-LICENSE');
await cp('node_modules/opencc-js/THIRD_PARTY_LICENSES.md','dist/vendor/opencc-THIRD_PARTY_LICENSES.md');
await cp('node_modules/opencc-js/LICENSES','dist/vendor/opencc-LICENSES',{recursive:true});
await cp('node_modules/stockfish/bin/stockfish-19-lite-single.js','dist/vendor/stockfish-19-lite-single.js');
await cp('node_modules/stockfish/bin/stockfish-19-lite-single.wasm','dist/vendor/stockfish-19-lite-single.wasm');
console.log('Built single-entry phone in dist/');

// Preflight manifest of every shipped game resource, not only image thumbnails.
// Paths stay logical: production and review releases resolve the same inventory
// with different code prefixes but stable media URLs.
const GAME_EXT=/\.(?:js|css|json|html|mjs|wasm|png|jpe?g|webp|svg|gif|avif|mp3|m4a|wav|mp4|webm|ico|woff2?)$/i;
const packageAssets=[];
const packageHash=createHash('sha256');
async function inventory(dir,prefix=''){
 for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const name=prefix+entry.name;
  if(entry.isDirectory())await inventory(dir+'/'+entry.name,name+'/');
  else if(GAME_EXT.test(name)){
   const content=await readFile(dir+'/'+entry.name);
   packageHash.update(name).update('\0').update(content).update('\0');
   packageAssets.push({path:name,bytes:content.length,hash:createHash('sha256').update(content).digest('hex').slice(0,20)});
  }
 }
}
for(const directory of ['src','vendor','apps','assets','icons','wallpapers']){
 try{await stat('dist/'+directory);await inventory('dist/'+directory,directory+'/');}catch(error){if(error.code!=='ENOENT')throw error;}
}
const fullManifest={version:packageHash.digest('hex').slice(0,20),assets:packageAssets};
await mkdir('dist/assets/startup',{recursive:true});
await writeFile('dist/assets/startup/full-assets.json',JSON.stringify(fullManifest));
console.log('Startup full package:',packageAssets.length,'files,',Math.round(packageAssets.reduce((n,x)=>n+x.bytes,0)/1e6),'MB');
