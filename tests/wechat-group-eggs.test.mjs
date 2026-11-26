import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {groupThread,groupState,groupName,groupAway,fatherUsed,displayMembers,chatSettings} from '../src/apps/wechat/features/group/state.js';
import {inviteFather,leaveGroup,changeGroupField,completeClassification,patBrother,tickGroupEggs,groupEggsDue,canGroupEgg} from '../src/apps/wechat/features/group/runtime.js';
import {FATHER_PRIVATE,FATHER_AFTER,NAME_LINES,NICK_LINES,PAT_LINES} from '../src/apps/wechat/features/group/lines.js';
import {parseClassification,classificationMessages} from '../src/apps/wechat/features/group/classifier.js';
import {renderGroupInfo} from '../src/apps/wechat/features/group/index.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {visibleMessages} from '../src/services/messaging/delivery.js';
import {playerWeChatMessages} from '../src/apps/wechat/features/group/history.js';
import {nativeWeChatComposer,sendNativeWeChatPreset} from '../src/services/messaging/preset-replies.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {recordMomentInteraction,publishPlayerMoment,markMomentInteractionsRead} from '../src/apps/wechat/features/moments/model.js';
import {appFrame} from '../src/system/shell.js';
import {manifest} from '../src/apps/wechat/index.js';
function setup(day=2){
 const s=activateStory55(initialState());s.day=day;s.clock='12:00';s.unlocked=true;s.nav.current={appId:'wechat',route:'/chat/group',params:{}};
 s.story55.completed.intro={day:1,clock:'12:00'};s.story55.activeScene=null;return s;
}
function idle(){
 for(const day of [2,7,17,20,25,30,38,43,48,53]){
  const s=setup(day);for(const clock of ['04:01','07:00','12:00','15:00','23:00']){s.clock=clock;if(canGroupEgg(s))return s;}
 }
 throw Error('No eligible idle scene');
}
test('red dots follow existing unread Moments interaction state and clear on read',()=>{
 const s=setup();const p=publishPlayerMoment(s,{text:'hello'});recordMomentInteraction(s,p,{id:'like',by:'小辛',kind:'like'});
 assert.match(renderWeChatHome(s,'/'),/wx-discover-dot/);assert.match(renderWeChatHome(s,'/discover'),/wx-red-dot/);
 markMomentInteractionsRead(s);assert.doesNotMatch(renderWeChatHome(s,'/discover'),/wx-discover-dot|wx-red-dot/);
});
test('father joins once, eight private bubbles, smile at real 30 seconds and exact approved group follow-up',()=>{
 let s=idle();const now=100000;
 assert.equal(inviteFather(s,{now}),true);assert.equal(displayMembers(s).length,7);
 assert.match(renderGroupInfo(s,'/chat-info/group/invite'),/該用戶暫時無法拉入群聊/);
 assert.match(renderGroupInfo(s,'/chat-info/group/invite'),/fulongsheng\.jpeg/);
 assert.doesNotMatch(renderGroupInfo(s,'/chat-info/group/invite'),/opacity|grayscale/);
 s=structuredClone(s);for(let t=2000;t<30000;t+=1000)tickGroupEggs(s,now+t);
 assert.equal(groupThread(s).messages.filter(m=>m.from==='fulongsheng').length,0);
 const privateLines=s.content.conversations.wechat.flatMap(c=>c.messages.filter(m=>m.wechatEgg&&c.id!=='group').map(m=>m.text));
 assert.equal(privateLines.length,FATHER_PRIVATE.length);
 tickGroupEggs(s,now+30000);assert.equal(displayMembers(s).length,6);assert.ok(fatherUsed(s));
 assert.equal(visibleMessages(groupThread(s),s).filter(m=>m.from==='fulongsheng'&&m.text==='🙂').length,1);
 assert.equal(inviteFather(s,{now:now+30001}),false);
 for(let t=31000;t<90000;t+=1000)tickGroupEggs(s,now+t);
 assert.deepEqual(groupThread(s).messages.filter(m=>m.wechatEgg&&m.kind==='text'&&m.from!=='fulongsheng').map(m=>m.text),FATHER_AFTER.map(x=>x[1]));
 assert.match(renderWeChatChat(s,'group'),/傅隆生退出了群聊/);
 assert.match(renderWeChatChat(s,'group'),/fulongsheng\.jpeg/);
 assert.match(renderWeChatChat(s,'group'),/wx-message-sender[^>]*>傅隆生</);
});
test('group rename survives reload without changing canonical ID or actor names; restore corpus omits rejected line',()=>{
 let s=idle();const old=groupThread(s).name;
 assert.equal(changeGroupField(s,'name','澳門第一男子天團',{now:100000}),true);
 const request=groupState(s).classifications.name;
 assert.equal(groupThread(s).name,old);assert.equal(groupName(s),'澳門第一男子天團');
 s=structuredClone(s);assert.match(appFrame(s,{manifest},renderWeChatChat(s,'group')),/澳門第一男子天團/);
 completeClassification(s,request.id,{type:'vanity'},{now:100000,random:()=>0});
 assert.ok(groupState(s).jobs.length>=2);
 assert.equal(changeGroupField(s,'name','狼崽團',{now:100001}),true);
 assert.ok(groupState(s).classifications.name.due>=160000);assert.equal(groupState(s).jobs.filter(j=>j.family==='name').length,0);
 assert.deepEqual(NAME_LINES.restore,[['胡枫','終於正常了'],['仔仔','改回來啦']]);
 assert.ok(NICK_LINES.some(x=>x[1]==='蒙哥的中二病還沒好嗎'));
 assert.deepEqual(PAT_LINES['小辛'],['嗯？','@pat','是誰在打我']);
 assert.equal(parseClassification({text:'{"type":"tease","target":"小辛","text":"unapproved"}'}).target,'小辛');
 assert.deepEqual(parseClassification({text:'{"type":"unknown","target":"熙泰"}'}),{type:'generic',target:''});
 assert.equal(classificationMessages(request).length,2);
});
test('leave hides previous history on rejoin without rewriting underlying story',()=>{
 let s=idle();const now=100000;groupThread(s).messages.push({id:'old-history',from:'wang',kind:'text',text:'OLD_PRIVATE_HISTORY_ABC',day:s.day,time:s.clock});const old=groupThread(s).messages.map(m=>m.id);
 assert.equal(leaveGroup(s,{now,random:()=>0}),true);assert.ok(groupAway(s));assert.doesNotMatch(renderWeChatHome(s,'/'),/data-id="group"/);
 s=structuredClone(s);
 const mins=Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3))+2;
 s.clock=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
 tickGroupEggs(s,now+5000);assert.ok(groupAway(s));assert.equal(groupState(s).leave.stage,'returning');
 tickGroupEggs(s,now+6800);tickGroupEggs(s,now+11000);assert.equal(groupAway(s),false);
 assert.deepEqual(groupThread(s).messages.filter(m=>!m.wechatEgg).map(m=>m.id),old);
 assert.match(renderWeChatHome(s,'/'),/data-id="group"/);
 assert.doesNotMatch(renderWeChatChat(s,'group'),/OLD_PRIVATE_HISTORY_ABC/);
 assert.doesNotMatch(renderGroupInfo(s,'/chat-info/group/search'),/OLD_PRIVATE_HISTORY_ABC/);
 assert.ok(playerWeChatMessages(groupThread(s),s).every(m=>!old.includes(m.id)));
 s=structuredClone(s);assert.doesNotMatch(renderWeChatChat(s,'group'),/OLD_PRIVATE_HISTORY_ABC/);
});
test('D01 and D54 prohibit eggs, and D54 automatically restores membership',()=>{
 for(const day of [1,54,55]){const s=setup(day);assert.equal(inviteFather(s),false);assert.equal(leaveGroup(s),false);assert.equal(patBrother(s,'小辛'),false);}
 const s=idle();leaveGroup(s,{random:()=>0});s.day=54;assert.equal(groupEggsDue(s),true);tickGroupEggs(s);assert.equal(groupAway(s),false);
});
test('a new mandatory group message returns a player immediately; no new mandatory flags',()=>{
 const s=idle();leaveGroup(s,{random:()=>0});groupThread(s).messages.push({id:'test-plot',from:'wang',text:'主線',kind:'text',day:s.day,time:s.clock,story55:true});assert.equal(groupEggsDue(s),true);tickGroupEggs(s);assert.equal(groupAway(s),false);assert.ok(groupThread(s).messages.some(m=>m.id==='test-plot'));
});
test('pat back is a system action, not dialogue text, and excluded roles cannot participate',()=>{
 const s=idle();assert.equal(patBrother(s,'熙泰'),false);assert.equal(patBrother(s,'小辛',{now:10000,random:()=>.3}),true);
 tickGroupEggs(s,15000);assert.ok(groupThread(s).messages.some(m=>m.wechatEgg&&m.kind==='system'&&m.text==='小辛拍了拍「熙蒙」'));
});

test('D02 allows the invitation at idle morning before a mandatory group scene',()=>{const s=setup(2);s.clock='08:00';assert.equal(canGroupEgg(s),true);assert.equal(inviteFather(s,{now:10000}),true);});

test('idle story group cannot send arbitrary text or open the emoji/photo picker; D01 opening trigger stays usable',()=>{const s=idle();assert.equal(nativeWeChatComposer(s,'group').disabled,true);const html=renderWeChatChat(s,'group');assert.match(html,/data-action="wx-emoji"[^>]* disabled/);assert.match(html,/data-action="attach-chat"[^>]* disabled/);const store={get:()=>s,update(){assert.fail('idle group cannot write')}};assert.equal(sendNativeWeChatPreset(store,'group','free text').handled,true);assert.ok(sendNativeWeChatPreset(store,'group','free text').reason);assert.equal(nativeWeChatComposer(setup(1),'group').disabled,false);});

import {FATHER_NOTICE_LINES,FATHER_NOTICE_COMBO,fatherNoticePhase,directFatherNotice} from '../src/apps/wechat/features/group/father-notice.js';
function phaseState(phase){const s=idle();if(phase!=='early'){s.day=phase==='agreement'?47:42;s.clock='23:50';s.story55.completed['d42-group']={day:42,clock:'16:31'};}if(phase==='agreement')s.story55.completed['d47-wang']={day:47,clock:'16:41'};assert.equal(fatherNoticePhase(s),phase);assert.ok(canGroupEgg(s));return s;}
const eggText=s=>groupThread(s).messages.filter(m=>m.wechatEgg&&m.kind==='text'&&m.from!=='fulongsheng').map(m=>m.text);
function drain(s,start,end){for(let t=start;t<=end;t+=1000)tickGroupEggs(s,t);}
for(const phase of ['early','conflict','agreement']){
 test('father notice '+phase+' exact ordered approved lines once per stage',()=>{let s=phaseState(phase);const n=100000;assert.equal(changeGroupField(s,'notice','殺死傅隆生',{now:n}),true);assert.equal(groupState(s).classifications.notice,undefined);drain(s,n+1000,n+30000);assert.deepEqual(eggText(s),FATHER_NOTICE_LINES[phase].map(x=>x[1]));changeGroupField(s,'notice','',{now:n+31000});changeGroupField(s,'notice','杀了干爹',{now:n+32000});drain(s,n+33000,n+60000);assert.deepEqual(eggText(s),FATHER_NOTICE_LINES[phase].map(x=>x[1]));assert.equal(chatSettings(s,'group').notice,'杀了干爹');});
 test('father combo '+phase+' replaces remaining notice lines, restores after reload, and clears announcement',()=>{let s=phaseState(phase);const n=100000;changeGroupField(s,'notice','殺死傅隆生',{now:n});assert.equal(inviteFather(s,{now:n+1}),true);assert.ok(!groupState(s).jobs.some(j=>j.family==='notice'));assert.equal(displayMembers(s).length,7);s=structuredClone(s);drain(s,n+1000,n+29000);assert.equal(groupThread(s).messages.filter(m=>m.from==='fulongsheng').length,0);const priv=s.content.conversations.wechat.flatMap(c=>c.id==='group'?[]:c.messages.filter(m=>m.wechatEgg).map(m=>m.text));assert.deepEqual(priv.sort(),FATHER_NOTICE_COMBO[phase].private.map(x=>x[1]).sort());tickGroupEggs(s,n+30001);assert.equal(displayMembers(s).length,6);assert.equal(chatSettings(s,'group').notice,'殺死傅隆生');s=structuredClone(s);drain(s,n+31000,n+65000);assert.deepEqual(eggText(s),FATHER_NOTICE_COMBO[phase].after.map(x=>x[1]));assert.equal(chatSettings(s,'group').notice,'');assert.equal(groupThread(s).messages.filter(m=>m.text==='熙旺清除了群公告').length,1);assert.equal(inviteFather(s,{now:n+70000}),false);});
}
test('phase uses completed scene IDs rather than dates; rejected D47 announcement lines are absent',()=>{const s=idle();s.day=47;assert.equal(fatherNoticePhase(s),'early');s.story55.completed['d42-group']={};assert.equal(fatherNoticePhase(s),'conflict');s.story55.completed['d47-wang']={};assert.equal(fatherNoticePhase(s),'agreement');assert.ok(!FATHER_NOTICE_LINES.agreement.some(([by])=>by==='熙旺'));});
test('invite while AI pending waits for exact notice classification, does not send two corpora',()=>{const s=idle(),n=100000;changeGroupField(s,'notice','是時候讓老頭徹底消失了',{now:n});const q=groupState(s).classifications.notice;assert.ok(q);assert.equal(inviteFather(s,{now:n+1}),true);assert.equal(displayMembers(s).length,6);assert.equal(inviteFather(s,{now:n+2}),false);completeClassification(s,q.id,{type:'father_harm'},{now:n+3});assert.equal(displayMembers(s).length,7);assert.equal(groupState(s).father.combo,'early');assert.ok(!groupState(s).jobs.some(j=>j.family==='notice'));});
test('deleting or editing notice cancels stale classification; normal invite remains original',()=>{const s=idle(),n=100000;changeGroupField(s,'notice','不明公告',{now:n});const q=groupState(s).classifications.notice;changeGroupField(s,'notice','',{now:n+1});assert.equal(completeClassification(s,q.id,{type:'father_harm'},{now:n+2}),false);assert.equal(inviteFather(s,{now:n+3}),true);assert.equal(groupState(s).father.combo,undefined);assert.equal(groupState(s).jobs.filter(j=>j.family==='father-private').length,FATHER_PRIVATE.length);});
test('auto clear never deletes a newer notice; exact classifier fallback rejects negations',()=>{const s=idle(),n=100000;assert.equal(directFatherNotice('不要殺死傅隆生'),false);assert.equal(directFatherNotice('杀了干爹'),true);assert.equal(parseClassification({text:'{"type":"father_harm","target":""}'}).type,'father_harm');changeGroupField(s,'notice','殺死傅隆生',{now:n});inviteFather(s,{now:n+1});changeGroupField(s,'notice','今晚吃飯',{now:n+2});drain(s,n+3000,n+65000);assert.equal(chatSettings(s,'group').notice,'今晚吃飯');assert.ok(!groupThread(s).messages.some(m=>m.text==='熙旺清除了群公告'));});
