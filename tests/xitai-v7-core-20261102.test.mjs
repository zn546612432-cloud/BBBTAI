import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedTaiMemory,selectTaiMemories} from '../src/services/ai/v7/memory-selector.js';
import {decodeTaiDecision,authorizeTaiDecision} from '../src/services/ai/v7/decision-contract.js';

const memories=[
 {id:'movie',first_game_day:33,channel_scope:'noapp',reliability:'reported',importance:70,summary:'熙蒙喜欢电影《圣诞惊魂夜》里的杰克',tags:['电影','杰克']},
 {id:'secret',first_game_day:36,channel_scope:'noapp',reliability:'observed',importance:90,summary:'熙蒙只在NoApp提到的私人秘密'},
 {id:'job',first_game_day:10,channel_scope:'mirage',reliability:'reported',importance:60,summary:'匿名黑客悬赏任务进度'},
 {id:'future',first_game_day:50,channel_scope:'shared',reliability:'canonical',importance:100,summary:'未来剧情不能提前看'},
 {id:'demo',first_game_day:2,channel_scope:'shared',demo:true,summary:'测试文案不是记忆'},
];

test('No future story, demo memory, or unearned NoApp access',()=>{
 const list=selectTaiMemories(memories,{day:34,channel:'noapp',recognized:true,query:'电影杰克'});
 assert.equal(list[0].id,'movie');
 assert(!list.some(x=>['future','demo','secret'].includes(x.id)));
 assert(!allowedTaiMemory(memories[0],{day:34,channel:'noapp',recognized:false}));
});
test('Mirage anonymity excludes NoApp private memories even after recognition',()=>{
 const list=selectTaiMemories(memories,{day:45,channel:'mirage',recognized:false,query:'私人秘密'});
 assert(!list.some(x=>x.id==='secret'||x.id==='movie'));
 assert(list.some(x=>x.id==='job'));
 assert(!allowedTaiMemory(memories[1],{day:45,channel:'mirage',recognized:true}));
});
test('Chess cannot read NoApp confidential facts',()=>{
 assert(!allowedTaiMemory(memories[1],{day:40,channel:'chess',recognized:true}));
 assert(allowedTaiMemory(memories[2],{day:40,channel:'noapp',recognized:true}));
});
test('Relevant memories outrank generic background events and dedupe',()=>{
 const other={id:'routine',first_game_day:33,channel_scope:'noapp',summary:'熙泰今天在酒店忙工作',importance:60};
 const result=selectTaiMemories([...memories,other,{...memories[0],id:'dup'}],{
  day:40,channel:'noapp',recognized:true,query:'你还记得我喜欢什么电影',limit:4
 });
 assert.equal(result[0].id,'movie');
 assert.equal(result.filter(x=>x.summary===memories[0].summary).length,1);
});
const proposed=(action,overrides={})=>({
 schema_version:1,source_message_id:'msg-001',action,strategy:'tease',
 intensity:'low',intent:'根据当下生活和关系作出真实选择',delay_seconds:0,...overrides
});
test('Strict JSON schema rejects stale, invented actions, and arbitrary fields',()=>{
 assert.equal(decodeTaiDecision(proposed('start_call',{source_message_id:'old'}),{sourceMessageId:'msg-001'}).reason,'stale_source');
 assert.equal(decodeTaiDecision(proposed('steal_money'),{sourceMessageId:'msg-001'}).reason,'invalid_action');
 assert.equal(decodeTaiDecision({...proposed('send_text'),phantom_event:true},{sourceMessageId:'msg-001'}).reason,'unexpected_fields');
});
test('Call is an explicit executable action, not an AI text promise',()=>{
 const p=decodeTaiDecision(proposed('start_call'),{sourceMessageId:'msg-001'});
 assert.equal(authorizeTaiDecision(p,{channel:'noapp',recognized:true,callAvailable:true,phoneBusy:true}).reason,'call_not_allowed');
 assert.equal(authorizeTaiDecision(p,{channel:'noapp',recognized:true,callAvailable:true,userForbidsCall:true}).reason,'call_not_allowed');
 assert.equal(authorizeTaiDecision(p,{channel:'noapp',recognized:true,callAvailable:true}).ok,true);
});
test('Voice requires real TTS and read-no-reply needs a genuine receipt',()=>{
 const v=decodeTaiDecision(proposed('send_voice'),{sourceMessageId:'msg-001'});
 assert.equal(authorizeTaiDecision(v,{channel:'noapp',recognized:true}).reason,'voice_not_available');
 assert.equal(authorizeTaiDecision(v,{channel:'noapp',recognized:true,voiceAvailable:true}).ok,true);
 const r=decodeTaiDecision(proposed('read_no_reply'),{sourceMessageId:'msg-001'});
 assert.equal(authorizeTaiDecision(r,{channel:'noapp',recognized:true}).reason,'read_not_confirmed');
 assert.equal(authorizeTaiDecision(r,{channel:'noapp',recognized:true,readConfirmed:true}).ok,true);
});
test('Deferred replies require a real due time',()=>{
 assert.equal(decodeTaiDecision(proposed('defer_reply',{delay_seconds:0}),{sourceMessageId:'msg-001'}).reason,'defer_requires_time');
 assert.equal(decodeTaiDecision(proposed('defer_reply',{delay_seconds:120}),{sourceMessageId:'msg-001'}).ok,true);
});
