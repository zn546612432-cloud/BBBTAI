import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePhoneAudioPath} from '../src/services/voice/asset-url.js';
import {publicAssetBase,publicAssetPath} from '../src/services/public-assets.js';
test('native modules resolve images and recordings inside versioned preview releases',()=>{
 const base=publicAssetBase('https://example.test/BBBTAI/preview/releases/abc/src/services/public-assets.js');
 assert.equal(base,'/BBBTAI/preview/releases/abc/');
 assert.equal(publicAssetPath('apps/wechat/media/user-food-rice.jpeg',{base}),base+'apps/wechat/media/user-food-rice.jpeg');
 assert.equal(resolvePhoneAudioPath('/assets/story55/ximeng-final-keywords.mp3',{base,origin:'https://example.test'}),'https://example.test'+base+'assets/story55/ximeng-final-keywords.mp3');
});
test('D55 audio and Tai prerecorded audio are base-aware on Pages and review',()=>{
 const key='/assets/story55/ximeng-final-keywords.mp3';
 assert.equal(resolvePhoneAudioPath(key,{base:'/BBBTAI/',origin:'https://example.test'}),'https://example.test/BBBTAI/assets/story55/ximeng-final-keywords.mp3');
 assert.equal(resolvePhoneAudioPath(key,{base:'/BBBTAI/review/55-20261101/',origin:'https://example.test'}),'https://example.test/BBBTAI/review/55-20261101/assets/story55/ximeng-final-keywords.mp3');
 assert.equal(resolvePhoneAudioPath('/BBBTAI/assets/story55/ximeng-final-keywords.mp3',{base:'/BBBTAI/',origin:'https://example.test'}),'https://example.test/BBBTAI/assets/story55/ximeng-final-keywords.mp3');
 assert.throws(()=>resolvePhoneAudioPath('/../private.mp3',{base:'/BBBTAI/'}),/格式/);
});
