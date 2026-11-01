import {mail55} from '../../services/story55/views.js';
import {linkedMission,linkedMailId,linkedDeliveryId,advanceLinkedMission} from '../mirage/linked-missions.js';
import {deliverLinkedArtifact} from '../mirage/linked-contract-runtime.js';
import {linkedMailView,linkedComposeView,linkedSentView,linkedReceiptView} from './features/mission/linked.js';
import {esc,btn} from '../../system/ui.js';
import {authorize,submit as submitGhost} from '../ghost/state.js';
import {HACKER_BOUNTY_ID,HACKER_MAIL_ID,phishingThemes,advanceHackerMission} from '../mirage/mission.js';
import {kiraInbox} from './features/inbox/index.js';
import {kiraDetail} from './features/detail/index.js';
import {composeMission} from './features/mission/index.js';
export const manifest={id:'kira',name:'KIRA',icon:10,defaultRoute:'/',supportsDeepLink:true,kicker:'ENCRYPTED MAIL'};
export function render({store},loc){
 const s=store.get();
 if(loc.route==='/compose/'+HACKER_BOUNTY_ID)return composeMission(s);
 if(loc.route.startsWith('/compose/linked/'))return linkedComposeView(s,decodeURIComponent(loc.route.slice('/compose/linked/'.length)));
 if(loc.route==='/sent')return '<div class="kira-inbox"><div class="kira-top">'+btn('kira-back','‹　收件箱')+'</div><h1>已发送</h1><div class="kira-mail-list">'+s.content.mail.filter(m=>m.linkedDelivery).map(m=>btn('kira-mail','<span class="kira-unread"></span><span><strong>'+esc(m.to)+'</strong><b>'+esc(m.subject)+'</b><small>'+esc(m.body)+'</small></span><time>D'+esc(m.day)+'</time>','kira-mail-row','data-id="'+esc(m.id)+'"')).join('')+'</div></div>';
 if(loc.route.startsWith('/mail/')){
  const mailId=loc.route.slice(6),mail=s.content.mail.find(m=>m.id===mailId);
  if(mail?.story55&&mail.id!=='flow-d03-reward')return mail55(s,mail);
  return mail?.linkedReceipt?linkedReceiptView(s,mailId):mail?.linkedDelivery?linkedSentView(s,mailId):mail?.linkedContract&&linkedMission(s,mail.orderId)?linkedMailView(s,mail.orderId):kiraDetail(s,mailId);
 }
 return kiraInbox(s);
}
export function handle(a,t,c){
 if(a.startsWith('kira-linked-')){
  const id=t.dataset.order,mission=linkedMission(c.store.get(),id);
  if(!mission)return;
  const mail=linkedMailId(id);
  if(a==='kira-linked-research')return c.router.open({appId:'browser',route:'/mission-search',params:{orderId:id}});
  if(a==='kira-linked-send'){
   if(mission.stage<2)return c.toast('先检索任务资料');
   c.store.update(s=>advanceLinkedMission(s,id,3));
   c.toast('任务确认已发送');return;
  }
  if(a==='kira-linked-ghost'){
   if(mission.stage<3)return c.toast('尚未发送任务确认');
   c.store.update(s=>{authorize(s,{orderId:id,mailId:mail,type:linkedMission(s,id).type});advanceLinkedMission(s,id,4);});
   return c.router.open({appId:'ghost',route:'/contract',params:{orderId:id}});
  }
  if(a==='kira-linked-settle'){
   const success=c.store.get().ghost?.orders?.[id]?.status==='success';
   if(!success)return c.toast('GHOST 尚未完成');
   return c.router.open({appId:'kira',route:'/compose/linked/'+encodeURIComponent(id),params:{}});
  }
  if(a==='kira-linked-open-files')return c.router.open({appId:'files',route:'/linked/'+encodeURIComponent(id),params:{}});
  if(a==='kira-linked-back')return c.router.open({appId:'kira',route:'/mail/'+mail,params:{}});
  if(a==='kira-linked-sent')return c.router.open({appId:'kira',route:'/mail/'+linkedDeliveryId(id),params:{}});
  return;
 }

 if(a==='kira-back')c.router.open({appId:'kira',route:'/',params:{}});
 if(a==='kira-sent-list')c.router.open({appId:'kira',route:'/sent',params:{}});
 if(a==='kira-mail')c.router.open({appId:'kira',route:'/mail/'+t.dataset.id});
 if(a==='kira-attachment')c.router.open({appId:'files',route:'/attachment',params:{mailId:t.dataset.id}});
 if(a==='kira-mission-browser')c.router.open({appId:'browser',route:'/mission-search',params:{orderId:HACKER_BOUNTY_ID}});
 if(a==='kira-mission-compose')c.router.open({appId:'kira',route:'/compose/'+HACKER_BOUNTY_ID});
 if(a==='kira-mission-theme'){
  const selected=phishingThemes.find(x=>x.id===t.dataset.theme);
  if(!selected?.correct){c.toast('主题与目标不符，请重新选择');return;}
  c.store.update(s=>{const mail=s.content.mail.find(m=>m.id===HACKER_MAIL_ID);if(mail)mail.selectedTheme=selected.id;});
 }
 if(a==='kira-forge-preview')return c.router.open({appId:'browser',route:'/forge-preview',params:{orderId:HACKER_BOUNTY_ID}});
 if(a==='kira-mission-send'){
  const mail=c.store.get().content.mail.find(m=>m.id===HACKER_MAIL_ID);
  if(!phishingThemes.find(x=>x.id===mail?.selectedTheme)?.correct)return;
  c.store.update(s=>{const m=s.content.mail.find(x=>x.id===HACKER_MAIL_ID);if(m)m.simulationLink='https://board.example.invalid/meeting';});
  advanceHackerMission(c.store,3);
  c.toast('邮件已发送 · 下一步：GHOST');
  c.router.open({appId:'kira',route:'/mail/'+HACKER_MAIL_ID});
 }
 if(a==='kira-mission-ghost'){const mail=c.store.get().content.mail.find(m=>m.id===HACKER_MAIL_ID);const order=c.store.get().content.orders.find(o=>o.id===HACKER_BOUNTY_ID);if(!mail||mail.missionStep<3||!order||order.status==='OPEN')return;c.store.update(s=>authorize(s,{orderId:HACKER_BOUNTY_ID,mailId:HACKER_MAIL_ID,type:s.ghost?.missionTypes?.[HACKER_BOUNTY_ID]||'cipher'}));c.router.open({appId:'ghost',route:'/contract',params:{orderId:HACKER_BOUNTY_ID}});}
 if(a==='kira-ghost-submit')c.store.update(s=>submitGhost(s,HACKER_BOUNTY_ID));
}

export function submitFormLinked(form,c){
 if(form.dataset.form!=='kira-linked-deliver')return false;
 const id=form.dataset.order,values=new FormData(form);
 const attachment=String(values.get('attachment')||''),note=String(values.get('note')||'');
 c.store.update(s=>deliverLinkedArtifact(s,id,attachment,{note}));
 c.toast?.('已发送附成果的邮件，等待雇主按游戏时间验收');
 c.router.open({appId:'kira',route:'/mail/'+linkedDeliveryId(id),params:{}});
 return true;
}
export const submitForm=submitFormLinked;
export function submit(form,c){return submitFormLinked(form,c);}
