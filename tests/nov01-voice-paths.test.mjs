import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePhoneAudioPath} from '../src/services/voice/asset-url.js';
test('D55 audio and Tai prerecorded audio are base-aware on Pages and review',()=>{
 const key='/assets/story55/ximeng-final-keywords.mp3';
 assert.equal(resolvePhoneAudioPath(key,{base:'/BBBTAI/',origin:'https://example.test'}),'https://example.test/BBBTAI/assets/story55/ximeng-final-keywords.mp3');
 assert.equal(resolvePhoneAudioPath(key,{base:'/BBBTAI/review/55-20261101/',origin:'https://example.test'}),'https://example.test/BBBTAI/review/55-20261101/assets/story55/ximeng-final-keywords.mp3');
 assert.equal(resolvePhoneAudioPath('/BBBTAI/assets/story55/ximeng-final-keywords.mp3',{base:'/BBBTAI/',origin:'https://example.test'}),'https://example.test/BBBTAI/assets/story55/ximeng-final-keywords.mp3');
 assert.throws(()=>resolvePhoneAudioPath('/../private.mp3',{base:'/BBBTAI/'}),/格式/);
});
