// One-time import of already heard and approved D13 speech. No new TTS calls.
// Six 2026-11-24 audition takes; previous in-game tracking line 16; one approved mail line.
import {D13_LINES,D13_VOICE_INDICES} from '../src/story/d13/content.js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../public/assets/story55/d13/',import.meta.url);
const oldRoot=new URL('../.d13-approved-old/',import.meta.url);
const newRoot=new URL('../.d13-approved-new/',import.meta.url);
const originalManifest=JSON.parse(await readFile(new URL('voice-manifest.json',root),'utf8'));
const earlier=JSON.parse(await readFile(new URL('manifest.json',oldRoot),'utf8'));
const approved=JSON.parse(await readFile(new URL('manifest.json',newRoot),'utf8'));
const sha256=b=>createHash('sha256').update(b).digest('hex');
const blobSHA=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const mp3=b=>b.length>4096&&b.length<1000000&&(b.subarray(0,3).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224));
if(D13_VOICE_INDICES.join(',')!=='8,10,12,14,16,18,20,21'
 ||earlier.originalLines!==true||earlier.clips.length!==7
 ||earlier.voiceId!==originalManifest.voice||approved.voiceId!==originalManifest.voice
 ||approved.text!==D13_LINES[20][1])throw Error('D13 approved speech source mismatch');
const previousTracking=await readFile(new URL('call-16.mp3',root));
if(!mp3(previousTracking)||previousTracking.length!==115188
 ||blobSHA(previousTracking)!=='a10171e9a25e99f884ff3add488312ade05834ae')
 throw Error('Original game tracking line was changed: refuse to replace it');
const files=new Map([[16,previousTracking]]);
for(const c of earlier.clips){
 if(c.index===16)continue;
 const newIndex=c.index===20?21:c.index;
 const bytes=await readFile(new URL(c.filename,oldRoot));
 if(!mp3(bytes)||c.original!==D13_LINES[newIndex][1]
  ||bytes.length!==c.bytes||sha256(bytes)!==c.sha256)throw Error('Previously approved take changed: '+c.index);
 files.set(newIndex,bytes);
}
const addition=await readFile(new URL('D13-新增-今天不逗你了-试听.mp3',newRoot));
if(!mp3(addition)||addition.length!==approved.size
 ||sha256(addition)!==approved.sha256
 ||sha256(addition)!=='4f7f46904a6782c67a85ce796577a2e10e08ac495c5af8d99a835e9621ebc630')
 throw Error('New author-approved D13 MP3 was changed');
files.set(20,addition);
if(files.size!==8||D13_VOICE_INDICES.some(x=>!files.has(x)))throw Error('Eight D13 telephone clips required');
const manifest={voice:originalManifest.voice,region:'cn',model:'speech-2.8-hd',clips:[]};
for(const index of D13_VOICE_INDICES){
 const bytes=files.get(index);
 if(index!==16)await writeFile(new URL('call-'+index+'.mp3',root),bytes);
 manifest.clips.push({index,path:'/assets/story55/d13/call-'+index+'.mp3',
  textHash:sha256(Buffer.from(D13_LINES[index][1],'utf8')),audioSha256:sha256(bytes),size:bytes.length});
}
if(blobSHA(await readFile(new URL('call-16.mp3',root)))!=='a10171e9a25e99f884ff3add488312ade05834ae')
 throw Error('Original game tracking line changed after assembling');
await writeFile(new URL('voice-manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: 6 approved re-recorded clips, untouched deployed call-16, approved new line20, original farewell moved to21');
