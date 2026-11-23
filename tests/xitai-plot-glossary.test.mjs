import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {selectTaiMemoryPreset} from '../src/apps/noapp/memory-replies.js';
import {projectTaiPlotGlossary,taiDirectTearDefinition,TAI_CANONICAL_PLOT_TERMS} from '../src/services/ai/worldbook/plot-glossary.js';
import {captureTaiWorldbook,assembleTaiMessages,splitWorldbook} from '../src/services/ai/worldbook/index.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

function fixture({recognized=true,day=45}={}){
 const s=initialState();
 activateStory55(s);s.day=day;s.clock='20:00';
 if(recognized)s.story55.completed.recognition={day:33,clock:'12:00'};
 return s;
}
function renderGlossary(s,message,props={}){
 return projectTaiPlotGlossary(s,{channel:'noapp',recognized:true,
  messages:[{role:'user',content:message}],...props});
}
const contents=entries=>entries.map(e=>e.content).join('\n');

test('the glossary contains canonical entities, including the different meanings of TAI, Xi Tai and Dr Ouroboros',()=>{
 const terms=new Set(TAI_CANONICAL_PLOT_TERMS);
 for(const name of ['tear-program','ouroboros-identity','narrenschiff','ghost-deployment','mirage','ghost-car','room404','d43-paris','family'])
  assert.equal(terms.has(name),true,name);
 const s=fixture();
 for(const ask of ['衔尾蛇之泪是什么？','銜尾蛇之淚是什麼？','What is Ouroboros’ Tear?','TAI 是什么？']){
  const lore=renderGlossary(s,ask);
  assert(lore.some(e=>e.id==='story-lore:tear-program'),ask);
  assert.match(contents(lore),/不是人、幫派、組織/);
  assert.match(contents(lore),/熙泰本人不是TAI/);
 }
});

test('the exact named-program factual question is answered with source-grounded fixed text without DeepSeek',()=>{
 const s=fixture();
 for(const q of ['衔尾蛇之泪是什么？','你知道衔尾蛇之泪是什么吗？','銜尾蛇之淚是啥','衔尾蛇之泪是做什么的']){
  const answer=selectTaiMemoryPreset(s,q);
  assert.equal(answer?.id,'canon-tear-definition-v1',q);
  assert.match(answer.text,/底層框架是我給你的/);
  assert.match(answer.text,/TAI/);
  assert(!answer.text.includes('未聽過')&&!answer.text.includes('不知道'));
 }
 assert.equal(taiDirectTearDefinition(s,'衔尾蛇之泪帮我做一件事'),null);
 assert.equal(taiDirectTearDefinition(s,'DeepSeek为什么不知道衔尾蛇之泪'),null);
});

test('the authoritative D25 group actually defines the program as a self-running AI and sourced framework',async()=>{
 const def=await import('../src/story/d25/definition.js');
 const c={nodes:[],scenes:{}};
 def.applyD25Definition(c);
 const lines=c.scenes['d25-survey'].map(l=>l[1]).join('\n');
 assert.match(lines,/銜尾蛇之淚/);
 assert.match(lines,/專門針對網絡安全訓練的 AI/);
 assert.match(lines,/收集資料、分析軟件、寫程序/);
 assert.match(lines,/框架代碼/);
});

test('time/identity/source gates prevent premature narrative knowledge',()=>{
 const s=fixture();
 assert.equal(contents(renderGlossary(s,'鬼車陷阱')), '');
 assert.equal(contents(renderGlossary(s,'巴黎的約定')), '');
 assert.equal(contents(renderGlossary(s,'room.404')), '');
 assert.equal(contents(renderGlossary(s,'杰克的手办')), '');
 // Trusted real completion of the author's D29 plan, not merely reaching the day.
 s.story55.completed.plan={day:29,clock:'22:00'};
 assert.match(contents(renderGlossary(s,'鬼车陷阱是什么')),/由Dr Ouroboros提出/);
 s.story55.completed.plan={day:29,clock:'22:00',legacySkipped:true};
 assert.equal(renderGlossary(s,'鬼车陷阱是什么').length,0);
 s.story55.completed['d25-survey']={day:25,clock:'15:00'};
 assert.match(contents(renderGlossary(s,'安保設備清單')),/security_survey_0612/);
});

test('authored D43 Paris promise is a factual source, not a guarantee of fulfilled travel',()=>{
 const s=fixture(),chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'s55-d43-paris-15',day:43,from:'tai',kind:'text',
  text:'所以別讓我失望，熙蒙。我們巴黎見。',actual:true});
 const fact=contents(renderGlossary(s,'你还记得巴黎铁塔和金字塔吗'));
 assert.match(fact,/熙蒙說更想看金字塔/);
 assert.match(fact,/不代表兩人已在巴黎見面/);
 chat.messages.at(-1).actual=false;
 assert.equal(renderGlossary(s,'你还记得巴黎铁塔和金字塔吗').length,0);
});

test('new terms cannot silently leak into anonymous MIRAGE or before recognition',()=>{
 const s=fixture({recognized:false});
 assert.equal(renderGlossary(s,'衔尾蛇之泪是什么？',{recognized:false}).length,0);
 assert.equal(renderGlossary(s,'衔尾蛇之泪是什么？',{channel:'mirage',recognized:false}).length,0);
 assert.equal(selectTaiMemoryPreset(s,'衔尾蛇之泪是什么？'),null);
 const late=fixture({recognized:true});
 late.story55.ended=true;
 assert.equal(renderGlossary(late,'TAI').length,0);
});

test('the actual shared worldbook snapshot injects named lore for BOTH decision and expression',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 const context={channel:'noapp',recognized:true,day:s.day,outputMode:'text',
  messages:[{role:'user',content:'你知道衔尾蛇之泪是什么吗？'}],turnId:'q:tear:1'};
 const snapshot=captureTaiWorldbook(store,context);
 assert(snapshot.entries.some(e=>e.id==='story-lore:tear-program'));
 assert.equal(splitWorldbook(snapshot,'expression').before.some(e=>e.id==='story-lore:tear-program'),true);
 assert.equal(splitWorldbook(snapshot,'decision').before.some(e=>e.id==='story-lore:tear-program'),true);
 const system=buildTaiPrompt({...context,worldbookSnapshot:snapshot});
 const outbound=assembleTaiMessages(system,context.messages,snapshot).at(0).content;
 assert.match(outbound,/衔尾蛇|銜尾蛇/);
 assert.match(outbound,/TAI/);
 assert.equal(s.aiDraft.worldbook.runtime.noapp.snapshot.entries.some(e=>e.id==='story-lore:tear-program'),true);
 // No duplicate scene clock, no separate memory counter: entry is in the existing snapshot.
 assert.equal(captureTaiWorldbook(store,context),snapshot);
 const follow=captureTaiWorldbook(store,{...context,turnId:'q:other:2',
  messages:[{role:'user',content:'今天晚饭吃什么？'}]});
 assert.equal(follow.entries.some(e=>e.id==='story-lore:tear-program'),false);
});
