import {initialState,clone} from '../../services/storage.js';
import {calendarAnchor} from '../../services/calendar.js';
// Story definitions remain editable; only the player's run is discarded.
export function restartState(previous){
 const next=initialState();
 Object.assign(next,{day:1,clock:'08:00',calendar:calendarAnchor(1),batteryPercent:100,invitations:[],content:clone(previous.content),wallpaper:previous.wallpaper,iconOverrides:clone(previous.iconOverrides||{}),storyChargeGates:clone(previous.storyChargeGates||[])});
 next.storyPresets.rules=clone(previous.storyPresets?.rules||[]);
 next.storyPresets.deletedRuleIds=clone(previous.storyPresets?.deletedRuleIds||[]);
 for(const list of Object.values(next.content.conversations))for(const c of list){
  c.unread=0;c.messages=c.messages.filter(m=>!m.actual);
  for(const m of c.messages){delete m.delivery;delete m.deliveryRevision;}
 }
 for(const mail of next.content.mail||[])mail.read=false;
 for(const reminder of next.content.reminders||[])reminder.done=false;
 for(const order of next.content.orders||[])order.status='开放';
 if(next.content.mirage){next.content.mirage.digitalBalance=0;next.content.mirage.digitalTransactions=[];}
 if(previous.ghost?.config)next.ghost={config:clone(previous.ghost.config),orders:{},history:[],balance:0};
 return next;
}
export const restartDialog=()=>`<div class="lock-screen lock-passcode"><section class="restart-dialog" role="alertdialog" aria-modal="true" aria-labelledby="restart-title"><h2 id="restart-title">是否重启手机？</h2><p>剧情将回到第一天</p><div><button data-action="restart-cancel">否</button><button data-action="restart-confirm">是</button></div></section></div>`;
