import test from 'node:test';
import assert from 'node:assert/strict';
import {taiShouldHangUpCall} from '../src/apps/noapp/call-hangup-intent.js';
import {callBridgeNote} from '../src/services/ai/humanize.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {DEFAULT_TAI_BEHAVIOR,normalizeTaiBehavior} from '../src/services/ai/behavior.js';
import {behaviorSettings} from '../src/apps/noapp/settings/behavior.js';
import {initialState} from '../src/services/storage.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';
import {startIncoming,startOutgoing,callAction,submitCall,callView,callState,minimizedCallView} from '../src/apps/noapp/voice-call.js';

test('explicit commands delegate an actual phone hangup to Tai without confusing discussions or negations',()=>{
 const yes=['你挂电话吧','你先挂','你挂吧','你来挂','熙泰挂电话吧','帮我挂了','挂了88','挂了，拜拜','挂电话吧','晚安','88','拜拜','那就挂了吧','结束通话吧','不聊了，拜拜','再見','我要睡了','你先忙吧','那你挂我电话吧，再见。','挂我电话吧拜拜','那你掛我的電話吧，再見'];
 const no=['你别挂电话','不要挂','我不想挂电话','等一下再挂','刚才是谁挂的电话','你是不是刚才挂了','我们刚才挂断了','挂电话和打字有什么不可以','我挂断电话还能打字','谁让你挂电话了','刚挂了怎么又找我','我讨厌你','如果你挂了怎么办','你不要挂我电话','你別掛我的電話'];
 for(const text of yes)assert.equal(taiShouldHangUpCall(text),true,'positive '+text);
 for(const text of no)assert.equal(taiShouldHangUpCall(text),false,'negative '+text);
});

test('call->text bridge preserves which human really hung up and does not invent unheard dialogue',()=>{
 const current={day:60,clock:'22:32'};
 const base={kind:'call',callStatus:'ended',day:60,time:'22:30',text:'语音通话 · 02:10'};
 const afterPlayer=callBridgeNote({...base,endedBy:'player',transcript:'熙蒙：嗯。'},current);
 assert.match(afterPlayer,/熙蒙主动按下挂断键/);
 assert.match(afterPlayer,/已经真正断开/);
 assert.match(afterPlayer,/文字聊天框打字/);
 assert.doesNotMatch(afterPlayer,/陈熙泰主动按下挂断键/);
 const afterTai=callBridgeNote({...base,endedBy:'tai',endReason:'player_request'},current);
 assert.match(afterTai,/陈熙泰主动按下挂断键/);
 assert.match(afterTai,/熙蒙明确要求/);
 assert.match(afterTai,/没有已确认播放完毕/);
 assert.equal(callBridgeNote({kind:'voice',transcript:'你好'},current),'');
});

test('DeepSeek prompt receives mutually exclusive phone, voice note, and message context',()=>{
 const base={channel:'noapp',recognized:true,day:37,messages:[{role:'user',content:'我还想听你多说一点'}]};
 const phone=buildTaiPrompt({...base,outputMode:'call',behavior:DEFAULT_TAI_BEHAVIOR});
 const text=buildTaiPrompt({...base,outputMode:'text',behavior:DEFAULT_TAI_BEHAVIOR});
 const voice=buildTaiPrompt({...base,outputMode:'voice',behavior:DEFAULT_TAI_BEHAVIOR});
 assert.match(phone,/双方正在 NoApp 实时语音通话/);
 assert.match(phone,/可自然连续输出2～5个完整口语意群/);
 assert.match(text,/现在双方在 NoApp 私聊窗口用文字发消息/);
 assert.match(voice,/现在双方没有进行实时电话/);
 assert.match(text,/作者本人提供的陈熙泰原始对白示例/,'author examples remain wired');
 assert.match(phone,/作者本人提供的陈熙泰原始对白示例/);
 assert.equal(DEFAULT_TAI_BEHAVIOR.callMaxSegments,5);
 assert.equal(DEFAULT_TAI_BEHAVIOR.callDetail,'detailed');
 assert.equal(normalizeTaiBehavior({callDetail:'garbage'}).callDetail,'detailed');
 assert.match(behaviorSettings(normalizeTaiBehavior(),{},[]),/name="behavior_callDetail"/);
});

async function withMockCall(replyEntries,run,{actions=[],failVoice=false,incomingOptions={openingText:'喂。'}}={}){
 const old=Object.fromEntries(['Audio','fetch','sessionStorage','FormData'].map(k=>[k,globalThis[k]]));
 const players=[],requests=[],toasts=[];
 let playerInput='';
 class FakeAudio {
  constructor(){this.src='';this.paused=true;this.listeners=new Map();players.push(this);}
  addEventListener(name,cb){const handlers=this.listeners.get(name)||new Set();handlers.add(cb);this.listeners.set(name,handlers);}
  removeEventListener(name,cb){this.listeners.get(name)?.delete(cb);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}
 }
 const state=initialState();state.day=60;state.clock='22:30';state.unlocked=true;
 state.aiDraft.behavior={...state.aiDraft.behavior,callPause:0.3,callMaxSegments:5,callDetail:'detailed'};
 const store={get:()=>state,update:fn=>fn(state)};
 const ctx={store,refresh(){},router:{open(){}},toast(message){toasts.push(message);}};
 const waitFor=async(testFn,description='condition')=>{
  for(let i=0;i<180;i++){if(testFn())return;await new Promise(resolve=>setTimeout(resolve,10));}
  throw Error('waiting for '+description);
 };
 try{
  globalThis.Audio=FakeAudio;
  globalThis.FormData=class{get(name){return name==='text'?playerInput:'';}};
  globalThis.sessionStorage={getItem:key=>key===BYOK_SESSION?JSON.stringify({deepseek:'test-deepseek',minimax:'test-minimax',region:'cn'}):null};
  globalThis.fetch=async(url,init)=>{
   const body=JSON.parse(init.body);
   requests.push({url:String(url),body});
   if(String(url).includes('t2a_v2'))return Response.json(failVoice&&requests.filter(r=>r.url.includes('t2a_v2')).length>1?{base_resp:{status_code:1008,status_msg:'今日 AI 使用额度已达到上限'}}:{base_resp:{status_code:0},data:{audio:'494433'}});
   const isDecision=body.messages[0].content.includes('【行为决策层】');
   return Response.json({choices:[{message:{content:isDecision?
    JSON.stringify({schema_version:10,action:'speak',tone:'dry',strategy:'answer_directly'}):
    JSON.stringify({schema_version:10,action:actions.length?'hang_up':'speak',messages:(typeof replyEntries==='function'?replyEntries(body):replyEntries).map(text=>({text,mode:'voice',tone:'dry'})),actions})}}]});
  };
  assert.equal(startIncoming(ctx,'熙泰找你',incomingOptions),true);
  assert.equal(callAction('tai-accept',ctx),true);
  await waitFor(()=>players[0]?.src?.startsWith('blob:'),'greeting audio');
  players[0].finish();
  await waitFor(()=>callState().turnCount===1,'completed greeting');
  await run({
   state,store,ctx,players,requests,waitFor,toasts,
   send(text){playerInput=text;return submitCall({dataset:{form:'tai-call-turn'}},ctx);}
  });
 }finally{
  callAction('tai-hangup',ctx);
  for(const [key,value] of Object.entries(old)){
   if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
 }
}

test('accepted player-requested callback plays exactly one fixed greeting without a model request',async()=>{
 await withMockCall(['熙蒙，你说。'],async({state,ctx,requests,players,waitFor,send})=>{
  const speech=requests.filter(r=>r.url.includes('t2a_v2'));
  assert.equal(speech.length,1);
  assert.match(speech[0].body.text,/^(?:怎么(?:了|\(le5\))|喂)[？?]$/);
  assert.equal(requests.filter(r=>r.url.includes('chat/completions')).length,0);
  assert.equal(callState().turnCount,1);
  send('嗯');
  await waitFor(()=>callView(state).includes('nya，你说。'),'nickname caption');
  assert.match(requests.filter(r=>r.url.includes('t2a_v2')).at(-1).body.text,/nya/);
  assert.doesNotMatch(requests.filter(r=>r.url.includes('t2a_v2')).at(-1).body.text,/熙蒙/);
  players[0].finish();
  await waitFor(()=>callState().turnCount===3,'nickname delivered');
 },{incomingOptions:{requestedByPlayer:true,openingText:'熙蒙。电话我打了。现在能听到我说话吗？'}});
});

test('a rejected dialogue draft never becomes speech or a fabricated connection failure',async()=>{
 await withMockCall(['不是勉强承认，是因为你这个人。'],async({state,requests,waitFor,send})=>{
  assert.equal(send('你怎么想？'),true);
  await waitFor(()=>requests.filter(r=>r.url.includes('chat/completions')).length===2,'one rejected draft plus one correction');
  await waitFor(()=>!callView(state).includes('熙泰正在回覆'),'expression finished');
  assert.equal(callState().state,'connected');
  assert.equal(requests.filter(r=>r.url.includes('t2a_v2')).length,1,'only the original greeting was synthesized');
  assert.doesNotMatch(callView(state),/连线不稳|連線不穩|通話失敗|勉强承认/);
 });
});

test('player requests Tai to hang up: spoken farewell executes actual hangup after audio completes',async()=>{
 await withMockCall(['好，先挂了。明天再说，别熬得太晚。'],async({state,ctx,players,requests,waitFor,send})=>{
  assert.equal(send('那你挂我电话吧，再见。'),true);
  await waitFor(()=>callView(state).includes('好，先挂了'),'farewell caption');
  assert.equal(callState().state,'connected','should not disconnect before goodbye is heard');
  assert.equal(state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').length,0);
  players[0].finish();
  await waitFor(()=>callState().state==='ended','Tai hangup');
  assert.equal(callState().endedBy,'tai');
  const entry=state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(entry.endedBy,'tai');
  assert.equal(entry.endReason,'player_request');
  assert.match(entry.transcript,/好，先挂了/);
  assert.match(callBridgeNote(entry,{day:60,clock:'22:31'}),/陈熙泰主动按下挂断键/);
  const modelRequests=requests.filter(x=>x.url.includes('chat/completions'));
  assert.equal(modelRequests.length,1,'player command skips decision-model call and uses one farewell generation');
 });
});

test('model JSON action ends the active call only after its farewell is played',async()=>{
 await withMockCall(['我還有事，晚點聊。'],async({state,players,waitFor,send})=>{
  send('还在吗？');await waitFor(()=>callView(state).includes('我還有事'),'farewell');
  assert.equal(callState().state,'connected');assert.doesNotMatch(callView(state),/end_call|after_reply/);
  players[0].finish();await waitFor(()=>callState().state==='ended','structured hangup');
  assert.equal(callState().endedBy,'tai');assert.equal(state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').length,1);
 },{actions:[{type:'end_call',timing:'after_reply'}]});
});
test('quota error shows connection failure, records neither party as hangup initiator, sends one local fallback',async()=>{
 await withMockCall(['聽得見。'],async({state,ctx,waitFor,send})=>{
  send('你听见了吗？');await waitFor(()=>callView(state).includes('連線不穩定'),'connection warning');
  await waitFor(()=>callState().state==='ended','connection failure');
  assert.match(callView(state),/通話失敗/);assert.equal(callState().endedBy,'connection_error');
  const chat=state.content.conversations.noapp.find(c=>c.id==='tai');const rec=chat.messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(rec.endedBy,'connection_error');assert.match(callBridgeNote(rec,state),/双方均未主动挂断/);assert.doesNotMatch(rec.transcript,/聽得見/);
  assert.equal(chat.messages.at(-1).text,'怎麼突然沒聲了？');callAction('tai-hangup',ctx);
  assert.equal(chat.messages.filter(m=>m.kind==='call').length,1);assert.ok(!state.notifications.some(n=>/AI 使用额度|MiniMax/.test(n.body||'')));
 },{failVoice:true});
});
test('manual hangup wins while a later character hangup action is waiting on speech',async()=>{
 await withMockCall(['晚安。'],async({state,ctx,players,waitFor,send})=>{
  send('不聊了');await waitFor(()=>callView(state).includes('晚安'),'goodbye segment');callAction('tai-hangup',ctx);
  players[0].finish();await new Promise(resolve=>setTimeout(resolve,350));
  const records=state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call');
  assert.equal(records.length,1);assert.equal(records[0].endedBy,'player');
 });
});
test('substantive call can speak four distinct paragraphs in one generation without overlapping playback',async()=>{
 const lines=[
  '你说的那件事我听明白了。先别急着怪自己，我想知道你实际遇到了什么。',
  '如果是那台机器又突然掉线，那也许不是你写错了代码。上回的问题就没有完全排查清楚。',
  '不过你总是想独自把所有事扛下来，这点我真的不太赞同。你可以试着让我也看一眼。',
  '好了，具体说说你第一次发现它不对劲是什么时候。我现在听着。'
 ];
 await withMockCall(lines,async({state,players,requests,waitFor,send})=>{
  send('我想跟你仔细聊聊今天出了什么问题，你多说几段。');
  for(let i=0;i<lines.length;i++){
   await waitFor(()=>callView(state).includes(lines[i]),'segment '+i);
   assert.equal(callState().turnCount,i+2,'only completed previous segments should be stored');
   players[0].finish();
  }
  await waitFor(()=>callState().turnCount===1+1+lines.length,'all completed voice thoughts');
  assert.equal(callState().state,'connected','speaking 4 segments must not end the call');
  const calls=requests.filter(x=>x.url.includes('chat/completions'));
  assert.equal(calls.length,1,'action and speech share one JSON request');
  const tts=requests.filter(x=>x.url.includes('t2a_v2'));
  assert.equal(tts.length,1+lines.length,'greeting plus four segments');
 });
});

test('explicit request for more speech has a JSON segment plan and repairs a short draft only once',async()=>{
 const lines=['我有些話還沒有說完。','你剛剛說起那件事，我想了一下。','我想聽聽你當時具體是怎麼處理的。'];
 await withMockCall(body=>body.messages[0].content.includes('【多段语音补足】')?lines:['好。'],async({state,players,requests,waitFor,send})=>{
  send('能不能多说几句');
  for(const line of lines){await waitFor(()=>callView(state).includes(line),line);players[0].finish();}
  await waitFor(()=>callState().turnCount===5);
  const calls=requests.filter(x=>x.url.includes('chat/completions')&&x.body.messages[0].content.includes('【单次通话 JSON'));
  assert.equal(calls.length,2);
  assert.match(calls[0].body.messages[0].content,/"min_segments":3/);
  assert.match(calls[1].body.messages[0].content,/多段语音补足/);
  assert.equal(state.events.filter(x=>x.type==='tai_call_v2_turn').at(-1).planned,3);
 });
});

test('ordinary live conversation continues after a one-line draft without a new player message',async()=>{
 const first='那是博士課程。',second='你找我到底什麼事？我等一下還有事。';
 await withMockCall(body=>body.messages[0].content.includes('【多段语音补足】')?[second]:[first],async({state,players,requests,waitFor,send})=>{
  send('你不是在哈佛讀書嗎？');
  await waitFor(()=>callView(state).includes(first),first);players[0].finish();
  await waitFor(()=>callView(state).includes(second),second);players[0].finish();
  await waitFor(()=>callState().turnCount===4);
  assert.equal(requests.filter(x=>x.url.includes('chat/completions')&&x.body.messages[0].content.includes('【单次通话 JSON')).length,2);
  assert.equal(state.events.filter(x=>x.type==='tai_call_v2_turn').at(-1).planned,2);
 });
});

test('game quota nearing its end makes Tai say goodbye and actually hang up',async()=>{
 await withMockCall(['我知道了。','好了，先聊到這裡吧。晚安。'],async({state,players,waitFor,send})=>{
  state.aiDraft.taiVoiceUsage={60:{call:27,message:0}};
  send('你覺得怎麼樣？');
  await waitFor(()=>callView(state).includes('我知道了。'),'reply');players[0].finish();
  await waitFor(()=>callView(state).includes('好了，先聊到這裡吧。'),'farewell');players[0].finish();
  await waitFor(()=>callState().state==='ended','quota farewell was actually played');
  assert.equal(state.aiDraft.taiVoiceUsage[60].call,29);
  assert.equal(state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').at(-1).endReason,'quota');
 });
});

test('microphone listening and recognition are inline beneath the contact, with no app toast',async()=>{
 await withMockCall(['聽到了。'],async({state,ctx,players,toasts,waitFor})=>{
  const priorWindow=globalThis.window,priorNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let recognition;
  class Speech{constructor(){recognition=this;}start(){}stop(){}abort(){}}
  try{
   globalThis.window={SpeechRecognition:Speech};
   Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
   assert.equal(callAction('tai-mic',ctx),true);
   assert.match(callView(state),/<p role="status" aria-live="polite">正在聆聽/);
   assert.equal(callAction('tai-mic',ctx),true);
   assert.match(callView(state),/<p role="status" aria-live="polite">正在識別/);
   recognition.onresult({results:[[{transcript:'你聽得到嗎？'}]]});
   recognition.onend();
   await waitFor(()=>callView(state).includes('聽到了。'));
   players[0].finish();
   assert.equal(toasts.length,0);
   assert.match(callView(state),/native-controls/);
  }finally{
   if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow;
   if(priorNavigator)Object.defineProperty(globalThis,'navigator',priorNavigator);else delete globalThis.navigator;
  }
 });
});

test('minimizing a live NoApp call preserves its session and allows talking from another App',async()=>{
 await withMockCall(['聽到了。'],async({state,ctx,players,toasts,waitFor})=>{
  const chat={appId:'noapp',route:'/chat/tai',params:{}};
  const callRoute={appId:'noapp',route:'/call',params:{}};
  state.nav.current=callRoute;state.nav.stack=[chat];
  ctx.router.open=loc=>{state.nav.stack.push(state.nav.current);state.nav.current=loc;};
  const session=callState().sessionId;
  assert.match(callView(state),/tai-minimize-call/);
  assert.equal(minimizedCallView(state),'');
  callAction('tai-minimize-call',ctx);
  assert.deepEqual(state.nav.current,chat);
  assert.match(minimizedCallView(state),/通話中/);
  assert.equal(startOutgoing(ctx),true,'the chat phone button resumes rather than dialing twice');
  assert.deepEqual(state.nav.current,callRoute);
  assert.equal(callState().sessionId,session);
  callAction('tai-minimize-call',ctx);
  state.nav.current={appId:'wechat',route:'/',params:{}};
  const oldWindow=globalThis.window,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let recognition;
  class Speech{constructor(){recognition=this;}start(){}stop(){}abort(){}}
  try{
   globalThis.window={SpeechRecognition:Speech};
   Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
   callAction('tai-mic',ctx);
   assert.match(minimizedCallView(state),/is-recording/);
   assert.match(minimizedCallView(state),/錄音中/);
   callAction('tai-mic',ctx);
   assert.doesNotMatch(minimizedCallView(state),/is-recording/);
   assert.match(minimizedCallView(state),/傳送中/);
   recognition.onresult({results:[[{transcript:'你聽得到嗎？'}]]});recognition.onend();
   await waitFor(()=>callView(state).includes('聽到了。'));
   players[0].finish();
   await waitFor(()=>callState().turnCount===3);
   assert.match(minimizedCallView(state),/通話中/);
   assert.equal(state.nav.current.appId,'wechat');
   callAction('tai-hangup',ctx);
   assert.equal(minimizedCallView(state),'');
   assert.equal(state.nav.current.appId,'wechat');
   assert.equal(state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').length,1);
   assert.equal(toasts.length,0);
  }finally{
   if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
   if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;
  }
 });
});

test('player silently hangs up: the next text prompt knows the phone is disconnected',async()=>{
 await withMockCall(['这次我听明白了。'],async({state,ctx,waitFor,send,requests})=>{
  assert.equal(callAction('tai-hangup',ctx),true);
  assert.equal(callState().endedBy,'player');
  const chat=state.content.conversations.noapp.find(c=>c.id==='tai');
  const entry=chat.messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(entry.endedBy,'player');
  assert.match(entry.transcript,/喂/);
  chat.messages.push({id:'after-call-player-text',from:'me',kind:'text',text:'挂电话以后我当然还可以打字啊。',actual:true,day:state.day,time:state.clock});
  const {replyToTaiMessage}=await import('../src/services/ai/live-chat.js');
  const result=await replyToTaiMessage({get:()=>state,update:fn=>fn(state)},'after-call-player-text',{
   wait:async()=>{},random:()=>.99,now:Date.now,refresh:()=>{}
  });
  assert.equal(result.status,'replied');
  const lastReply=chat.messages.filter(m=>m.from==='tai'&&m.replySourceId==='after-call-player-text').at(-1);
  assert.ok(lastReply,'Tai must produce a real reply to post-call text');
  assert.equal(lastReply.kind,'text','first text after hangup should not become an audio clip');
  assert.ok(!state.events.some(e=>e.type==='tai_v12_turn_plan'&&e.sourceId==='after-call-player-text'),'no forced micro-bubble quotas on first post-call response');
  const modelRequests=requests.filter(x=>x.url.includes('chat/completions'));
  assert.ok(modelRequests.some(r=>r.body.messages[0].content.includes('现在双方在 NoApp 私聊窗口用文字发消息')));
  assert.ok(modelRequests.some(r=>r.body.messages[0].content.includes('熙蒙自己按了挂断键')));
  assert.ok(modelRequests.some(r=>r.body.messages.some(m=>m.content?.includes('熙蒙主动按下挂断键'))));
  assert.equal(callState().state,'ended','text replies must not reopen a call');
 });
});
