import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55} from '../src/services/story55/runtime.js';
import {story55Config,nodeStatus,completed} from '../src/services/story55/state.js';
import {scriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {canCharge,plugIn} from '../src/system/power/battery.js';

test('D24 Flow keeps its mandatory overnight scene open until the final bubble',()=>{
 const s=initialState();activateStory55(s);
 s.day=24;s.clock='23:59';s.batteryPercent=20;s.story55.activeScene=null;
 const cfg=story55Config(s),lines=cfg.scenes.lead;
 for(const node of cfg.nodes)if(node.gateDay<=24&&node.id!=='lead')
  s.story55.completed[node.id]={day:node.day,clock:'20:00',test:true};
 const flow='mc-flow-d03';
 s.content.conversations.mirage??=[];
 if(!s.content.conversations.mirage.some(c=>c.id===flow))
  s.content.conversations.mirage.push({id:flow,name:'Flow',messages:[],unread:0});
 assert.equal(lines.length,15);
 assert.equal(lines.filter(x=>x[0]==='me').length,6);
 assert.equal(nodeStatus(s,'lead').state,'ready');
 assert.equal(canCharge(s),false);
 advanceGameMinutes(s,200);
 assert.equal(s.day,24);assert.equal(s.clock,'03:00');
 assert.equal(s.batteryPercent,1);assert.equal(s.emergencyCharge,false);
 assert.equal(scriptedDraft55(s,'mirage',flow)?.text,lines[0][1]);
 assert.equal(canCharge(s),false);
 for(let i=0;i<lines.length;i++)advanceScene55(s,'lead',{now:1000+i*2000});
 assert.equal(completed(s,'lead'),true);
 const msgs=s.content.conversations.mirage.find(c=>c.id===flow).messages.filter(m=>String(m.id).startsWith('s55-lead-v3-'));
 assert.equal(msgs.length,15);
 assert.equal(msgs.filter(m=>m.from==='me').length,6);
 assert.equal(msgs.at(-1).text,lines.at(-1)[1]);
 assert.equal(canCharge(s),true);
 assert.equal(plugIn(s),true);
 assert.equal(s.day,25);
 assert.equal(s.clock,'08:00');
});
