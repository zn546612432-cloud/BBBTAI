import test from 'node:test';
import assert from 'node:assert/strict';
import {conversations,messageCard} from '../src/apps/developer/features/conversations/index.js';
import {activeConversation,rowsFor} from '../src/apps/developer/features/conversations/navigation.js';
import {render,change,handle} from '../src/apps/developer/index.js';

function sample(){
 return {
  day:1,clock:'08:38',calendar:{anchorDay:1,anchorDate:'2025-05-19'},story55:{version:1},
  editor:{channel:'wechat',conversation:'wang',chatScope:'story',chatDay:1,presetDay:1},
  storyPresets:{rules:[],usedIds:[],usedGroups:[],firedProactiveDays:[],flags:[],deletedRuleIds:[]},
  content:{conversations:{
   wechat:[{id:'wang',name:'熙旺',messages:[
    {id:'h-1',from:'wang',text:'舊歷史台詞',time:'08:30',sentDate:'2024-03-10',authored:true,storyImported:true},
    {id:'d-16',from:'wang',text:'未到時間的預設',time:'12:40',sentDate:'2025-06-03',authored:true,schedule:{mode:'game-time',day:16,clock:'12:40'}}
   ]}],noapp:[],mirage:[],messages:[]}}
 };
}
test('classic editor is default: sees all author messages across dates and retains complete old controls',()=>{
 const s=sample();
 const html=conversations(s);
 assert.match(html,/＋ 新建对话窗口/);
 assert.doesNotMatch(html,/chat-mode-toolbar/);
 assert.match(html,/舊歷史台詞/);
 assert.match(html,/未到時間的預設/);
 assert.match(html,/data-message-field="from"/);
 assert.match(html,/data-message-field="text"/);
 assert.match(html,/data-sent-date=/);
 assert.match(html,/data-schedule-field="mode"/);
 assert.match(html,/data-schedule-field="clock"/);
 assert.match(html,/data-schedule-field="day"/);
 assert.match(html,/data-order-message=/);
 assert.match(html,/data-action="duplicate-message"/);
 assert.match(html,/data-action="test-message"/);
 assert.equal(activeConversation(s).c.id,'wang');
});
test('old editor ignores obsolete dated-view preferences and never filters source bubbles',()=>{
 const s=sample();s.editor.chatView='dated';s.editor.chatScope='story';s.editor.chatDay=16;
 const html=conversations(s);
 assert.match(html,/舊歷史台詞/);
 assert.match(html,/未到時間的預設/);
 assert.match(html,/data-schedule-field="mode"/);
 assert.match(html,/data-schedule-field="clock"/);
 assert.doesNotMatch(html,/data-view="dated"/);
});
test('55-day run exposes original keyword, timing and proactive preset authoring controls',()=>{
 const s=sample();s.editor.presetId='rule-check';
 s.storyPresets.rules.push({id:'rule-check',title:'主動招呼',kind:'proactive',mode:'scheduled',day:1,dayScope:'exact',
 channel:'wechat',conversationId:'wang',from:'08:00',to:'10:00',priority:50,enabled:true,once:true,
 condition:'any',keywords:[],minMessages:0,requiresFlag:'',setsFlag:'',group:'',messages:['早安']});
 const html=render({store:{get:()=>s}},{route:'/presets'});
 assert.match(html,/data-tab="presets"/);
 assert.match(html,/剧情预设中心/);
 assert.match(html,/主动发送条件/);
 assert.match(html,/开始时间/);
 assert.match(html,/结束时间/);
 assert.match(html,/一次性/);
 assert.match(html,/NPC 回复气泡/);
});

test('restored classic handlers edit real source message timing, trigger and prose',()=>{
 const s=sample();s.notifications=[];
 const store={get:()=>s,update(fn){fn(s);return s;}};
 const ctx={store,toast:()=>{}};
 const message=s.content.conversations.wechat[0].messages[1];
 change({id:'',dataset:{messageField:'text',id:'d-16'},value:'修訂後的台詞'},ctx);
 assert.equal(message.text,'修訂後的台詞');
 change({id:'',dataset:{scheduleField:'mode',id:'d-16'},value:'chat-delay'},ctx);
 assert.equal(message.schedule.mode,'chat-delay');
 change({id:'',dataset:{scheduleField:'seconds',id:'d-16'},value:'4.5'},ctx);
 assert.equal(message.schedule.seconds,4.5);
 change({id:'',dataset:{scheduleField:'mode',id:'d-16'},value:'game-time'},ctx);
 change({id:'',dataset:{scheduleField:'day',id:'d-16'},value:'18'},ctx);
 change({id:'',dataset:{scheduleField:'clock',id:'d-16'},value:'09:25'},ctx);
 assert.deepEqual(message.schedule,{mode:'game-time',day:18,clock:'09:25'});
 handle('add-message',{dataset:{}},ctx);
 const last=s.content.conversations.wechat[0].messages.at(-1);
 assert.equal(last.authored,true);
 assert.equal(last.schedule.mode,'immediate'); // No silent forced D01 schedule.
});
