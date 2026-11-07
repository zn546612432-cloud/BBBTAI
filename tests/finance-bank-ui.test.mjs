import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from '../src/apps/bank/index.js';

test('Pacific exchange screen shows BTC denomination and 2025 daily quote instead of inherited rate=1',()=>{
 const s={day:6,clock:'18:00',story55:{version:1},content:{mirage:{digitalBalance:10}},bankData:{rate:1,balance:0,transactions:[],account:'•• 1846'}};
 const html=render({store:{get:()=>s}},{route:'/exchange'});
 assert.match(html,/10\.00000000 BTC/);
 assert.match(html,/1 BTC = US\$107,791\.16/);
 assert.match(html,/BTC 参考估值/);
 assert.match(html,/1,077,911\.60/);
 assert.doesNotMatch(html,/1 : 1\.00/);
});
test('Pacific historic BTC sale receipt saves quote and amount without repricing',()=>{
 const s={day:7,clock:'09:00',story55:{version:1},content:{mirage:{digitalBalance:9}},bankData:{
  rate:1,balance:107791.16,account:'•• 1846',transactions:[{id:'btc-1',label:'MIRAGE · BTC 兑换',amount:107791.16,asset:'BTC',assetAmount:1,quoteUsdRate:107791.16,time:'20:30',date:'2025-05-24'}]
 }};
 const html=render({store:{get:()=>s}},{route:'/receipt/btc-1'});
 assert.match(html,/1\.00000000 BTC/);
 assert.match(html,/107,791\.16 \/ BTC/);
 assert.match(html,/2025-05-24/);
});
