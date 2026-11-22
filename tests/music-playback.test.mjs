import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {matchingTracks,trackById} from '../src/apps/music/features/shared/catalog.js';

test('Elijah Woods track is searchable and uses its bundled MP3 and supplied PNG cover',()=>{
 const track=trackById('where-were-going');
 assert.equal(track.title,"where we're going");
 assert.equal(track.artist,'Elijah Woods');
 assert.equal(track.duration,182);
 assert.equal(matchingTracks('Elijah Woods')[0].id,track.id);
 assert.equal(track.fallback,undefined);
 assert.match(track.src,/where-were-going\.mp3$/);
 assert.match(track.cover,/where-were-going-cover\.png$/);
 assert.ok(existsSync('public'+track.src));
 assert.ok(existsSync('public'+track.cover));
});

test('Melatonin uses a packaged MP3 with an independent M4A fallback',async()=>{
 const track=trackById('melatonin');
 assert.match(track.src,/melatonin\.mp3$/);
 assert.match(track.fallback,/melatonin\.m4a\?audio=2$/);
 assert.ok(existsSync('public'+track.src));
 assert.equal(trackById('tonight-rain').src,'/assets/music/tonight-rain.m4a');
 const attempts=[];
 globalThis.Audio=class{
  constructor(){this.dataset={};this.volume=1;this.paused=true;}
  addEventListener(){}
  play(){attempts.push(this.src);this.paused=false;return attempts.length===1?Promise.reject(new DOMException('decode failed','NotSupportedError')):Promise.resolve();}
 };
 const {playTrack}=await import('../src/apps/music/index.js');
 const state={musicPlaying:false},toasts=[];
 await playTrack('melatonin',{store:{get:()=>state,update:fn=>fn(state)},toast:m=>toasts.push(m)});
 assert.deepEqual(attempts,[track.src,track.fallback]);
 assert.equal(state.musicPlaying,true);
 assert.equal(state.musicTrack,'melatonin');
 assert.deepEqual(toasts,[]);
});
