import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {taiLife,taiLifeContext} from '../src/services/ai/life-context.js';
import {taiPresence} from '../src/services/presence.js';
import {taiVoiceRemaining,unlockTaiVoice,synthesizeTaiVoice,taiVoiceUnlockCommand,submitTaiVoiceUnlock} from '../src/services/ai/voice-budget.js';
import {hasBannedTaiReassurance} from '../src/services/ai/expression-style.js';
import {replyToTaiMessage,maybeResumeTaiDeferred} from '../src/services/ai/live-chat.js';
import {taiDisplayName,markTaiRead} from '../src/apps/noapp/contact.js';
import {chatView,chatList} from '../src/components/chat.js';
import {render} from '../src/apps/noapp/index.js';
import {startIncoming} from '../src/apps/noapp/voice-call.js';

function fixture(clock='08:30'){
 const s=activateStory55(initialState());s.day=35;s.clock=clock;s.story55.completed.recognition={day:35};s.story55.noappInstalled=true;s.powerMode='idle';s.unlocked=true;
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');c.messages=[];
 return {s,c,store:{get:()=>s,update:fn=>fn(s)}};
}
test('London sleep inclusive at 01:30, exclusive at 07:30; DST is game-date based',()=>{
 const {s}=fixture('08:29');assert.equal(taiLife(s).local,'01:29');assert.equal(taiPresence(s).contactable,true);
 s.clock='08:30';assert.equal(taiPresence(s).contactable,false);assert.equal(taiLife(s).activity,'睡覺');
 s.clock='14:29';assert.equal(taiPresence(s).contactable,false);
 s.clock='14:30';assert.equal(taiPresence(s).contactable,true);
 s.clock='22:00';assert.equal(taiLife(s).status,'busy');assert.match(taiLifeContext(s),/澳門 22:00.*英國 .*15:00/);
 s.calendar={anchorDay:35,anchorDate:'2025-12-01'};s.clock='09:30';assert.equal(taiLife(s).local,'01:30');assert.equal(taiPresence(s).contactable,false);
 s.clock='15:30';assert.equal(taiPresence(s).contactable,true);
});
test('independent daily caps reserve before provider work, failure releases reservation, secret persists and is exact',async()=>{
 const {s,store,c}=fixture();s.aiDraft.taiVoiceUsage={35:{call:29,message:14}};
 let resolve,called=0;const synth=()=>{called++;return new Promise(r=>resolve=r);};
 const a=synthesizeTaiVoice(store,'call',{text:'嗯。'},synth);
 await assert.rejects(synthesizeTaiVoice(store,'call',{text:'嗯。'},synth),{code:'TAI_VOICE_LIMIT'});assert.equal(called,1);
 resolve(new Blob(['voice']));await a;assert.equal(taiVoiceRemaining(s,'call'),0);assert.equal(taiVoiceRemaining(s,'message'),1);
 await assert.rejects(synthesizeTaiVoice(store,'message',{text:'嗯。'},async()=>{throw Error('fake failure');}));assert.equal(taiVoiceRemaining(s,'message'),1);
 await synthesizeTaiVoice(store,'message',{text:'嗯。'},async()=>new Blob(['voice']));assert.equal(taiVoiceRemaining(s,'message'),0);
 s.day++;assert.equal(taiVoiceRemaining(s,'call'),30);assert.equal(taiVoiceRemaining(s,'message'),15);
 assert.equal(unlockTaiVoice(store,'草莓是香蕉嗎？'),false);assert.equal(unlockTaiVoice(store,'草莓是香蕉'),true);assert.equal(c.messages.length,0);
 s.day++;assert.equal(taiVoiceRemaining(s,'call'),Infinity);assert.equal(taiVoiceRemaining(s,'message'),Infinity);
});
test('banned reassurance is recognized across text and speech segments before synthesis',async()=>{
 const {store}=fixture();assert.equal(hasBannedTaiReassurance(['剛才那件事。','別多想。']),true);
 assert.equal(hasBannedTaiReassurance(['刚刚说的那些话，你不用想太多。']),true);
 assert.equal(hasBannedTaiReassurance(['剛才你說什麼？']),false);
 await assert.rejects(synthesizeTaiVoice(store,'message',{text:'剛才，別多想。'},()=>{assert.fail('provider must not be called');}),{code:'TAI_STYLE'});
});
test('plain and private unlock commands are consumed before chat and persist across days; cloud authorization is separate',async()=>{
 const {s,c,store}=fixture();s.aiDraft.taiVoiceUsage={35:{call:30,message:15}};s.drafts.tai='草莓是香蕉';
 const toast=[],ctx={store,refresh(){},toast:line=>toast.push(line)};
 const form={elements:{text:{value:'草莓是香蕉'}}};
 assert.equal(submitTaiVoiceUnlock(form,ctx,{cloud:true,activate:()=>assert.fail('plain phrase cannot authorize cloud spending')}),true);
 assert.equal(form.elements.text.value,'');assert.equal(s.drafts.tai,undefined);assert.equal(taiVoiceRemaining(s,'call'),Infinity);assert.equal(taiVoiceRemaining(s,'message'),Infinity);assert.equal(s.aiDraft.taiCloudTester,undefined);
 assert.equal(taiVoiceUnlockCommand('草莓是香蕉嗎？'),null);
 form.elements.text.value='草莓是香蕉 TEST-'+'a'.repeat(48);
 let sent;
 assert.equal(submitTaiVoiceUnlock(form,ctx,{cloud:true,activate:async code=>{sent=code;return {tester:true};}}),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent,'TEST-'+'a'.repeat(48));assert.equal(s.aiDraft.taiCloudTester,true);assert.equal(form.elements.text.value,'');assert.equal(c.messages.length,0);
 s.day++;assert.equal(taiVoiceRemaining(s,'call'),Infinity);assert.equal(taiVoiceRemaining(s,'message'),Infinity);
});
test('sleep preserves unread and blocks calls; wake resumes old messages even after reload and marks all read',async()=>{
 const {s,c,store}=fixture();c.messages.push({id:'first',from:'me',kind:'text',text:'喂',day:35,time:'08:30',actual:true},{id:'voice',from:'me',kind:'voice',text:'[語音]',day:35,time:'08:30',actual:true});
 const original=globalThis.fetch;globalThis.fetch=()=>{assert.fail('No network for sleeping or unheard reply')};
 try{
  const result=await replyToTaiMessage(store,'voice');assert.equal(result.status,'offline');assert.equal(c.messages[1].taiReadAt,undefined);assert.equal(c.messages[1].taiPending,true);
  assert.equal(startIncoming({store}),false);assert.equal(maybeResumeTaiDeferred(store),false);
  s.clock='14:30';const task=maybeResumeTaiDeferred(store,{wait:async()=>{}});assert.ok(task);await task;
  assert.ok(c.messages[0].taiReadAt);assert.ok(c.messages[1].taiReadAt);assert.equal(c.messages[1].taiPending,undefined);assert.equal(c.messages.length,3);
 }finally{globalThis.fetch=original;}
});
test('contact display is T. or saved remark; receipts belong to outgoing bubbles',()=>{
 const {s,c}=fixture('21:30');c.messages.push({id:'one',from:'me',text:'你好',kind:'text',day:35,time:'21:30',actual:true},{id:'two',from:'me',text:'在嗎？',kind:'text',day:35,time:'21:30',actual:true});
 assert.equal(taiDisplayName(s),'T.');assert.match(chatList(s,'noapp'),/T\./);
 markTaiRead(s,'one',100);assert.match(chatView(s,'noapp','tai'),/is-read">已讀/);assert.match(chatView(s,'noapp','tai'),/is-unread">未讀/);
 s.aiDraft.taiRemark='哥哥';assert.match(chatList(s,'noapp'),/哥哥/);assert.match(render({store:{get:()=>s}},{route:'/contact/tai'}),/NoApp ID：T\./);
});
