import test from 'node:test';
import assert from 'node:assert/strict';
import {dayDate,dayOfDate,historyDates,selection,rowsFor,activeConversation,addDatedMessage,isEditableMessage} from '../src/apps/developer/features/conversations/navigation.js';
import {makeChatBundle,parseChatBundle,previewChatImport,applyChatImport,CHAT_BUNDLE_FORMAT} from '../src/apps/developer/features/conversations/transfer.js';

const old={id:'wx-old',from:'wang',text:'2024 年的歷史',time:'08:30',sentDate:'2024-03-10',authored:true,storyImported:true};
const future={id:'wx-future',from:'wang',text:'D16 劇情',time:'12:40',sentDate:'2025-06-03',day:16,authored:true,schedule:{mode:'game-time',day:16,clock:'12:40'}};
const player={id:'player-1',from:'me',text:'我真的發過的話',time:'12:45',sentDate:'2025-06-03',actual:true};
const dynamic={id:'s55-runtime',from:'wang',text:'固定運行消息',time:'12:50',sentDate:'2025-06-03',story55:true,systemOwned:true};
function state(){return {day:16,clock:'13:00',editor:{chatScope:'history',chatDate:'2024-03-10',conversation:'wang',channel:'wechat'},content:{conversations:{wechat:[{id:'wang',name:'熙旺',messages:structuredClone([old,future,player,dynamic])}],noapp:[],mirage:[],messages:[]}}};}
test('historical and D01–D55 dates keep the canonical calendar anchor',()=>{
 assert.equal(dayDate(1),'2025-05-19');
 assert.equal(dayDate(55),'2025-07-12');
 assert.equal(dayOfDate('2025-06-03'),16);
 assert.equal(dayOfDate('2024-03-10'),null);
 const s=state();
 assert.deepEqual(historyDates(s),['2024-03-10']);
 assert.deepEqual(rowsFor(s,'wechat',s.content.conversations.wechat[0]).map(x=>x.m.id),['wx-old']);
 s.editor.chatScope='story';s.editor.chatDay=16;
 assert.equal(selection(s).date,'2025-06-03');
 assert.deepEqual(rowsFor(s,'wechat',s.content.conversations.wechat[0]).map(x=>x.m.id),['wx-future','player-1','s55-runtime']);
 assert.equal(activeConversation(s).c.id,'wang');
});
test('editor creates dated messages but does not mutate the runtime clock',()=>{
 const s=state();s.editor.chatScope='story';s.editor.chatDay=18;
 const message=addDatedMessage(s,s.content.conversations.wechat[0],'text',(_state,_c,kind)=>({id:'author-new',from:'wang',text:'測試',time:'18:20',kind,authored:true}));
 assert.equal(message.sentDate,'2025-06-05');
 assert.deepEqual(message.schedule,{mode:'game-time',day:18,clock:'18:20'});
 assert.equal(s.day,16);
 assert.equal(isEditableMessage(player),false);
 assert.equal(isEditableMessage(dynamic),false);
 assert.equal(isEditableMessage(future),true);
});
test('versioned JSON export/import roundtrip excludes real player and runtime messages',()=>{
 const s=state(),bundle=makeChatBundle(s,{scope:'all'});
 assert.equal(bundle.format,CHAT_BUNDLE_FORMAT);
 assert.deepEqual(bundle.conversations[0].messages.map(m=>m.id),['wx-old','wx-future']);
 assert.deepEqual(parseChatBundle(JSON.stringify(bundle)).conversations[0].messages[0],old);
 const other=state();other.content.conversations.wechat[0].messages=[structuredClone(player),structuredClone(dynamic)];
 assert.deepEqual(previewChatImport(other,bundle).report,{conversationsNew:0,messagesNew:2,conflicts:0,protected:0,unchanged:0,details:[]});
 applyChatImport(other,bundle,{mode:'merge'});
 assert.equal(other.content.conversations.wechat[0].messages.find(m=>m.id==='wx-old').text,old.text);
 assert.equal(other.content.conversations.wechat[0].messages.find(m=>m.id==='player-1').text,player.text);
 assert.equal(other.content.conversations.wechat[0].messages.find(m=>m.id==='s55-runtime').text,dynamic.text);
});
test('merge keeps existing authored messages; replace only changes matching authored IDs',()=>{
 const s=state(),bundle=makeChatBundle(s,{scope:'all'});
 bundle.conversations[0].messages[0].text='新的歷史校稿';
 bundle.conversations[0].messages.push({id:'player-1',from:'wang',text:'不能覆蓋玩家',time:'10:00',authored:true});
 assert.equal(previewChatImport(s,bundle).report.protected,1);
 applyChatImport(s,bundle,{mode:'merge'});
 assert.equal(s.content.conversations.wechat[0].messages[0].text,old.text);
 applyChatImport(s,bundle,{mode:'replace-conflicts'});
 assert.equal(s.content.conversations.wechat[0].messages[0].text,'新的歷史校稿');
 assert.equal(s.content.conversations.wechat[0].messages.find(m=>m.id==='player-1').text,player.text);
});
test('invalid import and duplicate IDs fail without modifying existing content',()=>{
 const s=state(),before=JSON.stringify(s.content.conversations),bundle=makeChatBundle(s,{scope:'all'});
 bundle.conversations[0].messages.push(structuredClone(bundle.conversations[0].messages[0]));
 assert.throws(()=>applyChatImport(s,bundle,{mode:'replace-conflicts'}),/重複/);
 assert.equal(JSON.stringify(s.content.conversations),before);
 bundle.conversations[0].messages.pop();
 bundle.conversations[0].messages[0].actual=true;
 assert.throws(()=>parseChatBundle(bundle),/玩家實發/);
 assert.equal(JSON.stringify(s.content.conversations),before);
});
