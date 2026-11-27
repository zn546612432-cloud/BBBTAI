import test from 'node:test';
import assert from 'node:assert/strict';
import {socialLore,socialDuplicate,groupSocialMessages} from '../src/services/ai/brother-social-worldbook.js';
import {momentsCommentMessages} from '../src/services/ai/moments-comments.js';
test('wang worldbook reflects brothers and father, retrieves relevant corpus',()=>{const lore=socialLore(['熙旺'],'干爹');assert.match(lore,/常忽略自己/);assert.match(lore,/他原話怎麼說的/);assert.doesNotMatch(lore,/還真有點困了/);});
test('group prompt and moments share the worldbook',()=>{assert.match(groupSocialMessages({field:'notice',value:'討厭你們'})[0].content,/0到3/);assert.match(momentsCommentMessages({by:'熙旺',day:17,clock:'08:00',post:{text:'干爹'}})[0].content,/常忽略自己/);assert.ok(socialDuplicate('咋了？',['怎麼了']));});
