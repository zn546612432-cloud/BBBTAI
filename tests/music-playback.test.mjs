import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {matchingTracks,trackById} from '../src/apps/music/features/shared/catalog.js';

test('Elijah Woods track is searchable and uses its bundled MP3 and supplied cover artwork',()=>{
 const track=trackById('where-were-going');
 assert.equal(track.title,"where we're going");
 assert.equal(track.artist,'Elijah Woods');
 assert.equal(track.duration,182);
 assert.equal(matchingTracks('Elijah Woods')[0].id,track.id);
 assert.equal(track.fallback,undefined);
 assert.match(track.src,/where-were-going\.mp3$/);
 assert.match(track.cover,/where-were-going-cover\.jpg$/);
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
test('music mode cycles silently without a toast',async()=>{
 const {handle}=await import('../src/apps/music/index.js');
 const state={musicMode:'sequence'},ctx={store:{get:()=>state,update:fn=>fn(state)},toast(){assert.fail('Playback mode must not toast');}};
 for(const mode of ['repeat','single','shuffle','sequence']){handle('music-mode',{},ctx);assert.equal(state.musicMode,mode);}
});

test('Xiao Xin D51 song opens the shared player and saves in the playlist across reloads',async()=>{
 const {initialState,PhoneStore}=await import('../src/services/storage.js');
 const {findMoment}=await import('../src/apps/wechat/features/moments/model.js');
 const {renderMoments,handleMoment}=await import('../src/apps/wechat/features/moments/index.js');
 const {handle,render}=await import('../src/apps/music/index.js');
 const {playlistTracks}=await import('../src/apps/music/features/library/playlist.js');
 const entries=new Map(),storage={getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
 const store=new PhoneStore(storage),s=store.get();s.day=51;s.clock='00:21';
 const post=findMoment(s,'xs-d51'),track=trackById(post.music.trackId);
 assert.equal(post.author,'小辛');assert.deepEqual(post.likes,[]);assert.deepEqual(post.comments,[]);
 assert.match(renderMoments(s,'/moments'),/data-action="wx-moment-music" data-id="xs-d51"/);
 assert.ok(!findMoment(s,'xm-d51'));
 assert.match(track.src,/ten-thousand-and-one\.mp3$/);assert.ok(existsSync('public'+track.src));
 for(const query of ['一万零一次沉溺','一萬零一次沉溺','李佳薇'])assert.equal(matchingTracks(query)[0].id,track.id);
 const oldDocument=globalThis.document;globalThis.document={querySelector:()=>null};
 const routes=[],ctx={store,refresh(){},toast:msg=>assert.fail(msg),router:{open:loc=>routes.push(loc)}};
 try{
  assert.equal(handleMoment('wx-moment-music',{dataset:{id:post.id}},ctx),true);
  await Promise.resolve();await Promise.resolve();
  assert.equal(store.get().musicTrack,track.id);assert.equal(store.get().musicPlaying,true);
  assert.equal(routes.at(-1).appId,'music');assert.match(render(ctx),/加入歌单/);
  handle('music-playlist',{},ctx);assert.equal(playlistTracks(store.get())[0].id,track.id);
  assert.match(render(ctx),/已加入歌单/);
  const loaded=new PhoneStore(storage);assert.deepEqual(loaded.get().musicPlaylist,[track.id]);
  handle('music-browse',{dataset:{category:'我的歌单'}},ctx);assert.match(render(ctx),/一万零一次沉溺/);
  handle('music-playlist',{},ctx);assert.deepEqual(playlistTracks(store.get()),[]);
 }finally{globalThis.document=oldDocument;}
});
