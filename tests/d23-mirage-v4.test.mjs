import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {story55Config,completed} from '../src/services/story55/state.js';
import {receiveInvitation,offerD23ChessInvitation} from '../src/services/invitations.js';
import {resignChessMatch,postMatchMessage} from '../src/services/chess.js';
import {tickD23ChessLesson} from '../src/services/chess-lesson.js';
import {sendMessage} from '../src/services/messaging/index.js';
import {canCharge,canShortCharge} from '../src/system/power/battery.js';
import {TAI_PROVIDER_ENDPOINT} from '../src/services/ai/supabase-gateway.js';
import {storySessionControls} from '../src/apps/mirage/features/story-controls/index.js';
import {
 beginD23MiragePostgame,d23MiragePostgame,acceptD23MirageSend,
 canSendD23Mirage,commitD23MirageResponse,endD23MirageConversation,
 tickD23MiragePostgame,d23MiragePostgameDue,replyToD23Mirage
} from '../src/services/story55/d23-postgame.js';
const contact='s55-ouroboros';
function fixture(){
 let s=activateStory55(initialState());s.day=23;s.clock='22:30';s.unlocked=true;
 s.story55.projects.base={authorized:true,batches:Array.from({length:10},(_,i)=>({complete:true,steps:Array(5).fill(true),day:i+14,testedDay:i+14})),active:null};
 for(const n of story55Config(s).nodes)if(n.gateDay&&n.gateDay<23)
  s.story55.completed[n.id]={day:n.day,clock:'20:00',test:true};
 s.story55.completed['d23-chess']={day:23,clock:'22:20'};
 tickStory55(s);
 assert.equal(offerD23ChessInvitation(s),true);
 const store={get:()=>s,update(fn){s=structuredClone(s);fn(s);}};
 const matchId=receiveInvitation(store,'s55-d23-chess-invite');
 store.update(next=>next.nav.current={appId:'chess',route:'/match/'+matchId,params:{}});
 return {store,matchId,match:()=>store.get().matches.find(m=>m.id===matchId)};
}
function deliverBoardEnding(store,id){
 const match=()=>store.get().matches.find(m=>m.id===id);
 store.update(s=>tickD23ChessLesson(s,10000));
 for(const now of [11200,14300,17400,20500])
  store.update(s=>tickD23ChessLesson(s,now));
 assert.equal(match().lesson.outbox.length,0);
}
function inMirage(f){
 f.store.update(s=>{
  assert.equal(beginD23MiragePostgame(s,f.matchId),true);
  s.nav.current={appId:'mirage',route:'/chat/'+contact,params:{}};
 });
}
function deliverOne(store,now){
 store.update(s=>tickD23MiragePostgame(s,now));
 store.update(s=>tickD23MiragePostgame(s,now+600));
}
test('D23 board keeps the approved resignation presets, never initiates postgame AI there',()=>{
 const f=fixture();
 assert.equal(resignChessMatch(f.store,f.matchId),true);
 assert.equal(f.match().result,'player-resigned');
 assert.equal(f.match().lesson.outbox.length,2);
 assert.equal(d23MiragePostgame(f.store.get()),null);
 assert.equal(postMatchMessage(f.store,f.matchId,'我還要說話'),false);
 deliverBoardEnding(f.store,f.matchId);
 assert.equal(f.match().chat.filter(m=>m.from==='tai').length,2);
 assert.match(f.match().chat[0].text,/認輸|不下/);
 assert.equal(completed(f.store.get(),'d23-chess-finish'),false);
 assert.equal(canCharge(f.store.get()),false);
});
test('Mirage intro and three real Send rounds end with two NPC lines and a native player farewell',()=>{
 const f=fixture();resignChessMatch(f.store,f.matchId);deliverBoardEnding(f.store,f.matchId);inMirage(f);
 assert.equal(f.match().closedAt>0,true);
 assert.equal(d23MiragePostgame(f.store.get()).phase,'intro');
 assert.equal(canSendD23Mirage(f.store.get()),false,'no player turn while initial AI speaks');
 assert.equal(commitD23MirageResponse(f.store.get(),{intro:true,round:0,replies:['怎麼，現在還不服氣？'],ai:false}),true);
 assert.equal(d23MiragePostgameDue(f.store.get(),1000),true);
 deliverOne(f.store,1000);
 assert.equal(d23MiragePostgame(f.store.get()).phase,'chat');
 assert.equal(canSendD23Mirage(f.store.get()),true);
 const thread=()=>f.store.get().content.conversations.mirage.find(x=>x.id===contact);
 assert.equal(thread().messages.filter(m=>/^s55-d23-mirage-/.test(m.id)).length,1);
 assert.equal(thread().messages.filter(m=>m.from==='me'&&/^s55-d23-mirage-/.test(m.id)).length,0);
 for(let n=1;n<=3;n++){
  const id=sendMessage(f.store,{channel:'mirage',conversationId:contact,text:'我還有話 '+n});
  f.store.update(s=>assert.equal(acceptD23MirageSend(s,id),true));
  assert.equal(canSendD23Mirage(f.store.get()),false,'wait for one AI reply');
  f.store.update(s=>assert.equal(commitD23MirageResponse(s,{
   intro:false,round:n,sourceId:id,replies:['第 '+n+' 次回覆'],ai:false
  }),true));
  deliverOne(f.store,n*5000);
  assert.equal(d23MiragePostgame(f.store.get()).phase,n===3?'closing':'chat');
 }
 assert.equal(canSendD23Mirage(f.store.get()),false,'a fourth player round is forbidden');
 assert.equal(endD23MirageConversation(f.store.get()),false,'must not prematurely reset closure');
 assert.equal(completed(f.store.get(),'d23-chess-finish'),false,'AI round limit is not plot completion');
 assert.equal(canCharge(f.store.get()),false);assert.equal(canShortCharge(f.store.get()),false);
 f.store.update(s=>s.story55.activeScene='d23-chess-finish');
 f.store.update(s=>assert.equal(tickQueuedStoryScenes55(s,25000),true));
 f.store.update(s=>assert.equal(tickQueuedStoryScenes55(s,25450),true));
 assert.equal(thread().messages.filter(m=>/^s55-d23-chess-finish/.test(m.id)).length,1);
 assert.equal(completed(f.store.get(),'d23-chess-finish'),false,'first goodbye is not completion');
 f.store.update(s=>assert.equal(tickQueuedStoryScenes55(s,27350),true));
 assert.equal(thread().messages.filter(m=>/^s55-d23-chess-finish/.test(m.id)).length,2);
 f.store.update(s=>assert.equal(sendScriptedDraft55(s,'mirage',contact,'去吧。'),'d23-chess-finish'));
 assert.equal(completed(f.store.get(),'d23-chess-finish'),true);
 assert.equal(d23MiragePostgame(f.store.get()).closed,true);
 assert.equal(thread().messages.at(-2).text,'下次有空再下。');
 assert.equal(thread().messages.at(-1).text,'去吧。');
 assert.equal(canCharge(f.store.get()),true);
});
test('early goodbye waits for native farewell Send and restores the previous scene',()=>{
 const f=fixture();resignChessMatch(f.store,f.matchId);deliverBoardEnding(f.store,f.matchId);inMirage(f);
 f.store.update(s=>commitD23MirageResponse(s,{intro:true,round:0,replies:['怎麼，現在還不服氣？']}));
 deliverOne(f.store,1000);
 const sentBefore=f.store.get().content.conversations.mirage.find(c=>c.id===contact).messages.filter(m=>m.from==='me').length;
 f.store.update(s=>{
  delete s.story55.completed.invitation;
  s.story55.activeScene='invitation'; // D06 genuinely incomplete in a legacy save.
  assert.equal(endD23MirageConversation(s),true);
  assert.equal(s.story55.d23Postgame.previousActiveScene,'invitation');
  assert.equal(s.story55.activeScene,'d23-chess-finish');
 });
 assert.equal(d23MiragePostgame(f.store.get()).rounds,0);
 assert.equal(completed(f.store.get(),'d23-chess-finish'),false);
 f.store.update(s=>s.story55.activeScene='d23-chess-finish');
 for(const now of [10000,10500,13000])f.store.update(s=>tickQueuedStoryScenes55(s,now));
 f.store.update(s=>assert.equal(sendScriptedDraft55(s,'mirage',contact,'去吧。'),'d23-chess-finish'));
 assert.equal(completed(f.store.get(),'d23-chess-finish'),true);
 assert.equal(f.store.get().content.conversations.mirage.find(c=>c.id===contact).messages.filter(m=>m.from==='me').length,sentBefore+1);
 assert.equal(f.store.get().story55.activeScene,'invitation','paused earlier scene is restored after farewell');
 const saved=structuredClone(f.store.get());
 assert.equal(tickQueuedStoryScenes55(saved,20000),false);
 assert.equal(saved.content.conversations.mirage.find(c=>c.id===contact).messages.filter(m=>/^s55-d23-chess-finish/.test(m.id)).length,3);
});

// Rendering MIRAGE invokes this function; a synchronous commit re-enters onEnter
// and logs the user out by consuming the one-use chess return intent twice.
test('authored postgame opening never commits reentrantly during Mirage render',async()=>{
 const f=fixture();resignChessMatch(f.store,f.matchId);deliverBoardEnding(f.store,f.matchId);inMirage(f);
 const pending=replyToD23Mirage(f.store);
 assert.equal(d23MiragePostgame(f.store.get()).phase,'intro','render must finish before intro commits');
 assert.equal(await pending,true);
 assert.equal(d23MiragePostgame(f.store.get()).phase,'intro-delivering');
});

test('D23 uses the production cloud AI for personal follow-ups; failed requests retry the same turn',async t=>{
 const f=fixture();resignChessMatch(f.store,f.matchId);deliverBoardEnding(f.store,f.matchId);inMirage(f);
 const prior={fetch:globalThis.fetch,location:globalThis.location,localStorage:globalThis.localStorage};
 t.after(()=>{for(const [key,value] of Object.entries(prior)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 globalThis.location={hostname:'zn546612432-cloud.github.io'};
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 let requests=0,fail=false;
 globalThis.fetch=async(url,init)=>{
  if(String(url).endsWith('/auth/v1/signup'))return new Response(JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_in:3600}));
  if(String(url).includes('/tai-v8-persona'))return new Response('{}',{status:404});
  assert.equal(String(url),TAI_PROVIDER_ENDPOINT);
  const {op,payload}=JSON.parse(init.body);assert.equal(op,'chat');requests++;
  // Same constraints as the protected gateway; no second system role.
  assert.equal(payload.messages.filter(m=>m.role==='system').length,1);
  assert.equal(payload.messages[0].role,'system');assert.ok(payload.messages[0].content.length<=50000);
  assert.match(payload.messages[0].content,/熙蒙主動認輸/);
  assert.match(payload.messages[0].content,/自由回應任何當前私人話題/);
  assert.equal(payload.messages.at(-1).role,'user');
  if(requests>1){assert.equal(payload.messages.at(-1).content,'会不会');assert.ok(payload.messages.some(m=>m.content==='我死了你会伤心吗'));}
  if(fail)return new Response(JSON.stringify({error:'provider_unreachable'}),{status:502});
  return new Response(JSON.stringify({text:JSON.stringify({messages:[{text:requests===1?'怎麼突然問這個？':'會。別拿這個開玩笑。'}]})}));
 };
 assert.equal(await replyToD23Mirage(f.store),true);assert.equal(requests,0);
 deliverOne(f.store,1000);
 const send=text=>{const id=sendMessage(f.store,{channel:'mirage',conversationId:contact,text});f.store.update(s=>assert.equal(acceptD23MirageSend(s,id),true));return id;};
 const thread=()=>f.store.get().content.conversations.mirage.find(c=>c.id===contact);
 send('我死了你会伤心吗');assert.equal(await replyToD23Mirage(f.store),true);
 deliverOne(f.store,5000);assert.equal(thread().messages.at(-1).aiGenerated,true);
 const sourceId=send('会不会');fail=true;
 assert.equal(await replyToD23Mirage(f.store),false);
 assert.equal(d23MiragePostgame(f.store.get()).replyFailed,true);
 assert.equal(thread().messages.at(-1).id,sourceId,'no fake character bubble');
 assert.match(storySessionControls(f.store.get(),contact),/mc-d23-retry-reply/);
 assert.equal(await replyToD23Mirage(f.store),false);assert.equal(requests,2,'no automatic retry storm');
 fail=false;assert.equal(await replyToD23Mirage(f.store,{retry:true}),true);
 deliverOne(f.store,9000);assert.equal(thread().messages.at(-1).text,'會。別拿這個開玩笑。');
 assert.equal(thread().messages.at(-1).aiGenerated,true);
 assert.equal(d23MiragePostgame(f.store.get()).rounds,2,'retry does not consume another round');
 assert.equal(thread().messages.filter(m=>m.id===sourceId).length,1);
});
