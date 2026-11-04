import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TAI_V8_VERSION,TAI_V8_ENDPOINT,loadApprovedTaiV8,formatApprovedTaiV8,resetTaiV8Cache
} from '../src/services/ai/supabase-persona.js';
import {authorXitaiDialogueExamples} from '../src/services/ai/author-dialogue-examples.js';
const data={
 ok:true,character_key:'chen_xitai',version:TAI_V8_VERSION,
 content:{
  personality:{central_conflict:'不愿示弱',traits:['自负','戒备'],principle:'不要机械毒舌'},
  speech:{primary_attention:'更好奇熙蒙',avoid:['不要主动展示健身']},
  behavior:{authority:'55天主线锁定',offline:'关闭网页停止主动行为'},
  memory:{retrieve_policy:['记住不等于主动提起']},
  examples:[{scene:'想念',player:'我想你了。',tai:['哦？有多想？','我也想你。','我以为这是你想听的。'],purpose:'调戏后收回'}]
 }
};

test('V8 approved persona loads from the fixed Supabase endpoint and caches',async()=>{
 resetTaiV8Cache();
 let calls=0;
 const fetcher=async(url,opts)=>{calls++;assert.equal(url,TAI_V8_ENDPOINT);assert.equal(opts.method,'GET');return {ok:true,json:async()=>data};};
 const first=await loadApprovedTaiV8({fetcher,now:()=>100});
 const second=await loadApprovedTaiV8({fetcher,now:()=>200});
 assert.equal(calls,1);
 assert.equal(first.version,TAI_V8_VERSION);
 assert.equal(first,second);
});

test('rejects stale or mismatching persona versions and fails safely',async()=>{
 resetTaiV8Cache();
 const mismatch=await loadApprovedTaiV8({fetcher:async()=>({ok:true,json:async()=>({...data,version:'old'})}),now:()=>100});
 assert.equal(mismatch,null);
 const failure=await loadApprovedTaiV8({fetcher:async()=>{throw Error('network blocked');},now:()=>200});
 assert.equal(failure,null);
 assert.equal(formatApprovedTaiV8(null), '');
});

test('unrecognized stage never receives relationship dialogue examples',()=>{
 const early=formatApprovedTaiV8(data,{recognized:false});
 assert.match(early,/身份保密/);
 assert.doesNotMatch(early,/我也想你。/);
 const later=formatApprovedTaiV8(data,{recognized:true});
 assert.match(later,/我也想你。/);
 assert.match(later,/记住不等于主动提起/);
 assert.match(later,/55天主线锁定/);
});

test('author-corrected example contains no gym / five-fly boasts',()=>{
 const example=authorXitaiDialogueExamples({channel:'noapp',recognized:true});
 assert.match(example,/哦？有多想？/);
 assert.match(example,/我也想你。/);
 assert.match(example,/我以为这是你想听的。/);
 assert.doesNotMatch(example,/练完五十组飞鸟/);
 assert.doesNotMatch(example,/我还在健身房/);
 assert.equal(authorXitaiDialogueExamples({channel:'noapp',recognized:false}), '');
});
