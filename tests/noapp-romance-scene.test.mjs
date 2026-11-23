import test from 'node:test';
import assert from 'node:assert/strict';
import {planTaiRomanceScene,romanceQuestionIntent,romanceSceneAwaitingPlayer} from '../src/services/ai/romance-scene/index.js';
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
test('player really chooses teasing, sincerity, joking, refusal, or silence',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const base=[m('u1','me','說愛我'),m('t1','tai',first.preset.text,{aiPresetId:first.preset.id,taiRomanceScene:first.tag})];
 for(const [input,branch] of [['對啊','playful'],['我認真的','serious'],['哈哈逗你的','joke'],['別說了','boundary']]){
  const result=plan([...base,m('u2','me',input)],input);
  assert.equal(result.mode,'continue');assert.equal(result.branch,branch);
  assert.equal(result.tag.beat,['joke','boundary'].includes(branch)?'closed':branch);
 }
 assert.equal(plan([...base,m('u2','me','……')],'……').mode,'silent');
 assert.equal(plan([...base,m('u2','me','查看報告')],'查看報告'),null);
 assert.equal(romanceSceneAwaitingPlayer(base),true);
});
test('one two-person scene is capped at three actual reply beats',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const base=[m('u1','me','說愛我'),m('t1','tai',first.preset.text,{taiRomanceScene:first.tag})];
 const two=plan([...base,m('u2','me','我認真的')],'我認真的');
 const extended=[...base,m('u2','me','我認真的'),m('t2','tai','模型回應',{taiRomanceScene:two.tag})];
 const three=plan([...extended,m('u3','me','對啊')],'對啊');
 assert.equal(three.tag.beat,'closed');
 assert.equal(three.tag.step,3);
 assert.equal(plan([...extended,m('u3','me','對啊'),m('t3','tai','好',{taiRomanceScene:three.tag}),m('u4','me','對啊')],'對啊'),null);
});
test('history survives JSON save and repeated presets cannot farm replies',()=>{
 const first=plan([m('u1','me','說愛我')],'說愛我');
 const base=JSON.parse(JSON.stringify([m('u1','me','說愛我'),
  m('t1','tai',first.preset.text,{aiPresetId:first.preset.id,taiRomanceScene:first.tag})]));
 assert.equal(plan([...base,m('u2','me','我認真的')],'我認真的').tag.sceneId,first.tag.sceneId);
 const interrupted=[...base,m('u2','me','別的話題'),m('t2','tai','我聽到了')];
 assert.equal(plan([...interrupted,m('u3','me','說愛我')],'說愛我'),null);
 assert.equal(romanceSceneAwaitingPlayer(interrupted),false);
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
  calls++;
  const req=JSON.parse(init.body);
  assert.match(req.messages[0].content,/雙人對話/);
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
