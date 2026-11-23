// The one output bus for phone media, speech and synthesized effects.
let settings={muted:false,volume:.7};
const media=new Map(),buses=new Set();
let mediaContext=null;
export const outputLevel=()=>settings.muted?0:settings.volume;
// iOS Safari ignores assignments to HTMLMediaElement.volume. Route its
// media through the same phone output gain as the synthesized system sounds.
function applyMediaLevel(element,record){
 record.expected=record.base*outputLevel();
 if(record.gain)record.gain.gain.value=record.base;
 else element.volume=record.expected;
}
function resumeMediaOutput(){if(mediaContext&&mediaContext.state!=='running')mediaContext.resume()?.catch(()=>{});}
function connectUnsupportedVolume(element,record,force=false){
 const level=element.volume,probe=level===.5?.75:.5;
 if(!force)try{element.volume=probe;if(Math.abs(element.volume-probe)<.00001){element.volume=level;return;}}catch{}
 const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!AudioContext)return;
 try{
  if(!mediaContext){
   mediaContext=new AudioContext();
   for(const type of ['pointerdown','touchend','click','keydown'])globalThis.document?.addEventListener(type,resumeMediaOutput,{capture:true,passive:true});
  }
  const source=mediaContext.createMediaElementSource(element),gain=mediaContext.createGain();
  element.volume=1;
  source.connect(gain);gain.connect(audioDestination(mediaContext));record.gain=gain;
  element.addEventListener?.('play',resumeMediaOutput);resumeMediaOutput();
 }catch(error){console.warn('Phone volume output unavailable:',error?.message);}
}
export function configureAudio(value={}){
 settings={muted:value.muted===true,volume:Math.max(0,Math.min(1,Number.isFinite(value.volume)?value.volume:.7))};
 for(const [element,record] of media)applyMediaLevel(element,record);
 for(const gain of buses)gain.gain.value=outputLevel();
 if(!outputLevel())globalThis.speechSynthesis?.cancel?.();
}
export function registerAudio(element,{webAudio=false}={}){
 if(!element||media.has(element))return element;
 const record={base:Number.isFinite(element.volume)?element.volume:1,expected:element.volume};media.set(element,record);
 connectUnsupportedVolume(element,record,webAudio);
 element.addEventListener?.('volumechange',()=>{
  if(record.gain)return; // Native mute remains independent of phone volume.
  if(Math.abs(element.volume-record.expected)<.00001)return;
  record.base=element.volume;record.expected=record.base*outputLevel();element.volume=record.expected;
 });
 applyMediaLevel(element,record);
 return element;
}
export function audioDestination(context){
 if(!context.__phoneOutput){const gain=context.createGain();gain.gain.value=outputLevel();gain.connect(context.destination);context.__phoneOutput=gain;buses.add(gain);}
 return context.__phoneOutput;
}
