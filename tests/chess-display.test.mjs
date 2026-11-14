import test from 'node:test';import assert from 'node:assert/strict';import {initialState} from '../src/services/storage.js';import {render} from '../src/apps/chess/index.js';import {createSoloMatch,playMove,postMatchMessage,replyToMatch} from '../src/services/chess.js';import {registry,homePages} from '../src/system/registry.js';
import {receiveInvitation} from '../src/services/invitations.js';

function chessStore(){let state=initialState();return {get:()=>state,update(fn){state=structuredClone(state);fn(state);}};}

test('finished checkmate and draw never display a running turn',()=>{
 const store=chessStore(),id=createSoloMatch(store);
 for(const [pgn,result] of [['1. f3 e5 2. g4 Qh4#','opponent-win'],['1. e4 e5','draw']]){
  store.update(s=>Object.assign(s.matches[0],{pgn,status:'finished',result}));
  const html=render({store},{route:'/match/'+id});
  assert.match(html,/已結束/);assert.doesNotMatch(html,/轮到你|等待对手|思考中/);
 }
});

test('accepted chess invitation resumes after expiry while a pending one expires',()=>{
 const store=chessStore();store.update(s=>{s.day=56;s.invitations=[{id:'accepted',senderId:'tai',source:'story-invitation',status:'pending',expiresDay:57},{id:'pending',senderId:'tai',source:'story-invitation',status:'pending',expiresDay:57}];});
 const id=receiveInvitation(store,'accepted');store.update(s=>s.day=58);
 assert.equal(receiveInvitation(store,'accepted'),id);
 assert.equal(store.get().invitations[0].status,'accepted');assert.equal(store.get().matches.length,1);
 assert.throws(()=>receiveInvitation(store,'pending'),/过期/);
 assert.equal(store.get().invitations[1].status,'expired');
 assert.throws(()=>receiveInvitation(store,'unknown'),/来源/);
});

test('concurrent replies share one request and a failure permits retry',async()=>{
 const store=chessStore();store.update(s=>s.matches.push({id:'concurrent',opponent:'tai',pgn:'',status:'active',history:[],chat:[]}));
 postMatchMessage(store,'concurrent','等你落子');
 const prior=globalThis.fetch;let calls=0,fail=false;
 globalThis.fetch=async url=>{if(url==='/api/ai/status')return {ok:true,text:async()=>JSON.stringify({deepseek:true})};calls++;if(fail)throw Error('network unavailable');return {ok:true,text:async()=>JSON.stringify({text:'收到'})};};
 try{
  await Promise.all([replyToMatch(store,'concurrent'),replyToMatch(store,'concurrent')]);
  assert.equal(calls,1);assert.equal(store.get().matches[0].chat.filter(m=>m.from==='tai').length,1);
  postMatchMessage(store,'concurrent','再來');fail=true;
  await assert.rejects(replyToMatch(store,'concurrent'),/本机 AI 后端未连接/);
  fail=false;assert.equal(await replyToMatch(store,'concurrent'),true);assert.equal(calls,3);
 }finally{globalThis.fetch=prior;}
});
test('last move highlights both squares and pieces have explicit image assets',()=>{let state=initialState();const store={get:()=>state,update(fn){state=structuredClone(state);fn(state);}};const id=createSoloMatch(store);playMove(store,id,'e2','e4');const html=render({store},{route:'/match/'+id});assert.match(html,/last-move[^>]*data-square="e2"/);assert.match(html,/last-move[^>]*data-square="e4"/);assert.match(html,/\/apps\/chess\/pieces\/wP.png/);});
test('instagram is not installed or shown on the home screen',()=>{assert.equal(registry.has('instagram'),false);assert.equal(homePages.flat().includes('instagram'),false);});
test('Tai match renders its own persisted chat and AI replies without NoApp audio',async()=>{
 let state=initialState();state.matches.push({id:'tai-match',opponent:'tai',pgn:'',status:'active',turn:'w',history:[],chat:[]});
 const store={get:()=>state,update(fn){state=structuredClone(state);fn(state);}};
 const prior=globalThis.fetch;
 globalThis.fetch=async(url)=>({ok:true,text:async()=>JSON.stringify(url==='/api/ai/status'?{deepseek:true}:{text:JSON.stringify({messages:[{text:'轮到你了',mode:'text',tone:'dry'}]})})});
 try{
  postMatchMessage(store,'tai-match','等你落子');
  assert.equal(await replyToMatch(store,'tai-match'),true);
  const html=render({store},{route:'/match/tai-match'});
  assert.match(html,/chess-chat-form/);assert.match(html,/等你落子/);assert.match(html,/轮到你了/);assert.doesNotMatch(html,/data-app="noapp"/);
 }finally{globalThis.fetch=prior;}
});
