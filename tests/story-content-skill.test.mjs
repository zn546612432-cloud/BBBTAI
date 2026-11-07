import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {storyDayPacket} from '../scripts/new-story-day.mjs';
import {validateStoryPacket,APP_CAPABILITIES} from '../scripts/validate-story-packet.mjs';
import {auditStorySkill} from '../scripts/audit-story-skill.mjs';
import {describeAppCapabilities} from '../scripts/list-story-app-capabilities.mjs';

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


const crossAppSrc=new URL('../.agents/skills/ximeng-story-fill/examples/d23-cross-app-needs-adapters.example.json',import.meta.url);
const crossApp=()=>JSON.parse(readFileSync(crossAppSrc,'utf8'));

test('Skill v2: 25 installed App modules are accounted for, including hidden aliases',()=>{
 assert.equal(Object.keys(APP_CAPABILITIES.apps).length,25);
 assert.equal(APP_CAPABILITIES.apps.mail.hidden,true);
 assert.equal(APP_CAPABILITIES.apps.developer.appId,'editor');
 assert.equal(APP_CAPABILITIES.apps.phone.overriddenBy,'src/apps/phone/replica.js');
 assert.equal(APP_CAPABILITIES.apps.weather.overriddenBy,'src/apps/weather/replica.js');
 assert.equal(APP_CAPABILITIES.apps.instagram,undefined);
 assert.equal(sample().schemaVersion,2);
 assert.equal(draft().schemaVersion,2);
});

test('D23-D25 SMS -> browser -> aomi order -> WeChat is valid planning but not an executable feature',()=>{
 const d=crossApp(),planning=validateStoryPacket(d),release=validateStoryPacket(d,{strict:true});
 assert.equal(planning.ok,true,planning.errors.join('\n'));
 assert.ok(planning.warnings.filter(x=>x.includes('尚无通用剧情适配器')).length>=4);
 assert.equal(release.ok,false,'strict must fail until all generic adapters exist');
 assert.ok(release.errors.filter(x=>x.includes('尚无通用剧情适配器')).length>=4);
 assert.equal(release.summary.day,23);
 assert.equal(release.summary.events,5);
 assert.equal(release.summary.apps.length,4);
});

test('Reject D06 dedicated flow reused on D23 without actual new adapter',()=>{
 const d=sample();
 d.day=23;
 d.date='2025-06-10';
 for(const ev of d.events)ev.timing.day=23;
 fail(d,'仅 D6 已接通');
});

test('Reject an app that exists as a folder but is not registered for phone story actions',()=>{
 const d=sample();d.events[2].surface='instagram';
 fail(d,'未在 src/system/registry.js 中注册');
});

test('Reject wrong operation on a registered App and wrong canonical owner',()=>{
 const d=sample();d.events[1].capability='ledger.post';
 fail(d,'没有声明此项能力');
 const t=sample();t.events[2].owner='bank';
 fail(t,'能力只能由统一权属');
});

test('Reject legacy surface alias sms for new v2 contract: use actual messages App ID',()=>{
 const d=sample();d.events[2].surface='sms';
 fail(d,'未在 src/system/registry.js 中注册');
});

test('Block fake publication through stage:approved while adapters are still required',()=>{
 const d=crossApp();d.stage='approved';
 fail(d,'尚无通用剧情适配器');
});

test('NoApp scripted scene needs explicit story gate even before adapter is available',()=>{
 const d=crossApp();const e=d.events[0];
 e.surface='noapp';e.owner='noapp';e.capability='ai.scripted-message';e.actor='熙泰';
 fail(d,'fact:tai-recognized');
 e.requires=['fact:tai-recognized'];
 const next=validateStoryPacket(d);
 assert.equal(next.ok,true,next.errors.join('\n'));
 assert.ok(next.warnings.some(x=>x.includes('尚无通用剧情适配器')));
});

test('Reject the use of hidden aliases as a shortcut to bypass KIRA capabilities',()=>{
 const d=crossApp();const e=d.events[0];
 e.surface='mail';e.capability='mail.receive';e.owner='kira';
 fail(d,'该 App 没有声明此项能力');
});

test('Reject v1 packet strict publication even if its old fields are otherwise valid',()=>{
 const d=sample();d.schemaVersion=1;
 const old=validateStoryPacket(d);
 assert.equal(old.ok,true,old.errors.join('\n'));
 assert.ok(old.warnings.some(x=>x.includes('旧v1')));
 fail(d,'不可直接通过严格发布验收');
});

test('Reject events missing capability in v2 packets',()=>{
 const d=sample();delete d.events[0].capability;
 fail(d,'v2 每个事件必须声明');
});


test('Story:apps lists real App capabilities without claiming universal run support',()=>{
 const a=describeAppCapabilities('wechat');
 assert.equal(a.length,1);
 assert.equal(a[0].appId,'wechat');
 assert.ok(a[0].actions.some(x=>x.name==='chat.d06-wish-player'&&x.state==='wired-day'));
 assert.ok(a[0].actions.some(x=>x.name==='chat.receive-text'&&x.state==='adapter-required'));
 assert.equal(describeAppCapabilities().length,25);
 assert.throws(()=>describeAppCapabilities('instagram'),/未在真实注册表/);
});

test('Story:apps CLI identifies app requirements and its output is valid JSON',()=>{
 const raw=execFileSync(process.execPath,['scripts/list-story-app-capabilities.mjs','aomi','--json'],{encoding:'utf8'});
 const a=JSON.parse(raw);
 assert.equal(a[0].appId,'aomi');
 assert.ok(a[0].actions.some(x=>x.name==='order.place'&&x.state==='adapter-required'));
 const bad=spawnSync(process.execPath,['scripts/list-story-app-capabilities.mjs','instagram'],{encoding:'utf8'});
 assert.notEqual(bad.status,0);
});

test('Repository app capability CLI and strict example remain working via npm scripts',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.scripts['story:apps'],'node scripts/list-story-app-capabilities.mjs');
 assert.equal(pkg.scripts['story:audit'],'node scripts/audit-story-skill.mjs');
 const r=spawnSync(process.execPath,['scripts/audit-story-skill.mjs'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 assert.match(r.stdout,/appsAudited":25/);
});
