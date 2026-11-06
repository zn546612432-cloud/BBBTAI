import {isStory55} from '../../services/story55/state.js';
import {D02_REMINDER,d02CompleteBuild,toggleD02Build} from '../../story/d02/runtime.js';
import {objectives55} from '../../services/story55/views.js';
import {btn,esc} from '../../system/ui.js';
import {reminders,toggleReminder,addReminder} from '../../services/reminders.js';
import {listHome,listDetail} from './features/lists/index.js';
import {wishDefinition} from '../../services/wishes/catalog.js';
import {getWish,purchaseWish,wishExpired} from '../../services/wishes/index.js';
export const manifest={id:'reminders',name:'提醒事项',glyph:'☑',tone:'#dce9ec',defaultRoute:'/',kicker:'REMINDERS'};
let search='';
let pendingPurchase=null;
export function render({store},loc){
 const s=store.get(),items=reminders(s).filter(r=>r.title.toLowerCase().includes(search.toLowerCase()));
 const body=loc.route==='/completed'?listDetail(items.filter(x=>x.done),'已完成'):loc.route==='/all'?listDetail(items,'全部'):listHome(items,search);
 const w=pendingPurchase&&wishDefinition(pendingPurchase),r=w&&getWish(s,w.id);
 const modal=w&&r?.status==='saved'
  ?'<div class="wx-wish-overlay" role="dialog" aria-modal="true" aria-label="确认心愿购买"><div class="wx-wish-panel"><strong>是否花费 '+w.price+' USD 购买'+esc(w.item)+'？</strong><p>从银行余额中扣款。'+(w.kind==='physical'?'商品送达后会收到消息。':'这是 D06 的限时安排。')+'</p><div class="wx-wish-actions"><button type="button" data-action="reminder-wish-cancel">取消</button><button type="button" data-action="reminder-wish-buy">购买</button></div></div></div>'
  :'';
 return '<div class="reminders-app" data-native-scroll="reminders">'+body+'</div>'+modal;
}
export function handle(a,t,c){
 if(a==='reminder-wish-open'){
  const id=t.dataset.id,w=wishDefinition(id),r=getWish(c.store.get(),id);
  if(!w||!r)return;
  if(r.status!=='saved'){c.toast?.(r.status==='ordered'?'已经购买，等待收货':'已经购买');return;}
  if(wishExpired(c.store.get(),id)){c.toast?.('这项心愿已过期');return;}
  pendingPurchase=id;c.refresh();return;
 }
 if(a==='reminder-wish-cancel'){pendingPurchase=null;c.refresh();return;}
 if(a==='reminder-wish-buy'){
  const id=pendingPurchase;pendingPurchase=null;
  if(id)c.store.update(s=>purchaseWish(s,id));
  c.toast?.('购买成功');return;
 }
 if(a==='reminder-open')c.router.open({appId:'reminders',route:t.dataset.route});if(a==='reminder-back')c.router.back();if(a==='reminder-toggle'){if(t.dataset.id.startsWith('d01-reminder-')||reminders(c.store.get()).some(r=>r.id===t.dataset.id&&r.storyD02Order))return;if(t.dataset.id===D02_REMINDER){if(!d02CompleteBuild(c.store.get())&&!reminders(c.store.get()).find(r=>r.id===D02_REMINDER)?.done)return c.toast?.('还没买齐工作站配件：先去澳东商城。');return c.store.update(s=>toggleD02Build(s));}c.store&&toggleReminder(c.store,t.dataset.id);}if(a==='reminder-delete'&& !t.dataset.id.startsWith('d01-reminder-')&&!reminders(c.store.get()).some(r=>r.id===t.dataset.id&&r.storyD02Order))c.store.update(s=>{s.content.reminders=reminders(s).filter(r=>r.id!==t.dataset.id);});if(a==='reminder-add')c.router.open({appId:'reminders',route:'/all'});}
export function submit(form,c){if(form.dataset.form==='add-reminder'){addReminder(c.store,new FormData(form).get('title')||'');form.reset();}}
export function input(el,c){if(el.name==='reminder-search'){search=el.value;c.refresh();}}
