#!/usr/bin/env node
// Runs only AFTER generation of seven approved real MP3s.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {D13_LINES,D13_VOICE_INDICES} from '../src/story/d13/content.js';

const base=new URL('../public/assets/story55/d13/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('voice-manifest.json',base),'utf8'));
const actual=manifest.clips.map(c=>c.index);
if(JSON.stringify(actual)!==JSON.stringify(D13_VOICE_INDICES))throw Error('Not all seven D13 voice clips were synthesized.');
for(const c of manifest.clips){
 const bytes=await readFile(new URL('call-'+c.index+'.mp3',base));
 if(bytes.length<4096||bytes.length>=1000000||bytes.length!==c.size)throw Error('Invalid D13 recording '+c.index);
 if(!(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224)))throw Error('Invalid MP3 header '+c.index);
 const hash=createHash('sha256').update(D13_LINES[c.index][1]).digest('hex');
 if(c.textHash!==hash)throw Error('Outdated D13 script/hash '+c.index);
}
const replaceExact=async(path,from,to)=>{
 const u=new URL('../'+path,import.meta.url);
 const content=await readFile(u,'utf8');
 if(content.split(from).length!==2)throw Error('Unexpected prior code in '+path);
 await writeFile(u,content.replace(from,to));
};
await replaceExact('src/services/telephony/index.js',
 "const liveD13=call.node==='intrusion'&&(!!apiConfig().minimax||index===20);",
 "const liveD13=call.node==='intrusion'&&!source;");
await replaceExact('tests/d13-voice-assets.test.mjs',
 "test('existing six D13 MP3s remain valid, revised closing voice uses live MiniMax'",
 "test('all seven approved D13 real MP3s match the current authored dialogue'");
await replaceExact('tests/d13-voice-assets.test.mjs',
 "assert.deepEqual(manifest.clips.map(c=>c.index),D13_VOICE_INDICES.filter(i=>i!==20));",
 "assert.deepEqual(manifest.clips.map(c=>c.index),D13_VOICE_INDICES);");
await replaceExact('tests/d13-voice-assets.test.mjs',
 " assert.match((await readFile(new URL('../src/services/telephony/index.js',import.meta.url),'utf8')),/index===20/);",
 " assert.match((await readFile(new URL('../src/services/telephony/index.js',import.meta.url),'utf8')),/const liveD13=call.node==='intrusion'&&!source/);");
await replaceExact('scripts/d13-wallet-call-mobile-smoke.mjs',
 "assert.equal(requestedSpeech.length,D13_VOICE_INDICES.length);\n assert.match(requestedSpeech.at(-1),/晚安，奈亞，或者我該叫你，熙蒙/);",
 "assert.equal(requestedSpeech.length,0,'Bundled D13 audio must not silently request live MiniMax');");
console.log('Verified all seven real MP3s; bundled playback and regression tests now match.');
