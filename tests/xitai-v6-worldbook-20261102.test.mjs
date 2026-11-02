import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {XITAI_EXPRESSION_WORLDBOOK_V6} from '../src/services/ai/behavior-worldbook-v6.js';
import {unpackTaiReply} from '../src/services/ai/format.js';

test('new worldbook includes human dialogue and respects the old character and timeline',()=>{
 const prompt=buildTaiPrompt({day:31,channel:'mirage',recognized:false,messages:[{role:'user',content:'hi'}]});
 assert.match(prompt,/v6 行为与表达补充/);
 assert.match(prompt,/不授权模型执行未知的新动作/);
 assert.match(prompt,/衔尾蛇时期/);
 assert.match(prompt,/长短自然/);
 assert.match(prompt,/不提前剧透/);
 assert.match(prompt,/匿名/);
 assert.ok(XITAI_EXPRESSION_WORLDBOOK_V6.includes('calm'));
});
test('v6 dialogue addendum does not enable unreleased voice or read-status protocol in the model',()=>{
 const prompt=buildTaiPrompt({day:56,channel:'noapp',recognized:true,outputMode:'text'});
 assert.match(prompt,/目前仅识别已经实现的 NoApp/);
 assert.match(prompt,/NoApp 真实来电指令/);
 assert.doesNotMatch(prompt,/必须输出 \(voice\)/);
 assert.doesNotMatch(prompt,/必须输出 \(read\)/);
 const reply=unpackTaiReply({text:JSON.stringify({messages:[{text:'我还在忙，等一下。',mode:'text'}]})});
 assert.equal(reply[0].action,undefined);
});
test('v6 retains real phone command without exposing markup in chat',()=>{
 const result=unpackTaiReply({text:JSON.stringify({messages:[{text:'(phone)喂，怎么又催我？',mode:'text'}]})});
 assert.equal(result[0].action,'phone');
 assert.equal(result[0].text,'喂，怎么又催我？');
});
