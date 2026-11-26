import test from 'node:test';
import assert from 'node:assert/strict';
import {casualChatPunctuation} from '../src/services/ai/chat-punctuation.js';
import {momentsCommentMessages} from '../src/services/ai/moments-comments.js';
test('casual chat drops full stops, retains serious and technical punctuation',()=>{
 assert.equal(casualChatPunctuation('剛忙完。怎麼了？'),'剛忙完 怎麼了？');
 assert.equal(casualChatPunctuation('嗯。我在。'),'嗯 我在');
 assert.equal(casualChatPunctuation('Good show.'),'Good show');
 assert.equal(casualChatPunctuation('等等...'),'等等...');
 assert.equal(casualChatPunctuation('Dr.'),'Dr.');
 assert.equal(casualChatPunctuation('T.'),'T.');
 assert.equal(casualChatPunctuation('版本 1.2.3'),'版本 1.2.3');
 assert.equal(casualChatPunctuation('https://example.com'),'https://example.com');
 assert.equal(casualChatPunctuation('我認真的。',{tone:'serious'}),'我認真的。');
});
test('Moments prompt distinguishes Awei from the other characters',()=>{
 const input={day:1,clock:'12:00',post:{text:'午飯'}};
 assert.match(momentsCommentMessages({...input,by:'阿威'})[0].content,/保留阿威自然使用句號/);
 assert.match(momentsCommentMessages({...input,by:'小辛'})[0].content,/日常手機評論不加/);
});
