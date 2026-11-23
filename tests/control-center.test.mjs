import test from 'node:test';
import assert from 'node:assert/strict';
import {configureAudio,registerAudio,audioDestination,outputLevel} from '../src/system/audio/index.js';
import {classifyGesture} from '../src/system/gestures.js';
import {controlsSettings,controlCenter} from '../src/system/control-center/view.js';

test('one output bus silences active and new audio; restores the chosen volume and preserves per-call mute',()=>{
 const element=()=>({volume:1,muted:false,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});
 configureAudio({volume:.8});const a=registerAudio(element());assert.equal(a.volume,.8);
 a.muted=true;configureAudio({muted:true,volume:.8});assert.equal(a.volume,0);assert.equal(registerAudio(element()).volume,0);
 const ctx={destination:{},createGain:()=>({gain:{value:1},connect(){}})};const bus=audioDestination(ctx);assert.equal(bus.gain.value,0);
 configureAudio({muted:false,volume:.6});assert.equal(a.volume,.6);assert.equal(a.muted,true);assert.equal(bus.gain.value,.6);assert.equal(audioDestination(ctx),bus);
 a.volume=.5;a.listeners.volumechange();assert.equal(a.volume,.3);
 configureAudio({muted:true,volume:.6});configureAudio({muted:false,volume:.6});assert.equal(a.volume,.3);assert.equal(outputLevel(),.6);
});
test('iOS-style read-only media volume uses the shared Web Audio gain',()=>{
 const previous=globalThis.AudioContext,gains=[];let source;
 class NativeContext{constructor(){this.state='suspended';this.destination={};}resume(){this.state='running';return Promise.resolve();}createGain(){const gain={gain:{value:1},connect(){}};gains.push(gain);return gain;}createMediaElementSource(element){source=element;return {connect(){}};}}
 try{
  globalThis.AudioContext=NativeContext;
  const element={get volume(){return 1;},set volume(v){},muted:false,addEventListener(){}};
  configureAudio({volume:.3});registerAudio(element);assert.equal(source,element);assert.equal(gains[1].gain.value,.3);
  configureAudio({volume:.8});assert.equal(gains[1].gain.value,.8);
  configureAudio({muted:true,volume:.8});assert.equal(gains[1].gain.value,0);assert.equal(element.muted,false);
 }finally{globalThis.AudioContext=previous;configureAudio({volume:.7});}
});
test('right upper swipe opens controls from lock and app; left swipe keeps notifications; upward dismiss stays in controls',()=>{
 const g={dx:2,dy:100,top:true,right:true};assert.equal(classifyGesture({...g,locked:true}),'controls');assert.equal(classifyGesture({...g,locked:false,home:false}),'controls');assert.equal(classifyGesture({...g,right:false,locked:true}),'shade');assert.equal(classifyGesture({dx:1,dy:-100,controls:true,bottom:true,home:true}),'controls');assert.equal(classifyGesture({...g,dx:3,dy:3}),null);
});
test('uses existing settings silent flag and retains persisted brightness and volume',()=>{
 assert.deepEqual(controlsSettings({silent:true,deviceControls:{volume:.4,brightness:.6}}),{muted:true,volume:.4,brightness:.6});
 const html=controlCenter({silent:true,batteryPercent:47});assert.match(html,/取消靜音/);assert.match(html,/47%/);assert.match(html,/data-cc-slider="volume"/);
});

test('idle media has no imaginary title or cover; playing media is rendered from the existing music flag',()=>{
 const idle=controlCenter({musicPlaying:false});assert.match(idle,/未在播放/);assert.doesNotMatch(idle,/cc-album|今夜有雨|正在播放/);
 const active=controlCenter({musicPlaying:true});assert.match(active,/cc-album/);assert.match(active,/今夜有雨/);assert.doesNotMatch(active,/未在播放/);
});
test('connectivity controls all expose real on and off states; rotation does not lock the screen',()=>{
 const keys=['airplane','airdrop','wifi','cellular','bluetooth','hotspot','vpn','rotationLock','lowPower','focus'];
 const enabled=controlCenter(Object.fromEntries(keys.map(key=>[key,true])));
 const disabled=controlCenter(Object.fromEntries(keys.map(key=>[key,false])));
 for(const key of keys){
  assert.match(enabled,new RegExp('data-cc="toggle-'+key+'"[^>]*aria-pressed="true"'));
  assert.match(disabled,new RegExp('data-cc="toggle-'+key+'"[^>]*aria-pressed="false"'));
 }
 assert.match(controlCenter({focus:true,silent:false}),/data-cc="mute"[^>]*aria-pressed="false"/);
 assert.match(controlCenter({focus:false,silent:true}),/data-cc="toggle-focus"[^>]*aria-pressed="false"/);
});

test('music explicitly uses the output gain even when native volume appears writable',async()=>{
 const previous=globalThis.AudioContext,links=[],gains=[];
 class Context{constructor(){this.state='running';this.destination={};}createGain(){const gain={gain:{value:1},connect(){}};gains.push(gain);return gain;}createMediaElementSource(element){links.push(element);return {connect(){}};}}
 try{
  globalThis.AudioContext=Context;
  // Isolate the bus from the read-only iOS fixture above.
  const {configureAudio:configure,registerAudio:register}=await import('../src/system/audio/index.js?forced-music');
  const element={volume:1,addEventListener(){}};
  configure({volume:.8});register(element,{webAudio:true});
  assert.deepEqual(links,[element]);assert.equal(element.volume,1);
  assert.equal(gains[1].gain.value,.8);
  configure({volume:.2});assert.equal(gains[1].gain.value,.2);
  configure({muted:true,volume:.2});assert.equal(gains[1].gain.value,0);
  configure({volume:.6});assert.equal(gains[1].gain.value,.6);
  register(element,{webAudio:true});assert.equal(links.length,1);
 }finally{globalThis.AudioContext=previous;}
});
