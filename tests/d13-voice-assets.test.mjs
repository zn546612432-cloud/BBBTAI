import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {D13_LINES,D13_VOICE_INDICES} from '../src/story/d13/content.js';
import {defaultStory55Config} from '../src/services/story55/config.js';
test('existing six D13 MP3s remain valid, revised closing voice uses live MiniMax',async()=>{
 const root=new URL('../public/assets/story55/d13/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('voice-manifest.json',root),'utf8'));
 assert.deepEqual(manifest.clips.map(c=>c.index),D13_VOICE_INDICES.filter(i=>i!==20));
 assert.equal(manifest.model,'speech-2.8-hd');assert.equal(manifest.region,'cn');
 const config=defaultStory55Config();
 for(const c of manifest.clips){
  const bytes=await readFile(new URL('call-'+c.index+'.mp3',root));
  assert.ok(bytes.length>4096&&bytes.length<1000000);assert.equal(bytes.length,c.size);
  assert.ok(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),'MP3 header');
  assert.equal(c.textHash,createHash('sha256').update(D13_LINES[c.index][1]).digest('hex'));
  assert.equal(config.voiceAssets.intrusion[c.index],c.path);
 }
 assert.doesNotMatch(JSON.stringify(manifest),/sk-api-|api_key|authorization/i);
 assert.match((await readFile(new URL('../src/services/telephony/index.js',import.meta.url),'utf8')),/index===20/);
});
