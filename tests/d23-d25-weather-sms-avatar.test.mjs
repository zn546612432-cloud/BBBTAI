import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {getWeather,setWeatherOverride} from '../src/services/weather/world.js';
import {MACAU_CYCLONE_SIGNALS,macauCycloneSignalAt} from '../src/services/weather/cyclone-signals.js';
import {resolveWeChatAvatar} from '../src/apps/wechat/avatars.js';
import {render as weatherRender} from '../src/apps/weather/index.js';
import content from '../src/story/d14-d24/content.json' with {type:'json'};

const state=()=>{const s=activateStory55(initialState());s.story55.minutesPerSecond=0;return s;};
const at=(s,day,clock)=>{s.day=day;s.clock=clock;tickStory55(s);return s;};
const sms=s=>s.content.conversations.messages.find(c=>c.id==='macau-meteorological-bureau');
const signalTexts=s=>(sms(s)?.messages||[]).filter(m=>m.id.startsWith('smg-cyclone-'));
const signalNotifications=s=>s.notifications.filter(n=>n.link?.appId==='messages'&&n.conversationId==='macau-meteorological-bureau');

test('traditional and simplified Hu Feng share the original shipped photo, not a fallback character',()=>{
 const a=resolveWeChatAvatar('胡楓'),b=resolveWeChatAvatar('胡枫');
 assert.equal(a,b);
 assert.match(a,/\/apps\/wechat\/avatars\/originals\/hufeng\.jpeg$/);
 assert.equal(resolveWeChatAvatar('胡'),a);
});

test('D23 June 10 heat is the existing Macau historical weather and retains original chat',()=>{
 const s=state();
 const w=getWeather(s,{day:23,clock:'11:41'});
 assert.equal(w.date,'2025-06-10');
 assert.equal(w.temp,32);
 assert.ok(w.high>=33);
 assert.equal(w.cycloneSignal,null,'no early cyclone wind signal on June 10');
 assert.equal(content.wechat.find(c=>c.day===23&&c.id==='heat').lines[0].text,'外面熱得要命，三十多度');
 assert.equal(signalTexts(s).length,0);
});

test('documented Wutip warning transitions are held in one fixed timeline, never ahead of their clock',()=>{
 assert.deepEqual(MACAU_CYCLONE_SIGNALS.map(e=>[e.day,e.clock,e.level]),[[24,'06:00',1],[25,'06:00',3],[25,'18:00',1],[27,'08:00',3],[28,'15:30',0]]);
 const take=(day,clock)=>macauCycloneSignalAt(day,clock)?.level??null;
 assert.equal(take(23,'23:59'),null);
 assert.equal(take(24,'05:59'),null);
 assert.equal(take(24,'06:00'),1);
 assert.equal(take(25,'05:59'),1);
 assert.equal(take(25,'06:00'),3);
 assert.equal(take(25,'17:59'),3);
 assert.equal(take(25,'18:00'),1);
 assert.equal(take(27,'08:00'),3);
 assert.equal(take(28,'15:29'),3);
 assert.equal(take(28,'15:30'),null);
});

test('Weather app reads the same signal data at D24 and D25, preserving hourly temperatures and edits',()=>{
 const s=state();
 const store={get:()=>s};
 at(s,24,'08:20');
 let weather=getWeather(s,{day:24,clock:s.clock});
 assert.equal(weather.cycloneSignal.level,1);
 assert.ok(weather.temp>=20);
 assert.ok(weather.precipitation>=0);
 const list=weatherRender({store},{route:'/',params:{}}),detail=weatherRender({store},{route:'/city/macau',params:{}});
 assert.match(list,/一號風球/);assert.match(detail,/一號風球/);
 setWeatherOverride(s,{day:24,values:{condition:'大雨'}});
 assert.equal(getWeather(s,{day:24,clock:'08:20'}).cycloneSignal.level,1,'manual weather condition must not erase official signal');
 at(s,25,'06:00');
 assert.match(weatherRender({store},{route:'/city/macau',params:{}}),/三號風球/);
 at(s,25,'18:00');
 assert.match(weatherRender({store},{route:'/city/macau',params:{}}),/一號風球/);
});

test('D24 SMS is delivered through existing phone messages and notification, exactly once, after actual 06:00 time',()=>{
 const s=state();
 at(s,23,'23:59');assert.equal(signalTexts(s).length,0);
 at(s,24,'05:59');assert.equal(signalTexts(s).length,0);
 at(s,24,'06:00');
 const m=signalTexts(s);
 assert.equal(m.length,3,'Portuguese, English and Traditional Chinese bubbles');
 assert.deepEqual(m.map(x=>x.sentDate),Array(3).fill('2025-06-11'));
 assert.deepEqual(m.map(x=>x.time),Array(3).fill('06:00'));
 assert.equal(signalNotifications(s).length,1,'only one notification banner per official event');
 assert.match(m.at(-1).text,/一號風球/);
 assert.equal(sms(s).name,'澳門地球物理氣象局');
 tickStory55(s);at(s,24,'08:20');
 assert.equal(signalTexts(s).length,3);
 assert.equal(signalNotifications(s).length,1);
 assert.equal(content.wechat.find(x=>x.day===24&&x.id==='wind').lines[0].text,'風球掛了，今天外出的安排先看情況。');
});

test('D25 transitions create correctly timestamped alerts, not a reused September red storm surge SMS',()=>{
 const s=state();at(s,24,'08:20');
 at(s,25,'05:59');assert.equal(signalTexts(s).length,3);
 at(s,25,'06:00');assert.equal(signalTexts(s).length,6);
 assert.match(signalTexts(s).at(-1).text,/三號風球/);
 at(s,25,'17:59');assert.equal(signalTexts(s).length,6);
 at(s,25,'18:00');assert.equal(signalTexts(s).length,9);
 assert.match(signalTexts(s).at(-1).text,/一號風球/);
 assert.equal(signalNotifications(s).length,3);
 assert.ok(signalTexts(s).every(m=>!m.text.includes('紅色風暴潮')&&!m.text.includes('Red Storm Surge')));
});

test('future signal changes share the same source, cancellation clears weather warning, old SMS is retained',()=>{
 const s=state();
 const existing={id:'personal-sms',name:'已保存的短信',messages:[{id:'prior',from:'friend',text:'留下這一條',time:'08:00',sentDate:'2025-05-12'}],unread:0};
 s.content.conversations.messages.push(existing);
 at(s,27,'08:00');assert.equal(getWeather(s).cycloneSignal.level,3);
 at(s,28,'15:30');assert.equal(getWeather(s).cycloneSignal,null);
 assert.equal(signalTexts(s).length,15);
 assert.equal(s.content.conversations.messages.find(c=>c.id==='personal-sms')?.messages[0].text,'留下這一條');
 const count=signalTexts(s).length;tickStory55(s);assert.equal(signalTexts(s).length,count);
});

test('deleted weather-SMS thread is not re-created over user choice',()=>{
 const s=state();s.content.deletedSmsConversationIds=['macau-meteorological-bureau'];
 at(s,24,'08:20');assert.equal(sms(s),undefined);assert.equal(signalNotifications(s).length,0);
});
