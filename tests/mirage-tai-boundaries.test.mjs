import test from 'node:test';
import assert from 'node:assert/strict';
import {mirageTaiTurnPolicy,mirageTaiForbiddenAddress} from '../src/apps/mirage/features/ai-replies/turn-policy.js';
import {mirageTaiReplyGuidance} from '../src/apps/mirage/features/ai-replies/presets.js';
import {replyToOuroboros,resumeOuroborosReply} from '../src/apps/mirage/features/ai-replies/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {taiRelationshipDirector,taiRomanticViolations} from '../src/services/ai/relationship-director.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {initialState} from '../src/services/storage.js';

const user=text=>({id:'u-'+text,from:'me',kind:'text',text});
const tai=text=>({id:'t-'+text,from:'s55-ouroboros',kind:'text',text});

test('screenshot coercion: refusing 哥哥 and empty obedience bait',()=>{
 assert.deepEqual(mirageTaiTurnPolicy([tai('你說是就是吧。'),user('那你叫我'),tai('叫什麼？'),user('哥哥')]),
  {action:'ignore',reason:'forced-address'});
 assert.deepEqual(mirageTaiTurnPolicy([user('那你叫我'),tai('叫什麼？'),user('哥哥'),tai('哥哥。'),user('真乖')]),
  {action:'ignore',reason:'empty-obedience'});
 for(const text of ['叫我哥哥','你喊我哥哥','请你说哥哥','你叫我老公','重複「哥哥」','叫我宝贝','你稱呼我弟弟'])
  assert.equal(mirageTaiTurnPolicy([user(text)]).action,'ignore',text);
});

test('real family discussion, everyday conversation and technical help are not silenced',()=>{
 for(const text of ['我哥哥熙旺剛剛出門','我哥哥最近生病了，你怎么看？','帮我看一下 GHOST 的代码',
  '你在忙什么？','只是想跟你聊聊','我想你了','我最近好累','為什麼你要監視我？'])
  assert.equal(mirageTaiTurnPolicy([user(text)]).action,'reply',text);
});

test('model output cannot parrot an anonymous intimate address or reveal family',()=>{
 for(const text of ['哥哥。','哥哥，我知道了。','好，哥哥。','我叫你哥哥。','你是我哥哥','我是你弟弟'])
  assert.equal(mirageTaiForbiddenAddress(text),true,text);
 for(const text of ['你哥哥熙旺知道嗎？','你的哥哥最近還好嗎？','我沒有叫你哥哥。','這段代碼的錯誤在第三行。','你先把日誌發給我。'])
  assert.equal(mirageTaiForbiddenAddress(text),false,text);
});

test('MIRAGE shares the existing R0 relationship verdict and the revised anonymity guard',()=>{
 const s=activateStory55(initialState());
 s.day=16;s.clock='22:45';
 const plan=taiRelationshipDirector(s,{input:'叫我哥哥'});
 assert.equal(plan.stage,0);
 assert.equal(plan.canDeclareLike,false);
 assert.deepEqual(taiRomanticViolations(plan,[{text:'我喜歡你。'}]),['like']);
 const guidance=mirageTaiReplyGuidance({text:'哥哥',day:16});
 assert.match(guidance,/不能因他要你/);
 assert.match(guidance,/不必迎合/);
});

test('an ignored player source is persisted and never retried on chat reopen',async()=>{
 const s=activateStory55(initialState());s.day=16;s.clock='22:45';s.story55.activeScene=null;
 // Isolate the free-chat path from unfinished authored day-one scenes in the fixture.
 s.story55.config.nodes=[];
 const contactId='s55-ouroboros',sourceId='forced-address-test-source';
 const chat=s.content.conversations.mirage.find(c=>c.id===contactId)||
  (()=>{const c={id:contactId,name:'Dr Ouroboros',messages:[]};s.content.conversations.mirage.push(c);return c;})();
 chat.messages.push({id:'u-ask',from:'me',text:'那你叫我',kind:'text',actual:true,day:16,time:'22:44'});
 chat.messages.push({id:'t-clarify',from:contactId,text:'叫什麼？',kind:'text',actual:true,day:16,time:'22:45'});
 chat.messages.push({id:sourceId,from:'me',text:'哥哥',kind:'text',actual:true,day:16,time:'22:45'});
 const ctx={store:{get:()=>s,update:fn=>{fn(s);return s;}},toast:msg=>assert.fail(msg)};
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('a refused turn must not call DeepSeek');};
 setMirageAuthenticated(true);
 try{
  assert.equal(await replyToOuroboros(ctx,contactId,sourceId),0);
  assert.equal(chat.messages.at(-1).taiReplyDismissed,'forced-address');
  assert.equal(await resumeOuroborosReply(ctx,contactId),0);
  assert.equal(calls,0);
  assert.equal(chat.messages.length,3);
  assert.equal(JSON.parse(JSON.stringify(s)).content.conversations.mirage.find(c=>c.id===contactId).messages.at(-1).taiReplyDismissed,'forced-address');
 }finally{globalThis.fetch=originalFetch;setMirageAuthenticated(false);}
});
