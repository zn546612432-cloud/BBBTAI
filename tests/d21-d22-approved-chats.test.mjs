import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';

const content=()=>JSON.parse(readFileSync(new URL('../src/story/d14-d24/content.json',import.meta.url),'utf8'));
const D21=[
 ['阿威','累死了。'],
 ['小辛','誰讓你下午還要加練。'],
 ['阿威','閉嘴。'],
 ['胡楓','醫療包還有嗎？'],
 ['熙旺','有，儲物櫃第二格。'],
 ['胡楓','謝了。']
];
const D22=[
 ['小辛','今天誰還去練？'],
 ['阿威','不去了，腿要廢了。'],
 ['仔仔','昨天不是還說不累？'],
 ['阿威','你們能不能放過我。'],
 ['小辛','哈哈哈哈。']
];
const stamp=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id).messages;

test('D21/D22 user-approved short group chats appear as separate authored tracks with verbatim dialogue',()=>{
 const c=content();
 const d21=c.wechat.filter(x=>x.day===21);
 const d22=c.wechat.filter(x=>x.day===22);
 assert.equal(d21.filter(x=>x.id==='after-training').length,1);
 assert.equal(d22.filter(x=>x.id==='training-check').length,1);
 const a=d21.find(x=>x.id==='after-training');
 const b=d22.find(x=>x.id==='training-check');
 assert.deepEqual({day:a.day,chat:a.chat,at:a.at},{day:21,chat:'group',at:'18:42'});
 assert.deepEqual({day:b.day,chat:b.chat,at:b.at},{day:22,chat:'group',at:'15:20'});
 assert.deepEqual(a.lines.map(x=>[x.who,x.text]),D21);
 assert.deepEqual(b.lines.map(x=>[x.who,x.text]),D22);
 assert.equal(a.lines.some(x=>x.who==='me')||b.lines.some(x=>x.who==='me'),false,'no auto-invented player bubble');
});

test('previous D21 clothes and D22 Wang headache conversations remain in place',()=>{
 const c=content();
 const clothes=c.wechat.find(x=>x.day===21&&x.id==='clothes');
 const headache=c.wechat.find(x=>x.day===22&&x.id==='headache');
 assert.equal(clothes.chat,'group');assert.equal(clothes.at,'13:07');assert.equal(clothes.lines.length,6);
 assert.deepEqual(clothes.lines[0],{who:'仔仔',text:'我把衣服第二版放桌上了，誰看完記得幫我收起來'});
 assert.equal(headache.chat,'wang');assert.equal(headache.at,'21:38');assert.equal(headache.lines.length,7);
 assert.deepEqual(headache.lines[0],{who:'熙旺',text:'今天你怎麼這麼安靜？'});
 assert.deepEqual(headache.lines.at(-1),{who:'熙旺',text:'我等一下上來'});
 const d20=c.wechat.find(x=>x.day===20&&x.id==='monitoring');
 assert.equal(d20.lines.length,21,'D20 restores the approved 21-line dialogue without touching D21/D22');
 const d23=c.wechat.find(x=>x.day===23&&x.id==='heat');
 assert.equal(d23.lines.length,3,'D23 existing group remains unchanged');
});

test('unified D21 lifecycle delivers six messages sequentially, without duplicate replay',()=>{
 const s=activateStory55(initialState());
 s.day=21;s.clock='18:42';
 const track=D14_D24_TRACKS.find(x=>x.name==='D21')?.track;
 assert.ok(track);
 track.tick(s,1000000);
 for(let i=1;i<=10;i++)track.tick(s,1000000+i*2100);
 const messages=stamp(s,'group').filter(m=>m.id.startsWith('d21-after-training-'));
 assert.equal(messages.length,6);
 assert.deepEqual(messages.map(m=>[m.from,m.text]),D21);
 assert.ok(messages.every(m=>m.storyD21===true&&m.sentDate==='2025-06-08'));
 track.tick(s,1050000);
 assert.equal(stamp(s,'group').filter(m=>m.id.startsWith('d21-after-training-')).length,6);
});

test('unified D22 lifecycle keeps group separate from existing 21:38 private chat',()=>{
 const s=activateStory55(initialState());
 s.day=22;s.clock='15:20';
 const track=D14_D24_TRACKS.find(x=>x.name==='D22')?.track;
 assert.ok(track);
 track.tick(s,2000000);
 for(let i=1;i<=10;i++)track.tick(s,2000000+i*2100);
 const messages=stamp(s,'group').filter(m=>m.id.startsWith('d22-training-check-'));
 assert.equal(messages.length,5);
 assert.deepEqual(messages.map(m=>[m.from,m.text]),D22);
 assert.ok(messages.every(m=>m.storyD22===true&&m.sentDate==='2025-06-09'));
 assert.equal(stamp(s,'wang').some(m=>m.id.startsWith('d22-headache-')),false,'the private chat is not triggered by group delivery');
 track.tick(s,2050000);
 assert.equal(stamp(s,'group').filter(m=>m.id.startsWith('d22-training-check-')).length,5);
});

test('D21/D22 scheduled group messages are not leaked at the start of D01',()=>{
 const s=activateStory55(initialState());
 const texts=JSON.stringify(s.content.conversations.wechat);
 for(const [who,t] of [...D21,...D22])assert.equal(texts.includes(t),false,who+': premature message');
});
