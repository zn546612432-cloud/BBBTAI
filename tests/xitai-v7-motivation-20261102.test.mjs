import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt,defaultTaiDraft} from '../src/services/ai/tai-profile.js';
import {XITAI_MOTIVATION_WORLDBOOK_V7} from '../src/services/ai/character-motivations-v7.js';

test('v7 brother ranking, curiosity and technical admiration reach the live prompt',()=>{
 const prompt=buildTaiPrompt({day:15,channel:'mirage',recognized:false,profile:defaultTaiDraft().profile});
 for(const item of ['v7 动机与关系补充','熙泰是三胞胎里的弟弟','源代码独立创造新工具','惺惺相惜','里斯本有庄园','不会主动讲自己今天在哪里']){
  assert.ok(prompt.includes(item),item);
 }
 assert.match(prompt,/公开范围：尚未相认/);
 assert.match(prompt,/亲缘身份/);
 assert.match(prompt,/不得主动公开陈熙泰真名/);
});

test('v7 NoApp context keeps his own private life and sibling truth without automatically exporting future events',()=>{
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,profile:defaultTaiDraft().profile});
 assert.match(prompt,/三胞胎里的弟弟/);
 assert.match(prompt,/哥哥究竟是什么样的人|哥哥是什么样的人/);
 assert.match(prompt,/没有额外已证实事件记忆/);
 assert.match(prompt,/公开范围：已经通过剧情相认/);
 for(const phrase of ['熙蒙死亡','必然死亡','已经在现实见面','我已经转账给你','必须输出 (voice)']){
  assert.ok(!prompt.includes(phrase),phrase);
 }
});

test('v7 author examples never enter prompt or become pre-written chat quotes',()=>{
 const prompt=buildTaiPrompt({day:38,channel:'noapp',recognized:true});
 for(const sample of ['你上次给的源码我改过了，跑起来比原来快','只发最小复现。快点','就比我早出来那么一会儿','你非得听我亲口说，是吧']){
  assert.ok(!prompt.includes(sample),'sample quote leaked: '+sample);
 }
 assert.ok(XITAI_MOTIVATION_WORLDBOOK_V7.includes('不应主动每天表白'));
});

test('v7 does not replace old independent custom profiles or persona version',()=>{
 const draft=defaultTaiDraft();
 draft.profile.temperament='作者自定义：偶尔会赌气';
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,profile:draft.profile});
 assert.match(prompt,/作者自定义：偶尔会赌气/);
 assert.equal(draft.personaVersion,5);
 assert.match(prompt,/v5/);
 assert.match(prompt,/v6/);
 assert.match(prompt,/v7/);
});
