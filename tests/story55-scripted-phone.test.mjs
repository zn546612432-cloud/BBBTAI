import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55,markMail55} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {completed,nodeStatus} from '../src/services/story55/state.js';
import {bindD13Wallet,transferD13Wallet,enterD13Chat,D13_WALLET_ID,D13_MAIL_ID} from '../src/story/d13/runtime.js';
import {receiveCall,answerCall,endCall,declineCall,outgoingCall} from '../src/services/telephony/store.js';
import {tickTelephony,primeTelephony,mountTelephony} from '../src/services/telephony/index.js';
import {telephonyFullscreen,telephonyIsland} from '../src/services/telephony/view.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {phoneRuntimePaused,tickPhoneRuntime} from '../src/system/runtime/controller.js';
import {render as mirageRender} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {messageCard} from '../src/apps/developer/features/conversations/index.js';
function fixture(){
 const s=initialState();activateStory55(s);previewNode55(s,'d13-wallet-mail');
 const entries=new Map(),store=new PhoneStore({getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)});store.replace(s);
 const ctx={store,router:{open(loc){store.update(s=>s.nav.current=loc);}},toast(){},refresh(){}};
 return {store,ctx};
}
function transfer(store,now=100){store.update(s=>{markMail55(s,D13_MAIL_ID);bindD13Wallet(s);transferD13Wallet(s,now);});}
function reachCall(store,ctx){
 while(sceneLines(store.get(),'intrusion')[scene55(store.get(),'intrusion').index]?.[0]!=='call'){
  const draft=scriptedDraft55(store.get(),'mirage','s55-ouroboros');
  store.update(s=>draft?sendScriptedDraft55(s,'mirage','s55-ouroboros',draft.text):advanceScene55(s,'intrusion'));
 }
 tickTelephony(ctx,10000);return store.get().phoneCall;
}
function ringing(store,ctx){transfer(store);store.update(enterD13Chat);return reachCall(store,ctx);}
test('mail, binding and transfer are idempotent, keeping D06 BTC and USD intact',()=>{
 const {store}=fixture(),btc=store.get().content.mirage.digitalBalance,bank=structuredClone(store.get().bankData);
 for(let i=0;i<3;i++)store.update(tickStory55);
 assert.equal(store.get().content.mail.filter(m=>m.id===D13_MAIL_ID).length,1);
 assert.equal(store.get().notifications.filter(n=>n.id==='s55-mail-'+D13_MAIL_ID).length,1);
 assert.equal(nodeStatus(store.get(),'intrusion').state,'locked');transfer(store);
 store.update(s=>{assert.equal(bindD13Wallet(s),false);assert.equal(transferD13Wallet(s),false);});
 const next=store.get();assert.equal(next.content.mirage.wallets.length,1);assert.equal(next.content.mirage.wallets[0].id,D13_WALLET_ID);
 assert.equal(next.content.mirage.wallets[0].status,'frozen');assert.equal(next.content.mirage.digitalBalance,btc);assert.deepEqual(next.bankData,bank);assert.ok(completed(next,'wallet'));
});
test('green screen lasts three seconds and inserts one non-notifying, non-editable divider',()=>{
 const {store,ctx}=fixture();transfer(store,100);assert.match(telephonyFullscreen(store.get()),/tel-green-screen/);
 tickTelephony(ctx,3099);assert.equal(store.get().story55.d13.phase,'green');tickTelephony(ctx,3100);
 assert.equal(store.get().nav.current.route,'/chat/s55-ouroboros');store.update(enterD13Chat);
 const chat=store.get().content.conversations.mirage.find(c=>c.id==='s55-ouroboros');assert.equal(chat.messages.filter(m=>m.kind==='divider').length,1);
 assert.equal(store.get().notifications.some(n=>n.messageId==='s55-intrusion-divider'),false);
 assert.doesNotMatch(messageCard(chat.messages.find(m=>m.kind==='divider'),chat,store.get(),0),/data-message-field|delete-message|data-drag/);
});
test('forced unknown call displays both iOS actions, auto-answers and logs once',()=>{
 const {store,ctx}=fixture(),call=ringing(store,ctx),html=telephonyFullscreen(store.get());
 assert.match(html,/未知號碼/);assert.match(html,/tel-answer/);assert.match(html,/tel-decline/);assert.doesNotMatch(html,/REMOTE OVERRIDE|<img|陳熙泰/);assert.equal(declineCall(store,call.id),false);
 tickTelephony(ctx,17999);assert.equal(store.get().phoneCall.state,'ringing');tickTelephony(ctx,18000);assert.equal(store.get().phoneCall.state,'connected');
 assert.doesNotMatch(telephonyIsland(store.get()),/REMOTE OVERRIDE/);assert.equal(endCall(store,call.id),false);
 endCall(store,call.id,22000,{remote:true});assert.equal(endCall(store,call.id,23000,{remote:true}),false);
 const logs=store.get().content.phone.calls.filter(c=>c.id===call.id);assert.equal(logs.length,1);assert.equal(logs[0].duration,4);
});
test('lock and alarm defer auto-answer until eight seconds after unlock',()=>{
 const {store,ctx}=fixture();store.update(s=>s.unlocked=false);receiveCall(store,{id:'deferred',forced:true},0);tickTelephony(ctx,90000);
 assert.equal(store.get().phoneCall.state,'ringing');store.update(s=>{s.unlocked=true;s.alarmRinging={id:'alarm'};});tickTelephony(ctx,95000);assert.equal(store.get().phoneCall.presentedAt,null);
 store.update(s=>s.alarmRinging=null);tickTelephony(ctx,100000);tickTelephony(ctx,107999);assert.equal(store.get().phoneCall.state,'ringing');tickTelephony(ctx,108000);assert.equal(store.get().phoneCall.state,'connected');
});
test('calls pause clock and battery; unpermitted outgoing calls never connect',()=>{
 const {store,ctx}=fixture();outgoingCall(store,'555',10);assert.ok(phoneRuntimePaused(store.get()));const old=structuredClone(store.get());
 store.update(s=>tickPhoneRuntime(s,{elapsedMs:10000,gameMinutes:20}));assert.equal(store.get().clock,old.clock);assert.equal(store.get().batteryPercent,old.batteryPercent);
 tickTelephony(ctx,2510);assert.equal(store.get().phoneCall.state,'ended');assert.equal(store.get().phoneCall.answeredAt,null);
 const log=store.get().content.phone.calls[0];assert.equal(log.connected,false);assert.equal(log.duration,0);assert.equal(log.direction,'outgoing');
});
test('speech appends on sound start, locks input and never sends the player line',async()=>{
 const {store,ctx}=fixture(),call=ringing(store,ctx);answerCall(store,call.id,10001);tickTelephony(ctx,10002);
 class Audio {play(){return Promise.resolve();}pause(){}}
 const previous=globalThis.Audio;globalThis.Audio=Audio;
 try{
  const audio=primeTelephony(ctx);store.update(s=>s.story55.scenes.intrusion.nextAt=0);tickTelephony(ctx,Date.now());
  const chat=()=>store.get().content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
  assert.equal(chat().messages.some(m=>m.id==='s55-intrusion-v2-8'),false);audio.onplaying();assert.equal(chat().messages.filter(m=>m.id==='s55-intrusion-v2-8').length,1);
  assert.equal(store.get().phoneCall.speaking,true);assert.equal(scriptedDraft55(store.get(),'mirage','s55-ouroboros'),null);
  audio.onended();await new Promise(resolve=>setImmediate(resolve));assert.equal(scene55(store.get(),'intrusion').index,9);
  assert.equal(chat().messages.some(m=>m.id==='s55-intrusion-v2-9'),false);
  const draft=scriptedDraft55(store.get(),'mirage','s55-ouroboros');store.update(s=>sendScriptedDraft55(s,'mirage','s55-ouroboros',draft.text));assert.equal(chat().messages.filter(m=>m.id==='s55-intrusion-v2-9').length,1);
 }finally{globalThis.Audio=previous;}
});
test('missing voice must not leak Tai dialogue as a MIRAGE text bubble or skip the call',()=>{
 const {store,ctx}=fixture(),call=ringing(store,ctx);answerCall(store,call.id,10001);tickTelephony(ctx,10002);
 store.update(s=>s.story55.scenes.intrusion.nextAt=0);tickTelephony(ctx,Date.now());
 assert.equal(scene55(store.get(),'intrusion').index,8);
 assert.equal(completed(store.get(),'intrusion'),false);
 assert.equal(store.get().phoneCall.resumeRequired,true);
 const chat=store.get().content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.equal(chat.messages.some(m=>m.id==='s55-intrusion-v2-8'),false);
 assert.equal(nodeStatus(store.get(),'code').state,'locked');
});
test('refresh skips green animation and connected calls require a resume gesture',()=>{
 const {store,ctx}=fixture(),previous=globalThis.document;globalThis.document={addEventListener(){},removeEventListener(){},querySelector(){return null;}};
 try{transfer(store);const dispose=mountTelephony(()=>ctx);assert.equal(store.get().story55.d13.phase,'chat');dispose();
 const call=reachCall(store,ctx);answerCall(store,call.id,10001);const stop=mountTelephony(()=>ctx);assert.equal(store.get().phoneCall.resumeRequired,true);assert.match(telephonyFullscreen(store.get()),/繼續通話/);stop();
 }finally{globalThis.document=previous;}
});
test('migration retains player messages, clears old call locks and never replays completed D13',()=>{
 const {store}=fixture();store.update(s=>{s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.push({id:'s55-intrusion-2',from:'me',text:'玩家實發'});delete s.story55.d13Revision;s.story55.lockedCall={node:'intrusion'};s.story55.scenes.intrusion={index:8};});
 assert.equal(scene55(store.get(),'intrusion').index,0);assert.equal(store.get().story55.lockedCall,undefined);
 assert.equal(store.get().content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.find(m=>m.id==='s55-intrusion-2').text,'玩家實發');
 store.update(s=>{s.story55.completed.intrusion={day:13};delete s.story55.d13Revision;});assert.equal(store.get().story55.d13.phase,'complete');assert.equal(nodeStatus(store.get(),'d13-wallet-transfer').state,'done');assert.equal(store.get().content.mirage.wallets.length,0);
});
test('MIRAGE has no management entry, while the global message editor remains usable',()=>{
 const {store}=fixture();setMirageAuthenticated(true);
 for(const route of ['/','/bounties','/market','/manage','/edit','/history/s55-ouroboros','/wallet'])assert.doesNotMatch(mirageRender({store},{route,params:{}}),/EDIT MESSAGES|mc-manage|mc-edit-message|mc-record|EDIT BALANCE/);
 assert.match(messageCard({id:'a',from:'me',text:'可編輯',kind:'text'},{id:'test',name:'Flow',messages:[]},store.get(),0),/data-message-field="text"/);
});

test('full naming-revised source remains intact and only shipped legacy copy migrates',async()=>{
 const {D13_LINES,D13_LEGACY_LINES,D13_VOICE_INDICES}=await import('../src/story/d13/content.js');
 const {applyD13Definition}=await import('../src/story/d13/definition.js');
 assert.equal(D13_LINES.length,21);assert.deepEqual(D13_VOICE_INDICES,[8,10,12,14,16,18,20]);
 assert.match(D13_LINES[8][1],/^晚上好，nya。/);assert.match(D13_LINES[20][1],/晚安，nya，或者我該叫你，熙蒙……/);
 const {store}=fixture(),config=structuredClone(store.get().story55.config);config.scenes.intrusion=structuredClone(D13_LEGACY_LINES);applyD13Definition(config);assert.deepEqual(config.scenes.intrusion,D13_LINES);
 const edited=structuredClone(D13_LEGACY_LINES);edited[1][1]='作者自己改過的句子';config.scenes.intrusion=edited;applyD13Definition(config);assert.deepEqual(config.scenes.intrusion,edited);
});

test('shared authored Send primes Audio synchronously only on the last valid pre-call turn',()=>{
 const {store,ctx}=fixture();transfer(store);store.update(enterD13Chat);
 store.update(s=>s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}});
 while(scene55(store.get(),'intrusion').index<2)store.update(s=>advanceScene55(s,'intrusion'));
 const priorDocument=globalThis.document,priorAudio=globalThis.Audio,listeners=new Map();let plays=0;
 globalThis.document={addEventListener(type,fn,capture){if(type==='submit'){assert.equal(capture,true);listeners.set(type,fn);}},removeEventListener(type){listeners.delete(type);},querySelector(){return null;}};
 globalThis.Audio=class{play(){plays++;return Promise.resolve();}pause(){}};
 let stop;
 try{
  stop=mountTelephony(()=>ctx);const submit=listeners.get('submit');assert.equal(typeof submit,'function');
  const form={dataset:{storyScene:'intrusion',id:'s55-ouroboros'},elements:{text:{value:sceneLines(store.get(),'intrusion')[2][1]}}};
  submit({target:form});assert.equal(plays,0,'An earlier player turn must not unlock audio');
  store.update(s=>{advanceScene55(s,'intrusion');advanceScene55(s,'intrusion');});
  form.elements.text.value='不完整的預設';submit({target:form});assert.equal(plays,0);
  form.elements.text.value=sceneLines(store.get(),'intrusion')[4][1];submit({target:form});
  assert.equal(plays,1,'Prime must happen in the submit capture, before any awaited shell handler');
  assert.equal(scene55(store.get(),'intrusion').index,4,'Priming cannot send the player turn');
  assert.equal(store.get().content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-intrusion-v2-4'),false);
 }finally{stop?.();globalThis.document=priorDocument;globalThis.Audio=priorAudio;}
});
