// One-time vendor task. Assets are fetched at build/maintenance time ONLY.
// The phone itself always reads public/assets/meteocons/ without network.
// Source: https://github.com/basmilius/meteocons
// Licensed MIT by Bas Milius; the upstream license is retained verbatim.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {METEOCON_SLUGS} from '../src/apps/weather/meteocons.js';

const VERSION='3.0.0-next.10';
const CDN='https://cdn.meteocons.com/'+VERSION+'/';
const LICENSE_URL='https://raw.githubusercontent.com/basmilius/meteocons/main/packages/svg/LICENSE';
const ROOT='public/assets/meteocons';
const manifest={upstream:'https://github.com/basmilius/meteocons',
 version:VERSION,style:'fill',license:'MIT',
 attribution:'Meteocons weather icons by Bas Milius (MIT)',
 categories:['svg','svg-static'],files:[]};

async function download(url){
 let lastError;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{accept:'image/svg+xml,text/plain,*/*'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   return await response.text();
  }catch(e){
   lastError=e;
   if(attempt<3)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1800));
  }
 }
 throw Error(url+': '+String(lastError));
}
async function saveIcon(slug,variant){
 const folder=variant==='svg'?'fill':'static';
 const url=CDN+variant+'/fill/'+slug+'.svg';
 const svg=await download(url);
 if(svg.length<250||svg.length>150000||!/<svg\b/i.test(svg)||!/<\/svg>/i.test(svg)
   ||/<script\b|<foreignObject\b|\bon(?:load|click|error)\s*=/i.test(svg))
  throw Error('Invalid or unsafe vendor SVG '+url);
 if(variant==='svg'&&!/<animate|@keyframes|animation\s*:/i.test(svg))
  throw Error('Not an animated Meteocons SVG '+url);
 const path=ROOT+'/'+folder+'/'+slug+'.svg';
 await mkdir(ROOT+'/'+folder,{recursive:true});
 await writeFile(path,svg,'utf8');
 manifest.files.push({path:path.replace(ROOT+'/',''),
  sha256:createHash('sha256').update(svg).digest('hex'),bytes:Buffer.byteLength(svg),source:url});
}
for(const slug of METEOCON_SLUGS){
 // Run sequentially to avoid stressing the upstream icon CDN.
 await saveIcon(slug,'svg');
 await saveIcon(slug,'svg-static');
 console.log('Vendored animated + reduced-motion:',slug);
}
const license=await download(LICENSE_URL);
if(!license.includes('MIT License')||!license.includes('Bas Milius'))throw Error('Upstream license mismatch');
await writeFile(ROOT+'/LICENSE',license,'utf8');
await writeFile(ROOT+'/SOURCES.json',JSON.stringify(manifest,null,2)+'\n','utf8');
console.log('DONE:',METEOCON_SLUGS.length,'animated +',METEOCON_SLUGS.length,
 'static SVGs. All assets vendored locally with MIT license.');
