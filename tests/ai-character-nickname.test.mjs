import test from 'node:test';
import assert from 'node:assert/strict';
import {traditionalTaiText} from '../src/services/ai/traditional.js';
import {groupSocialMessages} from '../src/services/ai/brother-social-worldbook.js';
test('canonical Mengmeng nickname survives Traditional Chinese conversion',()=>{
 assert.equal(traditionalTaiText('最喜欢蒙蒙哥了！'),'最喜歡蒙蒙哥了！');
 assert.equal(traditionalTaiText('濛濛哥，给你打电话'),'蒙蒙哥，給你打電話');
 assert.equal(traditionalTaiText('熙蒙，蒙蒙'),'熙蒙，蒙蒙');
 assert.equal(traditionalTaiText('头发剪短了'),'頭髮剪短了');
 assert.match(groupSocialMessages({field:'notice',value:'愛我'})[0].content,/暱稱固定寫作「蒙蒙」「蒙蒙哥」/);
});
