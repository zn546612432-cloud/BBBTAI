import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,nodeLink55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {currentScript55,scriptedDraft55,sendScriptedDraft55,threadForScene55} from '../src/services/story55/scripted-chat.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {completed} from '../src/services/story55/state.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {registry} from '../src/system/registry.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';

const state=()=>{const s=initialState();activateStory55(s);return s;};
test('D01 starts with an NPC message in the ORIGINAL WeChat group, and does not send the player text',()=>{
 const s=state();
 const start=currentScript55(s,'wechat','group');
 assert.equal(start.id,'intro');
 assert.equal(start.kind,'wang');
 assert.equal(nodeLink55(s,'intro').appId,'wechat');
 assert.equal(nodeLink55(s,'intro').route,'/chat/group');
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 const before=group.messages.length;
 assert.equal(scriptedDraft55(s,'wechat','group'),null);
 advanceScene55(s,'intro');
 assert.equal(group.messages.length,before+1);
 assert.equal(group.messages.at(-1).from,'wang');
 const me=scriptedDraft55(s,'wechat','group');
 assert.equal(me.kind,'me');
 assert.ok(me.text.includes('给我带一份'));
 const html=renderWeChatChat(s,'group');
 assert.match(html,/class="composer wx-composer"/);
 assert.match(html,/data-story-scene="intro"/);
 assert.match(html,/data-story-type="/);
 assert.doesNotMatch(html,/s55-scene-next|s55-scene-lines/);
 assert.equal(group.messages.some(x=>x.text===me.text),false);
 assert.throws(()=>sendScriptedDraft55(s,'wechat','group','漏一个字'),/完整/);
 assert.equal(group.messages.some(x=>x.text===me.text),false);
 sendScriptedDraft55(s,'wechat','group',me.text);
 assert.equal(group.messages.at(-1).from,'me');
 assert.equal(group.messages.at(-1).text,me.text);
 assert.equal(completed(s,'intro'),true);
});
test('original MIRAGE private channel shows the incoming message and the own reply in composer',()=>{
 const s=state();previewNode55(s,'invitation');
 const route=nodeLink55(s,'invitation');
 assert.equal(route.appId,'mirage');
 assert.equal(route.route,'/chat/s55-ouroboros');
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.ok(chat);
 setMirageAuthenticated(true);
 advanceScene55(s,'invitation');
 const step=scriptedDraft55(s,'mirage','s55-ouroboros');
 assert.equal(step.kind,'me');
 assert.match(step.text,/我单干/);
 const html=registry.get('mirage').render({store:{get:()=>s}},{route:'/chat/s55-ouroboros',params:{}});
 assert.match(html,/mc-cipher-scroll/);
 assert.match(html,/mc-composer composer/);
 assert.match(html,/data-story-stage="invitation:1"/);
 assert.match(html,/data-story-type="我单干，没有加入团队的打算。"/);
 assert.doesNotMatch(html,/s55-scene-next|s55-scene-lines/);
 assert.equal(chat.messages.filter(m=>m.from==='me').length,0);
 sendScriptedDraft55(s,'mirage','s55-ouroboros',step.text);
 assert.equal(chat.messages.at(-1).text,step.text);
 setMirageAuthenticated(false);
});
test('D30 recognition is a real NoApp conversation with send button, no theatrical dialogue panel',()=>{
 const s=state();previewNode55(s,'recognition');s.story55.noappInstalled=true;
 const route=nodeLink55(s,'recognition');
 assert.equal(route.appId,'noapp');
 assert.equal(route.route,'/chat/tai');
 advanceScene55(s,'recognition');
 const authored=scriptedDraft55(s,'noapp','tai');
 assert.equal(authored.kind,'me');
 const html=registry.get('noapp').render({store:{get:()=>s}},{route:'/chat/tai',params:{}});
 assert.match(html,/data-form="send-chat"/);
 assert.match(html,/data-story-scene="recognition"/);
 assert.match(html,/data-story-type="/);
 assert.doesNotMatch(html,/noapp-story55-step|s55-scene-next|查看新消息/);
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 assert.equal(chat.messages.filter(m=>m.from==='me').length,0);
 sendScriptedDraft55(s,'noapp','tai',authored.text);
 assert.equal(chat.messages.at(-1).from,'me');
});
test('D55 final voice is an in-chat sound bubble, not a Next-button card',()=>{
 const s=state();previewNode55(s,'ending');s.story55.noappInstalled=true;
 while(sceneLines(s,'ending')[scene55(s,'ending').index]?.[0]!=='watch'){
  const step=currentScript55(s,'noapp','tai');
  assert.ok(step);
  if(step.kind==='me')sendScriptedDraft55(s,'noapp','tai',step.text);
  else advanceScene55(s,'ending');
 }
 const html=registry.get('noapp').render({store:{get:()=>s}},{route:'/chat/tai',params:{}});
 assert.match(html,/noapp-final-pending/);
 assert.match(html,/data-action="s55-final-audio"/);
 assert.doesNotMatch(html,/s55-scene-next|noapp-story55-step/);
});

test('D30 investigation questions stay in MIRAGE composer, requiring five explicit taps',()=>{
 const s=state();previewNode55(s,'questions');
 assert.deepEqual(nodeLink55(s,'questions'),{appId:'mirage',route:'/chat/s55-ouroboros',params:{node:'questions'}});
 for(let i=0;i<5;i++){
  const question=scriptedDraft55(s,'mirage','s55-ouroboros');
  assert.equal(question.id,'questions');
  assert.equal(question.index,i);
  sendScriptedDraft55(s,'mirage','s55-ouroboros',question.text);
 }
 assert.equal(completed(s,'questions'),true);
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.equal(chat.messages.filter(m=>m.id.startsWith('s55-question-')).length,5);
});
