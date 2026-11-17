import {voicePreview} from './gateway.js';
import {saveClip} from '../voice/audio-store.js';

const failedVoiceLines=['語音發不出去。','網不太好，還是打字吧。','不行，發不了語音。','算了，打字說。'];
export function voiceFailureLine(key=''){
 let hash=0;for(const ch of String(key))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
 return failedVoiceLines[hash%failedVoiceLines.length];
}
export function callFailureLine({endedAfter=false,turns=[]}={}){
 return endedAfter?'好了，先聊到這裡吧。':turns.length?'怎麼突然沒聲了？':'網不太好，打字說吧。';
}

// One shared queue. No message, unread count or notification until delivery.
let queue=Promise.resolve();
export function prepareTaiVoice(message,{speechText=message.text,tone=message.aiTone}={}){
 const work=async()=>{
  try{
   const clip=await voicePreview({text:speechText,tone});
   const audioId='tai-'+message.id;
   await saveClip(audioId,clip);
   return {...message,kind:'voice',audioId,voiceCaption:message.text,voiceRequested:undefined};
  }catch(error){
   console.warn('NoApp voice delivery failed:',error?.message);
   return {...message,kind:'text',text:voiceFailureLine(message.id),translation:undefined,voiceRequested:undefined};
  }
 };
 const result=queue.then(work,work);queue=result.catch(()=>{});return result;
}
export function waitForTaiVoiceQueue(){return queue;}
