import {markMail55} from './story55/runtime.js';
import {isMirageAuthenticated} from '../apps/mirage/session.js';
import {normalizeAppLink} from './deep-links/index.js';
import {readConversationInState} from './messaging/read.js';
import {markMomentInteractionsRead} from '../apps/wechat/features/moments/model.js';
const acknowledgeOpenChat=(s,previousApp)=>{const {appId,route}=s.nav.current;if(appId==='wechat'&&route?.startsWith('/moments/comment/'))markMomentInteractionsRead(s,route.slice('/moments/comment/'.length));if(appId==='kira'&&route?.startsWith('/mail/')){const mail=s.content.mail?.find(m=>m.id===route.slice(6));if(mail){mail.read=true;if(mail.story55)markMail55(s,mail.id);}}if(route?.startsWith('/chat/')&&!(appId==='mirage'&&(previousApp!=='mirage'||!isMirageAuthenticated())))readConversationInState(s,appId,route.slice(6));};
// A live call is a transient screen, never a historical destination.
export const isNoAppCallRoute=loc=>loc?.appId==='noapp'&&loc.route==='/call';
export function dismissNoAppCallRoute(s){
 const nav=s.nav;
 nav.stack=(nav.stack||[]).filter(loc=>!isNoAppCallRoute(loc));
 if(!isNoAppCallRoute(nav.current))return;
 nav.current=nav.stack.pop()||{appId:'noapp',route:'/chat/tai',params:{}};
 acknowledgeOpenChat(s,'noapp');
}
export class PhoneRouter{constructor(store,registry){this.store=store;this.registry=registry;this.scroll=new Map();}open(link){const next=normalizeAppLink(link,this.registry);this.store.update(s=>{const current=s.nav.current;this.scroll.set(JSON.stringify(current),document.querySelector('#app-content')?.scrollTop||0);s.nav.stack.push(current);s.nav.current=next;acknowledgeOpenChat(s,current.appId);});}back(){this.store.update(s=>{const previous=s.nav.current.appId;s.nav.current=s.nav.stack.pop()||{appId:'home',route:'/',params:{}};acknowledgeOpenChat(s,previous);});}home(){this.store.update(s=>{s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};});}restoreScroll(){const node=document.querySelector('#app-content');if(node)node.scrollTop=this.scroll.get(JSON.stringify(this.store.get().nav.current))||0;}}
export function appLink(appId,route='/',params={}){return {appId,route,params};}
