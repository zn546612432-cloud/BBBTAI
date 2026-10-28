import {execFileSync} from 'node:child_process';
import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// The game runs at / in local development, but project Pages lives at /AAATAI/.
// Rewrite absolute app asset URLs only in the generated site, never in sources or saves.
const repo=(process.env.GITHUB_REPOSITORY||'zn546612432-cloud/AAATAI').split('/').at(-1);
const projectPath=process.env.GITHUB_PAGES_BASE||`/${repo}/`;
if(!/^\/[A-Za-z0-9._/-]*\/$/.test(projectPath)||projectPath.includes('..'))throw Error('Invalid GitHub Pages base path');
const base=projectPath==='/'?'/':projectPath;
const resourcePattern=/(["'`(=])\/(src|assets|apps|icons|vendor|wallpapers)(?=\/)/g;

execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});

// Version the whole module graph, including relative imports and CSS imports.
// A query on index.html alone would still reuse cached modules at fixed URLs.
const hash=createHash('sha256').update(base);
async function hashTree(folder){
 for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory())await hashTree(file);
  else hash.update(file).update('\0').update(await readFile(file)).update('\0');
 }
}
await hashTree('dist');
const version=hash.digest('hex').slice(0,16);
const releaseBase=`${base}releases/${version}/`;

let replacements=0;
async function rewriteTree(folder){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory()){await rewriteTree(file);continue;}
  if(!/\.(html|css|js)$/.test(entry.name))continue;
  const original=await readFile(file,'utf8');
  const rewritten=original.replace(resourcePattern,(_all,prefix,section)=>{replacements++;return `${prefix}${releaseBase}${section}`;});
  if(rewritten!==original)await writeFile(file,rewritten);
 }
}
await rewriteTree('dist');
const index=await readFile('dist/index.html','utf8');
await writeFile('dist/index.html',index.replace('<head>',`<head><meta name="ximeng-release" content="${version}">`));
await writeFile('dist/release.json',JSON.stringify({version,source_commit:process.env.GITHUB_SHA||null,url:releaseBase})+'\n');
await writeFile('dist/.nojekyll','');
const entries=await readdir('dist');
const releaseDir=`dist/releases/${version}`;
await mkdir(releaseDir,{recursive:true});
// Keep root assets for existing saved wallpaper/avatar paths. Both entry points
// use the same origin and storage key, preserving the player's saved game.
for(const entry of entries)await cp(path.join('dist',entry),path.join(releaseDir,entry),{recursive:true});
console.log(`GitHub Pages: ${replacements} resource paths adapted to ${releaseBase}`);
