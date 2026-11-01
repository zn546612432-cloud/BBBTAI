import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalPhoneAudioPath,resolvePhoneAudioPath} from '../src/services/voice/asset-url.js';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55,handleStory55Action} from '../src/services/story55/controller.js';
import {defaultStory55Config,exportStory55Config} from '../src/services/story55/config.js';

const stale='/BBBTAI/releases/b710a0814d4102fe/assets/story55/ximeng-final-keywords.mp3';
const key='/assets/story55/ximeng-final-keywords.mp3';
test('exact recording URL from the failed iPhone screenshot rebases onto every current deployment',()=>{
 for(const base of ['/BBBTAI/releases/new/','/BBBTAI/preview/releases/new/','/BBBTAI/review/nov01-repairs/releases/new/']){
  assert.equal(resolvePhoneAudioPath(stale,{base,origin:'https://example.test'}),'https://example.test'+base+'assets/story55/ximeng-final-keywords.mp3');
 }
 assert.equal(canonicalPhoneAudioPath(stale),key);
 assert.equal(canonicalPhoneAudioPath('/BBBTAI/preview/releases/old/assets/voices/tai.mp3'),'/assets/voices/tai.mp3');
 assert.equal(resolvePhoneAudioPath('https://example.test'+stale,{base:'/BBBTAI/releases/new/',origin:'https://example.test'}),'https://example.test/BBBTAI/releases/new/assets/story55/ximeng-final-keywords.mp3');
 assert.equal(resolvePhoneAudioPath('https://media.example/voice.mp3',{origin:'https://example.test'}),'https://media.example/voice.mp3');
});
test('existing phone save repairs final and scripted audio without resetting D55 progress or messages',()=>{
 const s=activateStory55(initialState());previewNode55(s,'ending');
 s.story55.config.finalAudio=stale;
 s.story55.config.voiceAssets={intrusion:{2:'/BBBTAI/releases/old/assets/voices/tai.mp3'}};
 const day=s.day,completed=structuredClone(s.story55.completed),scene=structuredClone(s.story55.scenes);
 const messages=structuredClone(s.content.conversations.noapp);
 const data=new Map([[KEY,JSON.stringify(s)]]);
 const store=new PhoneStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(store.get().day,day);
 assert.deepEqual(store.get().story55.completed,completed);
 assert.deepEqual(store.get().story55.scenes,scene);
 assert.deepEqual(store.get().content.conversations.noapp,messages);
 assert.equal(store.get().story55.config.finalAudio,key);
 assert.equal(store.get().story55.config.voiceAssets.intrusion[2],'/assets/voices/tai.mp3');
 assert.equal(JSON.parse(data.get(KEY)).story55.config.finalAudio,key);
 assert.equal(JSON.parse(exportStory55Config({story55:{config:{...defaultStory55Config(),finalAudio:stale}}})).finalAudio,key);
});
test('tapping the final voice bubble with a stale saved URL plays a canonical asset and waits for ended',async()=>{
 const s=activateStory55(initialState());previewNode55(s,'ending');
 for(let n=0;n<50&&sceneLines(s,'ending')[scene55(s,'ending').index]?.[0]!=='watch';n++)advanceScene55(s,'ending',{acceptCall:true});
 assert.equal(sceneLines(s,'ending')[scene55(s,'ending').index]?.[0],'watch');
 s.story55.config.finalAudio=stale;
 const previous=globalThis.Audio,played=[],errors=[];let audio;
 class FakeAudio{
  constructor(){audio=this;this.src='';}
  async play(){if(!this.src.startsWith('data:'))played.push(this.src);}
 }
 globalThis.Audio=FakeAudio;
 try{
  const ctx={store:{get:()=>s,update:fn=>fn(s)},toast:message=>errors.push(message)};
  await handleStory55Action('s55-final-audio',{dataset:{node:'ending'}},ctx);
  assert.equal(played.length,1);assert.ok(played[0].endsWith(key));
  assert.ok(!played[0].includes('b710a0814d4102fe'));
  assert.ok(!s.story55.finalAudioHeard);assert.deepEqual(errors,[]);
  audio.onended();assert.equal(s.story55.finalAudioHeard,true);
 }finally{globalThis.Audio=previous;}
});
