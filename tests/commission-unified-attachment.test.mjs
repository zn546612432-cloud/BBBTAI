import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {handle as handleKira} from '../src/apps/kira/index.js';
import {render as renderFiles,handle as handleFiles} from '../src/apps/files/index.js';
import {begin} from '../src/apps/ghost/state.js';
import {D01_ATTACHMENT,D01_REPAIR} from '../src/story/d01/runtime.js';
import {D02_MAIL,D02_A_MAIL,D02_S,D02_A,D02_KEY_FILES} from '../src/story/d02/runtime.js';
import {D03_MAIL,D03_ORDER,d03StepId,seedD03Contract,acceptD03Contract,tickD03Contract} from '../src/story/d03/contract.js';
import {D04_CONTRACTS,D04_MAIL,D04_STEP,seedD04Contracts,acceptD04Contract,tickD04Contracts} from '../src/story/d04/contract.js';
import {commissionAttachment,openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';

const fresh=()=>{
 const s=activateStory55(initialState());s.day=3;s.clock='13:40';s.unlocked=true;
 s.nav.current={appId:'kira',route:'/',params:{}};
 seedD03Contract(s);assert.equal(acceptD03Contract(s),true);
 s.day=4;s.clock='19:52';seedD04Contracts(s);
 for(const def of D04_CONTRACTS)assert.equal(acceptD04Contract(s,def.id),true);
 return s;
};
const store=s=>({get:()=>s,update:fn=>fn(s)});
const context=s=>{
 const route=[];
 return {store:store(s),route,router:{open:args=>{route.push(args);return args;}},toast:()=>{}};
};
const countCards=html=>(html.match(/class="kira-d01-attachment"/g)||[]).length;
test('D03 and D04 have one native clickable encrypted file, no generic attachment CTA',()=>{
 const s=fresh();
 for(const id of [D03_MAIL,...D04_CONTRACTS.map(d=>D04_MAIL(d.id))]){
  const html=kiraDetail(s,id),file=commissionAttachment(s,id);
  assert.equal(countCards(html),1,id);
  assert.ok(html.includes('1 個附件'));
  assert.ok(html.includes(file.name));
  assert.ok(html.includes('data-action="kira-open-commission-file"'));
  assert.ok(!html.includes('查看附件'));
 }
 for(const [mailId,orderId,name,action] of [
  [D01_ATTACHMENT,D01_REPAIR,'mirage001.key','kira-d01-open-file'],
  [D02_MAIL,D02_S,D02_KEY_FILES[D02_S],'kira-d02-open-file'],
  [D02_A_MAIL,D02_A,D02_KEY_FILES[D02_A],'kira-d02-open-file']
 ]){
  s.content.mail.unshift({id:mailId,from:'MIRAGE',subject:'ACCESS',body:'授權憑證',
   day:4,time:'19:52',attachments:[name],read:false});
  assert.equal(commissionAttachment(s,mailId).orderId,orderId);
  const html=kiraDetail(s,mailId);
  assert.equal(countCards(html),1);
  assert.ok(html.includes(name));
  assert.ok(html.includes('data-action="'+action+'"'));
 }
});
test('D03 legacy two-file saves migrate to one attached package without deleting content',()=>{
 const s=fresh(),m=s.content.mail.find(x=>x.id===D03_MAIL);
 assert.deepEqual(m.attachments,['dataset_0521.enc']);
 m.attachments=['dataset_0521.enc','manifest.json'];
 m.body=m.body.replace('附件：dataset_0521.enc（內含 manifest.json）','附件：dataset_0521.enc、manifest.json');
 tickD03Contract(s);
 assert.deepEqual(m.attachments,['dataset_0521.enc']);
 assert.ok(!m.body.includes('附件：dataset_0521.enc、manifest.json'));
 assert.equal(countCards(kiraDetail(s,D03_MAIL)),1);
});
test('D03 file opens Files and then Ghost; no Ghost run before file authorization',()=>{
 const s=fresh(),c=context(s),first=d03StepId(0);
 assert.equal(s.ghost.orders[first],undefined);
 assert.equal(openCommissionWithGhost(s,'not-a-real-mail'),null);
 handleKira('kira-open-commission-file',{dataset:{id:D03_MAIL}},c);
 const file=commissionAttachment(s,D03_MAIL);
 assert.equal(c.route.at(-1).route,file.route);
 assert.equal(s.content.mail.find(x=>x.id===D03_MAIL).read,true);
 const preview=renderFiles({store:store(s)},{route:file.route,params:{}});
 assert.ok(preview.includes('dataset_0521.enc'));
 assert.ok(preview.includes('data-action="files-commission-open-ghost"'));
 handleFiles('files-commission-open-ghost',{dataset:{id:D03_MAIL}},c);
 assert.deepEqual(c.route.at(-1),{appId:'ghost',route:'/contract',params:{orderId:first}});
 assert.equal(s.story55.d03Contract.attachmentOpened,true);
 assert.ok(s.ghost.orders[first]);
 assert.equal(begin(s,first,10000),true);
});
test('D04 C/B commissions each route one distinct local file into their configured first minigame',()=>{
 const s=fresh(),c=context(s);
 for(const def of D04_CONTRACTS){
  const mailId=D04_MAIL(def.id),file=commissionAttachment(s,mailId);
  assert.equal(file.name,def.attachment);
  assert.equal(s.content.mail.find(m=>m.id===mailId).attachments.length,1);
  assert.equal(s.ghost.orders[D04_STEP(def.id,0)],undefined);
  handleKira('kira-open-commission-file',{dataset:{id:mailId}},c);
  handleFiles('files-commission-open-ghost',{dataset:{id:mailId}},c);
  assert.equal(c.route.at(-1).params.orderId,D04_STEP(def.id,0));
  assert.equal(s.story55.d04Attachments[def.id],true);
  assert.equal(s.ghost.orders[D04_STEP(def.id,0)].type,def.stages[0]);
  assert.equal(begin(s,D04_STEP(def.id,0)),true);
 }
});
test('expired commissions never reopen GHOST and Mirage has no duplicate launch CTA',()=>{
 const s=fresh();
 s.day=8;s.clock='12:00';tickD03Contract(s);tickD04Contracts(s);
 assert.equal(openCommissionWithGhost(s,D03_MAIL),null);
 for(const def of D04_CONTRACTS)assert.equal(openCommissionWithGhost(s,D04_MAIL(def.id)),null);
 const source=readFileSync(new URL('../src/apps/mirage/index.js',import.meta.url),'utf8');
 assert.ok(!source.includes("+btn('mc-d03-run'"));
 assert.ok(!source.includes("+btn('mc-d04-run'"));
 assert.ok(source.includes("btn('mc-d03-mail'"));
 assert.ok(source.includes("btn('mc-d04-mail'"));
});
