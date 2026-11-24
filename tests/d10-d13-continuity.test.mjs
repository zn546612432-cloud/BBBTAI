import {bindD13Wallet,transferD13Wallet,enterD13Chat} from '../src/story/d13/runtime.js';
import {markMail55} from '../src/services/story55/runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,advanceScene55} from '../src/services/story55/runtime.js';
import {nodeStatus,story55Config,completed} from '../src/services/story55/state.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {PHONE_CHAT_TRACKS} from '../src/services/messaging/phone-story-scheduler.js';
import {D10_GROUP} from '../src/story/d10/dialogue.js';
import {D11_GROUP} from '../src/story/d11/dialogue.js';
import {D12_GROUP,D13_GROUP,d12Track} from '../src/story/d12-d13/wechat.js';
import {tickPhoneStoryMessages} from '../src/services/messaging/phone-story-scheduler.js';
import {d11Track} from '../src/story/d11/wechat.js';
import {syncD10D13Content,OLD_D10,OLD_RETURN,OLD_MOVE,MEETING_NOTE,OLD_INTRUSION_LINE} from '../src/story/d10-d13/continuity.js';
import {entryFor,allDiaryDays} from '../src/story/diary/entries.js';
import {diaryView} from '../src/apps/schedule/features/diary/index.js';
const phone=(day,clock='08:00')=>{const s=activateStory55(initialState());s.day=day;s.clock=clock;s.unlocked=true;s.story55.completed.invitation={day:6,clock:'20:00'};tickStory55(s);return s;};
const thread=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const flat=defs=>defs.flatMap(d=>d.lines);
test('D10 preserves scene IDs and changes only the approved rain, exam and night copy',()=>{
 assert.equal(flat(D10_GROUP).length,25);
 assert.deepEqual(D10_GROUP.map(x=>x.id),Object.keys(OLD_D10));
 for(const d of D10_GROUP.filter(x=>!['noodles','carry'].includes(x.id)))assert.equal(d.lines.length,OLD_D10[d.id].length);
 assert.ok(D10_GROUP.some(d=>d.lines.length===1));
 assert.ok(flat(D10_GROUP).every(x=>!['me','熙蒙','傅隆生','熙泰'].includes(x.who)));
 assert.ok(flat(D10_GROUP).filter(x=>x.who==='胡枫').some(x=>/首爾/.test(x.text)));
 assert.ok(!flat(D10_GROUP).filter(x=>x.who==='胡枫').some(x=>/停車場|超市|搬東西/.test(x.text)));
});
test('D11 Fu returns via Wang private native Send, without inventing Fu group bubbles',()=>{
 const s=phone(11,'08:40'),n=story55Config(s).nodes.find(x=>x.id==='return');
 assert.equal(n.conversationId,'wang');assert.equal(n.at,'08:40');assert.equal(n.delivery,'queued');
 assert.deepEqual(n.requires,[],'returning family cannot be gated by D06');
 assert.deepEqual(story55Config(s).scenes.return.map(x=>x[0]),['wang','wang','me','wang','wang']);
 assert.ok(!flat(D11_GROUP).some(x=>x.who==='傅隆生'));
 assert.equal(currentScript55(s,'wechat','wang').kind,'wang');
 advanceScene55(s,'return');advanceScene55(s,'return');
 const draft=currentScript55(s,'wechat','wang');
 assert.equal(draft.kind,'me');assert.equal(thread(s,'wang').messages.filter(m=>m.from==='me'&&m.id.startsWith('s55-return-')).length,0);
 sendScriptedDraft55(s,'wechat','wang',draft.text);
 assert.equal(thread(s,'wang').messages.filter(m=>m.from==='me'&&m.id.startsWith('s55-return-')).length,1);
 advanceScene55(s,'return');advanceScene55(s,'return');assert.ok(completed(s,'return'));
 s.clock='21:59';tickStory55(s);assert.equal(entryFor(s,11),null);
 assert.equal(s.content.notes.some(n=>n.id===MEETING_NOTE.id),false);
 s.clock='22:00';tickStory55(s);
 const entry=entryFor(s,11);
 assert.ok(entry);assert.equal(entry.title,'老地方');
 assert.equal(entry.body,MEETING_NOTE.text,'approved prose must be exactly unchanged');
 assert.ok(allDiaryDays(s).includes(11));
 const rendered=diaryView(s,{route:'/',params:{day:'11'}});
 assert.match(rendered,/DAY 11/);
 assert.match(rendered,/老地方/);
 assert.match(rendered,/五億美元的比特幣/);
 assert.equal(s.content.notes.some(n=>n.id===MEETING_NOTE.id),false,'D11 scene must not seed a Notes item');
 s.day=12;s.clock='08:00';tickStory55(s);
 assert.equal(entryFor(s,11).body,MEETING_NOTE.text,'earlier journal entries persist');
});
test('D12 Hu Feng lands in Macau; D13 fresh group remains NPC only and no future identity is leaked',()=>{
 assert.deepEqual(PHONE_CHAT_TRACKS.filter(x=>x.day>=10&&x.day<=13).map(x=>x.day),[10,11,12,13]);
 assert.ok(flat(D11_GROUP).some(x=>x.who==='胡枫'&&/韓國/.test(x.text)));
 assert.ok(flat(D12_GROUP).some(x=>x.who==='胡枫'&&/拿行李/.test(x.text)));
 assert.ok(flat(D13_GROUP).some(x=>x.who==='胡枫'&&/昨晚/.test(x.text)));
 assert.ok(flat(D13_GROUP).every(x=>x.who!=='me'&&x.who!=='傅隆生'&&x.who!=='熙泰'));
 const s=phone(13,'16:00');
 assert.ok(!story55Config(s).scenes.intrusion.some(x=>x[0]==='ouroboros'&&/日程|陈熙泰|弟弟/.test(x[1])));
 assert.equal(story55Config(s).nodes.find(x=>x.id==='move').conversationId,'group');
});
test('D12–D13 mandatory nodes preserve D14 KIRA gate, Ghost remains independent',()=>{
 const s=phone(12,'10:10');s.story55.completed.return={day:11,clock:'22:00'};tickStory55(s);
 assert.equal(nodeStatus(s,'move').state,'ready');
 advanceScene55(s,'move');advanceScene55(s,'move');
 const pending=currentScript55(s,'wechat','group');assert.equal(pending.kind,'me');
 sendScriptedDraft55(s,'wechat','group',pending.text);
 while(!completed(s,'move')){const line=currentScript55(s,'wechat','group');if(line.kind==='me')sendScriptedDraft55(s,'wechat','group',line.text);else advanceScene55(s,'move');}
 assert.ok(completed(s,'move'));s.day=13;s.clock='20:00';tickStory55(s);
 advanceScene55(s,'exhibition');assert.ok(completed(s,'exhibition'));
 s.clock='22:10';tickStory55(s);markMail55(s,'s55-d13-wallet-mail');bindD13Wallet(s);transferD13Wallet(s,0);enterD13Chat(s);
 assert.equal(nodeStatus(s,'intrusion').state,'ready');
 const arr=story55Config(s).scenes.intrusion;
 for(let i=0;i<arr.length+2&&!completed(s,'intrusion');i++){if(arr[s.story55.scenes.intrusion?.index||0]?.[0]==='call')s.phoneCall={node:'intrusion',state:'connected'};advanceScene55(s,'intrusion');}
 assert.ok(completed(s,'intrusion'));s.day=14;s.clock='09:16';tickStory55(s);
 assert.equal(nodeStatus(s,'code').state,'ready');
 assert.ok(s.content.mail.some(m=>m.id==='code-mail'));
});
test('exact-match legacy D10 and D11 migration keeps player sent text and no Fu group entry',()=>{
 const s=phone(11,'20:00');s.story55.d10D13Revision=0;
 s.story55.config.scenes.return=structuredClone(OLD_RETURN);
 s.story55.config.scenes.move=structuredClone(OLD_MOVE);
 s.story55.config.scenes.intrusion[5][1]=OLD_INTRUSION_LINE;
 s.story55.scenes.return={index:2};
 const group=thread(s,'group'),wang=thread(s,'wang');
 const player={id:'s55-return-1',from:'me',text:'真的？我马上过去。',day:11,time:'13:01'};
 const parent={id:'s55-return-2',from:'father',text:'好好干。',day:11,time:'13:02'};
 const old={id:'s55-return-0',from:'wang',text:OLD_RETURN[0][1],day:11,time:'13:00'};
 const d10=group.messages.find(m=>m.id==='d10-noodles-0')||{id:'d10-noodles-0',from:'胡枫',day:10,time:'11:50'};
 d10.text=OLD_D10.noodles[0];
 if(!group.messages.includes(d10))group.messages.push(d10);
 group.messages.push(player,parent,old);
 const d10Other=group.messages.find(m=>m.id==='d10-shopping-list-1')||{id:'d10-shopping-list-1',day:10,time:'09:23'};
 d10Other.text=OLD_D10['shopping-list'][1];d10Other.from='熙旺';
 if(!group.messages.includes(d10Other))group.messages.push(d10Other);
 syncD10D13Content(s);
 assert.equal(group.messages.includes(player),true);
 assert.equal(player.text,'真的？我马上过去。');
 assert.ok(!group.messages.some(m=>m.id===parent.id));
 assert.ok(wang.messages.some(m=>m.id===old.id));
 assert.equal(d10.text,D10_GROUP.find(x=>x.id==='noodles').lines[0].text);
 assert.equal(d10Other.text,D10_GROUP[0].lines[1].text);
 assert.equal(d10Other.from,'仔仔','D10 migration updates the NPC speaker as well as text');
 assert.equal(s.story55.scenes.return.index,3);
 assert.notEqual(s.story55.config.scenes.intrusion[5][1],OLD_INTRUSION_LINE);
 assert.ok(s.story55.contentArchives.some(x=>x.id===parent.id));
 const count=wang.messages.length;syncD10D13Content(s);
 assert.equal(wang.messages.length,count);
});

test('D11 and D12 NPC messages recover old skipped status without a player reply',()=>{
 const a=phone(11,'08:00');delete a.story55.completed.return;
 a.story55.d11Chats={notice:{started:false,index:0,nextAt:null,completed:false,skipped:true,historySettled:true,status:'skipped'}};
 a.clock='10:00';d11Track.tick(a,1000);
 assert.equal(a.story55.d11Chats.notice.skipped,false);
 assert.ok(thread(a,'group').messages.some(m=>m.id==='d11-notice-0'&&m.text.includes('晚上七點半')));
 const b=phone(12,'08:00');delete b.story55.completed.move;
 b.story55.d12Chats={arrival:{started:false,index:0,nextAt:null,completed:false,skipped:true,historySettled:true,status:'skipped'}};
 b.clock='23:30';d12Track.tick(b,1000);
 assert.equal(b.story55.d12Chats.arrival.skipped,false);
 assert.ok(thread(b,'group').messages.some(m=>m.id==='d12-arrival-0'&&m.text.includes('澳門好熱')));
});

test('D10 revision-one saved chat repairs only the known stale NPC speaker, keeping player customizations and audit copy',()=>{
 const s=phone(11,'20:00'),group=thread(s,'group');
 s.story55.d10D13Revision=1;
 const canonical=D10_GROUP.find(d=>d.id==='shopping-list').lines[1];
 const oldSpeaker={id:'d10-shopping-list-1',from:'熙旺',text:canonical.text,storyD10:true,actual:true,day:10,time:'09:23',sentDate:'2025-05-28'};
 const custom={...oldSpeaker,id:'d10-shopping-list-2',text:'自己寫的內容'};
 const player={...oldSpeaker,id:'d10-shopping-list-3',from:'me'};
 group.messages=group.messages.filter(m=>!['d10-shopping-list-1','d10-shopping-list-2','d10-shopping-list-3'].includes(m.id));
 group.messages.push(oldSpeaker,custom,player);
 assert.equal(syncD10D13Content(s),true);
 assert.equal(oldSpeaker.from,canonical.who);
 assert.equal(custom.from,'熙旺');
 assert.equal(player.from,'me');
 const archived=s.story55.contentArchives.find(x=>x.id===oldSpeaker.id&&x.original?.from==='熙旺');
 assert.ok(archived,'original NPC record is recoverable');
 assert.equal(syncD10D13Content(s),false,'migration runs once for an already repaired save');
});

test('D13 removes only 15:10 clothing scene and uses exact confirmed 18:35 group chat',()=>{
 assert.equal(D13_GROUP.some(s=>s.id==='work'),false);
 const evening=D13_GROUP.find(s=>s.id==='evening');
 assert.equal(evening.at,'18:35');
 assert.deepEqual(evening.lines.map(m=>[m.who,m.text]),[
  ['熙旺','明天碰個頭，東西都帶上'],
  ['阿威','我那份晚點發你'],
  ['胡枫','我剛回來，讓我先看看']
 ]);
 const s=phone(13,'18:34'),group=thread(s,'group');
 s.clock='18:35'; // start the actual D13 timer only after reaching the authored boundary
 for(let i=0;i<20;i++)tickPhoneStoryMessages(s,10000+i*2500);
 assert.deepEqual(group.messages.filter(m=>m.id?.startsWith('d13-evening-')).map(m=>m.text),evening.lines.map(m=>m.text));
 assert.equal(group.messages.some(m=>m.id?.startsWith('d13-work-')),false);
});
test('old D13 chats migrate built-in group bubbles only, preserving player speech',()=>{
 const s=phone(13,'14:00'),group=thread(s,'group');
 s.clock='19:00';
 const stale=[
  ['d13-work-0','仔仔','那幾套衣服要再核一次尺寸'],
  ['d13-work-1','阿威','我晚上過去試'],
  ['d13-work-2','仔仔','別穿著跑，先讓我改完'],
  ['d13-work-3','小辛','這話怎麼像特地說給我聽的'],
  ['d13-evening-0','熙旺','各自手上的資料先整理好，明天碰面一起看'],
  ['d13-evening-1','阿威','我那份晚上發你'],
  ['d13-evening-2','胡枫','我剛回來，先把收到的檔案過一遍']
 ];
 s.story55.d13GroupCopyRevision=undefined;
 for(const [id,from,text] of stale)group.messages.push({id,from,text,actual:true,storyD13:true});
 group.messages.push({id:'real-player-d13',from:'me',text:'我也想去',actual:true});
 s.notifications.push({id:'old-work-banner',conversationId:'group',messageId:'d13-work-0',body:stale[0][2]});
 s.notifications.push({id:'old-evening-banner',conversationId:'group',messageId:'d13-evening-0',body:stale[4][2]});
 tickPhoneStoryMessages(s,50000);
 assert.equal(group.messages.some(m=>m.id?.startsWith('d13-work-')),false);
 assert.deepEqual(group.messages.filter(m=>m.id?.startsWith('d13-evening-')).map(m=>m.text),D13_GROUP.find(x=>x.id==='evening').lines.map(x=>x.text));
 assert.equal(group.messages.find(m=>m.id==='real-player-d13')?.text,'我也想去');
 assert.equal(s.notifications.some(n=>n.id==='old-work-banner'),false);
 assert.equal(s.notifications.find(n=>n.id==='old-evening-banner')?.body,'明天碰個頭，東西都帶上');
 const once=structuredClone(group.messages);
 tickPhoneStoryMessages(s,60000);
 assert.deepEqual(group.messages,once);
});


test('D11 old seeded Notes are moved out of Notes without duplicating or changing the canonical journal text',()=>{
 const s=phone(12,'08:00');
 s.story55.completed.return={day:11,clock:'21:00'};
 const original={id:MEETING_NOTE.id,title:MEETING_NOTE.title,text:MEETING_NOTE.text,
  authored:true,storyContent:true,createdDay:11,updatedDay:11,updatedClock:'22:00'};
 s.content.notes.unshift(structuredClone(original));
 s.story55.authoredNoteIds??=[];
 s.story55.authoredNoteIds.push(MEETING_NOTE.id);
 assert.equal(syncD10D13Content(s),true);
 assert.equal(s.content.notes.some(n=>n.id===MEETING_NOTE.id),false);
 assert.deepEqual(s.story55.d11MeetingNoteArchive,original);
 assert.equal(entryFor(s,11).body,MEETING_NOTE.text);
 assert.equal(syncD10D13Content(s),false,'a second load must not recreate anything');
});

test('a customized legacy D11 note is preserved as the journal edit, not silently replaced',()=>{
 const s=phone(12,'08:00'),edited='熙蒙自己改過的內容';
 s.story55.completed.return={day:11,clock:'21:00'};
 s.content.notes.unshift({id:MEETING_NOTE.id,title:'我自己改的標題',
  text:edited,authored:true,storyContent:true,createdDay:11,updatedDay:12});
 assert.equal(syncD10D13Content(s),true);
 assert.equal(entryFor(s,11).title,'我自己改的標題');
 assert.equal(entryFor(s,11).body,edited);
 assert.equal(s.content.notes.some(n=>n.id===MEETING_NOTE.id),false);
 assert.equal(s.story55.d11MeetingNoteArchive.text,edited);
 assert.equal(syncD10D13Content(s),false);
});

test('an edited D11 journal takes priority; the previous edited Note is archived, and unrelated Notes survive',()=>{
 const s=phone(12,'08:00');
 s.story55.completed.return={day:11,clock:'21:00'};
 s.content.storyDiary??={};
 s.content.storyDiary['11']={title:'自己的日程',body:'日程里已有的原文'};
 s.content.notes.unshift({id:MEETING_NOTE.id,title:'備份版本',text:'備忘錄里的修改',
  authored:true,storyContent:true});
 s.content.notes.unshift({id:'my-private-note',title:'自己的筆記',text:'不要刪掉'});
 assert.equal(syncD10D13Content(s),true);
 assert.equal(entryFor(s,11).title,'自己的日程');
 assert.equal(entryFor(s,11).body,'日程里已有的原文');
 assert.equal(s.story55.d11MeetingNoteArchive.text,'備忘錄里的修改');
 assert.ok(s.content.notes.some(n=>n.id==='my-private-note'));
 assert.equal(s.content.notes.some(n=>n.id===MEETING_NOTE.id),false);
});
