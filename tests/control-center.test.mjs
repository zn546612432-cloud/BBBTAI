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
test('right upper swipe opens controls from lock and app; left swipe keeps notifications; upward dismiss stays in controls',()=>{
 const g={dx:2,dy:100,top:true,right:true};assert.equal(classifyGesture({...g,locked:true}),'controls');assert.equal(classifyGesture({...g,locked:false,home:false}),'controls');assert.equal(classifyGesture({...g,right:false,locked:true}),'shade');assert.equal(classifyGesture({dx:1,dy:-100,controls:true,bottom:true,home:true}),'controls');assert.equal(classifyGesture({...g,dx:3,dy:3}),null);
});
test('uses existing settings silent flag and retains persisted brightness and volume',()=>{
 assert.deepEqual(controlsSettings({silent:true,deviceControls:{volume:.4,brightness:.6}}),{muted:true,volume:.4,brightness:.6});
 const html=controlCenter({silent:true,batteryPercent:47});assert.match(html,/取消靜音/);assert.match(html,/47%/);assert.match(html,/data-cc-slider="volume"/);
});
