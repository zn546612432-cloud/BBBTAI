import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareXitaiSpeech} from '../src/services/voice/voice-regex.js';
import {XITAI_LONG_WORLDBOOK} from '../src/services/ai/character-worldbook.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {askTai,saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';

test('detailed Xitai worldbook contains independent personality, education and identity boundaries',()=>{
 assert.ok(XITAI_LONG_WORLDBOOK.length>4000);
 for(const t of ['哈佛','MIRAGE','自负','国际象棋','莎士比亚','相认前','D56','金融','语音'])
  assert.ok(XITAI_LONG_WORLDBOOK.includes(t),t);
 const prompt=buildTaiPrompt({day:56,channel:'noapp'});
 assert.ok(prompt.includes('完整人物世界书'));
 assert.ok(prompt.includes('自负'));
});
test('MiniMax speech preparation translates aliases and keeps voice instructions out of displayed text',()=>{
 const r=prepareXitaiSpeech('我今天……真的有点困。(sigh) 还有这个（皱眉）很长很长很长的句子。',{tone:'soft'});
 assert.match(r.text,/\(sighs\)/);
 assert.doesNotMatch(r.text,/皱眉|sigh\)/);
 assert.ok(r.speed<1);
 assert.equal(prepareXitaiSpeech('木啊',{tone:'soft'}).text,'(lip-smacking)');
});
test('emergency dialogue never injects laughter and long voice includes natural breathing',()=>{
 const serious=prepareXitaiSpeech('有人在跟踪我，定位已经暴露，别回头。',{tone:'danger'});
 assert.doesNotMatch(serious.text,/\(chuckle\)|\(laughs\)/);
 const long=prepareXitaiSpeech('你这次调用的接口设计有一个非常明显的问题，我看了日志之后发现，你的请求队列阻塞很可能和缺失的超时配置直接相关。',{tone:'neutral'});
 assert.match(long.text,/\(breath\)/);
 assert.ok((long.text.match(/\([a-z-]+\)/g)||[]).length<=4);
});
test('DeepSeek empty JSON content is retried as plain-text reply, not sent as blank chat',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 saveApiConfig({deepseek:'fake-test-deepseek',minimax:'',region:'cn'});
 let count=0;
 globalThis.fetch=async(_url,opts)=>{
  const payload=JSON.parse(opts.body);count++;
  const content=count===1?'   ':'{"messages":[{"text":"还算像样。","mode":"text","tone":"dry"}]}';
  if(count===2)assert.equal(payload.response_format.type,'text');
  return {ok:true,text:async()=>JSON.stringify({choices:[{message:{content}}]})};
 };
 try{
  const result=await askTai({channel:'noapp',day:56,messages:[{role:'user',content:'在吗'}]});
  assert.equal(count,2);assert.match(result.text,/像样/);
 }finally{
  clearApiConfig();
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
 }
});
