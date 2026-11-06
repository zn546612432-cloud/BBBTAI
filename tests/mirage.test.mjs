import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore} from '../src/services/storage.js';
import {initializeMirage,saveRecord,purchase,cipher,contactNames} from '../src/apps/mirage/data.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('Mirage starts with four durable named contacts and also retains player-authored identities',()=>{const storage=memory(),store=new PhoneStore(storage);initializeMirage(store);assert.ok(store.get().content.conversations.mirage.length>=4);saveRecord(store,'contacts',null,{name:'私有联系人',authored:true});initializeMirage(store);assert.ok(store.get().content.conversations.mirage.some(c=>c.name==='私有联系人'));
 assert.equal(store.get().content.conversations.mirage.filter(c=>c.storySeed&&c.day!==5).length>=4,true);assert.equal(new PhoneStore(storage).get().content.mirage.balance,300000);});
test('Mirage contact, product and bounty edits persist independently of other phone apps',()=>{const storage=memory(),store=new PhoneStore(storage);initializeMirage(store);const wechat=structuredClone(store.get().content.conversations.wechat);saveRecord(store,'contacts',null,{name:'Test Alias',avatar:'data:image/png;base64,dGVzdA=='});const c=store.get().content.conversations.mirage.at(-1);saveRecord(store,'contacts',c.id,{name:'New Alias',online:true});assert.equal(store.get().content.conversations.mirage.at(-1).name,'New Alias');assert.equal(store.get().content.conversations.mirage.at(-1).avatar,'data:image/png;base64,dGVzdA==');saveRecord(store,'products',null,{name:'CUSTOM ITEM',category:'EQUIPMENT',price:12.5,stock:2});saveRecord(store,'bounties',null,{title:'CUSTOM CONTRACT',reward:'$ 100',status:'OPEN'});const restored=new PhoneStore(storage).get();assert.equal(restored.content.mirage.products.at(-1).price,12.5);assert.equal(restored.content.orders.at(-1).title,'CUSTOM CONTRACT');assert.deepEqual(restored.content.conversations.wechat,wechat);});
test('Mirage checkout changes balance, stock, assets and ledger together; failures leave all records untouched',()=>{const store=new PhoneStore(memory());initializeMirage(store);store.update(s=>{s.content.mirage.cart=[{id:'mc-p1',qty:2}];});purchase(store);let d=store.get().content.mirage;assert.equal(d.balance,276000);assert.equal(d.products[0].stock,2);assert.equal(d.assets[0].quantity,2);assert.equal(d.transactions[0].amount,-24000);assert.deepEqual(d.cart,[]);assert.throws(()=>purchase(store),/EMPTY/);store.update(s=>{s.content.mirage.cart=[{id:'mc-p1',qty:3}];});let before=structuredClone(store.get());assert.throws(()=>purchase(store),/STOCK/);assert.deepEqual(store.get(),before);store.update(s=>{s.content.mirage.cart=[{id:'mc-p1',qty:1}];s.content.mirage.balance=1;});before=structuredClone(store.get());assert.throws(()=>purchase(store),/FUNDS/);assert.deepEqual(store.get(),before);});
test('Mirage cinematic ciphertext is deterministic, excludes source plaintext and varies across messages',()=>{const a=cipher('This message is private','a');assert.ok(a.startsWith('%%ENC BEGIN%%'));assert.ok(a.endsWith('%%ENC END%%'));assert.ok(!a.includes('This message is private'));assert.equal(a,cipher('This message is private','a'));assert.notEqual(a,cipher('This message is private','b'));});
test('recently opened authored identity rises above the other contacts',async()=>{const store=new PhoneStore(memory());initializeMirage(store);saveRecord(store,'contacts',null,{name:'A',authored:true});saveRecord(store,'contacts',null,{name:'B',authored:true});const {contacts}=await import('../src/apps/mirage/data.js');assert.equal(contacts(store.get())[0].name,'A');store.update(s=>{s.content.conversations.mirage.find(c=>c.name==='B').lastOpened=2;});assert.equal(contacts(new PhoneStore(store.storage).get())[0].name,'B');});
test('Mirage login keeps SIGN UP and prefills the fixed account, restored after three taps',async()=>{const {render,onEnter,accountTap}=await import('../src/apps/mirage/index.js');const store=new PhoneStore(memory());onEnter();const html=render({store},{route:'/'});assert.match(html,/value="NYARLATHOTEP"/);assert.match(html,/name="password"[^>]+value="miragecipheraccess"/);assert.match(html,/data-action="mc-sign-up"[^>]*>SIGN UP/);assert.match(html,/REGISTRATION IS TEMPORARILY UNAVAILABLE/);const input={value:''};accountTap(input);accountTap(input);assert.equal(input.value,'');accountTap(input);assert.equal(input.value,'NYARLATHOTEP');});
test('completed bounties leave the active list and remain available in the completed archive',async()=>{const {bountyGroups}=await import('../src/apps/mirage/data.js');const store=new PhoneStore(memory());const id=store.get().content.orders[0].id;assert.deepEqual(bountyGroups(store.get().content.orders).open.map(o=>o.id),[id]);store.update(s=>{s.content.orders.find(o=>o.id===id).status='ACCEPTED';});assert.deepEqual(bountyGroups(store.get().content.orders).open.map(o=>o.id),[id]);store.update(s=>{s.content.orders.find(o=>o.id===id).status='COMPLETED';});assert.deepEqual(bountyGroups(store.get().content.orders).open,[]);assert.equal(bountyGroups(store.get().content.orders).completed[0].id,id);assert.equal(bountyGroups(new PhoneStore(store.storage).get().content.orders).completed[0].id,id);});
test('hacker bounty migration is once-only, acceptance creates one KIRA mission and choices gate step three',async()=>{const {HACKER_BOUNTY_ID,HACKER_MAIL_ID,acceptHackerBounty,phishingThemes,advanceHackerMission}=await import('../src/apps/mirage/mission.js');const {render:renderKira,handle:handleKira}=await import('../src/apps/kira/index.js');const store=new PhoneStore(memory());initializeMirage(store);initializeMirage(store);assert.equal(store.get().content.orders.filter(o=>o.id===HACKER_BOUNTY_ID).length,1);const order=store.get().content.orders.find(o=>o.id===HACKER_BOUNTY_ID);assert.equal(order.title,'招募黑客');assert.equal(order.description,'窃取目标信息。');acceptHackerBounty(store);acceptHackerBounty(store);assert.equal(store.get().content.mail.filter(m=>m.id===HACKER_MAIL_ID).length,1);assert.match(renderKira({store},{route:'/mail/'+HACKER_MAIL_ID}),/【mirage】新订单/);const ctx={store,toast:()=>{},router:{open:()=>{}}};handleKira('kira-mission-theme',{dataset:{theme:'entertainment'}},ctx);assert.equal(store.get().content.mail.find(m=>m.id===HACKER_MAIL_ID).selectedTheme,undefined);advanceHackerMission(store,2);handleKira('kira-mission-theme',{dataset:{theme:phishingThemes.find(t=>t.correct).id}},ctx);handleKira('kira-mission-send',{dataset:{}},ctx);assert.equal(new PhoneStore(store.storage).get().content.mail.find(m=>m.id===HACKER_MAIL_ID).missionStep,3);});

test('D01 repair button accepts on D01 and displays locked state after day one',async()=>{
 const {activateStory55}=await import('../src/services/story55/runtime.js');
 const {render,handle}=await import('../src/apps/mirage/index.js');
 const {setMirageAuthenticated}=await import('../src/apps/mirage/session.js');
 const store=new PhoneStore(memory()),messages=[];
 store.update(s=>activateStory55(s));
 const ctx={store,router:{open:()=>{}},toast:t=>messages.push(t),refresh:()=>{}};
 setMirageAuthenticated(true);
 try{
  let html=render(ctx,{route:'/order/mirage001',params:{}});
  assert.match(html,/data-action="mc-accept-bounty"[^>]*data-id="mirage001"/);
  assert.match(html,/ACCEPT CONTRACT/);
  handle('mc-accept-bounty',{dataset:{id:'mirage001'}},ctx,{route:'/order/mirage001'});
  assert.equal(store.get().content.orders.find(o=>o.id==='mirage001').status,'ACCEPTED');
  assert.equal(store.get().story55.d01.repairAccepted,true);
  assert.ok(messages.includes('CONTRACT ACCEPTED · KIRA'));
  store.update(s=>{s.day=2;s.content.orders.find(o=>o.id==='mirage001').status='OPEN';s.story55.d01={};});
  html=render(ctx,{route:'/order/mirage001',params:{}});
  assert.match(html,/D01 ONLY · UNAVAILABLE/);
  assert.match(html,/data-action="mc-accept-bounty"[^>]*disabled/);
 }finally{setMirageAuthenticated(false);}
});

test('D06 Flow posts exactly one live message, then Mirage uses the shared single-file five-stage contract',async()=>{
 const {activateStory55,tickStory55}=await import('../src/services/story55/runtime.js');
 const {rebuildStory55AtDay}=await import('../src/services/story55/rebuild.js');
 const {D06_CONTRACT,D06_ORDER_ID}=await import('../src/story/d06/commission.js');
 const {FLOW_CONTACT}=await import('../src/services/story55/flow-d03.js');
 const {D04_MAIL,D04_STEP,submitD04Contract}=await import('../src/story/d04/contract.js');
 const {commissionAttachment,openCommissionWithGhost,commissionPendingGhostStep}=await import('../src/services/commissions/attachment-flow.js');
 const {render:renderMirage,handle:handleMirage}=await import('../src/apps/mirage/index.js');
 const {render:renderKira,handle:handleKira}=await import('../src/apps/kira/index.js');
 const {render:renderFiles,handle:handleFiles}=await import('../src/apps/files/index.js');
 const {render:renderGhost,handle:handleGhost}=await import('../src/apps/ghost/index.js');
 const {begin,finish}=await import('../src/apps/ghost/state.js');
 const {completed}=await import('../src/services/story55/state.js');
 const {setMirageAuthenticated}=await import('../src/apps/mirage/session.js');
 const store=new PhoneStore(memory()),routes=[],toasts=[];
 store.update(s=>{activateStory55(s);rebuildStory55AtDay(s,6,'08:20');});
 const ctx={store,router:{open:r=>routes.push(r)},toast:x=>toasts.push(x),refresh:()=>{}};
 const o=()=>store.get().content.orders.find(x=>x.id===D06_ORDER_ID),mailId=D04_MAIL(D06_ORDER_ID);
 const flow=()=>store.get().content.conversations.mirage.find(x=>x.id===FLOW_CONTACT).messages.filter(m=>m.id==='flow-d06-wallet-bounty');
 setMirageAuthenticated(true);
 try{
  assert.equal(flow().length,1);
  assert.match(flow()[0].text,/10 BTC/);
  assert.equal(flow()[0].sentDate,'2025-05-24');
  store.update(s=>{tickStory55(s);tickStory55(s);});
  assert.equal(flow().length,1,'repeated ticks cannot resend Flow');
  assert.equal(o().status,'OPEN');assert.equal(o().reward,'10 BTC');assert.equal(o().category,'S');
  assert.deepEqual(D06_CONTRACT.stages,['cipher','veil','route','route','extract']);
  assert.equal(store.get().content.mail.filter(m=>m.id===mailId).length,0);
  assert.match(renderMirage(ctx,{route:'/order/'+D06_ORDER_ID,params:{}}),/ACCEPT CONTRACT/);
  handleMirage('mc-accept-bounty',{dataset:{id:D06_ORDER_ID}},ctx,{route:'/order/'+D06_ORDER_ID});
  assert.equal(o().status,'ACCEPTED');
  const mail=store.get().content.mail.find(m=>m.id===mailId);
  assert.deepEqual(mail.attachments,['wallet_challenge_0524.enc']);
  assert.match(mail.body,/MIRAGE-D06/);
  assert.equal(store.get().content.mail.filter(m=>m.id===mailId).length,1);
  assert.match(renderKira(ctx,{route:'/mail/'+mailId,params:{}}),/kira-open-commission-file/);
  handleKira('kira-open-commission-file',{dataset:{id:mailId}},ctx);
  assert.equal(routes.at(-1).appId,'files');
  assert.equal(routes.at(-1).route,'/attachment/commission/'+encodeURIComponent(mailId));
  assert.match(renderFiles(ctx,{route:routes.at(-1).route,params:{}}),/files-commission-open-ghost/);
  assert.equal(commissionAttachment(store.get(),mailId).name,'wallet_challenge_0524.enc');
  handleFiles('files-commission-open-ghost',{dataset:{id:mailId}},ctx);
  assert.equal(routes.at(-1).appId,'ghost');
  const first=D04_STEP(D06_ORDER_ID,0);
  assert.equal(routes.at(-1).params.orderId,first);
  assert.equal(commissionPendingGhostStep(store.get(),mailId),first);
  assert.match(renderGhost(ctx,{route:'/contract',params:{orderId:first}}),/請輸入 KIRA 郵件內的授權密鑰/);
  assert.equal(begin(store.get(),first),false,'GHOST must not start before manual key validation');
  const priorDocument=globalThis.document;
  const field={value:'wrong'};
  globalThis.document={getElementById:()=>field};
  try{
   handleGhost('gh-start',{dataset:{}},ctx,{route:'/contract',params:{orderId:first}});
   assert.equal(store.get().ghost.orders[first].status,'authorized');
   assert.ok(toasts.some(x=>x.includes('密鑰不匹配')));
   field.value='MIRAGE-D06';
   handleGhost('gh-start',{dataset:{}},ctx,{route:'/contract',params:{orderId:first}});
   assert.equal(store.get().ghost.orders[first].keyVerified,true);
   assert.equal(store.get().ghost.orders[first].status,'running');
  }finally{globalThis.document=priorDocument;}
  const before=store.get().content.mirage.digitalBalance;
  for(let i=0;i<D06_CONTRACT.stages.length;i++){
   const id=D04_STEP(D06_ORDER_ID,i);
   if(i>0)store.update(s=>{assert.equal(begin(s,id),true);});
   assert.equal(store.get().ghost.orders[id].type,D06_CONTRACT.stages[i]);
   assert.equal(store.get().ghost.orders[id].status,'running');
   store.update(s=>finish(s,id,true));
   assert.equal(store.get().ghost.orders[id].status,'success');
   if(i<4)assert.equal(commissionPendingGhostStep(store.get(),mailId),D04_STEP(D06_ORDER_ID,i+1));
  }
  assert.equal(o().status,'READY');
  assert.equal(completed(store.get(),'wallet'),false);
  assert.equal(store.get().content.mirage.digitalBalance,before);
  assert.equal(commissionPendingGhostStep(store.get(),mailId),null);
  assert.match(renderMirage(ctx,{route:'/order/'+D06_ORDER_ID,params:{}}),/READY TO SUBMIT/);
  store.update(s=>assert.equal(submitD04Contract(s,D06_ORDER_ID),true));
  assert.equal(o().status,'COMPLETED');assert.equal(completed(store.get(),'wallet'),true);
  assert.equal(store.get().content.mirage.digitalBalance,before+10);
  assert.equal(store.get().content.mirage.transactions.filter(t=>t.id==='s55-wallet-10btc').length,1);
  assert.equal(store.get().content.mirage.digitalTransactions.filter(t=>t.orderId===D06_ORDER_ID).length,1);
  store.update(s=>{assert.equal(submitD04Contract(s,D06_ORDER_ID),false);tickStory55(s);});
  assert.equal(store.get().content.mirage.digitalBalance,before+10,'no double reward');
  assert.equal(store.get().content.mail.filter(m=>m.id===mailId).length,1);
  const restored=new PhoneStore(store.storage).get();
  assert.equal(restored.content.orders.find(x=>x.id===D06_ORDER_ID).status,'COMPLETED');
  assert.equal(restored.content.mirage.digitalBalance,before+10);
  assert.equal(restored.content.mail.filter(m=>m.orderId===D06_ORDER_ID&&m.attachments?.length===1).length,1);
 }finally{setMirageAuthenticated(false);}
});

test('D06 accepted legacy save upgrades to one proper KIRA attachment and never creates an obsolete wallet mail',async()=>{
 const {activateStory55,tickStory55}=await import('../src/services/story55/runtime.js');
 const {rebuildStory55AtDay}=await import('../src/services/story55/rebuild.js');
 const {D06_ORDER_ID}=await import('../src/story/d06/commission.js');
 const {D04_MAIL}=await import('../src/story/d04/contract.js');
 const s=new PhoneStore(memory()).get();activateStory55(s);rebuildStory55AtDay(s,6,'09:00');
 const o=s.content.orders.find(x=>x.id===D06_ORDER_ID);
 Object.assign(o,{status:'ACCEPTED',title:'10 BTC / WALLET CHALLENGE'});
 s.content.mail.push({id:'s55-wallet-d06-authorization',from:'MIRAGE',body:'legacy',project:'wallet',read:false});
 s.notifications.push({id:'s55-wallet-d06-authorization-notice',title:'KIRA',body:'legacy'});
 tickStory55(s);tickStory55(s);
 assert.equal(o.status,'ACCEPTED');
 assert.equal(o.title,'S 級懸賞 · 公開錢包挑戰');
 assert.equal(s.content.mail.some(m=>m.id==='s55-wallet-d06-authorization'),false);
 assert.equal(s.notifications.some(n=>n.id==='s55-wallet-d06-authorization-notice'),false);
 assert.equal(s.content.mail.filter(m=>m.id===D04_MAIL(D06_ORDER_ID)).length,1);
 assert.equal(s.content.mail.find(m=>m.id===D04_MAIL(D06_ORDER_ID)).attachments.length,1);
});

test('D06 Flow message waits for 08:10 and is silent historical catch-up after the day passes',async()=>{
 const {activateStory55,tickStory55}=await import('../src/services/story55/runtime.js');
 const {FLOW_CONTACT}=await import('../src/services/story55/flow-d03.js');
 const s=new PhoneStore(memory()).get();activateStory55(s);s.day=6;s.clock='08:09';tickStory55(s);
 const chat=s.content.conversations.mirage.find(c=>c.id===FLOW_CONTACT);
 assert.equal(chat.messages.some(m=>m.id==='flow-d06-wallet-bounty'),false);
 s.clock='08:10';tickStory55(s);
 assert.equal(chat.messages.filter(m=>m.id==='flow-d06-wallet-bounty').length,1);
 const past=new PhoneStore(memory()).get();activateStory55(past);past.day=7;past.clock='08:00';tickStory55(past);
 const history=past.content.conversations.mirage.find(c=>c.id===FLOW_CONTACT).messages.find(m=>m.id==='flow-d06-wallet-bounty');
 assert.equal(history.historical,true);
 assert.ok(past.notifications.some(n=>n.messageId===history.id&&n.silent));
});
