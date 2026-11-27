import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneRouter} from '../src/services/router.js';
import {isMirageChessReturn} from '../src/apps/mirage/session.js';
import {readFileSync} from 'node:fs';

const home={appId:'home',route:'/',params:{}};
const chat={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};
const chess={appId:'chess',route:'/match/finished-match',params:{}};
const returned={...chat,params:{fromChess:'finished'}};
const make=(current,stack=[])=>{
 const s={nav:{current,stack:[...stack]},matches:[{id:'finished-match',status:'finished',closedAt:1000}]};
 return {s,router:new PhoneRouter({get:()=>s,update:fn=>fn(s)},new Set(['home','mirage','chess']))};
};
test('finished chess returns to Mirage with no historical chess screen; Back goes home',()=>{
 const original=globalThis.document;
 globalThis.document={querySelector:()=>null};
 try{
  const {s,router}=make(chess,[home,chat]);
  router.open(returned,{resetHistory:true});
  assert.deepEqual(s.nav.current,returned);
  assert.deepEqual(s.nav.stack,[]);
  assert.equal(isMirageChessReturn(s),true);
  router.back();assert.deepEqual(s.nav.current,home);assert.deepEqual(s.nav.stack,[]);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('old saves with a closed chess board in the back stack return home too',()=>{
 const {s,router}=make(chat,[home,chat,chess]);
 assert.equal(isMirageChessReturn(s),true);
 router.back();assert.deepEqual(s.nav.current,home);assert.deepEqual(s.nav.stack,[]);
});
test('ordinary MIRAGE chat and unfinished chess do not change navigation policy',()=>{
 const {s}=make(chat,[home,chess]);s.matches[0].status='active';delete s.matches[0].closedAt;
 assert.equal(isMirageChessReturn(s),false);
 s.nav.stack=[home];assert.equal(isMirageChessReturn(s),false);
});
test('both scripted chess exits reset history and the MIRAGE header uses the same return policy',()=>{
 const chessSource=readFileSync(new URL('../src/apps/chess/index.js',import.meta.url),'utf8');
 const mirageSource=readFileSync(new URL('../src/apps/mirage/index.js',import.meta.url),'utf8');
 assert.equal((chessSource.match(/fromChess:'finished'\}\},\{resetHistory:true\}/g)||[]).length,2);
 assert.match(mirageSource,/if\(action==='mc-contacts'\)\{if\(isMirageChessReturn\(s\)\)return ctx\.router\.home\(\)/);
});
