import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt,defaultTaiDraft,visibleTaiMemories} from '../src/services/ai/tai-profile.js';

test('review draft exposes character rules without fabricating personal events',()=>{
 const d=defaultTaiDraft();
 assert.match(d.profile.relationship,/渴望亲情与爱/);
 assert.match(d.profile.knowledge,/草稿/);
 assert.deepEqual(d.memories,[]);
 assert.match(buildTaiPrompt({day:20,channel:'mirage',profile:d.profile,memories:d.memories}),/不要编造共同经历/);
});

test('memory selection excludes future and other-channel facts',()=>{
 const records=[
  {day:20,visibility:'shared',source:'已发生聊天',text:'约好下棋'},
  {day:30,visibility:'shared',source:'未来',text:'尚未发生'},
  {day:19,visibility:'noapp',source:'其他频道',text:'私密内容'}
 ];
 assert.deepEqual(visibleTaiMemories(records,20,'mirage').map(m=>m.text),['约好下棋']);
 const prompt=buildTaiPrompt({day:20,channel:'mirage',memories:records});
 assert.match(prompt,/约好下棋/);assert.doesNotMatch(prompt,/尚未发生|私密内容/);
});
