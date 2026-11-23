import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptedCallIsComplete} from '../src/apps/noapp/scripted-call-progress.js';

test('D55 resumed opening with empty steps immediately hands off to free chat', () => {
 const resumed = {id:'d55-noapp-opening',steps:[],handoffToFree:true};
 assert.equal(scriptedCallIsComplete(resumed,0),true);
 assert.equal(scriptedCallIsComplete(resumed,12),true);
});

test('explicit empty steps never fall back to older lines', () => {
 assert.equal(scriptedCallIsComplete({steps:[],lines:['old']},0),true);
});

test('unfinished scripted calls still require authored turns', () => {
 assert.equal(scriptedCallIsComplete({steps:[['me','Hi'],['tai','Hello']]},1),false);
 assert.equal(scriptedCallIsComplete({steps:[['me','Hi'],['tai','Hello']]},2),true);
});

test('legacy lines-only scripts still complete at their actual length', () => {
 assert.equal(scriptedCallIsComplete({lines:['one','two']},1),false);
 assert.equal(scriptedCallIsComplete({lines:['one','two']},2),true);
});
