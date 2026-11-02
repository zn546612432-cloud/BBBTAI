import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';
import {unpackTaiReply} from '../src/services/ai/format.js';

const sequence=(...v)=>()=>v.shift()??.9;
async function runRealFlow({user='你还上学吗？',rolls=[.1,.9,.1],outputs=[]},fn){
 const state=initialState();state.day=56;state.clock='21:40';
 const chat=state.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'u13',from:'me',text:user,kind:'text',day:56,time:'21:40',actual:true});
 const store={get:()=>state,update:callback=>callback(state)};
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const storage=new Map();
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 saveApiConfig({deepseek:'test-only-key',minimax:'',model:'deepseek-flash'});
 let expression=0;const calls=[];
 globalThis.fetch=async (_url,init)=>{
  const body=JSON.parse(init.body),system=body.messages[0].content;
  calls.push({system,body});
  const decision=system.includes('【行为决策层】');
  const content=decision
   ?JSON.stringify({schema_version:10,source_message_id:'u13',action:'send_text',strategy:'tease',intensity:'medium',tone:'playful',vocal_cue:'none',intent:'认真回应哥哥的追问'})
   :JSON.stringify({messages:outputs[expression++]||[{text:'当然。'}]});
  return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const result=await replyToTaiMessage(store,'u13',{random:sequence(...rolls),wait:async()=>{},now:()=>1200000});
  await fn({result,state,chat,calls});
 }finally{
  clearApiConfig();globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
 }
}
test('40% branch: one DeepSeek JSON text containing semicolons becomes three separate paced NoApp bubbles',async()=>{
 await runRealFlow({rolls:[.1,.9,.1],outputs:[[
  {text:'哈佛，计算机博士；早就不用去教室了；怎么，你这么关心我的课表？',mode:'text',tone:'playful'}
 ]]},async({result,state,chat,calls})=>{
  assert.equal(result.status,'replied');
  assert.equal(result.count,3);
  assert.deepEqual(chat.messages.filter(m=>m.replySourceId==='u13').map(m=>m.text),[
   '哈佛，计算机博士','早就不用去教室了','怎么，你这么关心我的课表？'
  ]);
  assert.equal(calls.length,2,'single expression call suffices once semicolon text is split');
  assert.match(calls[1].system,/40%分号连发模式已触发/);
  const audit=state.events.filter(e=>e.type==='tai_v12_turn_plan').at(-1);
  assert.equal(audit.semicolonBurst,true);
  assert.equal(audit.target,3);
  assert.equal(audit.emitted,3);
 });
});
test('old screenshot: continuation repeats Harvard facts but only new question is actually delivered',async()=>{
 await runRealFlow({rolls:[.5,.9,.9],outputs:[
  [{text:'哈佛，计算机博士，早不上教室了',mode:'text',tone:'dry'}],
  [{text:'哈佛，计算机博士。不过早就不上教室了。你对我上不上学很在意？',mode:'text',tone:'playful'}]
 ]},async({result,chat,calls})=>{
  assert.equal(result.count,2);
  assert.equal(calls.length,3,'one natural continuation retry');
  assert.deepEqual(chat.messages.filter(m=>m.replySourceId==='u13').map(m=>m.text),[
   '哈佛，计算机博士，早不上教室了','你对我上不上学很在意？'
  ]);
 });
});
test('format parser supports Chinese and English semicolons; voice calls are not split into text bubbles',()=>{
 const data={text:JSON.stringify({messages:[{text:'一句；两句;三句',mode:'text'}]})};
 assert.deepEqual(unpackTaiReply(data,'noapp').map(x=>x.text),['一句','两句','三句']);
 const voice={text:JSON.stringify({messages:[{text:'先说一段；然后再说。',mode:'voice'}]})};
 assert.deepEqual(unpackTaiReply(voice,'call').map(x=>x.text),['先说一段；然后再说。']);
});
