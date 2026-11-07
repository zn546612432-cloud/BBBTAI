import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalBtcUsd,BTC_USD_DAILY_2025,MAY_2025_MOP_PER_USD_AVERAGE} from '../src/services/finance/historical-btc-usd.js';
import {exchange} from '../src/services/bank.js';

function fakeStore({day=6,btc=10,usd=0,story=true}={}){
 let s={day,clock:'18:30',calendar:{anchorDay:1,anchorDate:'2025-05-19'},story55:story?{version:1}:undefined,
  bankData:{balance:usd,rate:1,transactions:[],account:'•• 1846'},
  content:{mirage:{digitalBalance:btc,digitalTransactions:[]}},events:[]};
 return {get:()=>s,update:fn=>{const next=structuredClone(s);fn(next);s=next;}};
}
test('all 55 days are populated with real 2025 BTC USD closes',()=>{
 assert.equal(BTC_USD_DAILY_2025.length,55);
 assert.equal(historicalBtcUsd(6),107791.16);
 assert.equal(historicalBtcUsd(7),109035.39);
 assert.equal(historicalBtcUsd(55),117435.23);
 assert.equal(MAY_2025_MOP_PER_USD_AVERAGE,8.0384);
 assert.throws(()=>historicalBtcUsd(0));
 assert.throws(()=>historicalBtcUsd(56));
});
test('D06 whole reward is not automatically USD, but may be exchanged once requested',()=>{
 const store=fakeStore();
 assert.equal(store.get().bankData.balance,0);
 assert.equal(store.get().content.mirage.digitalBalance,10);
 exchange(store,'1');
 assert.equal(store.get().bankData.balance,107791.16);
 assert.equal(store.get().content.mirage.digitalBalance,9);
 const bankTx=store.get().bankData.transactions[0],walletTx=store.get().content.mirage.digitalTransactions[0];
 assert.equal(bankTx.asset,'BTC');assert.equal(bankTx.assetAmount,1);
 assert.equal(bankTx.quoteUsdRate,107791.16);assert.equal(bankTx.date,'2025-05-24');
 assert.equal(walletTx.id,bankTx.id);
 assert.equal(walletTx.amount,-1);assert.equal(walletTx.usdAmount,107791.16);
});
test('BTC conversion accepts 8 decimals, changes quote with story day, rejects overdrawn',()=>{
 const store=fakeStore({btc:0.1,usd:350});
 exchange(store,'0.0001');
 assert.equal(store.get().content.mirage.digitalBalance,0.0999);
 assert.equal(store.get().bankData.balance,360.78);
 assert.throws(()=>exchange(store,'0.00000001'),/过低/);
 assert.throws(()=>exchange(store,'0.000000001'),/八位小数/);
 assert.throws(()=>exchange(store,'2'),/余额不足/);
 store.update(s=>{s.day=7;});
 exchange(store,'0.01');
 assert.equal(store.get().bankData.transactions[0].quoteUsdRate,109035.39);
 assert.equal(store.get().bankData.transactions[0].date,'2025-05-25');
});
test('repeated valid conversion consumes BTC twice only when there is enough BTC; no free USD',()=>{
 const store=fakeStore({btc:0.5});
 exchange(store,'0.5');
 const total=store.get().bankData.balance;
 assert.equal(total,53895.58);
 assert.throws(()=>exchange(store,'0.5'),/余额不足/);
 assert.equal(store.get().bankData.balance,total);
 assert.equal(store.get().content.mirage.digitalTransactions.length,1);
});
test('legacy generic exchange is unchanged for non-story 55 fixtures',()=>{
 const store=fakeStore({story:false,btc:5});
 exchange(store,'2');
 assert.equal(store.get().bankData.balance,2);
 assert.equal(store.get().content.mirage.digitalBalance,3);
});
