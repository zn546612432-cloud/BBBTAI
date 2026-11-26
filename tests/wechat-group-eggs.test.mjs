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
test('leave hides the existing group, uses game minutes then real seconds, and restores original history without rewriting it',()=>{
 let s=idle();const old=groupThread(s).messages.map(m=>m.id),now=100000;
 assert.equal(leaveGroup(s,{now,random:()=>0}),true);assert.ok(groupAway(s));assert.doesNotMatch(renderWeChatHome(s,'/'),/data-id="group"/);
 s=structuredClone(s);
 const mins=Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3))+2;
 s.clock=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
 tickGroupEggs(s,now+5000);assert.ok(groupAway(s));assert.equal(groupState(s).leave.stage,'returning');
 tickGroupEggs(s,now+6800);tickGroupEggs(s,now+11000);assert.equal(groupAway(s),false);
 assert.deepEqual(groupThread(s).messages.filter(m=>!m.wechatEgg).map(m=>m.id),old);
 assert.match(renderWeChatHome(s,'/'),/data-id="group"/);
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
