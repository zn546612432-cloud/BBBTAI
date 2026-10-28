import {btn,esc} from '../../system/ui.js';
import {reminders,toggleReminder,addReminder} from '../../services/reminders.js';
import {listHome,listDetail} from './features/lists/index.js';
export const manifest={id:'reminders',name:'提醒事项',glyph:'☑',tone:'#dce9ec',defaultRoute:'/',kicker:'REMINDERS'};
let search='';
export function render({store},loc){const items=reminders(store.get()).filter(r=>r.title.toLowerCase().includes(search.toLowerCase()));return `<div class="reminders-app" data-native-scroll="reminders">${loc.route==='/completed'?listDetail(items.filter(x=>x.done),'已完成'):loc.route==='/all'?listDetail(items,'全部'):listHome(items,search)}</div>`;}
export function handle(a,t,c){if(a==='reminder-open')c.router.open({appId:'reminders',route:t.dataset.route});if(a==='reminder-back')c.router.back();if(a==='reminder-toggle')toggleReminder(c.store,t.dataset.id);if(a==='reminder-delete')c.store.update(s=>{s.content.reminders=reminders(s).filter(r=>r.id!==t.dataset.id);});if(a==='reminder-add')c.router.open({appId:'reminders',route:'/all'});}
export function submit(form,c){if(form.dataset.form==='add-reminder'){addReminder(c.store,new FormData(form).get('title')||'');form.reset();}}
export function input(el,c){if(el.name==='reminder-search'){search=el.value;c.refresh();}}
