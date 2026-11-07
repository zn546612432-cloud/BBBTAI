import {applyD13Definition,D13_WALLET_ID,D13_MAIL_ID} from './definition.js';
import {isStory55,completed,completeNode,nodeStatus,date55} from '../../services/story55/state.js';
export {D13_WALLET_ID,D13_MAIL_ID};
export const d13State=s=>s.story55?.d13;
export function syncD13(s){
 if(!isStory55(s))return;
 applyD13Definition(s.story55.config);
 if(s.story55.d13Revision===1)return;
 // Completed saves retain their exact scene, records and balances.
 // Partial legacy calls restart at the wallet; existing bubble IDs stay intact.
 const finished=completed(s,'intrusion');
 if(finished)for(const id of ['d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer'])s.story55.completed[id]??={...s.story55.completed.intrusion,migrated:true};
 s.story55.d13={phase:finished?'complete':'mail'};
 if(!finished&&s.story55.scenes.intrusion){s.story55.scenes.intrusion={index:0,accepted:false};}
 if(s.story55.activeScene==='intrusion'&&!finished)s.story55.activeScene=null;
 delete s.story55.lockedCall;
 s.story55.d13Revision=1;
}
export function bindD13Wallet(s){
 if(completed(s,'intrusion'))return false;
 if(nodeStatus(s,'d13-wallet-bind').state!=='ready')return false;
 const wallets=s.content.mirage.wallets??=[];
 if(!wallets.some(w=>w.id===D13_WALLET_ID))wallets.push({id:D13_WALLET_ID,address:'MIR-WLT-0013',asset:'BTC',balance:50,status:'available',boundAt:date55(s.day)});
 completeNode(s,'d13-wallet-bind');s.story55.d13.phase='bound';return true;
}
export function transferD13Wallet(s,now=Date.now()){
 if(completed(s,'d13-wallet-transfer')||completed(s,'intrusion'))return false;
 if(nodeStatus(s,'d13-wallet-transfer').state!=='ready')return false;
 const wallet=s.content.mirage.wallets.find(w=>w.id===D13_WALLET_ID);
 if(!wallet||wallet.status!=='available')return false;
 // The simulated transfer is interrupted. No USD posting, no main BTC debit.
 wallet.status='frozen';wallet.transferId=D13_WALLET_ID;
 completeNode(s,'d13-wallet-transfer');
 s.story55.d13={...s.story55.d13,phase:'green',greenStartedAt:now};return true;
}
export function enterD13Chat(s){
 if(s.story55?.d13?.phase!=='green')return false;
 s.story55.d13.phase='chat';
 const chats=s.content.conversations.mirage;
 let chat=chats.find(c=>c.id==='s55-ouroboros');
 if(!chat){chat={id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0};chats.push(chat);}
 if(!chat.messages.some(m=>m.id==='s55-intrusion-divider'))chat.messages.push({
  id:'s55-intrusion-divider',kind:'divider',text:'── NEW SESSION ──',from:'system',day:s.day,time:s.clock,sentDate:date55(s.day),systemOwned:true
 });
 s.story55.activeScene='intrusion';
 return true;
}
