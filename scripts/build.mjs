import {cp,mkdir,rm,readdir,writeFile} from 'node:fs/promises';
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
await mkdir('dist/vendor',{recursive:true});
await cp('node_modules/chess.js/dist/esm/chess.js','dist/vendor/chess.js');
await cp('node_modules/stockfish/bin/stockfish-19-lite-single.js','dist/vendor/stockfish-19-lite-single.js');
await cp('node_modules/stockfish/bin/stockfish-19-lite-single.wasm','dist/vendor/stockfish-19-lite-single.wasm');
console.log('Built single-entry phone in dist/');
