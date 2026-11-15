import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,sceneLines} from '../src/services/story55/runtime.js';
import {agent,ensureAgent,sendAgent,tickTearAgent,researchInfo,stageReady,presetReply} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {renderAgentContent} from '../src/apps/ghost/deployment/tear-agent/view.js';
import {renderTearAgent} from '../src/apps/ghost/deployment/tear-ui/view.js';
import {buildTearPrompt} from '../src/services/ai/tear-prompt.js';
import {saveIncomingZip,localFileList,handleLibraryAction} from '../src/apps/files/features/local-library/index.js';
import {TEAR_STAGES} from '../src/story/d25/tear-agent.js';
import {dailyContent} from '../src/apps/browser/features/cheat-guide/content.js';
import {D29_IP} from '../src/story/d29/definition.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=25;s.clock='10:30';tickStory55(s);ensureAgent(s);
 return s;
}
function addZip(s,chat,prefix,name){
 const c=s.content.conversations.wechat.find(c=>c.id===chat);
 const id=prefix+'-test';c.messages.push({id,kind:'file',text:name,from:'阿威',day:s.day,time:s.clock});
 return saveIncomingZip(s,chat,id).file.id;
}
function time(s,day,clock){s.day=day;s.clock=clock;tickTearAgent(s);}
test('TAI name, spoiler gate, and fixed files through cross-day research with zero cost',()=>{
 const s=fixture(),balance=s.bankData.balance;
 assert.equal(agent(s).messages[0].text,'你好，我是小TAI，今天有什麼可以幫助你？');
 assert.equal(sendAgent(s,'TAI？').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'這是主人賜予我的名字。');
 assert.equal(sendAgent(s,'熙泰').kind,'blocked');
 const survey=addZip(s,'group','s55-d25-survey',TEAR_STAGES.survey.file);
 assert.equal(sendAgent(s,'',survey).kind,'preset');
 time(s,25,'12:04');assert.equal(agent(s).jobs.survey.done,false);
 time(s,25,'12:05');assert.equal(agent(s).jobs.survey.done,true);
 time(s,26,'10:36');assert.ok(researchInfo(s).cases>300000);
 time(s,26,'21:16');
 const maintenance=addZip(s,'group','s55-d26-records',TEAR_STAGES.maintenance.file);
 sendAgent(s,'',maintenance);assert.ok(researchInfo(s).paused);
 time(s,26,'23:06');assert.equal(researchInfo(s).paused,false);
 time(s,27,'16:42');
 const staff=addZip(s,'hufeng','s55-d27-staff',TEAR_STAGES.staff.file);
 sendAgent(s,'',staff);time(s,27,'18:31');assert.equal(agent(s).jobs.staff.done,false);
 time(s,27,'18:32');assert.ok(localFileList(s).some(f=>f.name==='staff_sync.log'));
 time(s,28,'10:19');s.story55.completed['d28-arrival']={day:28,clock:s.clock};assert.ok(stageReady(s,'validation'));
 sendAgent(s,TEAR_STAGES.validation.prompt);time(s,28,'14:18');assert.equal(researchInfo(s).complete,false);
 time(s,28,'14:19');assert.ok(researchInfo(s).complete);const cases=researchInfo(s).cases;
 time(s,28,'19:12');assert.equal(researchInfo(s).cases,cases);
 s.story55.completed['d28-meeting']={day:28,clock:s.clock};sendAgent(s,TEAR_STAGES.program.prompt);
 time(s,28,'21:42');assert.ok(localFileList(s).some(f=>f.name==='BC_01.enc'));
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open(){}}};
 handleLibraryAction('files-local-share-program',{dataset:{id:'tear-artifact-program'}},ctx);
 assert.equal(agent(s).programShared,true);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='hufeng').messages.filter(m=>m.id==='s55-d28-bc-01').length,1);
 assert.equal(s.bankData.balance,balance);
 assert.ok(sceneLines(s,'d29-meeting').some(l=>l[1]==='我的程序已經拿到了。'));
});
test('missing research does not claim completion, D29 IP requires the real storyline, and guide has all five days',()=>{
 const s=fixture();assert.ok(sceneLines(s,'d28-meeting').some(l=>l[1]==='還在驗證。'));
 time(s,29,'22:00');sendAgent(s,D29_IP);assert.equal(agent(s).ipRequested,undefined);
 s.content.notes.push({id:'s55-d29-ip',text:D29_IP});sendAgent(s,D29_IP);
 assert.equal(agent(s).ipRequested,true);assert.equal(agent(s).ipAuthorized,undefined);
 for(let day=25;day<=29;day++)assert.ok(dailyContent[day].eggs.length);
});

test('TAI only displays the newest message and has no visible history control',()=>{
 const s=fixture(),a=agent(s);
 a.messages.push(
  {id:'old-user',role:'user',text:'OLDER_USER_ONLY_MARKER'},
  {id:'old-reply',role:'assistant',text:'OLDER_REPLY_ONLY_MARKER'},
  {id:'current-user',role:'user',text:'CURRENT_USER_MARKER'},
  {id:'latest-reply',role:'assistant',text:'LATEST_REPLY_ONLY_MARKER'}
 );
 const body=renderAgentContent(s).content;
 assert.match(body,/LATEST_REPLY_ONLY_MARKER/);
 assert.doesNotMatch(body,/OLDER_USER_ONLY_MARKER|OLDER_REPLY_ONLY_MARKER|CURRENT_USER_MARKER/);
 const screen=renderTearAgent(s);
 assert.doesNotMatch(screen,/gh-tear-history|歷史紀錄/);
});
test('existing transcript saves migrate to a fresh single-message view without losing research jobs',()=>{
 const s=fixture(),a=agent(s);
 a.displayRevision=1;
 a.messages=[{id:'old',role:'assistant',text:'（以角色身份分簡短回應）舊的錯誤內容'}];
 a.jobs.survey={start:123,shown:1,done:false};
 const migrated=ensureAgent(s);
 assert.equal(migrated.displayRevision,2);
 assert.equal(migrated.messages.length,1);
 assert.equal(migrated.messages[0].text,'你好，我是小TAI，今天有什麼可以幫助你？');
 assert.equal(migrated.jobs.survey.done,false);
 assert.equal(migrated.jobs.survey.start,123);
});
test('TAI greetings and punctuation are answered naturally without unrelated safety refusals',()=>{
 assert.equal(presetReply('hi'),'你好，我在。有什麼需要我協助？');
 assert.equal(presetReply('?'),'我在。怎麼了？');
 assert.equal(presetReply('TAI？'),'這是主人賜予我的名字。');
 const prompt=buildTearPrompt('AAB_SECURITY: FUZZING');
 assert.match(prompt,/優先直接回答使用者最新的訊息/);
 assert.match(prompt,/不要輸出括號式旁白/);
 assert.doesNotMatch(prompt,/以角色身份分簡短回應|先說明系統界線/);
});
