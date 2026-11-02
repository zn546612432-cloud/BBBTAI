import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt, defaultTaiDraft, ensureTaiDraft} from '../src/services/ai/tai-profile.js';
import {taiTopicGate} from '../src/services/ai/humanize.js';
import {taiBehaviorPrompt} from '../src/services/ai/behavior.js';

test('v8 final instruction prohibits unsolicited updates and prioritizes Ximeng',()=>{
 const draft=defaultTaiDraft();
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,profile:draft.profile,outputMode:'text',scene:'熙蒙问源码设计的问题'});
 assert.match(prompt,/【v8最高优先级｜谈话焦点：熙蒙/);
 assert.match(prompt,/不主动告诉熙蒙自己今天做了什么/);
 assert.match(prompt,/更好奇熙蒙本人/);
 assert.match(prompt,/不要从“不要报备自己”走向/);
 assert.ok(prompt.lastIndexOf('【v8最高优先级')>prompt.lastIndexOf('当前真实交互事件'));
 assert.ok(prompt.lastIndexOf('【v8最高优先级')>prompt.indexOf('作者偏好'));
});

test('v8 high priority survives an old user-authored preference for autobiography',()=>{
 const p=buildTaiPrompt({day:37,channel:'noapp',recognized:true,profile:{interaction:'我喜欢主动说自己的行程'}});
 assert.ok(p.includes('我喜欢主动说自己的行程'));
 assert.ok(p.lastIndexOf('【v8最高优先级')>p.indexOf('我喜欢主动说自己的行程'));
});

test('topic gate focuses on mentioned activities instead of inventing self updates',()=>{
 const p=taiTopicGate([{role:'user',content:'我把昨天的代码改好了'}]);
 assert.match(p,/熙蒙.*更好奇/);
 assert.match(p,/熙蒙最近提过代码和技术/);
 assert.match(p,/熙蒙明确问起熙泰的近况才酌情回答/);
 assert.doesNotMatch(p,/改聊自己的近况/);
});

test('active and expansive settings do not authorize unsolicited lifestyle talk',()=>{
 for(const setting of [{initiative:'active',verbosity:'expansive'},{initiative:'natural',verbosity:'balanced'}]){
  const p=taiBehaviorPrompt(setting);
  assert.match(p,/不主动/);
  assert.match(p,/熙蒙/);
 }
});

test('old default self-report field is migrated but custom edits remain',()=>{
 const s={aiDraft:defaultTaiDraft()};
 s.aiDraft.profile.interaction='健身、学习、旅行、看秀、酒店、美食、小酌、电影与自己的判断都可以主动完整分享。承接当前生活记录与时区，不每轮谈代码，不照抄情境范例。若当下确实决定马上打电话，应给出明确的口头承诺，由程序进行来电；不能假称已成功拨号或替游戏执行转账与任务。';
 assert.equal(ensureTaiDraft(s),true);
 assert.match(s.aiDraft.profile.interaction,/不主动/);
 const s2={aiDraft:defaultTaiDraft()};
 s2.aiDraft.profile.interaction='作者专属的额外互动习惯';
 assert.equal(ensureTaiDraft(s2),false);
 assert.equal(s2.aiDraft.profile.interaction,'作者专属的额外互动习惯');
});
