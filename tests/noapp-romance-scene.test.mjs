import test from 'node:test';
import assert from 'node:assert/strict';
import {planTaiRomanceScene,romanceQuestionIntent,romanceSceneAwaitingPlayer,romanceReplyIntent,bridgeRelationshipPermissions} from '../src/services/ai/romance-scene/index.js';
import {initialState} from '../src/services/storage.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';

const m=(id,from,text,meta={})=>({id,from,text,day:50,kind:'text',actual:true,...meta});
const rel=(stage=4)=>({stage,rejected:false,crisis:false});
const plan=(history,input,relationship=rel())=>planTaiRomanceScene({history,input,relationship});
const quick={wait:async()=>{},random:()=>0,now:()=>1000000};

test('R3-R4 use only the two author-approved opening lines',()=>{
 const one=plan([m('u','me','說你愛我')],'說你愛我');
 assert.equal(one.mode,'preset');
 assert.equal(one.preset.text,'你就這麼想聽？');
 assert.equal(plan([m('u','me','你是不是喜欢我？')],'你是不是喜欢我？').preset.text,'……你認真的？');
 assert.equal(romanceQuestionIntent('幫我修一個 bug'),'');
});
test('stage, rejection, crisis, and actual delivery guard fixed scenes',()=>{
 for(const stage of [1,2,5,6])assert.equal(plan([m('u','me','說愛我')],'說愛我',rel(stage)),null);
 assert.equal(plan([m('u','me','說愛我',{actual:false})],'說愛我'),null);
 assert.equal(plan([m('u','me','說愛我')],'說愛我',{...rel(),rejected:true}),null);
 assert.equal(plan([m('u','me','說愛我')],'說愛我',{...rel(),crisis:true}),null);
});
test('approved node follows a real affirmative player message without DeepSeek',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const history=[m('u1','me','說愛我'),m('t1','tai',first.preset.text,{aiPresetId:first.preset.id,taiRomanceScene:first.tag})];
 const second=plan([...history,m('u2','me','對啊')],'對啊');
 assert.equal(second.mode,'preset');
 assert.equal(second.preset.text,'……你認真的？');
 assert.equal(second.tag.step,2);
 const earnest=plan([...history,m('u2','me','我認真的')],'我認真的');
 assert.equal(earnest.mode,'continue');
 assert.equal(earnest.bridgeOnly,true);
 assert.equal(bridgeRelationshipPermissions({canDeclareLike:true,canDeclareLove:true},earnest).canDeclareLike,false);
});
test('free input classification handles serious, jokes, silence, boundaries and topic switches',()=>{
 const first=plan([m('u1','me','你是不是喜歡我？')],'你是不是喜歡我？');
 const base=[m('u1','me','你是不是喜歡我？'),m('t1','tai',first.preset.text,{aiPresetId:first.preset.id,taiRomanceScene:first.tag})];
 assert.equal(romanceQuestionIntent('熙泰，你到底喜欢我吗？'),'feelings_question');
 assert.equal(romanceQuestionIntent('你不是说喜欢我吗'),'');
 assert.equal(romanceReplyIntent('哈哈，我认真的'),'serious');
 assert.equal(plan([...base,m('u2','me','哈哈逗你的')],'哈哈逗你的').tag.beat,'closed');
 assert.equal(plan([...base,m('u2','me','別說了')],'別說了').mode,'silent');
 assert.equal(plan([...base,m('u2','me','……')],'……').mode,'silent');
 assert.equal(plan([...base,m('u2','me','查看報告')],'查看報告'),null);
 assert.equal(romanceSceneAwaitingPlayer(base),true);
});
test('the story stays open as long as the player talks about it; no 3-reply cap',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const history=[m('u1','me','說愛我'),m('t1','tai',first.preset.text,{taiRomanceScene:first.tag})];
 for(let i=2;i<=9;i++){
  history.push(m('u'+i,'me','我認真的'));
  const step=plan(history,'我認真的');
  assert.equal(step.mode,'continue');
  assert.equal(step.tag.step,i);
  history.push(m('t'+i,'tai','普通銜接',{taiRomanceScene:step.tag}));
 }
 assert.equal(plan([...history,m('new','me','我先修電腦了')],'我先修電腦了'),null);
});
test('save restores scene cursor, but a previously used opening never loops',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const base=JSON.parse(JSON.stringify([m('u1','me','說愛我'),
  m('t1','tai',first.preset.text,{aiPresetId:first.preset.id,taiRomanceScene:first.tag})]));
 assert.equal(plan([...base,m('u2','me','我認真的')],'我認真的').tag.sceneId,first.tag.sceneId);
 const interrupted=[...base,m('u2','me','別的話題'),m('t2','tai','我聽到了')];
 assert.equal(plan([...interrupted,m('u3','me','說愛我')],'說愛我'),null);
 assert.equal(romanceSceneAwaitingPlayer(interrupted),false);
});
test('unplayed phone speech does not count as an actual authored beat',()=>{
 const first=plan([{role:'user',content:'說愛我',id:'u1'}],'說愛我');
 const history=[{role:'user',content:'說愛我',id:'u1'},
  {role:'assistant',content:first.preset.text,taiRomanceScene:first.tag}];
 assert.equal(plan([...history,{role:'user',content:'對啊',id:'u2'}],'對啊'),null);
 history[1].playedAt=5000;
 const next=plan([...history,{role:'user',content:'對啊',id:'u2'}],'對啊');
 assert.equal(next.preset.text,'……你認真的？');
});
function setup(input){
 const s=initialState();s.day=56;s.clock='21:30';
 s.aiDraft??={};s.aiDraft.taiBond={score:64,signals:{}};
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push(m('prior','me','想你了',{day:52,taiHandledAction:'read_no_reply'}));
 chat.messages.push(m('user-1','me',input,{day:56,time:'21:30'}));
 return {s,chat,store:{get:()=>s,update:fn=>fn(s)}};
}
test('NoApp actually delivers approved opening without invoking an AI provider',async()=>{
 const {s,chat,store}=setup('說愛我');
 const before=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('An approved fixed line must not call AI');};
 try{
  const out=await replyToTaiMessage(store,'user-1',quick);
  assert.equal(out.status,'replied');
  assert.equal(out.text,'你就這麼想聽？');
  assert.equal(chat.messages.at(-1).aiPresetId,'tai-romance-love-question-v1');
  assert.equal(chat.messages.at(-1).taiRomanceScene.beat,'opening');
  assert.equal(chat.messages.at(-1).replySourceId,'user-1');
 }finally{globalThis.fetch=before;}
});
test('NoApp delivers a second approved graph beat without any model call',async()=>{
 const {chat,store}=setup('說愛我');
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('approved authored node must never call a model');};
 try{
  assert.equal((await replyToTaiMessage(store,'user-1',quick)).text,'你就這麼想聽？');
  chat.messages.push(m('user-2','me','對啊',{day:56,time:'21:31'}));
  const response=await replyToTaiMessage(store,'user-2',quick);
  assert.equal(response.status,'replied');
  assert.equal(response.text,'……你認真的？');
  assert.equal(chat.messages.at(-1).taiRomanceScene.beat,'confirm');
  assert.equal(chat.messages.at(-1).replySourceId,'user-2');
 }finally{globalThis.fetch=previous;}
});

test('NoApp continuation uses exactly one bounded DeepSeek generation, not forced bubble count',async()=>{
 const {chat,store}=setup('說愛我');
 assert.equal((await replyToTaiMessage(store,'user-1',quick)).status,'replied');
 chat.messages.push(m('user-2','me','我認真的',{day:56,time:'21:31'}));
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const storage=new Map();
 globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 saveApiConfig({deepseek:'test-private-key',minimax:'',model:'deepseek-flash'});
 let calls=0;
 globalThis.fetch=async(url,init)=>{
  // Character-bible GET is a separate optional read; count only actual
  // DeepSeek content generations, not supporting network lookups.
  if(String(url).includes('/tai-v8-persona'))return Response.json({},{status:404});
  if(String(url).includes('api.deepseek.com/chat/completions'))calls++;
  const req=JSON.parse(init.body);
  assert.match(req.messages[0].content,/自由打字對話圖/);
  return Response.json({choices:[{message:{content:JSON.stringify({messages:[{text:'我聽到了。',mode:'text',tone:'neutral'}]})}}]});
 };
 try{
  const out=await replyToTaiMessage(store,'user-2',quick);
  assert.equal(out.status,'replied');
  assert.equal(out.count,1);
  assert.equal(chat.messages.at(-1).text,'我聽到了');
  assert.equal(chat.messages.at(-1).taiRomanceScene.beat,'serious');
  assert.equal(calls,1);
 }finally{
  clearApiConfig();
  globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
 }
});
test('ellipsis is a real quiet branch: no provider request, no manufactured NPC line',async()=>{
 const {chat,store}=setup('你是不是喜歡我？');
 assert.equal((await replyToTaiMessage(store,'user-1',quick)).status,'replied');
 const previous=chat.messages.at(-1).id;
 chat.messages.push(m('user-2','me','……',{day:56}));
 const out=await replyToTaiMessage(store,'user-2',quick);
 assert.equal(out.status,'read_no_reply');
 assert.equal(chat.messages.filter(x=>x.from==='tai').at(-1).id,previous);
 assert.equal(chat.messages.at(-1).taiHandledAction,'read_no_reply');
});
