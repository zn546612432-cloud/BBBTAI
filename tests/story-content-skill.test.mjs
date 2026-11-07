import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStoryPacket} from '../scripts/validate-story-packet.mjs';

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
 fail(d,'user-send');
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
 const d=sample();d.events[2].owner='new-d06-bank';fail(d,'已有');
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
