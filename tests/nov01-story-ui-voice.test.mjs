import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {restartState} from '../src/system/restart/index.js';
import {ensureMirageStory,WALLET_CHALLENGE_ID} from '../src/apps/mirage/contacts-seed.js';
import {acceptOuroborosChallenge,markOuroborosWon,ouroborosStage,ouroborosDraft,sendOuroborosPreset} from '../src/apps/mirage/ouroboros-flow.js';
import {contacts} from '../src/apps/mirage/data.js';
import {deliverTaiChessInvite} from '../src/services/chess-invites.js';
import {deferInvitation,dueChessReminders,sendUnansweredChessReminders} from '../src/services/invitations.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {assets} from '../src/apps/developer/features/assets/index.js';

test('D05 contract remains hidden on morning and is available after evening only',()=>{
 const s=initialState();s.day=5;s.clock='08:00';ensureMirageStory(s);
 assert.equal(s.content.orders.some(o=>o.id===WALLET_CHALLENGE_ID),false);
 assert.equal(acceptOuroborosChallenge(s),false);
 s.clock='20:00';ensureMirageStory(s);
 assert.equal(s.content.orders.some(o=>o.id===WALLET_CHALLENGE_ID),true);
 assert.equal(contacts(s).some(c=>c.id==='mc-ourob-d05'),false);
});
test('D05 sends ORDER CREATED on accepting and player sends staged messages after winning',()=>{
 const s=initialState();s.day=5;s.clock='21:00';s.content.mirage??={};ensureMirageStory(s);
 assert.equal(acceptOuroborosChallenge(s),true);
 let c=contacts(s).find(c=>c.id==='mc-ourob-d05');
 assert.equal(c.unread,1);assert.match(c.messages[0].text,/ORDER CREATED/);
 assert.equal(markOuroborosWon(s),true);
 assert.equal(ouroborosStage(s),'won');
 assert.equal(c.messages.length,1);
 assert.equal(ouroborosDraft(s,c.id),'我拿到了。');
 assert.equal(sendOuroborosPreset(s,c.id,'我拿到了。'),true);
 assert.equal(c.messages.at(-1).text,'你属于哪个组织？');
 c.messages.find(m=>m.id==='ou-group').delivery={day:5,clock:'21:01'};
 assert.equal(sendOuroborosPreset(s,c.id,'我单干。'),true);
 assert.match(c.messages.at(-1).text,/百分之八十/);
 assert.equal(sendOuroborosPreset(s,c.id,'因为我是天才。'),true);
 assert.match(c.messages.at(-1).text,/奖励饼干/);
 assert.equal(ouroborosDraft(s,c.id),'');
 assert.equal(sendOuroborosPreset(s,c.id,'因为我是天才。'),false);
});
test('unanswered chess invitation follows up once after four game hours even if deferred',()=>{
 const s=initialState();s.day=56;s.clock='21:18';
 deliverTaiChessInvite(s,{day:56,clock:'21:17',index:0});
 const id=s.invitations.find(i=>i.source==='story-invitation').id;
 const store={get:()=>s,update:f=>f(s)};deferInvitation(store,id);
 assert.equal(s.invitations.find(i=>i.id===id).status,'deferred');
 s.day=57;s.clock='01:17';assert.equal(dueChessReminders(s),false);
 s.clock='01:18';assert.equal(dueChessReminders(s),true);
 assert.equal(sendUnansweredChessReminders(s).length,1);
 assert.equal(dueChessReminders(s),false);
 assert.equal(sendUnansweredChessReminders(s).length,0);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.id.startsWith('tai-chess-followup-')).length,1);
});
test('NoApp text bubbles and voice speech tags have separate serialization',()=>{
 const text=unpackTaiReply({text:JSON.stringify({messages:[{text:'(breath)终于上线。\n\n你这效率。',mode:'text'}]})},'noapp');
 assert.equal(text.length,2);assert.deepEqual(text.map(x=>x.text),['终于上线。','你这效率。']);
 const audio=unpackTaiReply({text:JSON.stringify({messages:[{text:'(chuckle) 真有趣。<#0.3#> 嗯。',mode:'voice'}]})},'noapp');
 assert.equal(audio.length,1);
 assert.equal(audio[0].speechText.includes('(chuckle)'),true);
 assert.equal(audio[0].text.includes('(chuckle)'),false);
});
test('developer avatar panel supports Xitai, all leading characters and their moments cover',()=>{
 const s=initialState(),html=assets(s);
 assert.match(html,/data-name="熙泰"/);
 assert.match(html,/data-name="傅隆生"/);
 assert.match(html,/data-name="熙蒙"/);
 assert.match(html,/character-upload-cover/);
});
test('0000 reset preserves chosen pictures but clears all NoApp chat and D05 contact',()=>{
 const s=initialState();s.characterAvatars={'熙泰':'data:image/png;base64,dGVzdA=='};
 s.content.conversations.noapp.find(c=>c.id==='tai').messages.push({id:'previous',from:'tai',text:'秘密',day:56,actual:false});
 s.content.conversations.mirage.push({id:'mc-ourob-d05',messages:[]});
 s.content.mirage={ouroborosScript:{stage:'finished'}};
 const next=restartState(s);
 assert.equal(next.content.conversations.noapp.find(c=>c.id==='tai').messages.length,0);
 assert.equal(next.content.conversations.mirage.some(c=>c.id==='mc-ourob-d05'),false);
 assert.equal(next.characterAvatars['熙泰'],s.characterAvatars['熙泰']);
});
