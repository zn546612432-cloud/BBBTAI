import {uid} from '../../services/id.js';
import {hackerBounty,HACKER_BOUNTY_ID} from './mission.js';
export const contactNames=['Isolde Mirage','Rookery 13','Nyx Voidwalker','Cipher-7','Vesper Nocturne','Dr. Ouroboros','Thalia Liminal','Orion Echo','Iris 404','Silas Rook','Lyra Null'];
export const MIRAGE_ACCOUNT='NYARLATHOTEP';
export const MIRAGE_PASSWORD='miragecipheraccess';
export const defaultProducts=[
 {id:'mc-p1',name:'ASSAULT RIFLE',category:'ARMS',price:12000,stock:4,description:'Unmarked inventory. Condition: excellent.',art:'rifle'},
 {id:'mc-p2',name:'TACTICAL SIDEARM',category:'ARMS',price:4200,stock:8,description:'Compact profile. Private stock.',art:'pistol'},
 {id:'mc-p3',name:'HUMAN KIDNEY',category:'ORGANS',price:85000,stock:2,description:'Restricted biological inventory. Lot K-041.',art:'kidney'},
 {id:'mc-p4',name:'HUMAN HEART',category:'ORGANS',price:160000,stock:1,description:'Restricted biological inventory. Lot H-017.',art:'heart'},
 {id:'mc-p5',name:'BALLISTIC VEST',category:'EQUIPMENT',price:2600,stock:6,description:'Lightweight protective equipment.',art:'vest'},
 {id:'mc-p6',name:'ENCRYPTED TERMINAL',category:'EQUIPMENT',price:6800,stock:3,description:'Portable private-network terminal.',art:'terminal'}
];
export function mirageData(s){return s.content.mirage||{account:MIRAGE_ACCOUNT,balance:300000,products:defaultProducts,cart:[],transactions:[],assets:[]};}
export function initializeMirage(store){if(store.get().content.mirage?.version===2)return;store.update(s=>{
 const previousVersion=s.content.mirage?.version||0;
 s.content.mirage={...mirageData(s),version:2};
 if(previousVersion<2&&!s.content.orders.some(o=>o.id===HACKER_BOUNTY_ID))s.content.orders.push({...hackerBounty});
 if(previousVersion>=1)return;
 const list=s.content.conversations.mirage||=[];
 contactNames.forEach((name,i)=>{let c=list.find(c=>c.name.toLowerCase().replace(/[. ]/g,'')===name.toLowerCase().replace(/[. ]/g,''));if(!c){c={id:'mc-'+i,name,messages:[]};list.push(c);}c.online??=i===0;c.status??=i===0?'ONLINE':'NO MESSAGE';});
 });}
export const contacts=s=>{const list=[...(s.content.conversations.mirage||[])];return list.sort((a,b)=>(Number(b.lastOpened)||0)-(Number(a.lastOpened)||0)||(a.name==='Isolde Mirage'?-1:b.name==='Isolde Mirage'?1:0));};
export const isCompletedBounty=order=>['COMPLETED','已完成'].includes(String(order.status||'').trim().toUpperCase());
export const bountyGroups=orders=>({open:orders.filter(o=>!isCompletedBounty(o)),completed:orders.filter(isCompletedBounty)});
export const money=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
export function cipher(text,id=''){let x=0x811c9dc5;for(const c of id+text)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;let out='';for(let i=0;i<Math.max(48,Math.min(128,text.length*4));i++){x=(Math.imul(x,1664525)+1013904223)>>>0;out+=(x>>>28).toString(16);if(i%8===7)out+=' ';}return '%%ENC BEGIN%% ['+out.trim()+'] %%ENC END%%';}
export function saveRecord(store,kind,id,record){const map={contacts:s=>s.content.conversations.mirage,bounties:s=>s.content.orders,products:s=>s.content.mirage.products};store.update(s=>{const list=map[kind](s),old=list.find(x=>x.id===id);if(old)Object.assign(old,record);else list.push({id:uid(),...(kind==='contacts'?{messages:[],online:false}:{}),...record});});}
export function purchase(store){let receipt;store.update(s=>{const d=s.content.mirage;const lines=d.cart.map(row=>({row,p:d.products.find(p=>p.id===row.id)}));if(!lines.length)throw Error('YOUR CART IS EMPTY');if(lines.some(({row,p})=>!p||row.qty>Number(p.stock)))throw Error('INSUFFICIENT STOCK');const total=lines.reduce((sum,{row,p})=>sum+row.qty*Number(p.price),0);if(total>d.balance)throw Error('INSUFFICIENT FUNDS');d.balance-=total;receipt=uid();for(const {row,p} of lines){p.stock-=row.qty;d.assets.push({id:uid(),productId:p.id,name:p.name,quantity:row.qty,price:p.price,receipt});}d.transactions.unshift({id:receipt,type:'PURCHASE',amount:-total,time:s.clock,date:s.calendar?.anchorDate});d.cart=[];});return receipt;}
