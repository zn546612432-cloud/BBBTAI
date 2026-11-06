import {isStory55,nodeStatus,story55Config,date55} from '../../services/story55/state.js';
import {D06_ORDER_ID} from '../../story/d06/commission.js';
import {ensureMirageStory,WALLET_CHALLENGE_ID,completeWalletChallenge} from './contacts-seed.js';
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
export {WALLET_CHALLENGE_ID,completeWalletChallenge};
// 55-day campaigns use the ORIGINAL MIRAGE design and complete native data
// rather than the old prototype-only story dashboard or D05 mission script.
export const STORY55_BOUNTY_ID=D06_ORDER_ID;
export const STORY55_WALLET_MAIL_ID='s55-wallet-d06-authorization';
// Player acceptance creates the missing KIRA authorization, once, without
// granting a reward or bypassing the real GHOST validation/minigame.
export function acceptStory55Wallet(s){
 if(!isStory55(s)||nodeStatus(s,'wallet').state!=='ready')return false;
 const order=s.content.orders?.find(o=>o.id===STORY55_BOUNTY_ID);
 if(!order||!['OPEN','ACCEPTED'].includes(order.status))return false;
 if(order.status==='ACCEPTED'&&s.content.mail?.some(m=>m.id===STORY55_WALLET_MAIL_ID))return false;
 order.status='ACCEPTED';
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===STORY55_WALLET_MAIL_ID))mail.unshift({
  id:STORY55_WALLET_MAIL_ID,from:'MIRAGE / Dr Ouroboros',
  subject:'[MIRAGE] WALLET CHALLENGE · GHOST 授权',
  body:'Nyarlathotep：\\n\\n钱包挑战已接受。\\n请打开 GHOST 中的 WALLET CHALLENGE，输入以下一次性项目授权码：\\n'+story55Config(s).projects.find(p=>p.id==='wallet').key+'\\n\\n完成数据提取程序后，系统会记录挑战结果。\\n\\n— MIRAGE',
  day:s.day,time:s.clock,date:date55(s.day),read:false,story55:true,storyWalletD06:true,project:'wallet'
 });
 const id='s55-wallet-d06-authorization-notice';
 if(!s.notifications.some(n=>n.id===id))s.notifications.unshift({
  id,title:'KIRA',body:'MIRAGE 钱包挑战授权邮件已送达',
  day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}}
 });
 return true;
}

export function ensureNativeMirage55(s){
 if(!isStory55(s))return;
 const old=s.content.mirage||{};
 const seed=old.nativeSeedVersion!==1;
 s.content.mirage={
  account:MIRAGE_ACCOUNT,balance:300000,products:structuredClone(defaultProducts),
  cart:[],transactions:[],assets:[],digitalBalance:0,digitalTransactions:[],
  ...old,
  products:Array.isArray(old.products)?old.products:structuredClone(defaultProducts),
  cart:Array.isArray(old.cart)?old.cart:[],
  assets:Array.isArray(old.assets)?old.assets:[],
  balance:Number.isFinite(old.balance)?old.balance:300000,
  nativeSeedVersion:1,version:3
 };
 // Contact identities are introduced by authored story triggers, never all at once.

 s.content.orders??=[];
 // D06 is seeded only by the shared daily commission runner.
 // Do not resurrect the prototype wallet order or its second KIRA email.
}

export function initializeMirage(store){
 if(isStory55(store.get()))return;
 const current=store.get();
 const missingStarter=['mc-arms-partner','mc-peer-crypt','mc-support-echo','mc-done-sable'].some(id=>!current.content.conversations.mirage.some(x=>x.id===id));
 const missingD05=(current.day>5||current.day===5&&current.clock>='20:00')&&!current.content.orders.some(x=>x.id===WALLET_CHALLENGE_ID);
 const needsUpgrade=current.content.mirage?.version!==3;
 if(!missingStarter&&!missingD05&&!needsUpgrade)return;
 store.update(s=>{
  const previousVersion=s.content.mirage?.version||0;
  s.content.mirage={...mirageData(s),version:3};
  if(previousVersion<2&&!s.content.orders.some(o=>o.id===HACKER_BOUNTY_ID))s.content.orders.push({...hackerBounty});
  ensureMirageStory(s);
 });
}
export const contacts=s=>{const done=s.events?.some(e=>e.type==='mirage_wallet_challenge_completed')||!!s.content.mirage?.ouroborosScript;const story55Unlocked=isStory55(s)&&!!s.story55?.completed?.wallet;const list=[...(s.content.conversations.mirage||[])].filter(c=>{if(isStory55(s)&&!story55Unlocked&&!c.authored&&(c.id==='s55-ouroboros'||c.id==='mc-ourob-d05'||/^Dr[. ]*Ouroboros$/i.test(c.name||'')))return false;return c.id!=='mc-ourob-d05'||done;});return list.sort((a,b)=>Math.max(Number(b.lastOpened)||0,Number(b.lastMessageAt)||0)-Math.max(Number(a.lastOpened)||0,Number(a.lastMessageAt)||0)||((b.authored===true?1:0)-(a.authored===true?1:0))||(a.name==='Isolde Mirage'?-1:b.name==='Isolde Mirage'?1:0));};
export const isCompletedBounty=order=>['COMPLETED','已完成'].includes(String(order.status||'').trim().toUpperCase());
export const bountyGroups=orders=>({open:orders.filter(o=>!isCompletedBounty(o)),completed:orders.filter(isCompletedBounty)});
export const money=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
export function cipher(text,id=''){let x=0x811c9dc5;for(const c of id+text)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;let out='';for(let i=0;i<Math.max(48,Math.min(128,text.length*4));i++){x=(Math.imul(x,1664525)+1013904223)>>>0;out+=(x>>>28).toString(16);if(i%8===7)out+=' ';}return '%%ENC BEGIN%% ['+out.trim()+'] %%ENC END%%';}
export function saveRecord(store,kind,id,record){const map={contacts:s=>s.content.conversations.mirage,bounties:s=>s.content.orders,products:s=>s.content.mirage.products};store.update(s=>{const list=map[kind](s),old=list.find(x=>x.id===id);if(old)Object.assign(old,record);else list.push({id:uid(),...(kind==='contacts'?{messages:[],online:false}:{}),...record});});}
export function purchase(store){let receipt;store.update(s=>{const d=s.content.mirage;const lines=d.cart.map(row=>({row,p:d.products.find(p=>p.id===row.id)}));if(!lines.length)throw Error('YOUR CART IS EMPTY');if(lines.some(({row,p})=>!p||row.qty>Number(p.stock)))throw Error('INSUFFICIENT STOCK');const total=lines.reduce((sum,{row,p})=>sum+row.qty*Number(p.price),0);if(total>d.balance)throw Error('INSUFFICIENT FUNDS');d.balance-=total;receipt=uid();for(const {row,p} of lines){p.stock-=row.qty;d.assets.push({id:uid(),productId:p.id,name:p.name,quantity:row.qty,price:p.price,receipt});}d.transactions.unshift({id:receipt,type:'PURCHASE',amount:-total,time:s.clock,date:s.calendar?.anchorDate});d.cart=[];});return receipt;}
