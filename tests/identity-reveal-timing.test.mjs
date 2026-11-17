import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55,handleStory55Action} from '../src/services/story55/controller.js';
import {completed,nodeStatus} from '../src/services/story55/state.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {agent,agentFiles,ensureAgent,sendAgent,tickTearAgent,tearTaskInfo} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {savePersonalFiles,unlockPersonalFiles,handleLibraryAction,renderLibrary,submitLibraryForm} from '../src/apps/files/features/local-library/index.js';
import {appUnlocked} from '../src/system/registry.js';
import {IDENTITY_DIALOGUE,IDENTITY_FALLBACK_OPENING} from '../src/story/d29/definition.js';

test('D33 fourth real message schedules D34, keeps archive sealed and delivers the approved dialogue one bubble at a time',async t=>{
 const s=activateStory55(initialState());previewNode55(s,'ig');
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 const store={get:()=>s,update:fn=>fn(s)},ctx={store,router:{open:loc=>s.nav.current=loc}};
 const send=text=>sendMessage(store,{channel:'mirage',conversationId:chat.id,text});
 ensureAgent(s).archiveRun={done:true,startedAt:0};assert.ok(savePersonalFiles(s));
 send('在嗎？');assert.equal(s.story55.identityContact,undefined);
 s.story55.completed.ig={day:33,clock:s.clock};
 send('在嗎？');send('你到底是誰？');send('那些照片是怎麼回事？');
 assert.equal(s.story55.identityContact.count,3);assert.equal(nodeStatus(s,'questions').state,'locked');
 send('回我');assert.equal(s.story55.identityContact.replyDay,34);
 send('？');assert.equal(s.story55.identityContact.replyDay,34);
 tickStory55(s);assert.ok(!chat.messages.some(m=>m.id.startsWith('s55-identity-reveal-')));
 assert.equal(unlockPersonalFiles(s,'XITAI'),false);
 t.mock.method(globalThis,'FormData',function(){return {get:()=> 'XITAI'};});
 let toast;submitLibraryForm({dataset:{form:'files-local-personal-unlock'}},{...ctx,toast:v=>toast=v});assert.equal(toast,'文件暫時無法響應');
 chat.messages.push({id:'s55-d29-offline',from:'system',text:'Ouroboros 已下線'},{id:'legacy-farewell',from:chat.id,text:'我還有事，下線了'});
 tickStory55(s);assert.ok(!chat.messages.some(m=>m.id==='s55-d29-offline'));assert.ok(chat.messages.some(m=>m.id==='legacy-farewell'));
 assert.doesNotMatch(renderLibrary(s,'/item/personal-files/tai/photo'),/triplets-baby-photo/);
 s.day=34;tickStory55(s);
 assert.equal(sceneLines(s,'questions').length,IDENTITY_DIALOGUE.length);
 for(const [index,[who,text]] of IDENTITY_DIALOGUE.entries()){
  assert.equal(scene55(s,'questions').index,index);
  if(who==='me'){
   const draft=scriptedDraft55(s,'mirage',chat.id);assert.equal(draft?.text,text);
   sendScriptedDraft55(s,'mirage',chat.id,text);
  }else{
   assert.equal(scriptedDraft55(s,'mirage',chat.id),null);
   tickQueuedStoryScenes55(s,Date.now()+10000);
   if(scene55(s,'questions').index===index)tickQueuedStoryScenes55(s,Date.now()+20000);
  }
  assert.equal(chat.messages.find(m=>m.id==='s55-identity-reveal-'+index)?.text,text);
 }
 assert.equal(completed(s,'questions'),true);
 assert.equal(appUnlocked('noapp',s),false);
 assert.ok(agentFiles(s).some(f=>f.id==='personal-files/account'));
 assert.equal(sendAgent(s,'','personal-files/account').kind,'preset');
 assert.match(agent(s).messages.at(-1).text,/ID/);
 assert.equal(sendAgent(s,'','personal-files/tai').kind,'preset');
 assert.equal(tearTaskInfo(s,'archive-password').running,true);
 const [hours,minutes]=s.clock.split(':').map(Number),finish=hours*60+minutes+50;
 s.clock=String(Math.floor(finish/60)%24).padStart(2,'0')+':'+String(finish%60).padStart(2,'0');if(finish>=1440)s.day++;
 tickTearAgent(s);assert.match(agent(s).messages.at(-1).text,/破譯失敗/);
 assert.equal(unlockPersonalFiles(s,'XITAI'),true);
 handleLibraryAction('files-local-personal-open',{dataset:{route:'/item/personal-files/tai/photo'}},ctx);
 assert.equal(completed(s,'photo'),true);tickStory55(s);
 assert.ok(!s.content.mail.some(m=>m.id==='invite-mail'));
 send('你是我弟弟？');tickStory55(s);assert.equal(s.content.mail.filter(m=>m.id==='invite-mail').length,1);
 assert.equal(appUnlocked('noapp',s),false);await handleStory55Action('s55-install-noapp',{dataset:{}},ctx);
 assert.equal(appUnlocked('noapp',s),true);assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').name,'陳熙泰');
});
test('D34 fallback only after a profile visit; late entry and old navigation recover without a fourth message',()=>{
 for(const late of [false,true]){
  const s=activateStory55(initialState());previewNode55(s,'ig');
  s.day=34;s.clock='07:59';tickStory55(s);
  assert.equal(nodeStatus(s,'questions').state,'locked');
  if(!late){s.nav.current={appId:'browser',route:'/page',params:{page:'room404'}};tickStory55(s);}
  assert.equal(nodeStatus(s,'questions').state,'locked');
  s.day=late?35:34;s.clock='08:00';tickStory55(s);
  if(late){
   assert.equal(nodeStatus(s,'questions').state,'locked');
   delete s.story55.room404VisitRevision;
   s.browserData={navigation:[{route:'/page',params:{page:'room404'}}]};
   tickStory55(s);
  }
  assert.equal(nodeStatus(s,'questions').state,'ready');
  assert.deepEqual(sceneLines(s,'questions'),[['ouroboros',IDENTITY_FALLBACK_OPENING],...IDENTITY_DIALOGUE.slice(1)]);
  const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
  tickQueuedStoryScenes55(s,Date.now()+10000);
  assert.equal(chat.messages.filter(m=>m.id==='s55-identity-reveal-0').length,1);
  assert.equal(chat.messages.find(m=>m.id==='s55-identity-reveal-0').text,IDENTITY_FALLBACK_OPENING);
  tickQueuedStoryScenes55(s,Date.now()+20000);
  assert.equal(scene55(s,'questions').index,1);
  assert.equal(s.story55.identityContact.count,0);
 }
});
