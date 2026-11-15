import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickQueuedStoryScenes55,sceneLines} from '../src/services/story55/runtime.js';
import {story55Config,nodeStatus,completed,story55ChargeGate,overnightSceneGate55} from '../src/services/story55/state.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {saveIncomingZip,localFileList} from '../src/apps/files/features/local-library/index.js';
import {existsSync} from 'node:fs';

test('D26–D28 fixed scenes deliver in order, require real Send, render media and block overnight until finished',()=>{
 const s=activateStory55(initialState()),cfg=story55Config(s),store={get:()=>s,update:fn=>fn(s)};
 s.story55.activeScene=null;
 for(const n of cfg.nodes)if(n.day<26)s.story55.completed[n.id]={day:n.day,clock:'22:00'};
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 const nodes=cfg.nodes.filter(n=>n.day>=26&&n.day<=28&&n.id.startsWith('d'));
 assert.equal(nodes.length,11);
 let now=Date.now()+10000;
 for(const n of nodes){
  s.day=n.day;s.clock='08:00';assert.equal(nodeStatus(s,n.id).state,'locked');
  s.clock=n.at;assert.equal(nodeStatus(s,n.id).state,'ready');
  assert.equal(story55ChargeGate(s),'plot');assert.equal(overnightSceneGate55(s)?.id,n.id);
  const chat=s.content.conversations[n.channel].find(c=>c.id===n.conversationId);
  const messages=()=>chat.messages.filter(m=>m.id.startsWith(n.messagePrefix+'-'));
  const lines=sceneLines(s,n.id);
  assert.equal(messages().length,0);
  for(const [i,[who,copy]] of lines.entries()){
   if(who==='me'){
    tickQueuedStoryScenes55(s,now+=3000);assert.equal(messages().length,i);
    if(n.channel==='wechat'){
     assert.equal(nativeWeChatComposer(s,n.conversationId).text,copy);
     assert.equal(sendNativeWeChatPreset(store,n.conversationId,copy).handled,true);
    }else{
     assert.equal(scriptedDraft55(s,n.channel,n.conversationId).text,copy);
     sendScriptedDraft55(s,n.channel,n.conversationId,copy);
    }
   }else{
    for(let tries=0;messages().length===i&&tries<3;tries++)tickQueuedStoryScenes55(s,now+=3000);
   }
   assert.equal(messages().length,i+1,`${n.id} line ${i}`);
   const msg=messages().at(-1);
   assert.equal(msg.text,n.imageLines?.[i]||copy);
   assert.equal(msg.kind,n.imageLines?.[i]?'image':n.fileLines?.includes(i)?'file':'text');
   if(msg.kind==='file'){
    const {file}=saveIncomingZip(s,n.conversationId,msg.id);
    assert.equal(file.folder,'downloads');saveIncomingZip(s,n.conversationId,msg.id);
    assert.equal(localFileList(s).filter(x=>x.id===file.id).length,1);
   }
   if(msg.kind==='image'){
    assert.ok(existsSync(new URL('../public'+msg.text,import.meta.url)),msg.text);
    assert.match(renderWeChatChat(s,n.conversationId),/wx-bubble-picture/);
   }
  }
  assert.equal(completed(s,n.id),true);
  tickQueuedStoryScenes55(s,now+=3000);assert.equal(messages().length,lines.length);
  if(!nodes.some(x=>x.day===n.day&&!completed(s,x.id)))assert.equal(story55ChargeGate(s),null);
 }
});
