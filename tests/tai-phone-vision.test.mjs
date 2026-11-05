import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTaiPhonePhoto,photoVisionDailyUsage,canAnalyzeTaiPhoto,cachedTaiVision} from '../src/services/ai/phone-mcp/vision.js';
import {callTaiPhoneTool} from '../src/services/ai/phone-mcp/index.js';
import {describeTaiImage,BYOK_SESSION} from '../src/services/ai/gateway.js';

const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/5zFgAAAAASUVORK5CYII=';
function makeSave(){
 return {day:32,clock:'20:00',calendar:{anchorDay:1,anchorDate:'2025-05-19'},powerMode:'idle',unlocked:true,
  aiDraft:{phoneMcp:{developerEnabled:true,visionEnabled:true}},events:[],
  content:{conversations:{wechat:[],messages:[],mirage:[],noapp:[]},photos:[{id:'img1',title:'熙旺和熙蒙的照片',src:png,actual:true}]}
 };
}
const fakeStore=s=>({s,get(){return this.s;},update(fn){const next=structuredClone(this.s);fn(next);this.s=next;return next;}});
test('Vision is opt-in and requires a real phone access grant',async()=>{
 const s=makeSave(),store=fakeStore(s);
 s.aiDraft.phoneMcp.visionEnabled=false;
 assert.deepEqual(canAnalyzeTaiPhoto(s,'img1'),{ok:false,error:'vision_disabled'});
 assert.equal((await analyzeTaiPhonePhoto(store,'img1',{analyze:async()=>{throw Error('should not call')}})).ok,false);
 s.aiDraft.phoneMcp.visionEnabled=true;s.aiDraft.phoneMcp.developerEnabled=false;
 assert.deepEqual(canAnalyzeTaiPhoto(s,'img1'),{ok:false,error:'photo_not_available'});
 assert.equal(photoVisionDailyUsage(s),0);
});
test('only the selected photo is sent, cache is reused without spending another attempt',async()=>{
 const store=fakeStore(makeSave());let requests=0;
 const analyze=async({dataUrl,authorLabel})=>{
  requests++;assert.equal(dataUrl,png);assert.equal(authorLabel,'熙旺和熙蒙的照片');
  return {summary:'两个人站在树前。',visibleText:'',uncertainty:'无法仅凭外貌判断名字'};
 };
 const first=await analyzeTaiPhonePhoto(store,'img1',{analyze,resolveImage:async src=>src,now:()=>100});
 assert.equal(first.ok,true);assert.equal(first.cached,false);
 assert.equal(requests,1);
 assert.equal(photoVisionDailyUsage(store.get()),1);
 const again=await analyzeTaiPhonePhoto(store,'img1',{analyze,resolveImage:async src=>src,now:()=>200});
 assert.equal(again.ok,true);assert.equal(again.cached,true);assert.equal(requests,1);
 const result=callTaiPhoneTool(store.get(),'inspect_photo',{photo_id:'img1'});
 assert.equal(result.data.visual_interpretation,'deepseek_flash_vision');
 assert.match(result.data.vision_summary,/两个人站在树前/);
 assert.ok(!JSON.stringify(result).includes('iVBORw'));
});
test('replaced photo cannot reuse cached visual description',async()=>{
 const store=fakeStore(makeSave());
 await analyzeTaiPhonePhoto(store,'img1',{resolveImage:async s=>s,analyze:async()=>({summary:'第一张'})});
 store.update(s=>{s.content.photos[0].src=png+'AAAA';});
 assert.equal(cachedTaiVision(store.get(),'img1'),null);
 const metadata=callTaiPhoneTool(store.get(),'inspect_photo',{photo_id:'img1'});
 assert.equal(metadata.data.visual_interpretation,'not_performed');
 assert.equal(metadata.data.vision_summary,undefined);
});
test('photo analysis has bounded daily budget even when provider errors',async()=>{
 const store=fakeStore(makeSave());
 for(let i=0;i<3;i++){
  const r=await analyzeTaiPhonePhoto(store,'img1',{resolveImage:async s=>s,analyze:async()=>{throw Error('network unavailable');}});
  assert.equal(r.ok,false);
 }
 assert.equal(photoVisionDailyUsage(store.get()),3);
 assert.equal(canAnalyzeTaiPhoto(store.get(),'img1').error,'daily_vision_limit');
});
test('DeepSeek Flash vision sends only selected image in user message; no app save, no secrets',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage,oldLocal=globalThis.localStorage;
 let body=null,url='';
 globalThis.sessionStorage={getItem:k=>k===BYOK_SESSION?JSON.stringify({deepseek:'fake-key'}):null};
 globalThis.localStorage={getItem:()=>null};
 globalThis.fetch=async(u,init)=>{
  url=String(u);body=JSON.parse(init.body);
  assert.equal(init.headers.Authorization,'Bearer fake-key');
  return Response.json({choices:[{message:{content:JSON.stringify({summary:'画面里有两个人。',visibleText:'',uncertainty:'无法确认姓名'})}}]});
 };
 try{
  const result=await describeTaiImage({dataUrl:png,authorLabel:'合照'});
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  assert.equal(body.model,'deepseek-flash');
  assert.equal(body.messages.length,1);
  assert.equal(body.messages[0].role,'user');
  assert.equal(body.messages[0].content[1].type,'image_url');
  assert.equal(body.messages[0].content[1].image_url.url,png);
  assert.equal(body.messages[0].content[1].image_url.detail,'low');
  assert.match(result.summary,/两个人/);
  assert.ok(!JSON.stringify(body).includes('日程'));
 }finally{
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
  if(oldLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldLocal;
 }
});
