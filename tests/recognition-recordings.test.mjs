import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RECOGNITION_STEPS,RECOGNITION_CALL} from '../src/story/d29/recognition-call.js';
import {SCRIPTED_VOICE_CLIPS} from '../src/story/d34-d42/voice-assets.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
test('recognition has the complete archived script and one matching MP3 per Tai line',()=>{
 assert.equal(RECOGNITION_STEPS.length,22);
 assert.equal(RECOGNITION_CALL.gapAfterMs[13],5000);
 const clips=SCRIPTED_VOICE_CLIPS.filter(c=>c.id.startsWith('d33-recognition-'));
 assert.equal(clips.length,12);
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/story55/d33/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.clips.length,clips.length);
 for(const clip of clips){
  assert.equal(clip.bundledOnly,true);
  const recorded=manifest.clips.find(c=>c.id===clip.id);
  assert.ok(recorded,clip.id);
  assert.equal(recorded.textHash,hash(clip.text));
  const audio=readFileSync(new URL('../public'+clip.path,import.meta.url));
  assert.ok(audio.length>1000,clip.id);
  assert.equal(recorded.audioHash,hash(audio));
 }
});
