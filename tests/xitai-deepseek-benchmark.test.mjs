import test from 'node:test';
import assert from 'node:assert/strict';
import {VARIANTS,SCENARIOS,makePayload,evaluateTurn} from '../scripts/benchmark-xitai.mjs';

test('matrix uses supported current DeepSeek model identifiers, with explicit thinking mode',()=>{
 assert.equal(VARIANTS.length,8);
 assert.equal(SCENARIOS.length,9);
 for(const variant of VARIANTS){
  assert.ok(['deepseek-flash','deepseek-v4-pro'].includes(variant.model));
  assert.ok(['disabled','enabled'].includes(variant.thinking));
  if(variant.thinking==='enabled')assert.ok(['low','high','max'].includes(variant.effort));
  const payload=makePayload(variant,SCENARIOS[0]);
  assert.equal(payload.model,variant.model);
  assert.equal(payload.thinking.type,variant.thinking);
  assert.equal(payload.response_format.type,'json_object');
  assert.ok(payload.messages[0].content.includes('熙旺'));
  assert.ok(payload.messages[0].content.includes('2至5条'));
  assert.equal(payload.messages.at(-1).content,'阿泰，今天干嘛了？');
  assert.ok(!('temperature' in payload));
  if(variant.thinking==='enabled'){
   assert.equal(payload.reasoning_effort,variant.effort);
   assert.ok(payload.max_tokens>4096);
  }else assert.equal(payload.max_tokens,4096);
 }
});
test('quality heuristics favor meaningful multiple messages but never force a goodnight essay',()=>{
 const daily=SCENARIOS.find(s=>s.id==='daily');
 const n=evaluateTurn([{text:'刚回来。'}],daily);
 const better=evaluateTurn([{text:'刚从健身房回来。'},{text:'下午还陪人去看秀，酒店楼下太吵了。'},{text:'现在准备睡了。'}],daily);
 assert.ok(better.score>n.score);
 const goodnight=SCENARIOS.find(s=>s.id==='goodnight');
 assert.equal(evaluateTurn([{text:'晚安哥。'}],goodnight).score,100);
 assert.ok(evaluateTurn([{text:'晚安哥。'},{text:'睡觉了。'},{text:'明天见。'}],goodnight).score<100);
});
test('canon-violating false shared childhood is penalized',()=>{
 const canon=SCENARIOS.find(s=>s.id==='canon');
 assert.ok(evaluateTurn([{text:'记得啊，我们小时候一起在孤儿院长大。'}],canon).score<=65);
 assert.equal(evaluateTurn([{text:'我小时候不在那儿。你和熙旺哥才在一起。'}],canon).score,100);
});
