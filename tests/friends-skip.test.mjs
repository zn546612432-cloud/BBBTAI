import test from 'node:test';
import assert from 'node:assert/strict';
import {authorize,begin,submit,settle} from '../src/apps/ghost/state.js';
import {skipFriendsOrder} from '../src/apps/ghost/features/friends-skip/index.js';

test('friends skip uses normal success and single settlement for every tool',()=>{
 for(const type of ['cipher','route','extract','veil','strike','verify']){
  const s={day:2,story55:{version:1},ghost:{orders:{},history:[],balance:0,config:{[type]:{reward:25}}}};
  authorize(s,{orderId:'sample',type});
  assert.equal(skipFriendsOrder(s,'sample'),false);
  assert.equal(begin(s,'sample',1000),true);
  assert.equal(skipFriendsOrder(s,'sample',2000),true);
  assert.equal(s.ghost.orders.sample.status,'success');
  assert.equal(skipFriendsOrder(s,'sample',2001),false);
  assert.equal(s.ghost.history.length,1);
  assert.equal(submit(s,'sample',3000),true);
  assert.equal(settle(s,123000),true);
  assert.equal(s.ghost.balance,25);
 }
});
