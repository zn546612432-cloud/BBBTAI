import {dateLabel} from './calendar.js';
export const openingBank=()=>({balance:1280,rate:1,transactions:[],account:'•• 1846'});
export function ensureBank(s){
 if(s.bankData)return false;
 s.bankData=openingBank();return true;
}
export const cents=n=>Math.round(Number(n)*100);
export function transfer(store,{recipient,account,amount,note=''}){
 const name=String(recipient||'').trim(),destination=String(account||'').trim(),memo=String(note||'').trim(),value=cents(amount);
 if(!name||!destination)throw Error('请填写收款人和账号');
 if(!/^\d{6,20}$/.test(destination.replace(/[\s-]/g,'')))throw Error('请输入 6–20 位收款账号');
 if(!Number.isSafeInteger(value)||value<=0||Math.abs(value/100-Number(amount))>0.000001)throw Error('请输入有效金额');
 store.update(s=>{ensureBank(s);const b=s.bankData;if(value>cents(b.balance))throw Error('余额不足');b.balance=(cents(b.balance)-value)/100;b.transactions.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),label:name,account:destination,note:memo,amount:-value/100,time:s.clock,date:dateLabel(s)});});
}
export function exchange(store,amount){
 const value=cents(amount);if(!Number.isSafeInteger(value)||value<=0||Math.abs(value/100-Number(amount))>0.000001)throw Error('请输入有效金额');
 store.update(s=>{ensureBank(s);const b=s.bankData,w=s.content.mirage,available=cents(w?.digitalBalance||0);if(!(b.rate>0))throw Error('汇率尚未设置');if(value>available)throw Error('数字币余额不足');const usd=cents(value/100*b.rate);if(usd<=0)throw Error('兑换金额过低');w.digitalBalance=(available-value)/100;b.balance=(cents(b.balance)+usd)/100;b.transactions.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),label:'MIRAGE',note:'数字币兑换',amount:usd/100,time:s.clock,date:dateLabel(s)});});
}
