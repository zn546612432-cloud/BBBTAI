import {uid} from './id.js';
import {D02_AODONG_CHAT_ID} from '../story/d02/runtime.js';
export const reminders = s => s.content.reminders || [];
export const canManuallyToggleReminder=r=>!!r&&!(
 r.wishId||r.storyProject||r.storyNode||r.storyPrivateContract||
 r.storyD01||r.storyD02||r.storyD02Order
);
export function reminderDestination(s,record){
 if(!record)return null;
 if(record.wishId)return {kind:'wish',id:record.wishId};
 if(record.storyNode)return {kind:'link',link:record.link||{appId:'reminders',route:'/all'},node:record.storyNode};
 if(record.link?.appId)return {kind:'link',link:record.link};
 if(record.id==='ghost-car-plan')return {kind:'link',link:{appId:'reminders',route:'/project/ghost-car-plan'}};
 if(record.storyPrivateContract)return {kind:'link',link:{appId:'mirage',route:'/private-contract'}};
 if(record.storyD02Order&&record.orderId)return {kind:'link',link:{appId:'mirage',route:'/order/'+record.orderId}};
 if(record.storyD02)return {kind:'link',link:{appId:'messages',route:'/chat/'+D02_AODONG_CHAT_ID}};
 if(record.id==='d01-reminder-bank')return {kind:'link',link:{appId:'bank',route:'/'}};
 if(record.id==='d01-reminder-repair')return {kind:'link',link:{appId:'mirage',route:'/bounties/hall'}};
 if(record.id?.startsWith('tear-link-'))return {kind:'link',link:{appId:'ghost',route:'/deployment'}};
 return {kind:'link',link:{appId:'reminders',route:'/all'}};
}
export function toggleReminder(store, id) {
 if(!canManuallyToggleReminder(reminders(store.get()).find(r=>r.id===id)))return false;
 store.update(s => { const item = reminders(s).find(r => r.id === id); if (item) item.done = !item.done; });
 return true;
}
export function addReminder(store, title) {
 title = title.trim().slice(0, 120);
 if (!title) return false;
 store.update(s => { (s.content.reminders ||= []).push({id:uid(), title, done:false}); });
 return true;
}
