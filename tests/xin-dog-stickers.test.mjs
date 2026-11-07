import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {xinDogStickers,xinDogSticker} from '../src/services/assets/xin-dog-stickers.js';
import {reviseDeliveredStoryCopy} from '../src/services/messaging/lifecycle/copy-revision.js';
import {beginD06Celebration,tickWishes,addWish,purchaseWish} from '../src/services/wishes/index.js';

test('imported stickers contain decoded local images with stable IDs and source provenance',()=>{
 assert.equal(xinDogStickers.length,164);
 assert.equal(new Set(xinDogStickers.map(a=>a.id)).size,164);
 for(const a of xinDogStickers){
  assert.match(a.sourceUrl,/^https:\/\/(pic\.feria\.eu\.org|i\.ibb\.co)\//);
  if(a.status==='unavailable'){assert.equal(a.path,null);continue;}
  const bytes=readFileSync(new URL('../public'+a.path,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF',a.id);
  assert.equal(bytes.subarray(8,12).toString(),'WEBP',a.id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,a.id);
  assert.ok(a.width>0&&a.height>0,a.id);
 }
 assert.throws(()=>xinDogSticker('not-a-real-sticker'));
});

test('older saves migrate exact Xin replies once, preserving player speech, pre-D01 history and metadata',()=>{
 const make=opts=>({id:'d06-celebrate-01',from:'小辛',text:'？？？？',kind:'text',day:6,time:'18:01',sentDate:'2025-05-24',read:true,...opts});
 const npc=make(),player=make({from:'me'}),history=make({sentDate:'2024-03-12'}),edited=make({text:'自己修改的話'});
 const s={story55:{version:1,copyRevisionD01D09:2},content:{conversations:{wechat:[{id:'group',unread:7,messages:[npc,player,history,edited]}]}},notifications:[],bankData:{balance:500}};
 assert.equal(reviseDeliveredStoryCopy(s),true);
 assert.equal(npc.kind,'image');assert.equal(npc.text,xinDogSticker('果真吗'));
 assert.deepEqual({...npc,text:'？？？？',kind:'text'},make());
 assert.equal(player.text,'？？？？');assert.equal(history.text,'？？？？');assert.equal(edited.text,'自己修改的話');
 assert.equal(s.content.conversations.wechat[0].unread,7);assert.equal(s.bankData.balance,500);
 assert.equal(reviseDeliveredStoryCopy(s),false);
 assert.equal(s.content.conversations.wechat[0].messages.length,4);
});

test('Xin sends stickers through the existing gated queue; payment alone never sends his delivery thanks',()=>{
 const s={day:6,clock:'18:00',unlocked:true,nav:{current:{appId:'home',route:'/'}},story55:{version:1,completed:{}},content:{conversations:{wechat:[{id:'group',name:'狼崽团',messages:[],unread:0},{id:'xiaoxin',name:'小辛',messages:[],unread:0}]},reminders:[]},bankData:{balance:5000,transactions:[]},notifications:[],events:[]};
 const group=s.content.conversations.wechat[0];
 const flush=()=>{for(let i=0;i<60;i++){if(s.story55.wishes)s.story55.wishes.story.nextAt=0;tickWishes(s,Date.now()+i*2100);}};
 assert.throws(()=>beginD06Celebration(s));
 s.story55.completed.wallet={day:6,clock:'17:00'};
 beginD06Celebration(s);flush();
 const first=group.messages.find(m=>m.id==='d06-celebrate-01');
 assert.equal(first.kind,'image');assert.equal(first.text,xinDogSticker('果真吗'));
 addWish(s,'d06-keyboard');purchaseWish(s,'d06-keyboard');flush();
 const xin=s.content.conversations.wechat.find(c=>c.id==='xiaoxin');
 assert.equal(xin.messages.some(m=>m.id==='wish-keyboard-thanks-1'),false);
 s.day=8;s.clock='16:00';flush();
 const thanks=xin.messages.find(m=>m.id==='wish-keyboard-thanks-1');
 assert.equal(thanks.kind,'image');assert.equal(thanks.text,xinDogSticker('小狗谢谢'));
 flush();assert.equal(group.messages.filter(m=>m.id===first.id).length,1);assert.equal(xin.messages.filter(m=>m.id===thanks.id).length,1);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='wish-purchase-d06-keyboard').length,1);
});
