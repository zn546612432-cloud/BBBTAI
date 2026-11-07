import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {storyDayPacket} from '../scripts/new-story-day.mjs';
import {validateStoryPacket} from '../scripts/validate-story-packet.mjs';
import {auditStorySkill} from '../scripts/audit-story-skill.mjs';

const src=new URL('../.agents/skills/ximeng-story-fill/examples/d06-dinner.example.json',import.meta.url);
const draftSrc=new URL('../.agents/skills/ximeng-story-fill/templates/day-packet.template.json',import.meta.url);
const sample=()=>JSON.parse(readFileSync(src,'utf8'));
const draft=()=>JSON.parse(readFileSync(draftSrc,'utf8'));
const fail=(doc,needle)=>assert.ok(
 validateStoryPacket(doc,{strict:true}).errors.some(x=>x.includes(needle)),
 'Should reject '+needle+': '+JSON.stringify(validateStoryPacket(doc,{strict:true}).errors)
);

test('Skill sample: real D06 event chain validates in strict mode',()=>{
 const data=sample(),result=validateStoryPacket(data,{strict:true});
 assert.equal(result.ok,true,result.errors.join('\n'));
 assert.equal(result.summary.day,6);
 assert.equal(result.summary.events,10);
 assert.equal(result.summary.assets,1);
 const ids=data.events.map(x=>x.id);
 assert.ok(ids.indexOf('wish-dinner-player')<ids.indexOf('wish-dinner-booking'));
 assert.ok(ids.indexOf('wish-dinner-booking')<ids.indexOf('wish-dinner-photo'));
});

test('The D08 starter is a draft only, with no invented story scenes',()=>{
 const data=draft(),result=validateStoryPacket(data);
 assert.equal(result.ok,true,result.errors.join('\n'));
 assert.equal(result.summary.events,0);
 assert.ok(result.warnings.some(x=>x.includes('尚无')||x.includes('空的')));
 assert.equal(data.day,8);
 assert.equal(data.date,'2025-05-26');
});

test('Reject wrong D-day calendar date',()=>{
 const d=sample();d.date='2025-05-25';fail(d,'date');
});

test('Reject duplicate event and transaction IDs',()=>{
 const d=sample();d.events[1].id=d.events[0].id;fail(d,'重复');
 const t=sample();t.events.push(structuredClone(t.events[0]));fail(t,'交易 ID');
});

test('Reject auto-spoken player text even when a purchase succeeded',()=>{
 const d=sample();const e=d.events.find(x=>x.kind==='player-send');
 e.trigger={type:'previous-event',ref:'wish-dinner-payment'};
 fail(d,'原生 Send');
});

test('Reject unrelated AI or forbidden participants in the Wolf Cubs chat',()=>{
 const d=sample();d.events.find(x=>x.id==='wish-dinner-thanks-xin').actor='熙泰';
 fail(d,'狼崽团');
});

test('Reject images that have not been registered',()=>{
 const d=sample();d.events.find(x=>x.kind==='incoming-image').assetId='photo-missing';
 fail(d,'assetId');
});

test('Reject artificial bank credit via NPC message',()=>{
 const d=sample();d.events.find(x=>x.kind==='incoming-text').money={
  operation:'postBankTransaction',amount:350,currency:'USD',transactionId:'extra-credit'
 };
 fail(d,'普通对白');
});

test('Reject unregistered owners and duplicate required dependency order',()=>{
 const d=sample();d.events[2].owner='new-d06-bank';fail(d,'现有统一系统');
 const t=sample();t.events[2].requires=['wish-dinner-photo'];fail(t,'必须先定义');
});

test('Reject approved packets without full negative/late/restore test matrix',()=>{
 const d=sample();d.stage='approved';d.acceptance=d.acceptance.filter(x=>x.type!=='negative');
 fail(d,'negative');
});

test('Reject padded currency amounts with unsupported fractional cents',()=>{
 const d=sample();d.events.find(x=>x.kind==='purchase').money.amount=-350.001;
 fail(d,'美分');
});

test('Day scaffold auto-derives correct 55-day dates and never invents content',()=>{
 const d08=storyDayPacket(8);
 assert.equal(d08.date,'2025-05-26');
 assert.equal(d08.stage,'draft');
 assert.equal(d08.events.length,0);
 assert.equal(d08.assets.length,0);
 assert.equal(storyDayPacket(55).date,'2025-07-12');
 assert.throws(()=>storyDayPacket(56),/D01/);
});

test('New day CLI --stdout prints a schema-valid draft without writing phone code',()=>{
 const raw=execFileSync(process.execPath,['scripts/new-story-day.mjs','D08','--stdout'],{encoding:'utf8'});
 const packet=JSON.parse(raw);
 assert.equal(packet.day,8);
 assert.equal(packet.date,'2025-05-26');
 assert.equal(validateStoryPacket(packet).ok,true);
 const wrong=spawnSync(process.execPath,['scripts/new-story-day.mjs','D56','--stdout'],{encoding:'utf8'});
 assert.notEqual(wrong.status,0);
});

test('Story packet CLI actually exits successfully for the curated sample',()=>{
 const r=spawnSync(process.execPath,['scripts/validate-story-packet.mjs','--strict',
  '.agents/skills/ximeng-story-fill/examples/d06-dinner.example.json'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/PASS .*d06-dinner.example.json/);
});


test('Skill repository audit confirms actual files, agent entrypoint and runtime contracts',()=>{
 const audit=auditStorySkill();
 assert.equal(audit.ok,true,audit.errors.join('\n'));
 assert.ok(audit.filesChecked>=20);
});

test('Cross-day delivery: D06 paid gift can arrive on D08 without a second engine',()=>{
 const d=sample();
 const prior=d.events.find(e=>e.id==='wish-dinner-payment');
 const photo=d.events.find(e=>e.id==='wish-dinner-photo');
 photo.timing={day:8,at:'16:00'};
 photo.trigger={type:'order-delivered',ref:'d06-delivery'};
 photo.requires=[prior.id];
 photo.delivery={late:'silent'};
 const output=validateStoryPacket(d,{strict:true});
 assert.equal(output.ok,true,output.errors.join('\n'));
});

test('Reject deliveries dated before the packet or before predecessor day',()=>{
 const d=sample();
 d.events.find(e=>e.id==='wish-dinner-photo').timing.day=5;
 fail(d,'执行日必须');
 const t=sample();
 const send=t.events.find(e=>e.id==='wish-dinner-player');
 send.timing.day=8;
 const thanks=t.events.find(e=>e.id==='wish-dinner-thanks-xin');
 thanks.timing.day=7;
 fail(t,'发生在前置事件之前');
});

test('Reject same-day chronological reversal between explicitly scheduled events',()=>{
 const d=sample();
 const send=d.events.find(e=>e.id==='wish-dinner-player');
 send.timing.at='19:35';
 const thanks=d.events.find(e=>e.id==='wish-dinner-thanks-xin');
 thanks.timing.at='19:30';
 fail(d,'执行时间早于前置事件');
});

test('No player-authored reply may be silently replayed or auto-sent',()=>{
 const d=sample();
 d.events.find(e=>e.id==='wish-dinner-player').delivery.late='replay';
 fail(d,'不得跨日自动补发');
 const t=sample();
 t.events.find(e=>e.id==='wish-dinner-player').trigger.ref='wish-unpaid';
 fail(t,'user-send 必须依赖');
});

test('Time-triggered authored event needs a matching game clock, not a second schedule',()=>{
 const d=sample();
 d.events.find(e=>e.id==='wish-dinner-photo').timing.at='19:10';
 fail(d,'day-time 触发时刻');
});

test('Player send must explicitly declare the enabling event as a prerequisite',()=>{
 const d=sample();
 d.events.find(e=>e.id==='wish-dinner-player').requires=[];
 fail(d,'必须显式声明');
});
