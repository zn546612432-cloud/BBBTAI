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
let recentPurchase=null;

// One purchase sheet used by both Reminders and the iOS home-screen widget.
export function openWishPurchase(id,c){
 const w=wishDefinition(id),r=getWish(c.store.get(),id);
 if(!w||!r)return false;
 if(r.status!=='saved'){
  c.toast?.(r.status==='ordered'?'已经购买，等待收货':r.status==='expired'?'这项安排已过期':'已经购买');
  return false;
 }
 if(wishExpired(c.store.get(),id)){c.toast?.('这项安排已过期');return false;}
 pendingPurchase=id;recentPurchase=null;c.refresh();return true;
}
export function wishPurchaseOverlay(s){
 const id=recentPurchase||pendingPurchase,w=id&&wishDefinition(id),r=id&&getWish(s,id);
 if(!w||!r)return '';
 if(recentPurchase&&r.purchasedDay){
  const dinner=w.kind==='event';
  const caption=dinner
   ?'钱已经付了。去狼崽团回复大家，再由仔仔安排订餐。晚饭定在今晚19:30，照片会在饭后发来。'
   :'预计 D'+String(r.deliveryDay).padStart(2,'0')+' 下午送达。收货后会收到对应人物的微信和照片。';
  return '<div class="wx-wish-overlay" role="dialog" aria-modal="true" aria-label="购买成功"><div class="wx-wish-panel"><strong>'+
    (dinner?'聚餐费用已支付':'订单已提交')+'</strong><p>已从 PACIFIC 银行扣除 '+w.price+' USD。'+caption+
    '</p><div class="wx-wish-actions"><button type="button" data-action="reminder-wish-finish">完成</button>'+
    (dinner?'<button type="button" data-action="reminder-wish-chat">查看群聊</button>':'<button type="button" data-action="reminder-wish-bank">银行明细</button>')+
    '</div></div></div>';
 }
 if(pendingPurchase&&r.status==='saved'){
  return '<div class="wx-wish-overlay" role="dialog" aria-modal="true" aria-label="确认心愿购买"><div class="wx-wish-panel"><strong>是否花费 '+w.price+' USD 购买'+esc(w.item)+'？</strong><p>从银行余额中扣款。'+
    (w.kind==='physical'?'到货后会收到微信。':'付款后预订今晚19:30的聚餐。')+
    '</p><div class="wx-wish-actions"><button type="button" data-action="reminder-wish-cancel">取消</button><button type="button" data-action="reminder-wish-buy">购买</button></div></div></div>';
 }
 return '';
}
export function render({store},loc){
 const s=store.get(),items=reminders(s).filter(r=>r.title.toLowerCase().includes(search.toLowerCase()));
 const body=loc.route==='/completed'?listDetail(items.filter(x=>x.done),'已完成'):loc.route==='/all'?listDetail(items,'全部'):listHome(items,search);
 return '<div class="reminders-app" data-native-scroll="reminders">'+body+'</div>'+wishPurchaseOverlay(s);
}
export function handle(a,t,c){
 if(a==='reminder-wish-open'){openWishPurchase(t.dataset.id,c);return;}
 if(a==='reminder-wish-cancel'||a==='reminder-wish-finish'){pendingPurchase=null;recentPurchase=null;c.refresh();return;}
 if(a==='reminder-wish-buy'){
  const id=pendingPurchase;
  if(!id)return;
  c.store.update(s=>purchaseWish(s,id));
  pendingPurchase=null;recentPurchase=id;
  c.refresh();
  return;
 }
 if(a==='reminder-wish-chat'||a==='reminder-wish-bank'){
  const appId=a==='reminder-wish-chat'?'wechat':'bank';
  const route=appId==='wechat'?'/chat/group':'/';
  pendingPurchase=null;recentPurchase=null;
  c.router.open({appId,route,params:{}});
  return;
 }
 if(a==='reminder-open')c.router.open({appId:'reminders',route:t.dataset.route});if(a==='reminder-back')c.router.back();if(a==='reminder-toggle'){if(t.dataset.id.startsWith('d01-reminder-')||reminders(c.store.get()).some(r=>r.id===t.dataset.id&&r.storyD02Order))return;if(t.dataset.id===D02_REMINDER){if(!d02CompleteBuild(c.store.get())&&!reminders(c.store.get()).find(r=>r.id===D02_REMINDER)?.done)return c.toast?.('还没买齐工作站配件：先去澳东商城。');return c.store.update(s=>toggleD02Build(s));}c.store&&toggleReminder(c.store,t.dataset.id);}if(a==='reminder-delete'&& !t.dataset.id.startsWith('d01-reminder-')&&!reminders(c.store.get()).some(r=>r.id===t.dataset.id&&r.storyD02Order))c.store.update(s=>{s.content.reminders=reminders(s).filter(r=>r.id!==t.dataset.id);});if(a==='reminder-add')c.router.open({appId:'reminders',route:'/all'});}
export function submit(form,c){if(form.dataset.form==='add-reminder'){addReminder(c.store,new FormData(form).get('title')||'');form.reset();}}
export function input(el,c){if(el.name==='reminder-search'){search=el.value;c.refresh();}}
