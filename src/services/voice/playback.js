// Unlock on the actual tap, before network/IndexedDB work. Reuse this element
// when changing tracks; iOS commonly rejects a new element after an async turn.
export function primeAudio(audio){
 if(!audio||audio._primed)return;
 audio._primed=true;
 const wav=new Uint8Array(204),v=new DataView(wav.buffer);
 const word=(at,text)=>[...text].forEach((ch,i)=>v.setUint8(at+i,ch.charCodeAt(0)));
 word(0,'RIFF');v.setUint32(4,196,true);word(8,'WAVE');word(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
 word(36,'data');v.setUint32(40,160,true);
 audio.src='data:audio/wav;base64,'+btoa(String.fromCharCode(...wav));
 try{audio.play()?.catch(()=>{audio._primed=false;});}catch{audio._primed=false;}
}
export function createGestureAudio(){
 if(typeof Audio==='undefined')return null;
 const audio=new Audio();audio.preload='auto';primeAudio(audio);return audio;
}
