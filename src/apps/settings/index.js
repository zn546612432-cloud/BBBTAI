import {settingsHome} from './features/home/index.js';
import {settingsDetail} from './features/details/index.js';
export const manifest={id:'settings',name:'设置',icon:6,defaultRoute:'/',kicker:'SYSTEM'};
export function render({store},loc){const s=store.get();return loc.route==='/'?settingsHome(s):settingsDetail(s,loc.route.slice(1));}
export function handle(a,t,c){
 if(a==='settings-back')c.router.back();
 if(a==='settings-open'){
  const route=t.dataset.route;
  if(route==='editor')return c.router.open({appId:'editor',route:'/'});
  if(route==='lock')return c.store.update(s=>{s.unlocked=false;s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};});
  if(route==='export')return c.download();
  c.router.open({appId:'settings',route:'/'+route});
 }
 if(a==='settings-toggle')c.store.update(s=>{const key=t.dataset.key;s[key]=!(s[key]??(['wifi','bluetooth','allowNotifications','haptics'].includes(key)));});
}
