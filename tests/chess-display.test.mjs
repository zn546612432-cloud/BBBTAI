import test from 'node:test';import assert from 'node:assert/strict';import {initialState} from '../src/services/storage.js';import {render} from '../src/apps/chess/index.js';import {createSoloMatch,playMove,postMatchMessage,replyToMatch} from '../src/services/chess.js';import {registry,homePages} from '../src/system/registry.js';
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
