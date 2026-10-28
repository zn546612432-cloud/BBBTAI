import {authorize,submit} from '../ghost/state.js';
import {HACKER_BOUNTY_ID,HACKER_MAIL_ID,phishingThemes,advanceHackerMission} from '../mirage/mission.js';
import {kiraInbox} from './features/inbox/index.js';
import {kiraDetail} from './features/detail/index.js';
import {composeMission} from './features/mission/index.js';
export const manifest={id:'kira',name:'KIRA',icon:10,defaultRoute:'/',supportsDeepLink:true,kicker:'ENCRYPTED MAIL'};
export function render({store},loc){
 const s=store.get();
 if(loc.route==='/compose/'+HACKER_BOUNTY_ID)return composeMission(s);
 if(loc.route.startsWith('/mail/'))return kiraDetail(s,loc.route.slice(6));
 return kiraInbox(s);
}
export function handle(a,t,c){
 if(a==='kira-back')c.router.back();
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
 if(a==='kira-ghost-submit')c.store.update(s=>submit(s,HACKER_BOUNTY_ID));
}
