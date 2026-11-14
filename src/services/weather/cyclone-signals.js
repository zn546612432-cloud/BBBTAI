// Macau's documented 2025 Typhoon Wutip signal changes. These are fixed
// historical timestamps, not forecasts. The weather UI and in-phone SMS use
// the exact same entries; the existing Story55 tick dispatches the messages.
// Source: Macao Meteorological and Geophysical Bureau's 2025 Wutip report:
// https://cms.smg.gov.mo/uploads/sync/pdf/tc/2025/c_2501.pdf
// SMS prose is original in-world copy, NOT verbatim historical official SMS.
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';

export const MACAU_CYCLONE_SMS_THREAD='macau-meteorological-bureau';
export const MACAU_CYCLONE_SIGNALS=Object.freeze([
 {id:'d24-0600-s1',day:24,date:'2025-06-11',clock:'06:00',level:1,
  sms:[
   '06:00 Está em vigor o sinal n.º 1 de ciclone tropical em Macau devido ao Wutip. Recomenda-se acompanhar as informações meteorológicas.',
   '06:00 Tropical Cyclone Signal No. 1 is in force in Macao due to Wutip. Please monitor the latest weather information.',
   '06:00 澳門發出一號風球。熱帶氣旋「蝴蝶」影響本澳，請留意最新天氣消息及戶外活動安排。'
  ]},
 {id:'d25-0600-s3',day:25,date:'2025-06-12',clock:'06:00',level:3,
  sms:[
   '06:00 O sinal n.º 3 de ciclone tropical foi emitido em Macau. Preste atenção ao vento e às condições meteorológicas.',
   '06:00 Tropical Cyclone Signal No. 3 has been issued in Macao. Take care outdoors and follow weather updates.',
   '06:00 澳門改發三號風球。外出請注意風力及降雨情況，留意地球物理氣象局最新消息。'
  ]},
 {id:'d25-1800-s1',day:25,date:'2025-06-12',clock:'18:00',level:1,
  sms:[
   '18:00 O sinal de ciclone tropical em Macau foi alterado para o n.º 1. Continue atento às informações meteorológicas.',
   '18:00 Macao has changed to Tropical Cyclone Signal No. 1. Please continue to follow weather updates.',
   '18:00 澳門改發一號風球。請繼續留意熱帶氣旋「蝴蝶」的最新消息。'
  ]},
 {id:'d27-0800-s3',day:27,date:'2025-06-14',clock:'08:00',level:3,
  sms:[
   '08:00 O sinal n.º 3 de ciclone tropical voltou a ser emitido em Macau. Tenha cuidado nas deslocações.',
   '08:00 Macao has issued Tropical Cyclone Signal No. 3 again. Please exercise caution when travelling.',
   '08:00 澳門再次發出三號風球。外出請留意風力及天氣變化。'
  ]},
 {id:'d28-1530-clear',day:28,date:'2025-06-15',clock:'15:30',level:0,
  sms:[
   '15:30 Foram cancelados todos os sinais de ciclone tropical em Macau. Continue a acompanhar as informações meteorológicas.',
   '15:30 All tropical cyclone signals in Macao have been cancelled. Please continue to follow weather updates.',
   '15:30 澳門已取消所有熱帶氣旋信號。請繼續留意天氣變化。'
  ]}
]);

const reached=(day,clock,e)=>day>e.day||day===e.day&&clock>=e.clock;
// Returns the latest ACTIVE signal, or null before the first warning and
// after cancellation. A single timeline also works for revisiting old days.
export function macauCycloneSignalAt(day,clock='08:00'){
 const d=Number(day),time=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(clock))?clock:'08:00';
 const event=MACAU_CYCLONE_SIGNALS.findLast(x=>reached(d,time,x));
 return event&&event.level>0?{id:event.id,day:event.day,date:event.date,clock:event.clock,level:event.level,name:'蝴蝶'}:null;
}

// Called BY existing tickStory55: no second queue, clock, event loop or
// notification mechanism. Stable message IDs and a progress ledger protect
// saves against duplicate delivery, including after the user deletes a bubble.
export function tickMacauCycloneSMS(s){
 if(s.story55?.version!==1)return false;
 if(s.content?.deletedSmsConversationIds?.includes(MACAU_CYCLONE_SMS_THREAD))return false;
 const due=MACAU_CYCLONE_SIGNALS.filter(e=>reached(s.day,s.clock,e));
 if(!due.length)return false;
 const threads=s.content.conversations.messages??(s.content.conversations.messages=[]);
 let chat=threads.find(c=>c.id===MACAU_CYCLONE_SMS_THREAD),changed=false;
 if(!chat){
  chat={id:MACAU_CYCLONE_SMS_THREAD,name:'澳門地球物理氣象局',avatar:'氣',messages:[],unread:0};
  threads.push(chat);changed=true;
 }
 const sent=s.story55.weatherAlertSentIds??(s.story55.weatherAlertSentIds=[]);
 for(const e of due){
  if(sent.includes(e.id))continue;
  for(const [index,body] of e.sms.entries()){
   const message=appendAuthoredPhoneMessage(s,{
    channel:'messages',conversationId:MACAU_CYCLONE_SMS_THREAD,
    messageId:'smg-cyclone-'+e.id+'-'+['pt','en','zh'][index],
    from:'澳門地球物理氣象局',text:body,day:e.day,clock:e.clock,
    sentDate:e.date,storyTag:'story55',
    // One banner per signal change; the other two languages remain visible
    // in the native SMS thread. Late catch-up should not spam old banners.
    notify:index===2&&s.day===e.day
   });
   changed=!!message||changed;
  }
  sent.push(e.id);changed=true;
 }
 return changed;
}
