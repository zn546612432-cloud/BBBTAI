import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {toggleFinalRecording,finalRecordingStatus,stopFinalRecording} from '../src/services/story55/final-recording.js';
import {finalVoiceBubble} from '../src/apps/noapp/final-voice.js';
import {chatView} from '../src/components/chat.js';
import {recoverPhone,phoneBlocked} from '../src/system/power/story.js';
import {powerFullscreen} from '../src/system/power/controls.js';

test('rapid taps coalesce loading; pause/resume keep one player and the same position; ended advances once',async()=>{
 const s=activateStory55(initialState());s.day=55;s.nav.current={appId:'noapp',route:'/chat/tai',params:{}};
 const previous=globalThis.Audio;let created=0,played=0,paused=0,completed=0,pending,player;
 class FakeAudio{
  constructor(){created++;player=this;this.src='';this.currentTime=0;}
  play(){if(this.src.startsWith('data:'))return Promise.resolve();played++;return new Promise(resolve=>pending=resolve);}
  pause(){paused++;}
 }
 globalThis.Audio=FakeAudio;stopFinalRecording();
 const ctx={store:{get:()=>s},toast:message=>assert.fail(message)},complete=()=>completed++;
 try{
  const first=toggleFinalRecording(ctx,complete);
  await toggleFinalRecording(ctx,complete);await toggleFinalRecording(ctx,complete);
  assert.equal(created,1);assert.equal(played,1);assert.equal(finalRecordingStatus(s),'loading');
  pending();await first;
  assert.match(finalVoiceBubble(s),/暂停语音/);assert.match(finalVoiceBubble(s),/❚❚/);
  player.currentTime=7.25;
  await toggleFinalRecording(ctx,complete);assert.equal(paused,1);assert.equal(finalRecordingStatus(s),'paused');
  assert.match(finalVoiceBubble(s),/播放语音/);
  const resume=toggleFinalRecording(ctx,complete);pending();await resume;
  assert.equal(created,1);assert.equal(played,2);assert.equal(player.currentTime,7.25);
  player.onended();player.onended();assert.equal(completed,1);
  const replay=toggleFinalRecording(ctx,complete);assert.equal(player.currentTime,0);pending();await replay;
  player.onended();assert.equal(completed,1);assert.equal(created,1);
 }finally{stopFinalRecording();globalThis.Audio=previous;}
});
test('pending and saved voice bubbles show only controls, waveform and duration',()=>{
 const s=activateStory55(initialState());
 assert.doesNotMatch(finalVoiceBubble(s),/密钥|最后的|手表|说明/);
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages=[{id:'final',from:'me',kind:'story55_final_audio',text:'熙蒙 · 最后的密钥录音',actual:true}];
 const html=chatView(s,'noapp','tai');
 assert.match(html,/noapp-final-voice/);assert.match(html,/23″/);
 assert.doesNotMatch(html,/密钥|最后的|手表/);
});
test('55-day ended saves can wake, reload the keypad and recover without being forced black again',()=>{
 const s=activateStory55(initialState());s.day=55;s.story55.ended=true;s.deathPhase='off';s.batteryPercent=1;
 const data=new Map([[KEY,JSON.stringify(s)]]),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const phone=new PhoneStore(storage);
 phone.update(next=>next.deathPhase='passcode');
 assert.equal(phone.get().deathPhase,'passcode');
 assert.match(powerFullscreen(phone.get(),{passcode:'<p>keypad</p>'}),/keypad/);
 const reload=new PhoneStore(storage);assert.equal(reload.get().deathPhase,'passcode');
 assert.equal(recoverPhone(reload.get(),'0816'),false);
 reload.update(next=>assert.equal(recoverPhone(next,'6180'),true));
 assert.equal(reload.get().deathPhase,'recovered');assert.equal(phoneBlocked(reload.get()),false);
 assert.equal(powerFullscreen(reload.get()),'');assert.equal(reload.get().day,55);
 const loaded=new PhoneStore(storage);assert.equal(loaded.get().deathPhase,'recovered');
});
