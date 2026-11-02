import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TAI_TURN_WEIGHTS,TAI_GUIDE_CHANCE,taiTurnProbabilities,taiGuideEligible,
 sampleTaiTurnPlan,taiTurnShapePrompt,taiTurnNeedsMore,mergeTaiTurnEntries
} from '../src/services/ai/conversation-shape-v12.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

const player=[{role:'user',content:'我把新的工具做了一半。'}];
const randomSeq=(...values)=>()=>values.shift()??0.8;
test('author weights sum to 135 and are normalized rather than called literal percentages',()=>{
 assert.equal(TAI_TURN_WEIGHTS.reduce((s,x)=>s+x.weight,0),135);
 assert.equal(TAI_GUIDE_CHANCE,.30);
 const distribution=taiTurnProbabilities();
 assert.ok(Math.abs(distribution.reduce((s,x)=>s+x.probability,0)-1)<1e-9);
 assert.ok(Math.abs(distribution[0].probability-1/3)<1e-8);
 assert.equal(distribution[3].count,'4-5');
});
test('exact weighted thresholds produce 3,2,1,4 and 5 bubbles',()=>{
 assert.equal(sampleTaiTurnPlan({random:randomSeq(0,0.9),messages:player}).target,3);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(45/135,0.9),messages:player}).target,2);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(75/135,0.9),messages:player}).target,1);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(105/135,.3,.9),messages:player}).target,4);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.99,.8,.9),messages:player}).target,5);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.99,.8,.9),maxMessages:3,messages:player}).target,3);
});
test('guide roll is independent of chosen count and respects 30% threshold',()=>{
 const guided=sampleTaiTurnPlan({random:randomSeq(.1,.299),messages:player});
 assert.equal(guided.target,3);assert.equal(guided.guide,true);
 const unguided=sampleTaiTurnPlan({random:randomSeq(.1,.301),messages:player});
 assert.equal(unguided.target,3);assert.equal(unguided.guide,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.001),messages:[{role:'user',content:'晚安'}]}).guide,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.001),messages:[{role:'user',content:'hi'}]}).guide,false);
 assert.equal(taiGuideEligible([{role:'user',content:'不要问我'}]),false);
});
test('seeded distribution over 25k turns is consistent with normalized weights and 30% guidance',()=>{
 let seed=524288;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const histogram={1:0,2:0,3:0,4:0,5:0};let guided=0;
 for(let i=0;i<25000;i++){
  const s=sampleTaiTurnPlan({random:rand,messages:player});
  histogram[s.target]++;if(s.guide)guided++;
 }
 const probability=(c)=>histogram[c]/25000;
 assert.ok(Math.abs(probability(3)-45/135)<.017);
 assert.ok(Math.abs(probability(2)-30/135)<.017);
 assert.ok(Math.abs(probability(1)-30/135)<.017);
 assert.ok(Math.abs((probability(4)+probability(5))-30/135)<.017);
 assert.ok(Math.abs(guided/25000-.3)<.017);
});
test('guidance is a grounded question, not a formulaic daily check-in',()=>{
 const plan={target:3,mode:'text',guide:true};
 const prompt=taiTurnShapePrompt(plan);
 assert.match(prompt,/本轮要表达3条独立聊天气泡/);
 assert.match(prompt,/30%引导型人格已经触发/);
 assert.match(prompt,/先接住熙蒙/);
 assert.match(prompt,/不主动汇报行程/);
 const runtime=buildTaiPrompt({day:37,channel:'noapp',recognized:true,messages:player,turnPlan:plan});
 assert.ok(runtime.endsWith(prompt));
 const plain=taiTurnShapePrompt({...plan,guide:false});
 assert.match(plain,/未触发主动引导/);
});
test('actual turn can request meaningful continuation without crossing boundary',()=>{
 const p={target:3};
 assert.equal(taiTurnNeedsMore({plan:p,entries:[{text:'嗯？'}],messages:player}),true);
 assert.equal(taiTurnNeedsMore({plan:p,entries:[{text:'我先忙了，晚点说。'}],messages:player}),false);
 assert.equal(taiTurnNeedsMore({plan:p,entries:[{text:'不错'}],messages:[{role:'user',content:'别问了'}]}),false);
 assert.equal(taiTurnNeedsMore({plan:p,entries:[{text:'打吧',action:'phone'}],messages:player}),false);
 assert.equal(taiTurnNeedsMore({plan:p,entries:[{text:'都讲完了'}],messages:player,action:'end_session'}),false);
 const result=mergeTaiTurnEntries([{text:'看了'}],[{text:'看了'},{text:'你改的是哪部分？'},{text:'算你厉害'}],3);
 assert.deepEqual(result.map(x=>x.text),['看了','你改的是哪部分？','算你厉害']);
});
