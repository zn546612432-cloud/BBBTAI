import test from 'node:test';
import assert from 'node:assert/strict';
import {D02_AODONG_SMS} from '../src/story/d02/runtime.js';
import {D03_SCENES} from '../src/story/d03/dialogue.js';
import {D04_GROUP,D04_PRIVATE} from '../src/story/d04/dialogue.js';
import {D05_GROUP,D05_PRIVATE} from '../src/story/d05/dialogue.js';
import {D08_GROUP} from '../src/story/d08/dialogue.js';
import {D09_GROUP} from '../src/story/d09/dialogue.js';
import {authoredMoments} from '../src/apps/wechat/features/moments/data.js';
import {WISH_CATALOG} from '../src/services/wishes/catalog.js';
import {privateScenes,rewardSets} from '../src/story/d06/wish-content.js';
import {syncWishReminders} from '../src/services/wishes/index.js';
import {DEFAULT_DIARY_ENTRIES} from '../src/story/diary/entries.js';
import {LATE_REPLIES} from '../src/services/messaging/lifecycle/replies.js';

const bubbles=scenes=>scenes.reduce((n,x)=>n+x.lines.length,0);

test('D08 and D09 keep exactly 20 NPC group bubbles and original scene IDs',()=>{
 assert.equal(D08_GROUP.length,5);
 assert.equal(D09_GROUP.length,5);
 assert.equal(bubbles(D08_GROUP),20);
 assert.equal(bubbles(D09_GROUP),20);
 assert.deepEqual(D08_GROUP.map(x=>x.id),['keyboard','delivery','heat','games','soup']);
 assert.deepEqual(D09_GROUP.map(x=>x.id),['training-call','cola','training','laundry','shopping']);
 assert.equal(D08_GROUP.at(-1).lines[0].who,'阿威');
 assert.equal(D08_GROUP.at(-1).lines[0].text,'最近好無聊，我有點想老頭子了。');
});

test('D03-D05 keep conversation quantity except explicitly retired Hu Feng DMs',()=>{
 assert.equal(D03_SCENES.filter(x=>x.chat==='hufeng').length,0);
 assert.equal(D04_PRIVATE.filter(x=>x.chat==='hufeng').length,0);
 assert.equal(D05_PRIVATE.filter(x=>x.chat==='hufeng').length,0);
 assert.equal(bubbles(D05_GROUP),154);
 assert.equal(D05_PRIVATE.length,3);
 assert.equal(D04_GROUP.find(x=>x.id==='earbuds').at,'15:50');
 assert.equal(D04_GROUP.find(x=>x.id==='earbuds').lines.length,18);
 assert.equal(D04_GROUP.find(x=>x.id==='video').lines.length,20);
 assert.equal(D04_GROUP.find(x=>x.id==='caught').lines.length,17);
 assert.ok(D04_GROUP.find(x=>x.id==='caught').lines.some(x=>x.text==='阿蒙在工作？'));
 assert.ok(D05_GROUP.find(x=>x.id==='computer').lines[0].text.includes('教授'));
 assert.equal(Object.hasOwn(LATE_REPLIES.d03,'hufeng'),false);
 assert.equal(Object.hasOwn(LATE_REPLIES.d04,'hufeng-am'),false);
 assert.equal(Object.hasOwn(LATE_REPLIES.d04,'hufeng-pm'),false);
 assert.equal(Object.hasOwn(LATE_REPLIES.d05,'hufeng-check'),false);
});

test('Hu Feng has no authored Moments or shoes wishes, while others keep theirs',()=>{
 assert.equal(authoredMoments.filter(x=>x.author==='胡枫'||x.author==='胡楓').length,0);
 assert.equal(Object.hasOwn(WISH_CATALOG,'d06-shoes'),false);
 assert.equal(Object.hasOwn(rewardSets,'d06-shoes'),false);
 assert.deepEqual(privateScenes,[]);
 assert.ok(authoredMoments.some(x=>x.id==='xs-d04'&&x.media.includes('xmCaught')));
 assert.ok(authoredMoments.some(x=>x.id==='xw-d03'));
 assert.ok(WISH_CATALOG['d06-dinner']);
 assert.ok(WISH_CATALOG['d06-keyboard']);
});

test('Legacy pending shoes are dropped from shared wish queue, not financial history',()=>{
 const s={day:6,clock:'17:00',story55:{version:1,ended:false,wishes:{
  records:{'d06-shoes':{id:'d06-shoes',status:'saved'}},
  story:{lines:[{id:'d06-shoes-01',wishRewardId:'d06-shoes'},{id:'keep-this',wishRewardId:'d06-dinner'}],delivered:[],nextAt:0}
 }},content:{reminders:[{id:'wish-d06-shoes',wishId:'d06-shoes'}]},bankData:{balance:123,transactions:[{id:'older-transaction'}]}};
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders.length,0);
 assert.deepEqual(s.story55.wishes.story.lines.map(x=>x.id),['keep-this']);
 assert.equal(s.bankData.balance,123);
 assert.equal(s.bankData.transactions.length,1);
});

test('Previously paid retired shoe wish disappears from reminders but preserves purchase ledger',()=>{
 const s={day:8,clock:'16:00',story55:{version:1,ended:false,wishes:{
  records:{'d06-shoes':{id:'d06-shoes',status:'delivered',purchasedDay:6}},
  story:{lines:[{id:'wish-shoes-photo',wishRewardId:'d06-shoes'}],delivered:[],nextAt:0}
 }},content:{reminders:[{id:'wish-d06-shoes',wishId:'d06-shoes',done:true}]},
 bankData:{balance:999,transactions:[{id:'wish-purchase-d06-shoes',amount:-180}]}};
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders.length,0);
 assert.equal(s.story55.wishes.story.lines.length,0);
 assert.equal(s.bankData.transactions[0].id,'wish-purchase-d06-shoes');
 assert.equal(s.bankData.balance,999);
});

test('D01 untitled ordinary day and D02 hardware-only SMS preserve their systems',()=>{
 assert.equal(DEFAULT_DIARY_ENTRIES[1].title,'');
 assert.ok(DEFAULT_DIARY_ENTRIES[1].body.includes('平靜的一天'));
 assert.equal(DEFAULT_DIARY_ENTRIES[1].body.includes('傅隆生回澳門'),false);
 assert.ok(D02_AODONG_SMS.includes('電腦配件專場八折'));
 assert.ok(!D02_AODONG_SMS.includes('電子產品全場八折'));
});
