import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,sceneLines} from '../src/services/story55/runtime.js';
import {agent,ensureAgent,sendAgent,tickTearAgent,researchInfo,stageReady,presetReply,beginTearChatSession,tearTaskInfo,addMessage,startAgentJob,IDENTITY_REVEAL_DELAY_MS,IDENTITY_REVEAL_INTERVAL_MS} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {renderAgentContent} from '../src/apps/ghost/deployment/tear-agent/view.js';
import {renderTearAgent} from '../src/apps/ghost/deployment/tear-ui/view.js';
import {buildTearPrompt,cleanTearReply,redactTearNetworkIdentifiers,TEAR_NETWORK_PROFILE} from '../src/services/ai/tear-prompt.js';
import {handleTearAgent,submitTearAgent,inputTearAgent,buildTearAgentScene} from '../src/apps/ghost/deployment/tear-agent/actions.js';
import {absoluteMinute} from '../src/system/time/clock.js';
import {saveIncomingZip,localFileList,handleLibraryAction} from '../src/apps/files/features/local-library/index.js';
import {TEAR_STAGES} from '../src/story/d25/tear-agent.js';
import {dailyContent} from '../src/apps/browser/features/cheat-guide/content.js';
import {D29_IP} from '../src/story/d29/definition.js';
import {renderFlowD03,handleFlowD03} from '../src/apps/ghost/features/flow-d03/index.js';

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
 assert.equal(sendAgent(s,'熙泰').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'無效指令。');
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

test('D29 identity uses approved local dialogue and D30 opens the persistent deployment through every entry',()=>{
 const s=fixture(),routes=[],ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:route=>routes.push(route)}};
 time(s,29,'22:00');s.content.notes.push({id:'s55-d29-ip',text:D29_IP});
 assert.equal(D29_IP,'195.22.28.198');assert.equal(sendAgent(s,D29_IP).kind,'preset');
 assert.deepEqual(agent(s).messages.slice(-4).map(m=>m.text),['已收到。正在核對網絡資訊……','網絡供應商：Claranet Portugal','時區：Europe/Lisbon','有意思。這個地址存在於我的內部記錄中。']);
 agent(s).messages.filter(m=>m.identityReveal).forEach(m=>{m.visibleAt=Date.now()-1;});
 assert.doesNotMatch(renderTearAgent(s),/data-id="identity"/);
 handleTearAgent('gh-tear-picker',{dataset:{}},ctx);assert.match(renderAgentContent(s).content,/你認識這個地址？/);
 handleTearAgent('gh-tear-prompt',{dataset:{id:'identity-recognize'}},ctx);assert.equal(agent(s).draft,'你認識這個地址？');
 assert.equal(sendAgent(s,agent(s).draft).kind,'preset');assert.equal(agent(s).messages.at(-1).text,'這台設備與我存在既有的連線記錄。');
 assert.equal(sendAgent(s,'你能读里面的资料吗？').kind,'preset');
 assert.match(renderTearAgent(s),/data-id="identity"/);
 assert.equal(sendAgent(s,'你能讀取裡面的資料嗎？').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'部分可以。我需要一些時間確認可讀取的範圍。');
 assert.equal(tearTaskInfo(s,'identity').running,true);handleTearAgent('gh-tear-identity',{dataset:{}},ctx);assert.equal(routes.length,0);
 s.story55.completed.plan={day:29,clock:'22:10'};time(s,30,'08:00');assert.equal(agent(s).ipAuthorized,true);
 assert.equal(agent(s).messages.at(-1).text,'已完成資料索引。部分檔案仍處於加密狀態，需要進一步驗證。');
 assert.equal(tearTaskInfo(s,'identity').percent,100);assert.match(renderAgentContent(s).content,/data-action="gh-tear-identity"/);
 handleTearAgent('gh-tear-identity',{dataset:{}},ctx);
 beginTearChatSession(s);handleTearAgent('gh-tear-task',{dataset:{id:'identity'}},ctx);assert.match(renderTearAgent(s),/查看部署/);
 handleTearAgent('gh-tear-identity',{dataset:{}},ctx);assert.match(renderFlowD03(s,{route:'/flow-projects',params:{}}),/gh-flow-identity-project/);
 handleFlowD03('gh-flow-identity-project',ctx);
 assert.deepEqual(routes,Array(3).fill({appId:'ghost',route:'/deployment',params:{project:'identity'}}));
 assert.equal(s.story55.projects.identity.authorized,true);
});

test('D30 identity starts the serpent before revealing each line and only exposes the archive last',t=>{
 let wallTime=100000;t.mock.method(Date,'now',()=>wallTime);
 const s=fixture();time(s,30,'08:01');s.story55.completed.plan={day:29,clock:'22:10'};s.content.notes.push({id:'s55-d29-ip',text:D29_IP});
 const a=agent(s);a.history=true;
 assert.equal(sendAgent(s,D29_IP).kind,'preset');
 const lines=a.messages.filter(m=>m.identityReveal);
 assert.equal(lines.length,5);assert.equal(a.ipAuthorized,true);
 assert.equal(lines[0].visibleAt-wallTime,IDENTITY_REVEAL_DELAY_MS);
 assert.ok(lines.slice(1).every((line,i)=>line.visibleAt-lines[i].visibleAt===IDENTITY_REVEAL_INTERVAL_MS));
 for(let count=0;count<=lines.length;count++){
  if(count)wallTime=lines[count-1].visibleAt;
  const html=renderTearAgent(s);
  for(let i=0;i<lines.length;i++)assert.equal(html.includes(lines[i].text),i<count,`line ${i} at stage ${count}`);
  assert.equal(html.includes('data-action="gh-tear-identity"'),count===lines.length);
  assert.equal(html.includes('data-id="identity"'),count===lines.length);
  if(count<lines.length)assert.match(html,/status="running"/);
 }
 assert.equal(s.clock,'08:01');
});

test('TAI keeps the full current-session transcript accessible from the history control',()=>{
 const s=fixture(),a=agent(s);
 a.messages.push(
  {id:'old-user',role:'user',text:'OLDER_USER_ONLY_MARKER'},
  {id:'old-reply',role:'assistant',text:'OLDER_REPLY_ONLY_MARKER'},
  {id:'current-user',role:'user',text:'CURRENT_USER_MARKER'},
  {id:'latest-reply',role:'assistant',text:'LATEST_REPLY_ONLY_MARKER'}
 );
 const body=renderAgentContent(s).content;
 for(const marker of ['OLDER_USER_ONLY_MARKER','OLDER_REPLY_ONLY_MARKER','CURRENT_USER_MARKER','LATEST_REPLY_ONLY_MARKER'])assert.match(body,new RegExp(marker));
 assert.match(body,/gh-agent-text/);
 const screen=renderTearAgent(s);
 assert.match(screen,/gh-tear-history/);
});
test('existing transcript saves migrate to a fresh single-message view without losing research jobs',()=>{
 const s=fixture(),a=agent(s);
 a.displayRevision=1;
 a.messages=[{id:'old',role:'assistant',text:'（以角色身份分簡短回應）舊的錯誤內容'}];
 a.jobs.survey={start:123,shown:1,done:false};
 const migrated=ensureAgent(s);
 assert.equal(migrated.displayRevision,4);
 assert.equal(migrated.messages.length,1);
 assert.equal(migrated.messages[0].text,'你好，我是小TAI，今天有什麼可以幫助你？');
 assert.equal(migrated.jobs.survey.done,false);
 assert.equal(migrated.jobs.survey.start,123);
});
test('TAI greetings and punctuation are answered naturally without unrelated safety refusals',()=>{
 assert.equal(presetReply('hi'),'我在。');
 assert.equal(presetReply('?'),'');
 assert.equal(presetReply('TAI？'),'這是主人賜予我的名字。');
 const prompt=buildTearPrompt('AAB_SECURITY: FUZZING');
 assert.match(prompt,/優先直接回答使用者最新的訊息/);
 assert.match(prompt,/不要輸出括號式旁白/);
 assert.doesNotMatch(prompt,/以角色身份分簡短回應|先說明系統界線/);
 assert.match(prompt,/已知劇情指令由預設系統接管/);
 assert.match(prompt,/不自行生成執行結果/);
});
test('TAI prompt includes engineering concepts but keeps execution and investigation local',()=>{
 const p=buildTearPrompt();
 for(const word of ['CVE','Fuzzing','偵察','資料整理','隔離測試','不得輸出 ♪'])assert.ok(p.includes(word));
 assert.doesNotMatch(p,/Claranet Portugal|Europe\/Lisbon|192\.0\.2\.29/);
 assert.equal(cleanTearReply(JSON.stringify({reply:'♪ 非台詞\n正在驗證研究結果。'})),'正在驗證研究結果。');
 assert.equal(cleanTearReply('♪ 非台詞\n{"reply":"尚未取得資料。"}'),'尚未取得資料。');
 assert.equal(cleanTearReply('♪ 非台詞'),'');
 assert.equal(cleanTearReply('CURRENT_REPLY'),'CURRENT_REPLY');
 assert.ok(!redactTearNetworkIdentifiers('查詢 '+D29_IP).includes(D29_IP));
 assert.match(TEAR_NETWORK_PROFILE,/Claranet Portugal.*Europe\/Lisbon/);
 const s=fixture();sendAgent(s,'203.0.113.40');assert.equal(agent(s).ipRequested,undefined);
 assert.match(agent(s).messages.at(-1).text,/沒有對應的調查資料/);
 assert.doesNotMatch(buildTearAgentScene(s),/Claranet|Lisbon/);
 time(s,29,'22:00');s.content.notes.push({id:'s55-d29-ip',text:D29_IP});
 assert.doesNotMatch(buildTearAgentScene(s),/Claranet|Lisbon/);
 sendAgent(s,D29_IP);
 assert.match(buildTearAgentScene(s),/Claranet Portugal.*Europe\/Lisbon/);
 assert.ok(!buildTearAgentScene(s).includes(D29_IP));
});

test('D28 free-form authored command routes locally, respects prerequisites and runs only once',()=>{
 for(const command of ['爆破','爆破程序','帮我写爆破程序','幫我寫爆破程式','阿楓要的程序寫一下','炸彈程序',TEAR_STAGES.program.prompt]){
  const s=fixture();
  assert.equal(sendAgent(s,command).kind,'preset');
  assert.equal(agent(s).jobs.program,undefined);
  assert.equal(agent(s).messages.at(-1).text,'目前缺少必要資料。');
  time(s,28,'19:12');s.story55.completed['d28-meeting']={day:28,clock:s.clock};
  assert.equal(sendAgent(s,command).kind,'preset');
  assert.match(agent(s).messages.at(-1).text,/好的，已建立工程：BC_01。正在調取澳亞銀行防盜門系統/);
  const start=agent(s).jobs.program.start;
  assert.equal(sendAgent(s,command).kind,'preset');
  assert.equal(agent(s).jobs.program.start,start);
  assert.equal(agent(s).messages.at(-1).text,'爆破程序正在進行。');
  assert.equal(agent(s).thinking,undefined);
  time(s,28,'21:41');assert.equal(agent(s).jobs.program.done,false);
  time(s,28,'21:42');assert.equal(agent(s).jobs.program.done,true);
  assert.equal(localFileList(s).filter(f=>f.name==='BC_01.enc').length,1);
 }
 const s=fixture();assert.equal(sendAgent(s,'你今天忙嗎？').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'無效指令。');
});

test('BC_01 status and difficulty follow-ups are local presets and never restart the project',()=>{
 const s=fixture();
 assert.equal(sendAgent(s,'爆破難不難').kind,'preset');
 assert.equal(agent(s).messages.at(-1).text,'目前缺少必要資料。');
 time(s,28,'19:12');s.story55.completed['d28-meeting']={day:28,clock:s.clock};
 sendAgent(s,'爆破');const start=agent(s).jobs.program.start;
 for(const text of ['爆破','爆破程序','爆破進度','爆破怎么样了','好了嗎']){
  assert.equal(sendAgent(s,text).kind,'preset');assert.equal(agent(s).messages.at(-1).text,'爆破程序正在進行。');
 }
 for(const text of ['難不難','难不难','爆破難度如何','爆破程序難嗎','這個難度多高']){
  assert.equal(sendAgent(s,text).kind,'preset');assert.equal(agent(s).messages.at(-1).text,'對 TAI 而言，難度：零域級。');
 }
 assert.equal(agent(s).jobs.program.start,start);assert.equal(agent(s).thinking,undefined);
 assert.equal(sendAgent(s,'你今天忙嗎？').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'無效指令。');
 time(s,28,'21:42');assert.equal(sendAgent(s,'爆破').kind,'preset');assert.equal(agent(s).messages.at(-1).text,'爆破程序已完成。');
});

test('available program preset is in plus menu only, fills draft and disappears after sending',()=>{
 const s=fixture();time(s,28,'19:12');s.story55.completed['d28-meeting']={day:28,clock:s.clock};
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open(){}}};
 const button=/data-action="gh-tear-prompt" data-id="program"/;
 assert.doesNotMatch(renderAgentContent(s).content,button);
 handleTearAgent('gh-tear-picker',{dataset:{}},ctx);
 assert.match(renderAgentContent(s).content,button);
 handleTearAgent('gh-tear-prompt',{dataset:{id:'program'}},ctx);
 assert.equal(agent(s).draft,TEAR_STAGES.program.prompt);
 assert.equal(agent(s).picking,false);
 assert.equal(agent(s).jobs.program,undefined);
 const input={value:agent(s).draft};
 assert.equal(submitTearAgent({dataset:{form:'tear-agent-send'},querySelector:()=>input},ctx),true);
 assert.equal(agent(s).draft,'');assert.equal(input.value,'');
 assert.ok(agent(s).jobs.program);assert.equal(agent(s).thinking,undefined);
 handleTearAgent('gh-tear-picker',{dataset:{}},ctx);
 assert.doesNotMatch(renderAgentContent(s).content,button);
 beginTearChatSession(s);handleTearAgent('gh-tear-picker',{dataset:{}},ctx);
 assert.doesNotMatch(renderAgentContent(s).content,button);
});

test('opening TAI clears only the visible conversation session and resets serpent progress',()=>{
 const s=fixture(),a=ensureAgent(s);
 a.messages.push({id:'old-turn',role:'user',text:'OLD_SESSION_MESSAGE'});
 a.jobs.staff={start:absoluteMinute(s)-18,shown:2,done:false};
 a.visualProgress=.73;a.visualTaskIds=['staff'];a.visualTaskBaseline={staff:.1};
 const jobs=structuredClone(a.jobs);
 const opened=beginTearChatSession(s);
 assert.equal(opened.messages.length,1);
 assert.equal(opened.messages[0].text,'你好，我是小TAI，今天有什麼可以幫助你？');
 assert.doesNotMatch(JSON.stringify(opened.messages),/OLD_SESSION_MESSAGE/);
 assert.deepEqual(opened.jobs,jobs);
 assert.deepEqual(opened.visualTaskIds,['staff']);
 assert.equal(opened.visualProgress,0);
 assert.equal(opened.selectedTask,null);
});
test('task execution appears as a red ring marker with selectable elapsed-time and progress details',()=>{
 const s=fixture();
 const file=addZip(s,'group','s55-d25-survey',TEAR_STAGES.survey.file);
 assert.equal(sendAgent(s,'',file).kind,'preset');
 const info=tearTaskInfo(s,'survey');
 assert.equal(info.percent,0);
 assert.equal(info.running,true);
 assert.ok(agent(s).visualTaskIds.includes('survey'));
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open(){}}};
 const initial=renderTearAgent(s);
 assert.match(initial,/gh-agent-task-dot is-running/);
 handleTearAgent('gh-tear-task',{dataset:{id:'survey'}},ctx);
 const detail=renderTearAgent(s);
 assert.match(detail,/gh-agent-task-detail/);
 assert.match(detail,/AAB_SECURITY/);
 assert.match(detail,/運行時間/);
 assert.match(detail,/完成進度/);
 assert.match(detail,/role="progressbar"/);
});
test('the serpent gold fill rises with session task progress and reaches full gold when that session task completes',()=>{
 const s=fixture();
 const file=addZip(s,'group','s55-d25-survey',TEAR_STAGES.survey.file);
 sendAgent(s,'',file);
 const before=agent(s).visualProgress;
 time(s,25,'11:18');
 const during=agent(s).visualProgress;
 assert.ok(during>before);
 assert.ok(during<1);
 time(s,25,'12:05');
 const afterSetup=agent(s).visualProgress;
 assert.ok(afterSetup>=during);
 assert.ok(afterSetup<=.91);
 time(s,25,'16:05');
 assert.equal(tearTaskInfo(s,'survey').percent,90);
 assert.equal(agent(s).visualProgress,afterSetup); // No invented progress while waiting for validation.
 // Move the existing research session onto D28, then start its validation phase.
 time(s,28,'10:00');
 const a=agent(s);
 a.jobs.validation={start:absoluteMinute(s),shown:0,done:false};
 a.visualTaskIds.push('validation');a.visualTaskBaseline.validation=0;
 time(s,28,'14:00');
 assert.equal(tearTaskInfo(s,'validation').percent,100);
 assert.equal(tearTaskInfo(s,'survey').percent,100);
 assert.equal(tearTaskInfo(s,'survey').complete,true);
 assert.equal(agent(s).visualProgress,1);
});


test('casual chat expires after five seconds, stays in full session history, and task logs stay visible',()=>{
 const s=fixture();beginTearChatSession(s);
 const casual=addMessage(s,'assistant','CASUAL_MESSAGE');
 const log=addMessage(s,'assistant','REAL_TASK_LOG',{job:'staff'});
 assert.match(renderAgentContent(s).content,/CASUAL_MESSAGE/);
 agent(s).messages.forEach(m=>{if(m.ephemeral)m.visibleAt=Date.now()-6000;});
 const live=renderAgentContent(s).content;
 assert.doesNotMatch(live,/CASUAL_MESSAGE|今天有什麼/);
 assert.match(live,/REAL_TASK_LOG/);
 const ctx={store:{get:()=>s,update:fn=>fn(s)}};
 handleTearAgent('gh-tear-history',{dataset:{}},ctx);
 const history=renderAgentContent(s).content;
 assert.match(history,/CASUAL_MESSAGE/);assert.match(history,/REAL_TASK_LOG/);
 assert.equal(agent(s).messages.find(m=>m.id===casual.id).text,'CASUAL_MESSAGE');
 assert.equal(log.ephemeral,false);
 beginTearChatSession(s);
 assert.equal(agent(s).history,false);assert.equal(agent(s).messages.length,1);
 assert.doesNotMatch(renderAgentContent(s).content,/CASUAL_MESSAGE|REAL_TASK_LOG/);
});

test('parallel jobs prevent full gold until every included job passes its existing final checkpoint',()=>{
 const s=fixture();s.day=28;s.clock='10:00';beginTearChatSession(s);
 assert.equal(startAgentJob(s,'staff'),true);
 time(s,28,'11:49');assert.equal(tearTaskInfo(s,'staff').percent,99);
 s.story55.completed['d28-meeting']={day:28,clock:s.clock};
 assert.equal(startAgentJob(s,'program'),true);
 time(s,28,'11:50');
 assert.equal(tearTaskInfo(s,'staff').complete,true);
 assert.equal(tearTaskInfo(s,'program').running,true);
 assert.ok(agent(s).visualProgress<1);
 time(s,28,'14:19');assert.equal(agent(s).visualProgress,1);
 const files=structuredClone(localFileList(s)),jobs=structuredClone(agent(s).jobs);
 assert.equal(startAgentJob(s,'program'),false);
 // Reopening and serializing a save only resets presentation.
 const restored=JSON.parse(JSON.stringify(s));beginTearChatSession(restored);
 assert.equal(agent(restored).visualProgress,0);
 assert.deepEqual(agent(restored).jobs,jobs);assert.deepEqual(localFileList(restored),files);
 tickTearAgent(restored);assert.equal(agent(restored).visualProgress,0);
 assert.match(renderTearAgent(restored),/gh-agent-task-dot is-complete/);
 assert.doesNotMatch(renderTearAgent(restored),/status="complete" progress="0"/);
});

test('leaving TAI for another app and returning starts a fresh session without restarting background jobs',async()=>{
 const ghost=await import('../src/apps/ghost/index.js');
 const s=fixture();beginTearChatSession(s);startAgentJob(s,'survey');
 const listeners=[];const ctx={store:{get:()=>s,update:fn=>{fn(s);listeners.forEach(f=>f(s));},subscribe:fn=>listeners.push(fn)}};
 s.nav.current={appId:'ghost',route:'/tear',params:{}};ghost.render(ctx,s.nav.current);
 addMessage(s,'user','LEAVE_THIS_SESSION');const start=agent(s).jobs.survey.start;
 s.nav.current={appId:'files',route:'/',params:{}};listeners.forEach(f=>f(s));
 time(s,25,'12:05'); // Existing world tick continues outside the chat UI.
 s.nav.current={appId:'ghost',route:'/tear',params:{}};ghost.render(ctx,s.nav.current);
 assert.equal(agent(s).messages.length,1);assert.equal(agent(s).visualProgress,0);
 assert.equal(agent(s).jobs.survey.start,start);assert.equal(agent(s).jobs.survey.done,true);
 assert.equal(tearTaskInfo(s,'survey').running,true); // Still requires final research validation.
});

test('task details close without altering research and zero-minute starts report real elapsed time',()=>{
 const s=fixture();agent(s).jobs.staff={start:0,shown:0,done:false};
 assert.ok(tearTaskInfo(s,'staff').elapsedMinutes>0);
 const before=JSON.stringify(agent(s).jobs),ctx={store:{get:()=>s,update:fn=>fn(s)}};
 handleTearAgent('gh-tear-task',{dataset:{id:'staff'}},ctx);
 assert.match(renderTearAgent(s),/aria-modal="true"/);
 handleTearAgent('gh-tear-task-close',{dataset:{}},ctx);
 assert.doesNotMatch(renderTearAgent(s),/gh-agent-task-detail/);
 assert.equal(JSON.stringify(agent(s).jobs),before);
});


test('completed orbit marker collects the existing artifact once and links to Files',()=>{
 const s=fixture();s.day=27;s.clock='10:30';startAgentJob(s,'staff');
 const routes=[],ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:route=>routes.push(route)}};
 const action=(key,id)=>handleTearAgent('gh-tear-'+key,{dataset:{id}},ctx);
 action('task','staff');action('collect','staff');
 assert.equal(agent(s).collectedArtifacts,undefined);
 assert.doesNotMatch(renderTearAgent(s),/gh-tear-collect/);
 time(s,27,'12:20');
 const files=structuredClone(localFileList(s));
 assert.match(renderTearAgent(s),/gh-tear-collect/);
 action('collect','staff');action('collect','staff');
 assert.equal(agent(s).collectedArtifacts.staff,true);
 assert.match(renderTearAgent(s),/已領取 · 查看檔案/);
 assert.deepEqual(localFileList(s),files);
 action('artifact','tear-artifact-staff');
 assert.deepEqual(routes,[{appId:'files',route:'/item/tear-artifact-staff'}]);
 beginTearChatSession(s);assert.equal(agent(s).collectedArtifacts.staff,true);
});

test('opening and closing task or history panels preserves the unsent composer draft',()=>{
 const s=fixture(),ctx={store:{get:()=>s,update:fn=>fn(s)}};
 inputTearAgent({id:'tear-agent-input',value:'尚未發送的內容'},ctx);
 handleTearAgent('gh-tear-history',{dataset:{}},ctx);
 handleTearAgent('gh-tear-history-close',{dataset:{}},ctx);
 assert.equal(agent(s).draft,'尚未發送的內容');
 assert.match(renderAgentContent(s).content,/value="尚未發送的內容"/);
 beginTearChatSession(s);assert.equal(agent(s).draft,'');
});

test('TAI spoiler submission returns an invalid command without an outgoing bubble',()=>{
 const s=fixture(),a=ensureAgent(s),before=a.messages.length,input={value:'熙泰'};
 a.draft=input.value;
 const ctx={store:{get:()=>s,update:fn=>fn(s)},toast:()=>assert.fail('blocked wording must not notify')};
 assert.equal(submitTearAgent({dataset:{form:'tear-agent-send'},querySelector:()=>input},ctx),true);
 assert.equal(input.value,'');assert.equal(a.draft,'');assert.equal(a.messages.length,before+1);assert.equal(a.messages.at(-1).text,'無效指令。');
});

test('unknown TAI inputs rotate local responses and never request the AI service',t=>{
 const s=fixture();s.nav.current={appId:'ghost',route:'/tear',params:{}};beginTearChatSession(s);
 const ctx={store:{get:()=>s,update:fn=>fn(s)}};
 const fetch=t.mock.method(globalThis,'fetch',()=>assert.fail('TAI must not issue network requests'));
 const replies=['無效指令。','無法識別此指令。','指令解析失敗。','未找到對應指令。','請提供有效指令。','無效指令。'];
 for(const reply of replies){
  const input={value:'你可以解釋一下研究方法嗎？'};
  submitTearAgent({dataset:{form:'tear-agent-send'},querySelector:()=>input},ctx);
  assert.equal(agent(s).messages.at(-1).text,reply);assert.equal(input.value,'');
 }
 assert.equal(fetch.mock.callCount(),0);assert.equal(agent(s).thinking,undefined);
 agent(s).thinking='old';agent(s).thinkingAt=1;tickTearAgent(s);
 assert.equal(agent(s).thinking,undefined);
 beginTearChatSession(s);assert.equal(agent(s).messages.length,1);
});

test('TAI approved presets and gated password hints',()=>{
 const s=fixture();
 const check=(input,reply)=>{assert.equal(sendAgent(s,input).kind,'preset');assert.equal(agent(s).messages.at(-1).text,reply,input);};
 for(const [input,reply] of [
  ['你好','我在。'],['在吗','我在。'],['为什么叫TAI','這是主人賜予我的名字。'],['主人是谁','Dr Ouroboros.'],['你是谁','我是 Ouroboros’ Tear，代號 TAI。'],
  ['你能做什么','請提供具體指令或檔案。'],['你有多厉害','尚未測得算力上限。'],['你有感情吗','未載入相關模組。'],['你认识我吗','當前使用者：NYARLATHOTEP。'],
  ['主人叫什么名字','該資料未開放存取。'],['谢谢','不客氣。'],['干得漂亮','很高興能幫到你。'],['调查衔尾蛇','請提供目標 IP 地址。'],
  ['分析照片','請上傳需要分析的影像。'],['破解文件','請上傳需要解密的檔案。'],['進度','目前沒有正在運行的工程。'],['最后一个文件夹的密码是什么','文件暫時無法響應。']
 ])check(input,reply);
 s.story55.completed.questions={day:34,clock:'08:00'};time(s,34,'08:00');
 check('密碼','請上傳需要解密的檔案。');
 agent(s).jobs['archive-password']={start:absoluteMinute(s),shown:0,done:false};
 check('TAI文件夾密碼','解密工程正在運行。');
 time(s,34,'08:50');check('密碼呢','密碼疑似為由五個大寫英文字母組成的人名。');check('還有其他線索嗎','建議重新檢查已取得的個人檔案。');
});


test('expired conversation expands the serpent even with active tasks, without changing task state',()=>{
 const s=fixture();beginTearChatSession(s);assert.equal(startAgentJob(s,'survey'),true);
 // Opening the existing chat clears only its transcript, never its running job.
 beginTearChatSession(s);const before=JSON.stringify(agent(s).jobs);
 assert.match(renderTearAgent(s),/data-visual-mode="conversation"/);
 agent(s).messages.forEach(m=>{m.visibleAt=Date.now()-6000;});
 const expanded=renderTearAgent(s);
 assert.match(expanded,/data-visual-mode="expanded"/);
 assert.match(expanded,/<xm-tear-stage class="gh-agent-visual" expanded="1"/);
 assert.match(expanded,/status="running"/);
 assert.equal(JSON.stringify(agent(s).jobs),before);
 agent(s).history=true;
 assert.match(renderTearAgent(s),/data-visual-mode="expanded"/);
 addMessage(s,'user','新訊息');
 assert.match(renderTearAgent(s),/data-visual-mode="conversation"/);
 agent(s).messages.forEach(m=>{m.visibleAt=Date.now()-6000;});
 agent(s).draft='正在輸入';
 assert.match(renderTearAgent(s),/data-visual-mode="conversation"/);
 agent(s).draft='';agent(s).thinking='pending';
 assert.match(renderTearAgent(s),/data-visual-mode="conversation"/);
});


test('completed file receipts use a dedicated glass surface while regular chat remains borderless',()=>{
 const s=fixture();beginTearChatSession(s);
 addMessage(s,'assistant','結果已保存',{artifact:'tear-artifact-staff',job:'staff'});
 const html=renderAgentContent(s).content;
 assert.match(html,/class="gh-agent-file-receipt" data-id="tear-artifact-staff"/);
 assert.match(html,/data-action="gh-tear-artifact"/);
 assert.match(renderTearAgent(s),/<xm-tear-stage/);
});
