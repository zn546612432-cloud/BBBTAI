import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {story55Config,nodeStatus,completed,story55ChargeGate} from '../src/services/story55/state.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {d25Track} from '../src/story/d25/wechat.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {saveIncomingZip,localFileList} from '../src/apps/files/features/local-library/index.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=25;s.clock='10:25';s.story55.activeScene=null;
 for(const n of story55Config(s).nodes)if(n.day<25)s.story55.completed[n.id]={day:n.day,clock:'22:00'};
 const contact='s55-ouroboros';
 if(!s.content.conversations.mirage.some(c=>c.id===contact))s.content.conversations.mirage.push({id:contact,name:'Dr Ouroboros',messages:[],unread:0});
 return s;
}
test('D25 group delivers a native ZIP, waits for every real Send, then opens the Mirage exchange',()=>{
 const s=fixture(),cfg=story55Config(s),group='d25-survey',mirage='d25-ouroboros';
 const chat=s.content.conversations.wechat.find(c=>c.id==='group');
 const groupMessages=()=>chat.messages.filter(m=>m.id.startsWith('s55-d25-survey-'));
 assert.equal(nodeStatus(s,group).state,'locked');
 assert.equal(nodeStatus(s,mirage).state,'locked');
 assert.equal(story55ChargeGate(s),'plot');
 s.clock='10:26';let now=Date.now()+10000;
 tickQueuedStoryScenes55(s,now);tickQueuedStoryScenes55(s,now+=2000);tickQueuedStoryScenes55(s,now+=2000);
 assert.equal(groupMessages().length,2);
 const zip=groupMessages()[1];assert.equal(zip.kind,'file');assert.equal(zip.text,'security_survey_0612.zip');
 assert.match(renderWeChatChat(s,'group'),/data-action="wx-file-preview"/);
 const {file}=saveIncomingZip(s,'group',zip.id);assert.equal(file.folder,'downloads');
 saveIncomingZip(s,'group',zip.id);assert.equal(localFileList(s).filter(f=>f.id===file.id).length,1);
 assert.equal(nativeWeChatComposer(s,'group').text,'收到');
 tickQueuedStoryScenes55(s,now+=2000);assert.equal(groupMessages().length,2);
 const store={get:()=>s,update:fn=>fn(s)};
 for(let i=2;i<cfg.scenes[group].length;i++){
  const [who,text]=cfg.scenes[group][i];
  if(who==='me')assert.equal(sendNativeWeChatPreset(store,'group',text).handled,true);
  else tickQueuedStoryScenes55(s,now+=3000);
 }
 assert.equal(completed(s,group),true);assert.equal(groupMessages().length,17);
 const messages=()=>s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id.startsWith('s55-d25-ouroboros-'));
 for(const [who,text] of cfg.scenes[mirage]){
  if(who==='me'){
   assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros').text,text);
   sendScriptedDraft55(s,'mirage','s55-ouroboros',text);
  }else{tickQueuedStoryScenes55(s,now+=3000);if(!messages().length)tickQueuedStoryScenes55(s,now+=3000);}
 }
 assert.equal(completed(s,mirage),true);assert.equal(messages().length,15);
 assert.equal(story55ChargeGate(s),null);
 assert.equal(messages()[0].text,'傳奇裝逼王？');assert.equal(messages().at(-1).text,'祝你好運，熙蒙。');
});
test('D25 brother conversation starts independently at 11:38 and retains native Send gating',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)},chat=s.content.conversations.wechat.find(c=>c.id==='wang');
 s.clock='11:37';let now=Date.now()+10000;d25Track.tick(s,now);
 assert.equal(chat.messages.some(m=>m.id.startsWith('d25-wang-milk-tea-')),false);
 s.clock='11:38';d25Track.tick(s,now);d25Track.tick(s,now+=2000);
 assert.equal(d25Track.draft(s,'wang').text,'在');
 const lines=d25Track.defs[0].lines;
 for(const {who,text} of lines.slice(1)){
  if(who==='me')assert.equal(d25Track.send(store,'wang',text,now+=3000).handled,true);
  else d25Track.tick(s,now+=3000);
 }
 assert.equal(chat.messages.filter(m=>m.id.startsWith('d25-wang-milk-tea-')).length,17);
 assert.equal(chat.messages.at(-1).text,'哈哈，就知道哄我');
});
