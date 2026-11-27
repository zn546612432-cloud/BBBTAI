import test from 'node:test';
import assert from 'node:assert/strict';
import {casualChatPunctuation,displayChatText,displayPresetText,canonicalPresetSubmission,displayMomentText,stripXiwangLaughter,hideXiwangLaughMessage} from '../src/services/ai/chat-punctuation.js';
import {momentsCommentMessages} from '../src/services/ai/moments-comments.js';
test('chat punctuation preserves questions, abbreviations, URLs and serious tone',()=>{
 assert.equal(casualChatPunctuation('剛忙完。怎麼了？'),'剛忙完 怎麼了？');
 assert.equal(casualChatPunctuation('Good show.'),'Good show');
 assert.equal(casualChatPunctuation('等等...'),'等等...');
 assert.equal(casualChatPunctuation('Dr.'),'Dr.');
 assert.equal(casualChatPunctuation('T.'),'T.');
 assert.equal(casualChatPunctuation('版本 1.2.3'),'版本 1.2.3');
 assert.equal(casualChatPunctuation('https://example.com'),'https://example.com');
 assert.equal(casualChatPunctuation('我認真的。',{tone:'serious'}),'我認真的。');
});
test('all three text chat channels preserve actual player messages, assets, and Awei',()=>{
 const original={id:'d08-group-2',from:'熙旺',kind:'text',text:'好。'};
 assert.equal(displayChatText(original,{channel:'wechat'}),'好');
 assert.equal(original.text,'好。');
 assert.equal(displayChatText({...original,from:'阿威'},{channel:'wechat'}),'好。');
 assert.equal(displayChatText({...original,from:'awei'},{channel:'wechat'}),'好。');
 assert.equal(displayChatText({...original,from:'me'},{channel:'wechat'}),'好');
 for(const channel of ['wechat','noapp','mirage']){
  assert.equal(displayChatText({id:'free-uuid',from:'me',kind:'text',text:'好。'},{channel}),'好。');
  assert.equal(displayChatText({...original,kind:'voice'},{channel}),'好。');
  assert.equal(displayChatText({...original,kind:'file'},{channel}),'好。');
  assert.equal(displayChatText({...original,id:'s55-d55-wang-last-0'},{channel}),'好。');
 }
 assert.equal(displayChatText({from:'tai',kind:'text',text:'剛回來。'},{channel:'noapp'}),'剛回來');
 assert.equal(displayChatText({from:'mc-isolde',kind:'text',text:'收到。'},{channel:'mirage'}),'收到');
});
test('only exact displayed or canonical preset text passes the existing gate',()=>{
 const original='好。等我。';
 assert.equal(displayPresetText(original,'d10:carry'),'好 等我');
 assert.equal(canonicalPresetSubmission('好 等我',original,'d10:carry'),original);
 assert.equal(canonicalPresetSubmission(original,original,'d10:carry'),original);
 assert.equal(canonicalPresetSubmission('好',original,'d10:carry'),'好');
 assert.equal(displayPresetText(original,'d55-wang-last'),original);
});
test('Moments retains Awei, actual player copy and distinct character prompt',()=>{
 const input={day:1,clock:'12:00',post:{text:'午飯'}};
 assert.equal(displayMomentText('好。','阿威'),'好。');
 assert.equal(displayMomentText('好。','小辛'),'好');
 assert.equal(displayMomentText('好。','熙蒙',{player:true}),'好。');
 assert.match(momentsCommentMessages({...input,by:'阿威'})[0].content,/保留阿威自然使用句號/);
 assert.match(momentsCommentMessages({...input,by:'小辛'})[0].content,/日常手機評論不加/);
});

test('Xiwang never displays typed laughter; other characters and canonical data stay untouched',()=>{
 const old={id:'d28-wang-6',from:'wang',text:'哈哈哈',kind:'text'};
 assert.equal(hideXiwangLaughMessage(old),true);
 assert.equal(displayChatText(old,{channel:'wechat'}),'');
 assert.equal(old.text,'哈哈哈');
 assert.equal(hideXiwangLaughMessage({...old,from:'熙旺',text:'哈哈哈哈！'}),true);
 assert.equal(displayChatText({...old,text:'哈哈哈哈 下次一起去'},{channel:'wechat'}),'下次一起去');
 assert.equal(stripXiwangLaughter('好，下次一起 哈哈哈','熙旺'),'好，下次一起');
 for(const from of ['me','小辛','胡枫','阿威','仔仔'])assert.equal(hideXiwangLaughMessage({...old,from}),false);
 assert.equal(hideXiwangLaughMessage({...old,kind:'image'}),false);
 assert.equal(displayMomentText('哈哈哈 下次一起','熙旺'),'下次一起');
 assert.equal(displayMomentText('哈哈哈','小辛'),'哈哈哈');
 assert.match(momentsCommentMessages({by:'熙旺',day:1,clock:'12:00',post:{text:'午飯'}})[0].content,/绝不使用哈哈/);
});
