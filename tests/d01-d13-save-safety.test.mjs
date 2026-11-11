import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickPhoneStoryMessages} from '../src/services/messaging/phone-story-scheduler.js';
import {syncD10D13Content} from '../src/story/d10-d13/continuity.js';
import {D10_GROUP} from '../src/story/d10/dialogue.js';

const setup=()=>activateStory55(initialState());
const group=s=>s.content.conversations.wechat.find(c=>c.id==='group');

test('retiring an old Hu Feng NPC subplot archives NPC messages and preserves genuine player and pre-D01 messages',()=>{
 const s=setup();s.day=7;s.clock='14:00';s.story55.legacyHuFengPlotRetired=false;
 const chat=s.content.conversations.wechat.find(c=>c.id==='hufeng');
 assert.ok(chat,'Hu Feng contact must exist');
 const oldNpc={id:'d03-hufeng-example-0',from:'胡枫',text:'old scripted repair',sentDate:'2025-05-21',day:3,actual:true,storyD03:true};
 const player={id:'d03-hufeng-example-1',from:'me',text:'我自己親自發出的消息',sentDate:'2025-05-21',day:3,actual:true};
 const historical={id:'d03-hufeng-example-2',from:'胡枫',text:'2024年的歷史',sentDate:'2024-03-10',actual:true};
 const free={id:'free-hufeng-custom',from:'me',text:'真實私聊',sentDate:'2025-05-23',actual:true};
 chat.messages.push(oldNpc,player,historical,free);chat.unread=3;
 s.notifications.push({id:'old-npc',conversationId:'hufeng',messageId:oldNpc.id,body:oldNpc.text});
 s.notifications.push({id:'player',conversationId:'hufeng',messageId:player.id,body:player.text});
 s.events.push({type:'authored_message_delivered',conversationId:'hufeng',messageId:oldNpc.id});
 tickPhoneStoryMessages(s,1000);
 assert.equal(chat.messages.some(m=>m.id===oldNpc.id),false);
 assert.ok(chat.messages.includes(player));
 assert.ok(chat.messages.includes(historical));
 assert.ok(chat.messages.includes(free));
 assert.equal(chat.unread,2);
 assert.equal(s.notifications.some(n=>n.id==='old-npc'),false);
 assert.equal(s.notifications.some(n=>n.id==='player'),true);
 const archived=s.story55.contentArchives.find(a=>a.id===oldNpc.id&&a.revision==='retired-hufeng-npc-plot');
 assert.deepEqual(archived.original,oldNpc);
});

test('D10 pickup is Friday, not Thursday, and delivered NPC text migrates without touching player or customized text',()=>{
 const s=setup();s.day=12;s.clock='09:00';s.story55.d10D13Revision=1;
 const scene=D10_GROUP.find(x=>x.id==='carry');
 assert.equal(scene.lines[2].who,'胡枫');
 assert.equal(scene.lines[2].text,'嘿嘿，找個時間我回來一趟，給你們買了很多禮物。');
 const chat=group(s);
 const player={id:'d10-carry-2',from:'me',text:'收到了，明晚我去機場接你',day:10,sentDate:'2025-05-28'};
 const npc={id:'d10-carry-2',from:'熙旺',text:'收到了，明晚我去機場接你',day:10,sentDate:'2025-05-28'};
 const custom={id:'d10-carry-2',from:'熙旺',text:'手動修改過的話',day:10,sentDate:'2025-05-28'};
 const history={id:'d10-carry-2',from:'熙旺',text:'收到了，明晚我去機場接你',sentDate:'2024-03-10'};
 chat.messages.unshift(player,npc,custom,history);chat.unread=2;
 s.notifications.push({id:'d10-date-test',conversationId:'group',messageId:'d10-carry-2',body:npc.text});
 const changed=syncD10D13Content(s);
 assert.equal(changed,true);
 assert.equal(npc.text,'收到了，後天晚上我去機場接你');
 assert.equal(player.text,'收到了，明晚我去機場接你');
 assert.equal(custom.text,'手動修改過的話');
 assert.equal(history.text,'收到了，明晚我去機場接你');
 assert.equal(chat.unread,2);
 assert.equal(s.notifications.find(n=>n.id==='d10-date-test').body,npc.text);
 assert.equal(syncD10D13Content(s),false,'migration is idempotent');
});
