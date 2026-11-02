import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TAI_TURN_WEIGHTS,TAI_GUIDE_CHANCE,TAI_SEMICOLON_BURST_CHANCE,taiTurnProbabilities,taiGuideEligible,
 sampleTaiTurnPlan,taiTurnShapePrompt,taiTurnNeedsMore,mergeTaiTurnEntries,dedupeTaiTurnEntries,stripRepeatedTaiClauses,taiGuidanceNeedsRepair,taiIntegrateGuidingQuestion
} from '../src/services/ai/conversation-shape-v12.js';
import {buildTaiPrompt,defaultTaiDraft,ensureTaiDraft} from '../src/services/ai/tai-profile.js';
import {combineTaiVoiceThoughts} from '../src/services/ai/voice-request-v11.js';

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
test('seeded 25k turns preserve original relative weights, 30% guide and new 40% semicolon style',()=>{
 let seed=524288;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const histogram={1:0,2:0,3:0,4:0,5:0};
 const original={1:0,2:0,3:0,'4-5':0};let guided=0,semicolon=0;
 for(let i=0;i<25000;i++){
  const s=sampleTaiTurnPlan({random:rand,messages:player});
  histogram[s.target]++;original[s.requested]++;if(s.guide)guided++;if(s.semicolonBurst)semicolon++;
 }
 const p=c=>histogram[c]/25000;
 assert.ok(Math.abs(original[3]/25000-45/135)<.017);
 assert.ok(Math.abs(original[2]/25000-30/135)<.017);
 assert.ok(Math.abs(original[1]/25000-30/135)<.017);
 assert.ok(Math.abs(original['4-5']/25000-30/135)<.017);
 // 40% of originally single-line turns become two bubbles when the style hits.
 assert.ok(Math.abs(p(2)-(30/135)*(1+.40))<.017);
 assert.ok(Math.abs(p(1)-(30/135)*.60)<.017);
 assert.ok(Math.abs(p(3)-45/135)<.017);
 assert.ok(Math.abs(p(4)+p(5)-30/135)<.017);
 assert.ok(Math.abs(guided/25000-.30)<.017);
 assert.ok(Math.abs(semicolon/25000-.40)<.017);
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

test('30% guide is implemented with a concrete follow-up when the actor answered but forgot the question',()=>{
 const plan={target:2,mode:'text',guide:true};
 const response=[{text:'噢，你那个工具终于跑起来了？'}];
 assert.equal(taiGuidanceNeedsRepair({plan,entries:response,messages:player}),false);
 const blunt=[{text:'听上去还可以'}];
 assert.equal(taiGuidanceNeedsRepair({plan,entries:blunt,messages:player}),true);
 const guided=taiIntegrateGuidingQuestion(blunt,{text:'你是自己重写了那部分，还是改了我的原版？',mode:'text'},2);
 assert.deepEqual(guided.map(x=>x.text),['听上去还可以','你是自己重写了那部分，还是改了我的原版？']);
 const merged=taiIntegrateGuidingQuestion(guided,{text:'那还想改什么？',mode:'text'},2);
 assert.equal(merged.length,2);
 assert.match(merged[1].text,/自己重写了/);
 assert.match(merged[1].text,/那还想改什么/);
 const boundary=[{text:'这件事我不想聊，先挂了'}];
 assert.equal(taiGuidanceNeedsRepair({plan,entries:boundary,messages:player}),false);
 const generic=taiIntegrateGuidingQuestion(blunt,{text:'你在干什么？'},2);
 assert.deepEqual(generic,blunt);
});

test('a sampled four-phrase voice turn becomes one MP3 request rather than four unrelated clips',()=>{
 const src=[
  {text:'你又熬夜了',mode:'voice',tone:'dry'},
  {text:'昨天是怎么答应我的？',mode:'voice',tone:'serious'},
  {text:'行了，先别忙着解释',mode:'voice',tone:'playful'},
  {text:'把你写的东西给我看一眼。',mode:'voice',tone:'neutral'}
 ];
 const audio=combineTaiVoiceThoughts(src);
 assert.equal(audio.length,1);
 assert.equal(audio[0].mode,'voice');
 assert.match(audio[0].speechText,/你又熬夜了。/);
 assert.match(audio[0].speechText,/昨天是怎么答应我的？/);
 assert.match(audio[0].speechText,/把你写的东西给我看一眼。/);
 assert.equal(combineTaiVoiceThoughts([{text:'只有一句',mode:'voice'}]).length,1);
 assert.equal(combineTaiVoiceThoughts([{text:'电话',action:'phone'},{text:'再听',mode:'voice'}]).length,2);
});

test('v12 intro does not turn story chess into an unsolicited curiosity routine',()=>{
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,messages:player,turnPlan:{target:3,guide:true,mode:'text'}});
 assert.match(prompt,/国际象棋是固定剧情玩法/);
 assert.match(prompt,/剧情结束后不要把棋局当成日常续聊话题/);
 const draft=defaultTaiDraft();
 assert.doesNotMatch(draft.profile.interaction,/棋局与烦恼/);
 const old='独立生活只影响内部状态，不主动向熙蒙讲自己今天在做什么；更关心哥哥提过的技术、朋友、家人、棋局与烦恼。熙蒙主动追问尤其反复询问时会适当松口，认真多讲几句，不能把话题一次次推回熙蒙；发起联系须有具体前因，不反复问“你在干什么”。真实来电、转账与任务只由程序执行。';
 const s={aiDraft:defaultTaiDraft()};s.aiDraft.profile.interaction=old;
 assert.equal(ensureTaiDraft(s),true);
 assert.match(s.aiDraft.profile.interaction,/国际象棋只由固定剧情触发/);
});


test('40% semicolon burst is independently sampled only for eligible text turns',()=>{
 assert.equal(TAI_SEMICOLON_BURST_CHANCE,.4);
 const yes=sampleTaiTurnPlan({random:randomSeq(.60,.9,.399),messages:player,mode:'text'});
 assert.equal(yes.requested,1);
 assert.equal(yes.target,2);
 assert.equal(yes.semicolonBurst,true);
 assert.equal(yes.guide,false);
 const no=sampleTaiTurnPlan({random:randomSeq(.60,.9,.401),messages:player,mode:'text'});
 assert.equal(no.requested,1);
 assert.equal(no.target,1);
 assert.equal(no.semicolonBurst,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.9,.01),messages:player,mode:'call'}).semicolonBurst,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.9,.01),messages:player,maxMessages:1,mode:'text'}).semicolonBurst,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.9,.01),messages:[{role:'user',content:'晚安'}]}).semicolonBurst,false);
 assert.equal(sampleTaiTurnPlan({random:randomSeq(.1,.9,.01),messages:[{role:'user',content:'只说一句就好'}]}).semicolonBurst,false);
 const prompt=taiTurnShapePrompt(yes);
 assert.match(prompt,/40%分号连发模式已触发/);
 assert.match(prompt,/全角分号「；」连接/);
 assert.match(prompt,/messages数组中只有一个元素/);
});
test('repeated opening facts from screenshot are removed but the new curiosity survives',()=>{
 const first={text:'哈佛，计算机博士，早不上教室了',tone:'dry',mode:'text'};
 const second={text:'哈佛，计算机博士。不过早就不上教室了。你对我上不上学很在意？',tone:'playful',mode:'text'};
 assert.equal(stripRepeatedTaiClauses(second.text,[first]),'你对我上不上学很在意？');
 assert.deepEqual(dedupeTaiTurnEntries([first,second]).map(x=>x.text),
 ['哈佛，计算机博士，早不上教室了','你对我上不上学很在意？']);
 assert.deepEqual(mergeTaiTurnEntries([first],[second],3).map(x=>x.text),
 ['哈佛，计算机博士，早不上教室了','你对我上不上学很在意？']);
 assert.equal(stripRepeatedTaiClauses('哈佛，计算机博士，早就不上教室了',[first]),'');
 const distinct=dedupeTaiTurnEntries([
  {text:'你问的是我的童年？'},{text:'我在里斯本长大。'},{text:'那你呢，哥？'}
 ]);
 assert.equal(distinct.length,3);
});
