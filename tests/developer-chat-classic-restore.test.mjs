import test from 'node:test';
import assert from 'node:assert/strict';
import {conversations,messageCard} from '../src/apps/developer/features/conversations/index.js';
import {activeConversation,rowsFor} from '../src/apps/developer/features/conversations/navigation.js';
import {render} from '../src/apps/developer/index.js';

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
 assert.match(html,/全部消息 · 原版完整编辑/);
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
test('dated mode never changes selected conversation or loses original scheduling controls',()=>{
 const s=sample();s.editor.chatView='dated';s.editor.chatScope='story';s.editor.chatDay=16;
 let html=conversations(s);
 assert.match(html,/未到時間的預設/);
 assert.doesNotMatch(html,/舊歷史台詞/);
 assert.match(html,/data-schedule-field="mode"/);
 assert.match(html,/data-schedule-field="clock"/);
 s.editor.chatScope='history';s.editor.chatDate='2024-03-10';
 html=conversations(s);
 assert.match(html,/舊歷史台詞/);
 assert.doesNotMatch(html,/未到時間的預設/);
 assert.equal(rowsFor(s,'wechat',s.content.conversations.wechat[0]).length,1);
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
