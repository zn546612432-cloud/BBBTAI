import {preview,updateTimelinePreview} from './features/preview/index.js';
import {phoneEditor} from './features/phone/index.js';
import {sms} from './features/sms/index.js';
import {assets} from './features/assets/index.js';
import {messageCard,newConversationForm,conversations} from './features/conversations/index.js';
import {ghostEditor,saveGhostConfig} from '../ghost/editor.js';
import {ensureGhost} from '../ghost/state.js';
import {uid} from '../../services/id.js';
import {datePreset,messageDate,messageClock,setMessageDate} from '../../services/messaging/timestamps.js';
import {dateParts,dateLabel,setPreviewDate} from '../../services/calendar.js';
import {phoneData} from '../../services/phone-data.js';
import {btn,card,demo,empty,esc} from '../../system/ui.js';
import {conversations as allConversations,selectedConversation,actors,actorName,renameConversation,renameActor,setSchedule,newMessage,reorderMessage,moveMessageTo,clearDelivery,scheduleLabel,createConversation,chatApps,isGroup} from './features/conversations/model.js';
import {presetEditor,handlePresetAction,changePresetField,isPresetTextField,presetTestSubmit,stagePresetFile} from './features/presets/index.js';
export const manifest={id:'editor',name:'内容编辑器',glyph:'✎',tone:'#65798c',hidden:true,defaultRoute:'/',kicker:'DEVELOPER / LOCAL DRAFT'};
const tabs=[['ghost','GHOST'],['conversations','对话'],['presets','剧情预设'],['sms','短信编辑'],['phone','电话编辑'],['assets','图片'],['preview','预览']];
const attr=v=>esc(v);
function nav(route){return `<div class="editor-tabs">${tabs.map(([id,name])=>btn('editor-tab',name,route===id?'active':'',`data-tab="${id}"`)).join('')}</div>`;}
export function render({store},loc){const s=store.get(),route=loc.route.slice(1)||'conversations';return `<div class="page-pad editor-page"><span class="eyebrow">LOCAL DRAFT ${demo()}</span><div class="large-title">内容编辑器</div>${nav(route)}${route==='ghost'?ghostEditor(s):route==='presets'?presetEditor(s):route==='assets'?assets(s):route==='preview'?preview(s):route==='sms'?sms(s):route==='phone'?phoneEditor(s):conversations(s)}</div>`;}
export function handle(a,t,ctx){
 const {store,router}=ctx,id=t.dataset.id;
 if(a==='editor-bank-rate'){const el=document.getElementById('gh-rate'),rate=el.value===''?null:Number(el.value);if(rate!==null&&(!Number.isFinite(rate)||rate<=0)){el.reportValidity();return;}store.update(s=>{s.bankData??={balance:0,transactions:[],rate:null};s.bankData.rate=rate;});return;}
 if(a==='editor-ghost-save'){saveGhostConfig(t,ctx);return;}
 if(a==='editor-ghost-mission'){const type=document.getElementById('gh-mission-type').value,input=document.getElementById('gh-order-seconds'),seconds=input.value===''?null:Number(input.value);if(seconds!==null&&(!Number.isInteger(seconds)||seconds<10||seconds>600)){input.reportValidity();return;}store.update(s=>{const g=ensureGhost(s);g.missionTypes??={};g.orderConfigs??={};g.missionTypes['mirage-recruit-hacker']=type;g.orderConfigs['mirage-recruit-hacker']={seconds};});return;}
 if(a==='editor-tab'){if(t.dataset.tab==='sms')store.update(s=>{s.editor.channel='messages';s.editor.conversation=s.content.conversations.messages?.[0]?.id||'';});router.open({appId:'editor',route:'/'+t.dataset.tab});return;}
 if(a.startsWith('preset-')&&handlePresetAction(a,t,ctx))return;
 if(a==='delete-phone-contact'){store.update(s=>{s.content.phone.contacts=s.content.phone.contacts.filter(p=>p.id!==id);});ctx.toast('联系人已删除');return;}
 if(a==='delete-phone-call'){store.update(s=>{s.content.phone.calls=s.content.phone.calls.filter(call=>call.id!==id);});ctx.toast('通话记录已删除');return;}
 if(a==='remove-charge-gate'){store.update(s=>{s.storyChargeGates=(s.storyChargeGates||[]).filter(g=>g.day!==Number(t.dataset.day));});return;}
 if(a==='preview-chat'){const x=selectedConversation(store.get());if(x)router.open({appId:x.channel,route:'/chat/'+x.c.id});return;}
 if(a==='add-message')store.update(s=>{const {c}=selectedConversation(s);c.messages.push(newMessage(s,c));});
 if(a==='duplicate-message')store.update(s=>{const {c}=selectedConversation(s),i=c.messages.findIndex(m=>m.id===id);if(i<0)return;const m=structuredClone(c.messages[i]);m.id=uid();delete m.delivery;delete m.actual;m.authored=true;c.messages.splice(i+1,0,m);});
 if(a==='delete-message')store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(m)clearDelivery(s,c,m);c.messages=c.messages.filter(m=>m.id!==id);});
 if(a==='move-up'||a==='move-down')store.update(s=>{const {c}=selectedConversation(s),i=c.messages.findIndex(m=>m.id===id);moveMessageTo(c,id,i+(a==='move-up'?-1:1));});
 if(a==='rearm-message')store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(m)clearDelivery(s,c,m);});
 if(a==='test-message'){
  const x=selectedConversation(store.get());
  store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(!m)return;clearDelivery(s,c,m);if(m.schedule?.mode==='game-time'){s.day=m.schedule.day;s.clock=m.schedule.clock;}if(x.channel==='noapp'&&s.day<56)s.day=56;});
  router.open({appId:x.channel,route:'/chat/'+x.c.id});return;
 }
 if(a==='add-image-message'||a==='replace-message-image'){
  const x=selectedConversation(store.get());
  ctx.pickImage(src=>store.update(s=>{const c=s.content.conversations[x.channel].find(c=>c.id===x.c.id);if(a==='add-image-message')c.messages.push({...newMessage(s,c,'image'),text:src});else {const m=c.messages.find(m=>m.id===id);if(m)m.text=src;}}));
 }
 if(a==='replace-wallpaper')ctx.pickImage(src=>store.update(s=>s.wallpaper=src));
 if(a==='replace-icon')ctx.pickImage(src=>store.update(s=>s.iconOverrides[id]=src));
 if(a==='add-photo')ctx.pickImage((src,name)=>store.update(s=>s.content.photos.push({id:uid(),title:name,src,actual:true})));
 if(a==='export-content')ctx.download();
}
export function change(t,ctx){
 const {store}=ctx;
 if(changePresetField(t,ctx))return;
 if(t.id==='editor-conversation'){const i=t.value.indexOf(':');store.update(s=>{s.editor.channel=t.value.slice(0,i);s.editor.conversation=t.value.slice(i+1);});return;}
 if(t.id==='editor-conversation-name')store.update(s=>renameConversation(selectedConversation(s).c,t.value));
 if(t.dataset.actorName)store.update(s=>renameActor(selectedConversation(s).c,t.dataset.actorName,t.value));
 if(t.dataset.messageField)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.id);if(!m)return;const field=t.dataset.messageField;if(field==='from'&&actors(c).some(a=>a.id===t.value))m.from=t.value;else if(field==='time')setMessageDate(m,s,{time:t.value});else if(field==='sentDate')setMessageDate(m,s,{date:t.value});else if(field==='text'&&(!m.kind||m.kind==='text'))m.text=t.value;});
 if(t.dataset.sentDate)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.sentDate);if(m)setMessageDate(m,s,{preset:t.value});});
 if(t.dataset.scheduleField)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.id);if(!m)return;const field=t.dataset.scheduleField,mode=field==='mode'?t.value:m.schedule?.mode;const input=field==='mode'?{mode}:{...m.schedule,[field]:t.value};setSchedule(s,c,m,input);});
 if(t.dataset.orderMessage){const value=Number(t.value);if(!Number.isInteger(value)||value<1)throw Error('排序位置需为正整数');store.update(s=>moveMessageTo(selectedConversation(s).c,t.dataset.orderMessage,value-1));}
}
export const isTextEdit=t=>isPresetTextField(t)||t.id==='editor-conversation-name'||!!t.dataset.actorName||!!t.dataset.messageField&&['text','time','sentDate'].includes(t.dataset.messageField)||!!t.dataset.scheduleField&&t.dataset.scheduleField!=='mode';
export function input(t,ctx){
 if(!isTextEdit(t))return;
 if(isPresetTextField(t)){changePresetField(t,ctx);return;}
 if((t.dataset.scheduleField||['date','time'].includes(t.type))&&(!t.value||!t.checkValidity()))return;
 if((t.id==='editor-conversation-name'||t.dataset.actorName)&&!t.value.trim())return;
 change(t,ctx);
 const root=t.closest('.editor-panel');if(!root)return;
 const {c,channel}=selectedConversation(ctx.store.get());
 const edited=c.messages.find(m=>m.id===t.dataset.id),badge=t.closest('[data-message-id]')?.querySelector('.schedule-badge');if(edited&&badge){badge.textContent=scheduleLabel(edited);badge.classList.toggle('delivered',!!edited.delivery);}
 const people=new Map(actors(c).map(a=>[a.id,a.name]));
 const choice=root.querySelector('#editor-conversation');
 if(choice?.selectedOptions[0])choice.selectedOptions[0].textContent=({wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'信息'}[channel]||channel)+' / '+c.name;
 root.querySelectorAll('select[data-message-field="from"]').forEach(select=>{for(const option of select.options)option.textContent=(people.get(option.value)||option.value)+(option.value==='me'?'（我方）':'');});
 root.querySelectorAll('[data-actor-name]').forEach(field=>{const name=people.get(field.dataset.actorName);if(name){field.setAttribute('aria-label',name+'的显示名称');if(field!==t)field.value=name;}});
 const title=root.querySelector('#editor-conversation-name');if(title&&title!==t)title.value=c.name;
}
export function submit(f,ctx){const {store,toast}=ctx,data=new FormData(f),form=f.dataset.form;
 if(form==='preset-test'){presetTestSubmit(f,ctx);return;}
 if(form?.startsWith('phone-')){
  const value=key=>String(data.get(key)||'').trim();
  const name=value('name'),number=value('number'),place=value('place'),day=value('day'),id=value('id');
  if(form==='phone-self'){
   if(!name||!number||!value('region'))throw Error('请填写姓名、澳门号码和地区');
   store.update(s=>{s.content.phone.self={name,number,region:value('region')};});toast('我的名片已保存');return;
  }
  if(form==='phone-add-contact'||form==='phone-edit-contact'){
   if(!name)throw Error('请输入联系人姓名');
   store.update(s=>{const list=s.content.phone.contacts;if(form==='phone-add-contact')list.push({id:uid(),name,number});else{const person=list.find(x=>x.id===id);if(!person)throw Error('联系人不存在');Object.assign(person,{name,number});}});
   toast(form==='phone-add-contact'?'联系人已添加':'联系人已保存');return;
  }
  if(form==='phone-add-call'||form==='phone-edit-call'){
   if(!number||!place||!day)throw Error('请填写电话号码、地区和时间');
   store.update(s=>{const list=s.content.phone.calls,call={name,number,place,day,missed:data.has('missed')};if(form==='phone-add-call')list.unshift({id:uid(),...call});else{const existing=list.find(x=>x.id===id);if(!existing)throw Error('通话记录不存在');Object.assign(existing,call);}});
   toast(form==='phone-add-call'?'通话记录已添加':'通话记录已保存');return;
  }
 }
 if(form==='new-conversation'||form==='new-sms'){createConversation(store,{channel:form==='new-sms'?'messages':String(data.get('channel')),name:String(data.get('name')||''),type:form==='new-sms'?'direct':String(data.get('type')),members:String(data.get('members')||'')});const pane=document.querySelector('#app-content');if(pane)pane.scrollTop=0;toast('对话窗口已创建，可以添加消息');}
 if(form==='charge-gate'){const day=Number(data.get('day')),untilFlag=String(data.get('flag')||'').trim();if(!Number.isInteger(day)||day<1||day>89||!untilFlag)throw Error('请填写天数与完成标记');store.update(s=>{s.storyChargeGates=[...(s.storyChargeGates||[]).filter(g=>g.day!==day),{day,untilFlag}];});toast('已保存');return;}
 if(form==='preview'){store.update(s=>setPreviewDate(s,{day:Number(data.get('day')),clock:String(data.get('clock'))}));toast('预览日期已更新');}
}
export function mountInteractions(root,ctx){
 root.addEventListener('input',e=>updateTimelinePreview(e.target));
 let drag=null;
 root.addEventListener('change',async e=>{
  if(e.target.id!=='preset-import-file')return;
  const file=e.target.files?.[0];
  if(!file)return;
  try{await stagePresetFile(file,ctx);}catch(error){ctx.toast(error.message||'剧情文件无法导入');}
  finally{e.target.value='';}
 });
 const cleanup=()=>{root.querySelectorAll('.drag-active,.drop-before,.drop-after').forEach(el=>el.classList.remove('drag-active','drop-before','drop-after'));root.classList.remove('editor-dragging');};
 root.addEventListener('pointerdown',e=>{
  const grip=e.target.closest('[data-drag-message]');if(!grip||!e.isPrimary||e.button!==0||ctx.store.get().nav.current.appId!=='editor')return;
  e.preventDefault();drag={id:grip.dataset.dragMessage,pointerId:e.pointerId,targetId:null,after:false};root.setPointerCapture(e.pointerId);grip.closest('[data-message-id]').classList.add('drag-active');root.classList.add('editor-dragging');
 });
 root.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const pane=root.querySelector('#app-content'),rect=pane?.getBoundingClientRect();
  if(rect){if(e.clientY<rect.top+55)pane.scrollTop-=18;else if(e.clientY>rect.bottom-55)pane.scrollTop+=18;}
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-message-id]');
  root.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));
  if(!target||target.dataset.messageId===drag.id){drag.targetId=null;return;}
  drag.targetId=target.dataset.messageId;const box=target.getBoundingClientRect();drag.after=e.clientY>box.top+box.height/2;target.classList.add(drag.after?'drop-after':'drop-before');
 });
 root.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const moved=drag;drag=null;if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);cleanup();
  if(moved.targetId){ctx.store.update(s=>reorderMessage(selectedConversation(s).c,moved.id,moved.targetId,moved.after));const status=root.querySelector('.editor-drag-status');if(status)status.textContent='消息顺序已保存';}
 });
 root.addEventListener('pointercancel',()=>{drag=null;cleanup();});
}
