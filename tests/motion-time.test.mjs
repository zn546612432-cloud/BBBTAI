import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarAnchor} from '../src/services/calendar.js';
import {timestampLabel,timestampGroups,setMessageDate,messageDate,datePreset} from '../src/services/messaging/timestamps.js';
import {classifyGesture} from '../src/system/gestures.js';
import {viewportMetrics} from '../src/system/viewport.js';
import {PhoneStore} from '../src/services/storage.js';
import {chatView} from '../src/components/chat.js';
const s={day:56,clock:'11:27',calendar:calendarAnchor(56,'2026-10-26')};
test('message dates render today, yesterday, day before and explicit calendar dates',()=>{
 const m={time:'16:04'};setMessageDate(m,s,{preset:'yesterday'});assert.equal(m.sentDate,'2026-10-25');assert.equal(timestampLabel(m,s),'昨天 16:04');assert.equal(datePreset(m,s),'yesterday');
 setMessageDate(m,s,{preset:'before-yesterday',time:'08:05'});assert.equal(timestampLabel(m,s),'前天 08:05');
 setMessageDate(m,s,{preset:'today',time:'11:27'});assert.equal(timestampLabel(m,s),'11:27');
 setMessageDate(m,s,{date:'2025-12-31',time:'23:59'});assert.equal(timestampLabel(m,s),'2025年12月31日 23:59');assert.throws(()=>setMessageDate(m,s,{date:'2026-02-30'}));
 assert.equal(messageDate({time:'昨天'},s),'2026-10-25');assert.equal(timestampLabel({time:'昨天'},s),'昨天');
});
test('timestamps stay tied to their actual sent date as game day changes and group gaps are shown',()=>{
 const msgs=[{id:'a',sentDate:'2026-10-25',time:'16:04'},{id:'b',sentDate:'2026-10-25',time:'16:05'},{id:'c',sentDate:'2026-10-26',time:'11:27'},{id:'d',sentDate:'2026-10-26',time:'11:40'}];
 assert.deepEqual(timestampGroups(msgs,s).map(x=>x.separator),['昨天 16:04',null,'11:27','11:40']);
 assert.equal(timestampLabel(msgs[2],{...s,day:57}),'昨天 11:27');
});
test('gestures distinguish horizontal pages, top pull-down and chat scrolling',()=>{
 assert.equal(classifyGesture({dx:-100,dy:7,home:true}), 'pages');assert.equal(classifyGesture({dx:4,dy:80,home:true}), 'shade');
 assert.equal(classifyGesture({dx:3,dy:70,top:true}), 'shade');assert.equal(classifyGesture({dx:3,dy:70,top:false,home:false}),null);
 assert.equal(classifyGesture({dx:2,dy:-100,locked:true}), 'unlock');assert.equal(classifyGesture({dx:0,dy:-70,shade:true}), 'shade');
});
test('visual viewport shrinks mobile app when the keyboard opens and restores its height',()=>{
 assert.deepEqual(viewportMetrics({width:390,layoutHeight:844,visualHeight:510,offsetTop:40,focused:true}),{mobile:true,height:510,top:40,keyboard:true});
 assert.equal(viewportMetrics({width:390,layoutHeight:844,visualHeight:844,focused:false}).keyboard,false);
 assert.equal(viewportMetrics({width:1000,layoutHeight:844,visualHeight:510,focused:true}).mobile,false);
});
test('chat has stable message keys and centered sent-date separators',()=>{
 const data=new Map(),store=new PhoneStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
 store.update(x=>{x.calendar=calendarAnchor(56,'2026-10-26');const c=x.content.conversations.wechat[0];c.messages[0].sentDate='2026-10-25';c.messages[0].time='16:04';c.messages[1].sentDate='2026-10-26';c.messages[1].time='11:27';});
 const html=chatView(store.get(),'wechat','wang');assert.match(html,/data-key="message-w1"/);assert.match(html,/class="chat-time-divider"[^>]*>昨天 16:04/);assert.match(html,/class="chat-time-divider"[^>]*>11:27/);
});
