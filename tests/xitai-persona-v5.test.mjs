import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt,defaultTaiDraft,ensureTaiDraft,taiKnowledgeContext} from '../src/services/ai/tai-profile.js';
import {ORIGINAL_WORLDBOOKS} from '../src/services/ai/original-worldbooks.js';
import {taiReviewPanel} from '../src/apps/developer/features/ai-profile/index.js';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {askTai,saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';

test('removed casual series cannot be loaded and all generation channels use v5',()=>{
 assert.equal('casual' in ORIGINAL_WORLDBOOKS,false);
 assert.deepEqual(Object.keys(ORIGINAL_WORLDBOOKS).sort(),['individuality','initiative','relationship']);
 for(const [channel,day] of [['mirage',15],['chess',29],['noapp',60]])for(const outputMode of ['text','voice','call']){
  const p=buildTaiPrompt({channel,day,outputMode,behavior:{verbosity:'brief'}});
  for(const rule of ['专属系统底层设定 v5','禁止任何场景','完整语法结构','禁止网络用语','不设最低数量','当前阶段与公开范围'])assert.ok(p.includes(rule),channel+'/'+outputMode+' '+rule);
  assert.doesNotMatch(p,/一条起步，两条封顶|一条消息 12 字以内|核心原则：话不说全|文字可极短|自然的短回复就停|聊天自然、简短、碎片化|D56 前不可揭露身份|D05 已发生的公开挑战/);
 }
});

test('early stages know kinship privately without receiving author finale or example dialogue',()=>{
 for(const day of [1,5,6,13,15,29,35,42,55]){
  const p=buildTaiPrompt({channel:'mirage',day});
  assert.match(p,/私下早已知道/);assert.match(p,/尚未相认/);
  assert.doesNotMatch(p,/三十人围杀|熙旺死亡|亲口把剩下的那个词|生锈的钥匙|我放你进来四十分钟|D53失败|D55终局/);
 }
 assert.match(taiKnowledgeContext({day:5,channel:'mirage'}),/尚未到比赛联系阶段/);
 assert.match(taiKnowledgeContext({day:6,channel:'mirage',recognized:true}),/尚未相认/);
 assert.match(taiKnowledgeContext({day:15,channel:'mirage'}),/借款与设备情况只能由当前已发生事件确认/);
 const p=buildTaiPrompt({channel:'mirage',day:35,recognized:false});
 assert.match(p,/尚未相认/);
 const recognized=buildTaiPrompt({channel:'noapp',day:35,recognized:true});
 assert.match(recognized,/已经通过剧情相认/);assert.match(recognized,/明确知道熙旺也是兄长/);
 assert.doesNotMatch(recognized,/公开范围：尚未相认/);
});

test('pre-v5 save migrates persona once without deleting memories, conversations or settings',()=>{
 const memories=[{day:12,visibility:'shared',source:'MIRAGE',text:'已经分享过的事情'}];
 const s={day:60,aiDraft:{profile:{speech:'聊天自然、简短、碎片化。',temperament:'旧版自定义'},memories,testTurns:[{content:'旧试聊'}],behavior:{maxMessages:4}},bankData:{balance:1234}};
 assert.equal(ensureTaiDraft(s),true);
 assert.equal(s.aiDraft.personaVersion,5);
 assert.match(s.aiDraft.profile.speech,/完整语法结构/);
 assert.equal(s.aiDraft.previousPersona.profile.temperament,'旧版自定义');
 assert.strictEqual(s.aiDraft.memories,memories);assert.equal(s.aiDraft.behavior.maxMessages,4);assert.equal(s.bankData.balance,1234);
 s.aiDraft.profile.temperament='v5作者的新编辑';
 assert.equal(ensureTaiDraft(s),false);assert.equal(s.aiDraft.profile.temperament,'v5作者的新编辑');
 const state=initialState();state.aiDraft=s.aiDraft;
 assert.match(taiReviewPanel(state),/旧人设归档（已停用）/);
});

test('PhoneStore reload uses v5 instead of the stale persona in persisted browser data',()=>{
 const state=initialState();delete state.aiDraft.personaVersion;state.aiDraft.profile.speech='聊天自然、简短、碎片化。';
 const data=new Map();const storage={getItem:()=>JSON.stringify(state),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const store=new PhoneStore(storage);
 assert.equal(store.get().aiDraft.personaVersion,5);
 assert.match(store.get().aiDraft.profile.speech,/完整语法结构/);
 assert.equal(defaultTaiDraft().personaVersion,5);
});

test('session-direct request sends the same v5 identity gate and plain-voice policy as preview',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const session=new Map();globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 saveApiConfig({deepseek:'fake-v5-test',region:'cn'});let seen;
 globalThis.fetch=async(url,init)=>{seen=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{message:{content:'{"messages":[{"text":"我会先把这件事情查清楚，再决定是否接受你的解释。","mode":"text","tone":"dry"}]}'}}]}),{headers:{'content-type':'application/json'}});};
 try{
  await askTai({day:35,channel:'mirage',recognized:false,outputMode:'call',messages:[{role:'user',content:'告诉我你是谁'}]});
  const p=seen.messages[0].content;
  assert.match(p,/专属系统底层设定 v5/);assert.match(p,/尚未相认/);assert.match(p,/只写可朗读纯台词，不输出表演标签/);
  assert.doesNotMatch(p,/需要时才少量使用 MiniMax 官方支持的 Sound Tags/);
 }finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});
