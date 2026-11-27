import test from 'node:test';
import assert from 'node:assert/strict';
import {socialLore,socialDuplicate,groupSocialMessages} from '../src/services/ai/brother-social-worldbook.js';
import {momentsCommentMessages} from '../src/services/ai/moments-comments.js';
test('wang worldbook reflects brothers and father, retrieves relevant corpus',()=>{const lore=socialLore(['熙旺'],'干爹');assert.match(lore,/常忽略自己/);assert.match(lore,/他原話怎麼說的/);assert.doesNotMatch(lore,/還真有點困了/);});
test('group prompt and moments share the worldbook',()=>{assert.match(groupSocialMessages({field:'notice',value:'討厭你們'})[0].content,/0到3/);assert.match(momentsCommentMessages({by:'熙旺',day:17,clock:'08:00',post:{text:'干爹'}})[0].content,/常忽略自己/);assert.ok(socialDuplicate('咋了？',['怎麼了']));});

import {momentsBatchMessages,parseMomentBatch} from '../src/services/ai/moments-comments.js';
import {selectPublicPresetKnowledge} from '../src/services/ai/worldbook/preset-knowledge.js';
test('batch accepts silence and excludes unknown speakers',()=>{assert.deepEqual(parseMomentBatch({text:'{"replies":[]}'}),[]);assert.equal(parseMomentBatch({text:'{"replies":[{"by":"熙泰","text":"你好"},{"by":"小辛","text":"好啊"}]}'}).length,1);assert.match(momentsBatchMessages({day:3,clock:'12:00',post:{text:'你好'},candidates:['熙旺']})[0].content,/candidates/);});
test('shared memory retrieval requires relevant delivered evidence',()=>{const result=selectPublicPresetKnowledge([{id:'a',by:'熙旺',text:'大家一起買房'},{id:'b',by:'熙旺',text:'買房',authoredPending:true},{id:'c',by:'小辛',text:'吃冰'}],'買房');assert.deepEqual(result.map(r=>r.id),['a']);});

import {GROUP_DIALOGUE_EXAMPLES,brotherDialogueExamples} from '../src/services/ai/brother-dialogue-examples.js';
test('dialogue examples are source-linked historical group scenes and latest name stays primary',()=>{assert.ok(GROUP_DIALOGUE_EXAMPLES.length>=10);assert.ok(GROUP_DIALOGUE_EXAMPLES.every(e=>e.ids.length===e.lines.length&&e.ids.every(id=>id.startsWith('wx-group-'))));assert.match(brotherDialogueExamples('gay'),/熙蒙/);const messages=groupSocialMessages({field:'name',value:'你們是gay',history:[{by:'熙旺',text:'討厭乾爹'}]});assert.match(messages[0].content,/value 是本輪唯一主要回應對象/);assert.match(messages[0].content,/最多5條/);assert.equal(JSON.parse(messages[1].content).value,'你們是gay');});

import {socialIntent,socialDirection,socialQualityIssues} from '../src/services/ai/brother-social-intent.js';
test('social intent recognizes affectionate joking and rejects the observed lecture pattern',()=>{assert.equal(socialIntent('你們必須喜歡我'),'affection');assert.equal(socialIntent('你们是gay'),'banter');assert.equal(socialIntent('討厭乾爹'),'vent');assert.equal(socialIntent('救命 我受傷了'),'serious');assert.ok(socialQualityIssues([{text:'喜歡是相處出來的。不是規定出來的。'}],'你們必須喜歡我').length);assert.deepEqual(socialQualityIssues([{text:'我最喜歡蒙蒙哥！！！'}],'你們必須喜歡我'),[]);assert.match(groupSocialMessages({field:'notice',value:'你們必須喜歡我'})[0].content,/親兄弟之間撒嬌/);});
