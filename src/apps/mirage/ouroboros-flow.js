// D05 authored dialogue: ordered, explicit player sends; no AI interpolation.
import {WALLET_CHALLENGE_ID,ouroborosContact} from './contacts-seed.js';
const CONTACT='mc-ourob-d05';
const line=(id,from,text,s)=>({id,from,text,kind:'text',day:s.day,time:s.clock,actual:true,storyImported:true,ouroborosScript:true});
const contact=s=>s.content.conversations.mirage?.find(c=>c.id===CONTACT);
export function ouroborosAvailable(s){return s.day>5||(s.day===5&&s.clock>='20:00');}
export function ouroborosStage(s){return s.content.mirage?.ouroborosScript?.stage||'unaccepted';}
function notify(s,text){
 const c=contact(s);if(!c)return;
 c.unread=Math.max(0,Number(c.unread)||0)+1;
 c.lastMessageAt=Date.now();
 s.notifications.unshift({id:'ourob-story-'+(s.content.mirage.ouroborosScript.stage),title:c.name,body:text,conversationId:CONTACT,link:{appId:'mirage',route:'/chat/'+CONTACT,params:{}}});
}
export function acceptOuroborosChallenge(s){
 if(!ouroborosAvailable(s))return false;
 const order=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 if(!order||order.status!=='OPEN')return false;
 order.status='ACCEPTED';
 const conversations=s.content.conversations.mirage;
 if(!contact(s))conversations.push(structuredClone(ouroborosContact));
 const c=contact(s);
 c.unread=0;
 c.messages=c.messages.filter(m=>!m.ouroborosScript&&!/^ou-(?:0\d|d05-after-)/.test(m.id));
 s.content.mirage.ouroborosScript={stage:'accepted'};
 const message=line('ou-order-created',CONTACT,'ORDER CREATED · CONTRACT #D05 · 10 BTC WALLET CHALLENGE',s);
 c.messages.push(message);notify(s,message.text);
 return true;
}
export function markOuroborosWon(s){
 const o=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 if(!o||o.status!=='ACCEPTED'||!ouroborosAvailable(s))return false;
 o.status='COMPLETED';
 if(!contact(s))s.content.conversations.mirage.push(structuredClone(ouroborosContact));
 const story=s.content.mirage.ouroborosScript??={stage:'accepted'};
 // A player opening the chat sees their own next sentence being typed; there
 // is no premature congratulation, no fake auto-send by the player.
 if(story.stage==='accepted')story.stage='won';
 s.content.mirage.ouroborosScript=story;
 s.content.mirage.transactions??=[];
 if(!s.content.mirage.transactions.some(t=>t.id==='ou-btc10'))s.content.mirage.transactions.unshift({id:'ou-btc10',type:'REWARD',asset:'BTC',amount:10,time:s.clock,day:s.day,description:'OUROBOROS CHALLENGE'});
 if(!s.events.some(e=>e.type==='mirage_wallet_challenge_completed'))s.events.push({type:'mirage_wallet_challenge_completed',day:s.day,clock:s.clock,asset:'BTC',quantity:10});
 return true;
}
export function ouroborosDraft(s,id){if(id!==CONTACT)return '';
 const stage=ouroborosStage(s),c=contact(s);
 if(stage==='asked'&&!c?.messages.some(m=>m.id==='ou-group'&&m.delivery))return '';
 return stage==='won'?'我拿到了。':stage==='asked'?'我单干。':stage==='impressed'?'因为我是天才。':'';
}
const REPLIES={
 won:[['ou-congrats','恭喜你。'],['ou-group','你属于哪个组织？']],
 asked:[['ou-impressed','真有趣。你知道吗，你打败了全世界百分之八十的黑客。你居然说自己是单干？']],
 impressed:[['ou-cookie','真有趣。拿好你的奖励饼干，黑客天才。希望我们以后还有合作的机会。']]
};
const NEXT={won:'asked',asked:'impressed',impressed:'finished'};
export function sendOuroborosPreset(s,id,text){
 const expected=ouroborosDraft(s,id),stage=ouroborosStage(s);
 if(!expected||text.trim()!==expected.trim())return false;
 const c=contact(s);if(!c)return false;
 c.messages.push(line('ou-player-'+stage,'me',expected,s));
 const next=NEXT[stage];s.content.mirage.ouroborosScript.stage=next;
 for(const [key,reply] of REPLIES[stage])if(!c.messages.some(x=>x.id===key)){
  const m=line(key,CONTACT,reply,s);
  if(key==='ou-group')m.schedule={mode:'chat-delay',seconds:2};
  c.messages.push(m);
 }
 c.lastMessageAt=Date.now();
 return true;
}
export function isOuroborosScriptActive(s,id){return id===CONTACT&&['won','asked','impressed'].includes(ouroborosStage(s));}
