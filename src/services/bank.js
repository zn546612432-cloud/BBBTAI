import {dateLabel} from './calendar.js';
import {isStory55,date55} from './story55/state.js';
import {historicalBtcUsd,HISTORICAL_BTC_USD_SOURCE} from './finance/historical-btc-usd.js';
export const openingBank=()=>({balance:1280,rate:1,transactions:[],account:'•• 1846'});
export function ensureBank(s){
 if(s.bankData)return false;
 s.bankData=openingBank();return true;
}
export const cents=n=>Math.round(Number(n)*100);
/** One synchronous ledger posting contract used by optional purchases and
 * BTC cash-outs. Call only inside the existing PhoneStore.update() callback.
 * A transaction ID is committed with its balance mutation, exactly once. */
export function postBankTransaction(s,{id,label,amount,metadata={},receipt=null}){
 ensureBank(s);
 const n=Number(amount),value=cents(n);
 if(!id||!label||!Number.isFinite(n)||!Number.isSafeInteger(value)||value===0||Math.abs(value/100-n)>0.000001)
  throw Error('银行交易金额或编号无效');
 s.bankData.transactions??=[];
 if(s.bankData.transactions.some(t=>t.id===id))throw Error('该笔银行交易已处理');
 const old=cents(s.bankData.balance);
 if(!Number.isSafeInteger(old)||old+value<0)throw Error('银行余额不足，请先兑换资产或积攒资金');
 const tx={...metadata,id,label,amount:value/100,date:isStory55(s)?date55(s.day):dateLabel(s),time:s.clock};
 s.bankData.balance=(old+value)/100;
 s.bankData.transactions.unshift(tx);
 // A bank receipt is the notification for the SAME ledger posting, not a
 // separately scheduled story event. Its transaction ID is the idempotency key.
 if(receipt){
  s.notifications??=[];
  const noticeId=receipt.id||'bank-receipt-'+id;
  if(!s.notifications.some(n=>n.id===noticeId))s.notifications.unshift({
   id:noticeId,title:receipt.title||'Pacific',
   body:receipt.body||`${n>0?'轉入':'轉出'} US${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
   day:s.day,clock:s.clock,link:receipt.link||{appId:'bank',route:'/receipt/'+encodeURIComponent(id)},
   bannerPending:true
  });
 }
 return tx;
}
export function payBankPurchase(s,{id,title,price,metadata={}}){
 const n=Number(price);
 if(!Number.isFinite(n)||n<=0)throw Error('商品金额无效');
 return postBankTransaction(s,{id,label:title,amount:-n,metadata});
}

export function transfer(store,{recipient,account,amount,note=''}){
 const name=String(recipient||'').trim(),destination=String(account||'').trim(),memo=String(note||'').trim(),value=cents(amount);
 if(!name||!destination)throw Error('请填写收款人和账号');
 if(!/^\d{6,20}$/.test(destination.replace(/[\s-]/g,'')))throw Error('请输入 6–20 位收款账号');
 if(!Number.isSafeInteger(value)||value<=0||Math.abs(value/100-Number(amount))>0.000001)throw Error('请输入有效金额');
 store.update(s=>{ensureBank(s);const b=s.bankData;if(value>cents(b.balance))throw Error('余额不足');b.balance=(cents(b.balance)-value)/100;b.transactions.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),label:name,account:destination,note:memo,amount:-value/100,time:s.clock,date:dateLabel(s)});});
}
/** Convert MIRAGE's BTC balance into the existing Pacific USD ledger.
 *  One shared finance operation; no phantom balance or independently seeded
 *  wallet. Historical prices are daily reference closes, not real-time ticks.
 *  For Story55 amounts are BTC with up to eight decimals (satoshi precision).
 *  Previous non-Story55 test fixtures keep the original generic 1:rate path.
 */
export function exchange(store,amount){
 if(isStory55(store.get())){
  const raw=String(amount).trim();
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(raw))throw Error('BTC 数量无效（最多八位小数）');
  const [integer,fraction='']=raw.split('.');
  const sats=Number(integer)*100000000+Number(fraction.padEnd(8,'0'));
  if(!Number.isSafeInteger(sats)||sats<=0)throw Error('请输入有效的 BTC 兑换数量');
  store.update(s=>{
   ensureBank(s);
   const wallet=s.content?.mirage;
   if(!wallet)throw Error('MIRAGE 钱包不存在');
   const available=Math.round(Number(wallet.digitalBalance||0)*100000000);
   if(!Number.isSafeInteger(available)||sats>available)throw Error('BTC 余额不足');
   const quote=historicalBtcUsd(s.day),usdCents=Math.round(sats/100000000*quote*100);
   if(!Number.isSafeInteger(usdCents)||usdCents<=0)throw Error('兑换金额过低，无法入账到美分');
   const btc=sats/100000000;
   wallet.digitalBalance=(available-sats)/100000000;
   wallet.digitalTransactions??=[];
   const sequence=wallet.digitalTransactions.filter(t=>t.type==='BTC_TO_USD').length+1;
   const id='btc-usd-'+date55(s.day)+'-'+sequence;
   if(wallet.digitalTransactions.some(t=>t.id===id)||s.bankData.transactions.some(t=>t.id===id))throw Error('交易编号重复');
   const usd=usdCents/100,date=date55(s.day);
   postBankTransaction(s,{id,label:'MIRAGE · BTC 兑换',amount:usd,
    metadata:{note:`${btc.toFixed(8)} BTC × ${quote.toFixed(2)}/BTC`,asset:'BTC',assetAmount:btc,quoteUsdRate:quote,quoteSource:HISTORICAL_BTC_USD_SOURCE}});
   wallet.digitalTransactions.unshift({id,orderId:null,type:'BTC_TO_USD',asset:'BTC',amount:-btc,usdAmount:usd,quoteUsdRate:quote,date,day:s.day,clock:s.clock});
   s.events??=[];s.events.push({type:'btc_usd_exchanged',id,assetAmount:btc,usdAmount:usd,quoteUsdRate:quote,day:s.day,clock:s.clock});
  });
  return;
 }
 // Legacy non-55-day fixtures: retain their established generic exchange.
 const value=cents(amount);if(!Number.isSafeInteger(value)||value<=0||Math.abs(value/100-Number(amount))>0.000001)throw Error('请输入有效金额');
 store.update(s=>{ensureBank(s);const b=s.bankData,w=s.content.mirage,available=cents(w?.digitalBalance||0);if(!(b.rate>0))throw Error('汇率尚未设置');if(value>available)throw Error('数字币余额不足');const usd=cents(value/100*b.rate);if(usd<=0)throw Error('兑换金额过低');w.digitalBalance=(available-value)/100;b.balance=(cents(b.balance)+usd)/100;b.transactions.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),label:'MIRAGE',note:'数字币兑换',amount:usd/100,time:s.clock,date:dateLabel(s)});});
}
