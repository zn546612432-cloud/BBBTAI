import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {D13_LINES,D13_VOICE_INDICES} from '../src/story/d13/content.js';
import {defaultStory55Config} from '../src/services/story55/config.js';
test('all eight approved D13 real MP3s match the current authored dialogue',async()=>{
 const root=new URL('../public/assets/story55/d13/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('voice-manifest.json',root),'utf8'));
 assert.deepEqual(manifest.clips.map(c=>c.index),D13_VOICE_INDICES);
 assert.equal(manifest.model,'speech-2.8-hd');assert.equal(manifest.region,'cn');
 const config=defaultStory55Config();
 const packet=JSON.parse(await readFile(new URL('../docs/story-packets/d13-wallet-call.json',import.meta.url),'utf8'));
 for(const c of manifest.clips){
  const bytes=await readFile(new URL(c.path.split('/').at(-1),root));
  assert.ok(bytes.length>4096&&bytes.length<1000000);assert.equal(bytes.length,c.size);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),c.audioSha256);
  assert.ok(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),'MP3 header');
  assert.equal(c.textHash,createHash('sha256').update(D13_LINES[c.index][1]).digest('hex'));
  assert.equal(config.voiceAssets.intrusion[c.index],c.path);
  const event=packet.events.find(e=>e.id==='s55-intrusion-v2-'+c.index);
  assert.equal(event.text,D13_LINES[c.index][1]);
  assert.equal(event.audioAssetId,'d13-call-'+(c.index===19?20:c.index));
 }
 assert.deepEqual(D13_VOICE_INDICES,[8,10,12,14,16,18,19,21]);
 assert.equal(manifest.clips.length,8);
 assert.equal(manifest.clips.find(x=>x.index===16).size,115188);
 assert.equal(manifest.clips.find(x=>x.index===19).audioSha256,'4f7f46904a6782c67a85ce796577a2e10e08ac495c5af8d99a835e9621ebc630');
 assert.equal(D13_LINES[19][1],'好了，今天不逗你了。明天有份東西給你，記得看郵箱。');
 assert.equal(D13_LINES[20][1],'（追蹤失敗！錯誤代碼：ERR-4037）');
 assert.equal(D13_LINES[21][1],'呵呵，我已經提醒過你了，追蹤我只是白費工夫。晚安，nya，或者我該叫你，熙蒙……');
 assert.doesNotMatch(JSON.stringify(manifest),/sk-api-|api_key|authorization/i);
});
