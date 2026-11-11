import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import baseline from '../docs/chat-v2/main-baseline.json' with {type:'json'};
import previous from '../src/story/revisions/d05-d17-v2-previous.json' with {type:'json'};
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,markMail55} from '../src/services/story55/runtime.js';
import {AUTHORED_CHAT_TRACKS} from '../src/services/messaging/lifecycle/registry.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {d07RepliesTrack} from '../src/story/d07/replies.js';
import {d11Track} from '../src/story/d11/wechat.js';
import {d13Track} from '../src/story/d12-d13/wechat.js';
import {addWish,purchaseWish,tickWishes} from '../src/services/wishes/index.js';
import {syncApprovedChatV2} from '../src/story/revisions/d05-d17-v2.js';
import {bindD13Wallet,D13_MAIL_ID,D13_WALLET_ID} from '../src/story/d13/runtime.js';
import {exchange} from '../src/services/bank.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
const store=s=>({get:()=>s,update:fn=>fn(s)});
const chat=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
const phone=(day,clock)=>{const s=activateStory55(initialState());s.day=day;s.clock=clock;s.story55.activeScene=null;for(const n of s.story55.config.nodes)if(n.day<day)s.story55.completed[n.id]={day:n.day,clock:'23:00'};return s;};
const wishFlush=s=>{for(let i=0;i<100;i++){if(s.story55.wishes)s.story55.wishes.story.nextAt=0;tickWishes(s,i*3000);}};
let now=1e6;
function drain(s,track,id,chatId){
 const q=track.ensure(s);for(const d of track.defs)if(d.id!==id)q[d.id].completed=true;
 for(let i=0;i<100&&!q[id].completed;i++){
  track.tick(s,now+=3000);const draft=track.draft(s,chatId);
  if(draft){const before=chat(s,chatId).messages.filter(m=>m.from==='me').length;track.tick(s,now+=3000);assert.equal(chat(s,chatId).messages.filter(m=>m.from==='me').length,before);assert.equal(sendNativeWeChatPreset(store(s),chatId,draft.text,now).handled,true);}
 }
 assert.equal(q[id].completed,true,id);
 return chat(s,chatId).messages.filter(m=>m.lifecycleId===track.name+':'+id);
}

test('unlisted scenes, D06, D13 call, frozen D17 and D18–D19 remain exact main sources',()=>{
 const s=phone(5,'08:00');const modified=new Set(previous.scenes.filter(x=>x.before).map(x=>x.before.source+':'+x.before.id));
 for(const old of baseline.scenes){if(modified.has(old.source+':'+old.id))continue;const track=AUTHORED_CHAT_TRACKS.find(x=>x.track.name===old.source)?.track;assert.ok(track,old.source);const d=track.defs.find(x=>x.id===old.id);s.day=d.day;const lines=typeof d.lines==='function'?d.lines(s):d.lines;assert.deepEqual(lines,old.lines,old.source+':'+old.id);}
 for(const id of ['intrusion','azathoth-invitation'])assert.deepEqual(s.story55.config.scenes[id],baseline.story.find(x=>x.node.id===id).lines);
 assert.equal(s.story55.config.scenes['azathoth-invitation'].length,30);
});

test('D07 saving wishes unlocks native Send; purchase, delivery, photos and thanks are distinct',()=>{
 const s=phone(7,'11:11');wishFlush(s);assert.equal(chat(s,'awei').messages.some(m=>m.id==='d07-awei-01'),false);
 s.clock='11:12';wishFlush(s);assert.ok(chat(s,'awei').messages.some(m=>m.id==='d07-awei-01'));
 assert.equal(d07RepliesTrack.draft(s,'awei'),null);addWish(s,'d07-headphones');
 assert.equal(nativeWeChatComposer(s,'awei').text,'沒問題，哥買單。');
 d07RepliesTrack.tick(s,now+=3000);assert.equal(chat(s,'awei').messages.some(m=>m.text==='謝謝蒙哥！！'),false);
 assert.equal(s.story55.wishes.records['d07-headphones'].status,'saved');
 const lines=drain(s,d07RepliesTrack,'headphones-promise','awei');assert.deepEqual(lines.map(m=>m.text),['沒問題，哥買單。','謝謝蒙哥！！']);
 assert.equal(s.bankData.transactions.some(t=>t.wishId==='d07-headphones'),false);
 s.bankData.balance=5000;purchaseWish(s,'d07-headphones');assert.equal(s.story55.wishes.records['d07-headphones'].deliveryDay,9);
 s.clock='14:09';wishFlush(s);assert.equal(chat(s,'wang').messages.some(m=>m.id==='d07-wang-01'),false);
 s.clock='14:10';wishFlush(s);addWish(s,'d07-tableware');delete s.story55.d07Replies['tableware-promise'];
 assert.deepEqual(drain(s,d07RepliesTrack,'tableware-promise','wang').map(m=>m.text),['去買十套，記我帳上。','哈哈，弟弟有錢說話就是不一樣。']);
 purchaseWish(s,'d07-tableware');s.day=8;s.clock='18:00';wishFlush(s);assert.equal(d07RepliesTrack.draft(s,'wang'),null);
 s.day=9;wishFlush(s);delete s.story55.d07Replies['tableware-received'];
 assert.deepEqual(drain(s,d07RepliesTrack,'tableware-received','wang').map(m=>m.text),['認真的嗎哥哥？','我買的是碗，不是垃圾桶。','那……糖醋排骨？','我要吃三碗飯。']);
 assert.equal(chat(s,'wang').messages.filter(m=>m.text==='碗到了，今晚給你們做西湖醋魚。').length,1);
 const photos=chat(s,'wang').messages.filter(m=>m.id==='wish-tableware-photo');assert.equal(photos.length,1);assert.equal(photos[0].kind,'image');
});

test('late keyboard/tableware purchases cannot announce delivery on D08/D09',()=>{
 const s=phone(10,'14:10');wishFlush(s);addWish(s,'d07-tableware');s.bankData.balance=5000;purchaseWish(s,'d07-tableware');wishFlush(s);
 assert.equal(d07RepliesTrack.draft(s,'wang')?.text,'去買十套，記我帳上。');assert.equal(chat(s,'wang').messages.some(m=>m.id==='wish-tableware-thanks-1'),false);
 s.day=12;s.clock='18:00';wishFlush(s);assert.ok(chat(s,'wang').messages.some(m=>m.id==='wish-tableware-thanks-1'));
 const k=phone(8,'18:00');k.story55.wishes={records:{'d06-keyboard':{id:'d06-keyboard',status:'ordered',purchasedDay:8,deliveryDay:10,rewardQueued:false}},story:{lines:[],delivered:[],d07Started:true}};
 assert.equal(d07RepliesTrack.draft(k,'xiaoxin'),null);k.day=10;wishFlush(k);
 assert.deepEqual(drain(k,d07RepliesTrack,'keyboard-received','xiaoxin').map(m=>m.text),['這麼快就收到了？','下次打遊戲你必須拿五殺。','包的哥哥！']);
 assert.equal(chat(k,'xiaoxin').messages.filter(m=>m.id==='wish-keyboard-photo').length,1);
});

test('brother egg consumes only actual free messages, once, without replacing a plot draft',()=>{
 const s=phone(7,'15:00');sendMessage(store(s),{channel:'wechat',conversationId:'wang',text:'哥哥呀'});assert.equal(s.story55.brotherEgg,undefined);
 sendMessage(store(s),{channel:'wechat',conversationId:'wang',text:'哥哥'});assert.equal(s.story55.brotherEgg.stage,'queued');
 assert.deepEqual(drain(s,d07RepliesTrack,'brother-ask','wang').map(m=>m.text),['怎麼了蒙蒙？']);
 sendMessage(store(s),{channel:'wechat',conversationId:'wang',text:'想你啦'});delete s.story55.d07Replies['brother-pat'];
 assert.deepEqual(drain(s,d07RepliesTrack,'brother-pat','wang').map(m=>m.text),['乖']);
 sendMessage(store(s),{channel:'wechat',conversationId:'wang',text:'哥哥'});assert.equal(s.story55.brotherEgg.stage,'done');
 const plot=phone(11,'08:40');plot.story55.scenes.return={index:2};plot.story55.wishes={records:{'d07-tableware':{status:'saved'}},story:{lines:[],delivered:[]}};
 assert.equal(nativeWeChatComposer(plot,'wang').source,'story55');assert.match(nativeWeChatComposer(plot,'wang').text,/干爹/);
});

test('D11 private native draft survives simultaneous 22:20 group delivery',()=>{
 const s=phone(11,'22:18'),q=d11Track.ensure(s);s.story55.completed.return=true;
 for(const d of d11Track.defs)if(!['wang-worry','after-meeting'].includes(d.id))q[d.id].completed=true;
 // Discover the stable original private ID rather than introducing a new thread.
 const privateDef=d11Track.defs.find(d=>d.chat==='wang'&&d.at==='22:18');assert.ok(privateDef);
 q[privateDef.id].completed=false;d11Track.tick(s,now+=3000);d11Track.tick(s,now+=3000);
 const draft=nativeWeChatComposer(s,'wang');assert.equal(draft.text,'沒呢哥。');
 s.clock='22:20';for(let i=0;i<12;i++)d11Track.tick(s,now+=3000);
 assert.equal(nativeWeChatComposer(s,'wang').text,draft.text);assert.ok(chat(s,'group').messages.some(m=>m.text==='明晚機場見，早點休息。'));
});

test('D13 real father Send -> one mail, actual timestamp, first-read clock clamp, separate 50 BTC',()=>{
 const s=phone(13,'19:03');delete s.story55.completed.intrusion;s.story55.d13Revision=3;
 drain(s,d13Track,'father-planning','fulongsheng');tickStory55(s);
 const mail=s.content.mail.find(m=>m.id===D13_MAIL_ID);assert.ok(mail);assert.equal(mail.time,'19:03');assert.equal(mail.subject,'待領取資產通知');
 const beforePlayers=JSON.stringify(chat(s,'fulongsheng').messages.filter(m=>m.from==='me')),bank=s.bankData.balance,balance=s.content.mirage.digitalBalance;
 mail.read=true;markMail55(s,D13_MAIL_ID);assert.equal(s.clock,'22:30');assert.equal(s.story55.completed.exhibition,undefined);
 assert.equal(JSON.stringify(chat(s,'fulongsheng').messages.filter(m=>m.from==='me')),beforePlayers);assert.equal(bindD13Wallet(s),true);
 assert.deepEqual([s.bankData.balance,s.content.mirage.digitalBalance],[bank,balance]);
 const w=s.content.mirage.wallets.find(w=>w.id===D13_WALLET_ID);assert.equal(w.balance,50);assert.equal(w.spendable,false);
 assert.throws(()=>exchange(store(s),50));
 for(let i=0;i<3;i++){tickStory55(s);markMail55(s,D13_MAIL_ID);}
 assert.equal(s.content.mail.filter(m=>m.id===D13_MAIL_ID).length,1);assert.equal(s.notifications.filter(n=>n.id==='s55-mail-'+D13_MAIL_ID).length,1);
 const late=phone(13,'22:17');tickStory55(late);const fallback=late.content.mail.find(m=>m.id===D13_MAIL_ID);assert.equal(fallback.time,'22:17');late.clock='23:00';markMail55(late,D13_MAIL_ID);assert.equal(late.clock,'23:00');
});

test('D15 Wang starts no earlier than 16:30 and only after the complete loan; D16 main/private coexist',()=>{
 const s=phone(15,'16:30'),track=D14_D24_TRACKS.find(x=>x.track.day===15).track;assert.equal(track.draft(s,'wang'),null);
 track.tick(s,now+=3000);track.tick(s,now+=3000);assert.equal(chat(s,'wang').messages.some(m=>m.text==='你下午在房裡罵誰？'),false);
 s.clock='20:40';s.story55.completed.loan={day:15,clock:'20:40'};const q=track.ensure(s);for(const d of track.defs)if(d.id!=='room')q[d.id].completed=true;
 track.tick(s,now+=3000);track.tick(s,now+=3000);assert.equal(chat(s,'wang').messages.find(m=>m.text==='你下午在房裡罵誰？').time,'20:40');
 const d16=D14_D24_TRACKS.find(x=>x.track.day===16).track;assert.ok(d16.defs.some(d=>d.chat==='wang'&&d.id==='hardware'));
 const a=phone(16,'16:00'),lines=drain(a,d16,'after-rehearsal','group');assert.equal(lines.length,11);assert.equal(lines.filter(m=>m.from==='me').length,2);assert.equal(lines.at(-1).text,'？');
});

test('V2 migration upgrades known scripts/queues only, retains real player/history/custom edits, and is idempotent',()=>{
 const s=phone(12,'23:30');const old=previous.scenes.find(x=>x.before?.source==='d10'&&x.before.id==='carry').before;
 const c=chat(s,'group');for(let i=0;i<old.lines.length;i++)c.messages.push({id:'d10-carry-'+i,from:old.lines[i].who,text:old.lines[i].text,day:10,time:old.at,sentDate:'2025-05-28',storyD10:true});s.story55.d10Chats={carry:{started:true,index:4,completed:true}};delete s.story55.approvedChatV2;
 const player={id:'d10-wang-supper-1',from:'me',text:'這是我親自發的',day:10};chat(s,'wang').messages.push(player);
 const custom={id:'custom',from:'熙旺',text:'不能覆蓋',authored:true};chat(s,'wang').messages.push(custom);
 const history=structuredClone(chat(s,'wang').messages.filter(m=>m.sentDate<'2025-05-19'));
 const oldMove=previous.story.find(x=>x.node.id==='move');s.story55.config.scenes.move=structuredClone(oldMove.lines);s.story55.scenes.move={index:3};delete s.story55.completed.move;
 syncApprovedChatV2(s);assert.deepEqual(c.messages.filter(m=>m.id.startsWith('d10-carry-')).map(m=>m.text),previous.scenes.find(x=>x.before?.id==='carry'&&x.before.source==='d10').after.lines.map(l=>l.text));
 assert.equal(player.text,'這是我親自發的');assert.equal(custom.text,'不能覆蓋');assert.deepEqual(chat(s,'wang').messages.filter(m=>m.sentDate<'2025-05-19'),history);
 assert.equal(s.story55.config.scenes.move.length,10);assert.equal(s.story55.scenes.move.index,3);assert.equal(s.story55.scenes.move.messagePrefix,undefined);
 assert.equal(syncApprovedChatV2(s),false);assert.ok(s.story55.contentArchives.length);
});
