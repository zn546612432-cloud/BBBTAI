import test from 'node:test';
import assert from 'node:assert/strict';
import {D02_DIALOGUES} from '../src/story/d02/dialogue.js';
import {D03_SCENES} from '../src/story/d03/dialogue.js';
import {D04_GROUP,D04_PRIVATE} from '../src/story/d04/dialogue.js';
import {D05_GROUP,D05_PRIVATE} from '../src/story/d05/dialogue.js';
import {celebration,privateScenes,rewardSets as d06Rewards} from '../src/story/d06/wish-content.js';
import {nextDay,afternoonDay,extraDay,rewardSets as d07Rewards} from '../src/story/d07/life-content.js';
import {D08_GROUP} from '../src/story/d08/dialogue.js';
import {D09_GROUP} from '../src/story/d09/dialogue.js';
import {D10_GROUP} from '../src/story/d10/dialogue.js';
import {D11_GROUP} from '../src/story/d11/dialogue.js';
import {D11_MEETING_NOTE_ID,tickD11MeetingNote} from '../src/story/d11/meeting-note.js';
import {STORY55_CONFIG} from '../src/story/story55/catalog.js';
import {threadForScene55} from '../src/services/story55/scripted-chat.js';
import {AUTHORED_CHAT_TRACKS} from '../src/services/messaging/lifecycle/registry.js';
import {D06_FLOW_AT,D06_CONTRACT} from '../src/story/d06/commission.js';
import {D01_REPAIR} from '../src/story/d01/runtime.js';

const groupLines=scenes=>scenes.flatMap(scene=>scene.lines).filter(l=>l.who);
const actor=group=>group.map(x=>x.who).filter(Boolean);
test('D01–D11 reset protects original functional task IDs and 55-day chronology',()=>{
 assert.equal(D01_REPAIR,'mirage001');
 assert.equal(D06_FLOW_AT,'08:10');
 assert.equal(D06_CONTRACT.assetAmount,10);
 assert.deepEqual(D06_CONTRACT.stages,['cipher','veil','route','route','extract']);
 assert.equal(STORY55_CONFIG.startDate,'2025-05-19');
 assert.equal(STORY55_CONFIG.totalDays,55);
 assert.ok(STORY55_CONFIG.nodes.find(n=>n.id==='return'&&n.day===11));
 assert.ok(STORY55_CONFIG.nodes.find(n=>n.id==='move'&&n.day===12));
 assert.ok(STORY55_CONFIG.nodes.find(n=>n.id==='intrusion'&&n.day===13));
});

test('All D01-D11 return conversations route family chats privately, not into Wolf Cubs',()=>{
 assert.equal(threadForScene55('return').conversationId,'wang');
 assert.equal(threadForScene55('intro').conversationId,'wang');
 assert.equal(threadForScene55('move').conversationId,'group');
 assert.ok(!STORY55_CONFIG.scenes.return.some(([who])=>who==='father'));
 assert.ok(STORY55_CONFIG.scenes.return.some(([who,line])=>who==='wang'&&line.includes('美景大厦')));
 assert.ok(STORY55_CONFIG.scenes.return.some(([who,line])=>who==='wang'&&line.includes('韩国')));
 const group=groupLines(D11_GROUP);
 assert.equal(group.some(l=>l.who==='傅隆生'||l.who==='father'),false);
 assert.equal(group.some(l=>l.who==='陈熙泰'||l.who==='熙泰'),false);
 assert.ok(group.some(l=>l.who==='胡枫'&&l.text.includes('首尔')));
});

test('D02 private talk still begins with player Send and no phantom player script appears from a late load',()=>{
 assert.equal(D02_DIALOGUES.wang[0][0],'me');
 assert.match(D02_DIALOGUES.wang[0][1],/出车/);
 assert.ok(D02_DIALOGUES.wang.some(([who,text])=>who==='熙旺'&&text.includes('收车')));
 assert.equal(D02_DIALOGUES.xin[0][0],'小辛');
 assert.ok(D02_DIALOGUES.xin.some(([who,text])=>who==='me'&&text.includes('先看看')));
});

test('D03-D05 remote school, independent taxi, hiking and fashion continuity',()=>{
 const d03=groupLines(D03_SCENES);
 assert.ok(d03.some(l=>l.who==='胡枫'&&l.text.includes('首尔')));
 assert.ok(D03_SCENES.find(x=>x.id==='hufeng').lines.some(l=>l.text.includes('韩国')));
 assert.ok(!D03_SCENES.find(x=>x.id==='hufeng').lines.some(l=>/拿過來|拿过来|下午拿/.test(l.text)));
 assert.ok(D04_PRIVATE.find(x=>x.id==='hufeng-am').lines.some(l=>l.text.includes('首尔')));
 assert.ok(D05_PRIVATE.find(x=>x.id==='zaizai-paris').lines.some(l=>l.text.includes('巴黎')));
 const d05=groupLines(D05_GROUP);
 assert.ok(d05.some(l=>l.who==='熙旺'&&l.text.includes('出车')));
 assert.ok(d05.some(l=>l.who==='阿威'&&l.text.includes('爬山')));
 for(const l of [...d03,...groupLines(D04_GROUP),...d05])
  assert.ok(!/全員住一間|把衣服扔洗衣機|把電腦拿過來/.test(l.text));
});

test('D06-D07 continuity does not teleport Hu Feng home from Korea, and photo event IDs remain stable',()=>{
 assert.ok(celebration.some(l=>l.from==='胡枫'&&l.text.includes('首尔')));
 assert.ok(celebration.some(l=>l.wishId==='d06-keyboard'));
 assert.ok(celebration.some(l=>l.wishId==='d06-dinner'));
 assert.ok(privateScenes.some(l=>l.chat==='hufeng'&&l.text.includes('学校')));
 assert.ok(d06Rewards['d06-dinner'].some(l=>l.id==='wish-dinner-booking-01'));
 assert.ok(d06Rewards['d06-dinner'].some(l=>l.id==='wish-dinner-photo'&&l.kind==='image'));
 assert.ok(d06Rewards['d06-shoes'].some(l=>l.id==='wish-shoes-photo'&&l.kind==='image'));
 assert.ok(nextDay.some(l=>l.from==='胡枫'&&l.text.includes('首尔')));
 assert.ok(afternoonDay.some(l=>l.from==='胡枫'&&l.text.includes('课')));
 assert.ok(extraDay.some(l=>l.wishId==='d07-headphones'));
 assert.ok(extraDay.some(l=>l.wishId==='d07-tableware'));
 assert.ok(d07Rewards['d07-headphones'].some(l=>l.kind==='image'));
});

test('D08-D10 have exactly 20 Wolf Cubs messages per day and D09 training is remote-safe',()=>{
 for(const [day,scenes] of [[8,D08_GROUP],[9,D09_GROUP],[10,D10_GROUP]]){
  const lines=groupLines(scenes);
  assert.equal(lines.length,20,'D'+day);
  assert.ok(scenes.some(s=>s.lines.length===1),'standalone messages: D'+day);
  assert.ok(lines.every(l=>l.who!=='me'&&l.who!=='熙蒙'&&l.who!=='傅隆生'&&l.who!=='陈熙泰'));
 }
 assert.ok(D09_GROUP.find(s=>s.id==='training').lines.some(l=>l.who==='阿威'));
 assert.ok(!D09_GROUP.find(s=>s.id==='training').lines.some(l=>l.who==='胡枫'&&/跑|训练/.test(l.text)));
 assert.ok(D10_GROUP.some(s=>s.lines.some(l=>l.who==='胡枫'&&l.text.includes('周五晚上'))));
});

test('D11 reunion track is registered once, and normal group messages do not preempt private news',()=>{
 const tracks=AUTHORED_CHAT_TRACKS.filter(t=>t.name==='D11');
 assert.equal(tracks.length,1);
 assert.equal(tracks[0].track.day,11);
 assert.ok(D11_GROUP.every(s=>typeof s.condition==='function'));
 assert.equal(D11_GROUP[0].condition({story55:{completed:{}}}),false);
 assert.equal(D11_GROUP[0].condition({story55:{completed:{return:{day:11}}}}),true);
});

test('D11 evening notes are only added after actual completed return and 22:00, once',()=>{
 const state={day:11,clock:'21:30',story55:{version:1,completed:{}},content:{notes:[]}};
 assert.equal(tickD11MeetingNote(state),false);
 state.story55.completed.return={day:11};
 assert.equal(tickD11MeetingNote(state),false);
 state.clock='22:05';
 assert.equal(tickD11MeetingNote(state),true);
 assert.equal(tickD11MeetingNote(state),false);
 assert.equal(state.content.notes.length,1);
 const note=state.content.notes[0];
 assert.equal(note.id,D11_MEETING_NOTE_ID);
 assert.match(note.text,/汪杰.*五亿美元/);
 assert.match(note.text,/三千万/);
 assert.match(note.text,/胡枫/);
 assert.ok(note.text.includes('\n'),'natural note line breaks');
});
