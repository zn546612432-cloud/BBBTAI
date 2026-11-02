import {markMail55} from './story55/runtime.js';
import {scriptedCallStatus} from './story55/scripted-phone.js';
import {isMirageAuthenticated} from '../apps/mirage/session.js';
import {normalizeAppLink} from './deep-links/index.js';
import {readConversationInState} from './messaging/read.js';
// A mandatory authored call cannot be skipped using the app-back or home
// controls. The recovery-settings route stays accessible on playback errors.
function lockedCallNavigation(s,next){
 const call=scriptedCallStatus(s);
 if(!call||s.nav.current?.appId!=='noapp'||s.nav.current?.route!=='/story-call')return false;
 if(call.phase==='ended')return false;
 if(next?.appId==='noapp'&&next.route==='/settings-ai'&&call.phase==='error')return false;
 return true;
}
function guardD01LinkExit(store,next){
 const s=store.get(),o=s.story55?.d01?.order;
 if(s.nav?.current?.appId!=='ghost'||s.nav.current.route!=='/d01-link')return false;
 if(next?.appId==='ghost'&&next.route==='/d01-link')return false;
 if(!o?.board||o.board.done)return false;
 if(o.leaveApproved){store.update(state=>{state.story55.d01.order.leaveApproved=false;});return false;}
 if(!o.exitPrompt)store.update(state=>{state.story55.d01.order.exitPrompt=true;});
 return true;
}
const acknowledgeOpenChat=(s,previousApp)=>{const {appId,route}=s.nav.current;if(appId==='kira'&&route?.startsWith('/mail/')){const mail=s.content.mail?.find(m=>m.id===route.slice(6));if(mail){mail.read=true;if(mail.story55)markMail55(s,mail.id);}}if(route?.startsWith('/chat/')&&!(appId==='mirage'&&(previousApp!=='mirage'||!isMirageAuthenticated())))readConversationInState(s,appId,route.slice(6));};
export class PhoneRouter{constructor(store,registry){this.store=store;this.registry=registry;this.scroll=new Map();}open(link){const next=normalizeAppLink(link,this.registry);if(lockedCallNavigation(this.store.get(),next)||guardD01LinkExit(this.store,next))return;this.store.update(s=>{const current=s.nav.current;this.scroll.set(JSON.stringify(current),document.querySelector('#app-content')?.scrollTop||0);s.nav.stack.push(current);s.nav.current=next;acknowledgeOpenChat(s,current.appId);});}back(){if(lockedCallNavigation(this.store.get())||guardD01LinkExit(this.store,this.store.get().nav.stack.at(-1)))return;this.store.update(s=>{const previous=s.nav.current.appId;s.nav.current=s.nav.stack.pop()||{appId:'home',route:'/',params:{}};acknowledgeOpenChat(s,previous);});}home(){if(lockedCallNavigation(this.store.get())||guardD01LinkExit(this.store,{appId:'home',route:'/'}))return;this.store.update(s=>{s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};});}restoreScroll(){const node=document.querySelector('#app-content');if(node)node.scrollTop=this.scroll.get(JSON.stringify(this.store.get().nav.current))||0;}}
export function appLink(appId,route='/',params={}){return {appId,route,params};}
