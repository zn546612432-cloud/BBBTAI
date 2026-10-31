import {isStory55} from '../../services/story55/state.js';
import {activateStory55} from '../../services/story55/runtime.js';
import {initialState,clone} from '../../services/storage.js';
import {calendarAnchor} from '../../services/calendar.js';
// Story definitions remain editable; only the player's run is discarded.
export function restartState(previous){
 if(isStory55(previous)){const next=clone(previous);return activateStory55(next);}
 const next=initialState();
 Object.assign(next,{day:1,clock:'08:00',calendar:calendarAnchor(1),batteryPercent:100,invitations:[],content:clone(previous.content),wallpaper:previous.wallpaper,iconOverrides:clone(previous.iconOverrides||{}),characterAvatars:clone(previous.characterAvatars||{}),storyChargeGates:clone(previous.storyChargeGates||[])});
 next.storyPresets.rules=clone(previous.storyPresets?.rules||[]);
 next.storyPresets.deletedRuleIds=clone(previous.storyPresets?.deletedRuleIds||[]);
 next.aiDraft=clone(previous.aiDraft||next.aiDraft);
 next.aiDraft.testTurns=[];
 // A new run must never inherit the previous player's private NoApp history.
 for(const c of next.content.conversations.noapp||[])c.messages=[];
 next.content.mirage&&(delete next.content.mirage.ouroborosScript);
 next.content.conversations.mirage=next.content.conversations.mirage.filter(c=>c.id!=='mc-ourob-d05');
 next.content.orders=next.content.orders.filter(o=>!o.storySeed||o.storyDay===1);
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
export const restartDialog=()=>`<div class="lock-screen lock-passcode"><section class="restart-dialog" role="alertdialog" aria-modal="true" aria-labelledby="restart-title"><h2 id="restart-title">抹掉所有内容与设置？</h2><p>本机的新消息和使用记录将被清除。此操作无法撤销。</p><div><button data-action="restart-cancel">取消</button><button data-action="restart-confirm">抹掉</button></div></section></div>`;
