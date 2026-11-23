import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {STORY55_CONFIG} from '../src/story/story55/catalog.js';
import {applyD55Definition} from '../src/story/d55/definition.js';
import {indexAuthoredPresetKnowledge,selectTaiDeliveredPresetKnowledge} from '../src/services/ai/worldbook/preset-knowledge.js';
import {projectTaiPlotGlossary} from '../src/services/ai/worldbook/plot-glossary.js';
import {captureTaiWorldbook} from '../src/services/ai/worldbook/index.js';

function fixture(day=53){
 const s=initialState();activateStory55(s);s.day=day;s.clock='20:00';
 s.story55.completed.recognition={day:33,clock:'10:00'};
 return s;
}
function ask(s,text){
 return projectTaiPlotGlossary(s,{channel:'noapp',recognized:true,messages:[{role:'user',content:text}]});
}
function readable(result){return result.map(e=>e.content).join('\n');}
function deliver(s,scene,part,options={}){
 const config=s.story55.config||STORY55_CONFIG;
 const index=config.scenes[scene].findIndex(([actor,content])=>content.includes(part)&&(!options.actor||actor===options.actor));
 assert(index>=0,scene+': '+part);
 const [actor,text]=config.scenes[scene][index];
 const id='s55-'+scene+'-'+index;
 const channel=options.channel||'noapp';
 let conversation=s.content.conversations[channel].find(c=>c.id===(channel==='noapp'?'tai':channel==='wechat'?'group':'s55-ouroboros'));
 if(!conversation){
  conversation={id:channel==='wechat'?'group':'s55-ouroboros',messages:[]};
  s.content.conversations[channel].push(conversation);
 }
 const msg={id,storyTag:'story55',day:s.day,from:actor==='me'?'me':'tai',kind:'text',text,actual:true};
 conversation.messages.push(msg);return msg;
}

test('all authored lines are indexed, including private scenes that must NOT be shown to Xi Tai',()=>{
 const config=structuredClone(STORY55_CONFIG);applyD55Definition(config);
 const entries=indexAuthoredPresetKnowledge(config);
 assert(entries.some(e=>e.sceneId==='d53-tai-night'&&e.scope==='tai-direct'));
 assert(entries.some(e=>e.sceneId==='d55-briefing'&&e.scope==='private'));
 assert(entries.some(e=>e.sceneId==='d55-xiaoxin'&&e.scope==='private'));
 const extra={id:'test-future-preset',kind:'scene',title:'新預設',day:40,channel:'noapp',conversationId:'tai'};
 config.nodes.push(extra);config.scenes[extra.id]=[['me','約定星期天看北極光']];
 assert(indexAuthoredPresetKnowledge(config).some(e=>e.sceneId===extra.id&&e.text.includes('北極光')));
});

test('newly delivered NoApp story lines turn into scoped lore without hand-maintained terms',()=>{
 const s=fixture();
 assert.equal(selectTaiDeliveredPresetKnowledge(s,'你的攝像頭膠布呢').length,0);
 deliver(s,'d53-tai-night','攝像頭');
 // The source is an actually delivered dialogue line, not a future authored draft.
 assert.match(readable(ask(s,'你之前說過攝像頭的事？')),/攝像頭/);
 assert(!readable(ask(s,'你之前說過攝像頭的事？')).includes('D55'));
});

test('altered, unplayed and privately delivered lines are rejected by the same evidence contract',()=>{
 const s=fixture();
 const m=deliver(s,'d53-tai-night','手辦已經包好了');
 assert.match(readable(ask(s,'手辦已經包好沒')),/手辦已經包好了/);
 m.actual=false;
 assert.equal(selectTaiDeliveredPresetKnowledge(s,'手辦已經包好沒').length,0);
 m.actual=true;m.text='假造的新詞';
 assert.equal(selectTaiDeliveredPresetKnowledge(s,'手辦已經包好沒').length,0);
 const w=deliver(s,'d53-action-start','哥，我只給你這一次機會',{channel:'wechat'});
 assert.equal(selectTaiDeliveredPresetKnowledge(s,'我只給你這一次機會').length,0);
 w.actual=false;
});

test('Fu Longsheng and the 200 hired people update only AFTER the matching D53 NoApp lines',()=>{
 const s=fixture(),before=readable(ask(s,'傅隆生和那兩百個雇佣兵怎麼回事'));
 assert.match(before,/傅隆生/);
 assert.doesNotMatch(before,/已親口.*兩百|親口告訴熙泰，自己安排了兩百/);
 const warning=deliver(s,'d53-tai-night','傅隆生不會放過我的');
 assert.match(readable(ask(s,'傅隆生是什麼人')),/D53熙蒙親口/);
 const force=deliver(s,'d53-tai-night','兩百個人');
 assert.match(readable(ask(s,'雇佣兵有多少人？')),/兩百個人/);
 force.actual=false;warning.actual=false;
 assert.doesNotMatch(readable(ask(s,'雇佣兵有多少人？')),/D53熙蒙親口告訴熙泰，自己安排了兩百/);
});

test('Wynn remains invisible before D55 briefing is actually spoken, and never implies success',()=>{
 const s=fixture(55);
 assert.equal(readable(ask(s,'永利计划要怎么撤离？')),'');
 s.story55.scenes['d55-briefing']={index:4};
 assert.equal(readable(ask(s,'永利计划要怎么撤离？')),'');
 s.story55.scenes['d55-briefing'].index=5;
 const t=readable(ask(s,'永利计划要怎么撤离？'));
 assert.match(t,/永利皇宮/);assert.match(t,/晚上十點前/);assert.match(t,/不是撤離成功/);
});

test('Xi Wang fact, private-scope rule, and worldbook decision/text snapshot reuse',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 assert.match(readable(ask(s,'熙旺是誰')),/三胞胎兄長/);
 const event=deliver(s,'d53-tai-night','如果計劃失敗，傅隆生不會放過我的');
 const messages=[{role:'user',content:'還記得我說傅隆生不會放過我嗎？'}];
 const snapshot=captureTaiWorldbook(store,{channel:'noapp',recognized:true,day:53,messages,turnId:'lore:53'});
 assert(snapshot.entries.some(e=>e.id==='story-lore:fu-longsheng'));
 assert(snapshot.entries.some(e=>e.id.startsWith('story-lore:preset-')));
 const ids=snapshot.entries.map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(captureTaiWorldbook(store,{channel:'noapp',recognized:true,day:53,messages,turnId:'lore:53'}),snapshot);
 event.actual=false;
 assert.equal(selectTaiDeliveredPresetKnowledge(s,'傅隆生不會放過我').length,0);
 assert.equal(projectTaiPlotGlossary(s,{channel:'mirage',recognized:false,messages}).length,0);
});
