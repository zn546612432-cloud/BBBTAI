// The one output bus for phone media, speech and synthesized effects.
let settings={muted:false,volume:.7};
const media=new Map(),buses=new Set();
export const outputLevel=()=>settings.muted?0:settings.volume;
export function configureAudio(value={}){
 settings={muted:value.muted===true,volume:Math.max(0,Math.min(1,Number.isFinite(value.volume)?value.volume:.7))};
 for(const [element,record] of media){record.expected=record.base*outputLevel();element.volume=record.expected;}
 for(const gain of buses)gain.gain.value=outputLevel();
 if(!outputLevel())globalThis.speechSynthesis?.cancel?.();
}
export function registerAudio(element){
 if(!element||media.has(element))return element;
 const record={base:Number.isFinite(element.volume)?element.volume:1,expected:element.volume};media.set(element,record);
 element.addEventListener?.('volumechange',()=>{
  if(Math.abs(element.volume-record.expected)<.00001)return;
  record.base=element.volume;record.expected=record.base*outputLevel();element.volume=record.expected;
 });
 record.expected=record.base*outputLevel();element.volume=record.expected;
 return element;
}
export function audioDestination(context){
 if(!context.__phoneOutput){const gain=context.createGain();gain.gain.value=outputLevel();gain.connect(context.destination);context.__phoneOutput=gain;buses.add(gain);}
 return context.__phoneOutput;
}
