import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {getWeather,setWeatherOverride,weatherSymbol} from '../src/services/weather/world.js';
import {home,lock} from '../src/system/shell.js';
import {weatherFor} from '../src/apps/weather/index.js';
import {entryFor} from '../src/story/diary/entries.js';

const fresh=(day=7,clock='08:00')=>{const s=activateStory55(initialState());s.day=day;s.clock=clock;return s;};

test('Macau current weather is identical across Home, Lock and Weather App, using game clock',()=>{
 const state=fresh(7,'08:00'),w=getWeather(state);
 assert.equal(w.source,'historical');
 assert.equal(w.date,'2025-05-25');
 assert.equal(w.tempExact,24.2);
 const homeHTML=home(state),lockHTML=lock(state),app=weatherFor(state);
 assert.ok(homeHTML.includes('<span class="widget-large">'+w.temp+'°</span>'));
 assert.ok(homeHTML.includes('<span class="widget-foot">'+w.condition+'</span>'));
 assert.ok(homeHTML.includes('澳门 <span>'+weatherSymbol(w.condition)+'</span>'));
 assert.ok(lockHTML.includes('<div class="lock-weather">'+weatherSymbol(w.condition)+'　'+w.temp+'°　'+w.condition+'</div>'));
 assert.equal(app.find(x=>x.id==='macau').temp,w.temp);
 state.clock='14:00';
 const afternoon=getWeather(state);
 assert.equal(afternoon.tempExact,25.6);
 assert.ok(home(state).includes('<span class="widget-large">'+afternoon.temp+'°</span>'));
 assert.ok(lock(state).includes('　'+afternoon.temp+'°　'+afternoon.condition+'</div>'));
 assert.equal(state.day,7,'reading weather must not advance timeline');
});

test('changing weather once updates both phone surfaces, city view and diary without altering story',()=>{
 const state=fresh(6,'14:00');
 const journalBefore=entryFor(state,6)?.body;
 setWeatherOverride(state,{day:6,cityId:'macau',values:{condition:'雷雨',temp:29}});
 const value=getWeather(state);
 assert.equal(value.source,'manual');
 assert.equal(value.condition,'雷雨');
 assert.ok(home(state).includes('29°</span>'));
 assert.ok(home(state).includes('雷雨'));
 assert.ok(lock(state).includes('⛈　29°　雷雨'));
 assert.equal(weatherFor(state).find(x=>x.id==='macau').condition,'雷雨');
 assert.equal(entryFor(state,6).weather,'雷雨');
 assert.equal(entryFor(state,6).body,journalBefore);
});

test('new weather source does not change Macau game time, old author text, or location city defaults',()=>{
 const state=fresh(1,'08:00');
 const first=getWeather(state);
 assert.equal(first.condition,'晴');
 assert.equal(entryFor(state,1).weather,'晴');
 assert.ok(home(state).includes(first.temp+'°'));
 assert.equal(getWeather(state,{cityId:'london'}).source,'placeholder');
 assert.equal(state.clock,'08:00');
 assert.equal(state.day,1);
});
