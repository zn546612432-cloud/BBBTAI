import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import replacements from '../src/story/assets/d01-d09-copy-replacements.json' with {type:'json'};
import {reviseDeliveredStoryCopy} from '../src/services/messaging/lifecycle/copy-revision.js';
import {D09_GROUP} from '../src/story/d09/dialogue.js';
import {celebration} from '../src/story/d06/wish-content.js';

test('old NPC copy migrates in place without touching player speech, history, unread or money',()=>{
 const line=replacements.find(x=>x.id==='d08-keyboard-0');
 const stamp={day:8,time:'09:12',sentDate:'2025-05-26',actual:true,storyD08:true};
 const m={...stamp,id:line.id,from:line.from,text:line.before,kind:'text'};
 const history={...m,sentDate:'2024-03-10'};
 const player={...m,from:'me'};
 const custom={...m,text:'使用者自己編輯過的內容'};
 const s={day:9,clock:'20:14',story55:{version:1},bankData:{balance:123,transactions:[{id:'kept'}]},
  content:{conversations:{wechat:[{id:'group',unread:5,messages:[m,history,player,custom]}]}},
  notifications:[{messageId:line.id,conversationId:'group',body:line.before}]};
 assert.equal(reviseDeliveredStoryCopy(s),true);
 assert.equal(m.text,line.text);
 assert.equal(history.text,line.before);
 assert.equal(player.text,line.before);
 assert.equal(custom.text,'使用者自己編輯過的內容');
 assert.deepEqual({...m,text:line.before}, {...stamp,id:line.id,from:line.from,text:line.before,kind:'text'});
 assert.equal(s.content.conversations.wechat[0].unread,5);
 assert.equal(s.notifications[0].body,line.text);
 assert.equal(s.bankData.balance,123);
 assert.deepEqual(s.bankData.transactions,[{id:'kept'}]);
 assert.equal(reviseDeliveredStoryCopy(s),false);
});

test('delivered D09 emoji becomes one bundled pre-2025 ZOGGY image with the same ID',()=>{
 const s={story55:{version:1},content:{conversations:{wechat:[{id:'group',messages:[{id:'d09-laundry-0',from:'仔仔',kind:'text',text:'🐶'}]}]}}};
 reviseDeliveredStoryCopy(s);
 const messages=s.content.conversations.wechat[0].messages;
 assert.equal(messages.length,1);
 const line=D09_GROUP.find(x=>x.id==='laundry').lines[0];
 assert.equal(messages[0].kind,'image');
 assert.equal(messages[0].text,line.text);
 const bytes=readFileSync(new URL('../public'+line.text,import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),240);
 assert.equal(bytes.readUInt32BE(20),240);
});

test('pending dinner copy retains its clickable wish, and saved Ouroboros copy drops biscuit trope',()=>{
 const invitation=replacements.find(x=>x.scene==='invitation');
 const dinner=replacements.find(x=>x.id==='d06-celebrate-10');
 const s={story55:{version:1,config:{scenes:{invitation:[]}},wishes:{story:{lines:[{id:dinner.id,from:dinner.from,text:dinner.before,wishId:'d06-dinner',wishText:'一起出去吃饭'}]}}},content:{conversations:{wechat:[]}}};
 s.story55.config.scenes.invitation[invitation.index]=['ouroboros',invitation.before];
 reviseDeliveredStoryCopy(s);
 const queued=s.story55.wishes.story.lines[0];
 assert.equal(queued.text,dinner.text);
 assert.ok(queued.text.includes(queued.wishText));
 assert.equal(s.story55.config.scenes.invitation[invitation.index][1],invitation.text);
 const fresh=celebration.find(x=>x.id===dinner.id);
 assert.ok(fresh.text.includes(fresh.wishText),'fresh saves must render the same wish link');
});
