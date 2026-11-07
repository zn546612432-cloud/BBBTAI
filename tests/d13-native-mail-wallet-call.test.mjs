import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,appendSceneMessage55,sceneLines} from '../src/services/story55/runtime.js';
import {applyD13Definition,D13_MAIL_ID,D13_WALLET_ID} from '../src/story/d13/definition.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {walletPage} from '../src/apps/mirage/features/wallet/index.js';
import {telephonyFullscreen,telephonyIsland} from '../src/services/telephony/view.js';
import {endCall} from '../src/services/telephony/store.js';
import {tickTelephony} from '../src/services/telephony/index.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=13;s.clock='22:16';s.unlocked=true;s.batteryPercent=85;
 s.powerMode='idle';s.dayChargeRemainingMs=0;
 return s;
}
test('D13 mail migrates only old default wording and is a native KIRA detail',()=>{
 const s=fixture(),mail=s.story55.config.mails.find(m=>m.id===D13_MAIL_ID);
 assert.ok(mail);
 mail.subject='[MIRAGE] 50 BTC';
 mail.body='之前懸賞贏的那個錢包入帳 50 枚比特幣，登入 MIRAGE 錢包快速綁定後可取款。';
 mail.from='MIRAGE';
 applyD13Definition(s.story55.config);
 assert.equal(mail.subject,'數位資產入帳通知');
 assert.equal(mail.from,'MIRAGE Wallet');
 s.content.mail.unshift({...mail,story55:true,storyNode:'d13-wallet-mail',read:false});
 const html=kiraDetail(s,D13_MAIL_ID);
 assert.match(html,/class="kira-mail-detail kira-d13-mail"/);
 assert.match(html,/data-action="kira-back"/);
 assert.match(html,/data-action="kira-d13-wallet"/);
 assert.match(html,/50\.00000000 BTC/);
 assert.match(html,/<br>/);
 assert.doesNotMatch(html,/查看附件|kira-d13-debug/);
 mail.subject='自訂標題';
 applyD13Definition(s.story55.config);
 assert.equal(mail.subject,'自訂標題','author-edited mail survives migration');
});
test('MIRAGE wallet has real return and cancel navigation actions',()=>{
 const s=fixture();
 assert.match(walletPage(s,'/wallet'),/data-action="mc-wallet-back"/);
 s.content.mirage.wallets=[{id:D13_WALLET_ID,address:'MIR-WLT-0013',balance:50,status:'available'}];
 s.nav.current={appId:'mirage',route:'/wallet/'+D13_WALLET_ID,params:{confirm:'yes'}};
 const detail=walletPage(s,s.nav.current.route);
 assert.match(detail,/data-action="mc-wallet-back"/);
 assert.match(detail,/data-action="mc-wallet-cancel-transfer"/);
 assert.doesNotMatch(detail,/data-action="mc-wallet">‹/);
});
test('D13 system tracking is metadata, never a chat bubble',()=>{
 const s=fixture();
 assert.equal(sceneLines(s,'intrusion')[15][0],'system');
 assert.equal(sceneLines(s,'intrusion')[19][0],'system');
 const before=s.content.conversations.mirage.reduce((count,c)=>count+c.messages.length,0);
 appendSceneMessage55(s,'intrusion',15);
 appendSceneMessage55(s,'intrusion',19);
 const after=s.content.conversations.mirage.reduce((count,c)=>count+c.messages.length,0);
 assert.equal(after,before);
});
test('incoming, connected, and island call views have functional controls',()=>{
 const s=fixture();
 s.phoneCall={id:'s55-d13-call-v2',source:'story55',node:'intrusion',direction:'incoming',
  displayName:'未知號碼',forced:true,state:'ringing',answeredAt:null,autoAnswerMs:8000,presentedAt:1000};
 const incoming=telephonyFullscreen(s);
 assert.match(incoming,/data-action="tel-answer"/);
 assert.match(incoming,/data-action="tel-decline"/);
 assert.doesNotMatch(incoming,/REMOTE OVERRIDE/);
 s.phoneCall.state='connected';s.phoneCall.answeredAt=1000;s.phoneCall.showControls=true;
 assert.match(telephonyFullscreen(s),/data-action="tel-end"/);
 assert.match(telephonyFullscreen(s),/data-action="tel-chat"/);
 s.phoneCall.showControls=false;
 assert.equal(telephonyFullscreen(s),'');
 assert.match(telephonyIsland(s),/data-action="tel-return"/);
});
test('hanging up an interrupted D13 call redials without restarting dialogue',()=>{
 const s=fixture();
 s.story55.activeScene='intrusion';s.story55.d13={phase:'chat',callRetries:0};
 s.story55.scenes.intrusion={index:11,accepted:true};
 s.phoneCall={id:'s55-d13-call-v2',source:'story55',node:'intrusion',direction:'incoming',
  displayName:'未知號碼',forced:true,state:'connected',startedAt:1000,answeredAt:1800,autoAnswerMs:8000,presentedAt:1000};
 const store={get:()=>s,update:fn=>fn(s)};
 const ctx={store,router:{open(){}},toast(){}};
 assert.equal(endCall(store,s.phoneCall.id,2000,{remote:true,reason:'user-hangup'}),true);
 assert.equal(s.phoneCall.state,'ended');
 tickTelephony(ctx,3499);
 assert.equal(s.phoneCall.state,'ended','hangup closes the screen before redial');
 tickTelephony(ctx,3501);
 assert.equal(s.phoneCall.state,'ringing');
 assert.equal(s.phoneCall.id,'s55-d13-call-v2-retry-1');
 assert.equal(s.story55.scenes.intrusion.index,11,'no replay of sent player text');
 assert.equal(s.story55.d13.callRetries,1);
});
