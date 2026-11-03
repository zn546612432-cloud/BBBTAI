import {isStory55} from '../../services/story55/state.js';
import {D02_REMINDER,d02CompleteBuild,toggleD02Build} from '../../story/d02/runtime.js';
import {objectives55} from '../../services/story55/views.js';
import {btn,esc} from '../../system/ui.js';
import {reminders,toggleReminder,addReminder} from '../../services/reminders.js';
import {listHome,listDetail} from './features/lists/index.js';
export const manifest={id:'reminders',name:'提醒事项',glyph:'☑',tone:'#dce9ec',defaultRoute:'/',kicker:'REMINDERS'};
let search='';
export function render({store},loc){/* Reminders remains the original iOS-style app, not a story task-tree. */const items=reminders(store.get()).filter(r=>r.title.toLowerCase().includes(search.toLowerCase()));return `<div class="reminders-app" data-native-scroll="reminders">${loc.route==='/completed'?listDetail(items.filter(x=>x.done),'已完成'):loc.route==='/all'?listDetail(items,'全部'):listHome(items,search)}</div>`;}
export function handle(a,t,c){if(a==='reminder-open')c.router.open({appId:'reminders',route:t.dataset.route});if(a==='reminder-back')c.router.back();if(a==='reminder-toggle'){if(t.dataset.id.startsWith('d01-reminder-'))return;if(t.dataset.id===D02_REMINDER){if(!d02CompleteBuild(c.store.get())&&!reminders(c.store.get()).find(r=>r.id===D02_REMINDER)?.done)return c.toast?.('还没买齐工作站配件：先去澳东商城。');return c.store.update(s=>toggleD02Build(s));}c.store&&toggleReminder(c.store,t.dataset.id);}if(a==='reminder-delete'&& !t.dataset.id.startsWith('d01-reminder-'))c.store.update(s=>{s.content.reminders=reminders(s).filter(r=>r.id!==t.dataset.id);});if(a==='reminder-add')c.router.open({appId:'reminders',route:'/all'});}
export function submit(form,c){if(form.dataset.form==='add-reminder'){addReminder(c.store,new FormData(form).get('title')||'');form.reset();}}
export function input(el,c){if(el.name==='reminder-search'){search=el.value;c.refresh();}}
