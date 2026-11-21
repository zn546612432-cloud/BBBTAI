import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {incomingTaiBatch,incomingBatchPrompt} from '../src/services/ai/incoming-turn.js';
import {musicListeningContext} from '../src/apps/music/features/shared/listening.js';
import {listeningData} from '../src/apps/music/features/shared/listening-data.js';
import {defaultWorldbook,readWorldbook} from '../src/services/ai/worldbook/format.js';
import {saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';

const share={id:'shared',from:'me',kind:'music',text:'分享音乐：褪黑素',attachment:{trackId:'melatonin'},actual:true,day:56,time:'21:20'};
const text=(id,text)=>({id,from:'me',kind:'text',text,actual:true,day:56,time:'21:20'});

test('audio cache matches the exact bundled recordings and provides the actual 2:15 neighborhood',()=>{
 for(const [key,file] of [['melatonin','melatonin.mp3'],['tonight-rain','tonight-rain.m4a']]){
  assert.equal(listeningData[key].sha256,createHash('sha256').update(readFileSync('public/assets/music/'+file)).digest('hex'));
  assert.ok(listeningData[key].windows.length>40);
 }
 assert.match(musicListeningContext([share],'2:15這裡'),/褪黑素[\s\S]*2:15/);
 assert.equal(musicListeningContext([], '2:15這裡'),'');
 assert.equal(musicListeningContext([share], '今天吃什麼'),'');
});

test('consecutive messages preserve their complete text and stop at a prior response',()=>{
 const previous=text('old','舊問題'),reply={from:'tai',id:'reply',kind:'text',text:'好'},a=text('a','你在嗎'),b=text('b','在不在');
 const batch=incomingTaiBatch([previous,reply,a,b],'b');
 assert.deepEqual(batch,[a,b]);assert.match(incomingBatchPrompt(batch),/同一意思只回应一次/);
 const book=defaultWorldbook();book.books[0].entries=book.books[0].entries.filter(e=>e.id!=='incoming-message-batch');
 assert.ok(readWorldbook({aiDraft:{worldbook:book}}).books[0].entries.some(e=>e.id==='incoming-message-batch'));
});

test('bare music share gives one real acknowledgment without calling an API',async()=>{
 const s=initialState();s.day=56;s.clock='21:20';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');chat.messages=[share];
 const store={get:()=>s,update:fn=>fn(s)};
 const result=await replyToTaiMessage(store,share.id,{wait:async()=>{},random:()=>0.5,now:()=>1234567});
 assert.equal(result.status,'replied');assert.equal(result.count,1);
 assert.equal(chat.messages.at(-1).text,'好');assert.equal(chat.messages.at(-1).replySourceId,share.id);
 assert.equal((await replyToTaiMessage(store,share.id)).status,'scripted');
});

test('actual reply receives both incoming bubbles and audio measurements, with no forced burst',async()=>{
 const s=initialState();s.day=56;s.clock='21:20';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');chat.messages=[{...share},{id:'ack',from:'tai',kind:'text',text:'好',day:56},text('a','我最喜歡這段'),text('b','2:15這裡')];
 const store={get:()=>s,update:fn=>fn(s)},oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage,storage=new Map(),calls=[];
 globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 saveApiConfig({deepseek:'testing-token-only',minimax:'',model:'deepseek-flash'});
 globalThis.fetch=async (_url,init)=>{
  const body=JSON.parse(init.body),system=body.messages[0].content;calls.push(body);
  const content=system.includes('【行为决策层】')?JSON.stringify({schema_version:10,source_message_id:'b',action:'send_text',strategy:'answer',tone:'neutral',intent:'回應音樂'}):JSON.stringify({messages:[{text:'嗯，這一段的變化很明顯。'}]});
  return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const result=await replyToTaiMessage(store,'b',{wait:async()=>{},random:()=>0,now:()=>1234567});
  assert.equal(result.count,1);assert.equal(calls.length,2);
  assert.match(calls[1].messages[0].content,/真實音頻分析｜褪黑素/);
  assert.match(calls[1].messages[0].content,/同一意思只回应一次/);
  assert.ok(calls[1].messages.some(m=>m.content==='我最喜歡這段'));
  assert.ok(chat.messages.find(m=>m.id==='a').taiReadAt);
 }finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldStorage===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldStorage;}
});
