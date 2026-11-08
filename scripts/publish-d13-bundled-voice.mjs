#!/usr/bin/env node
// Runs only AFTER generation of seven approved real MP3s.
import {readFile} from 'node:fs/promises';
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
console.log('Verified all seven D13 MP3s against the approved script.');
