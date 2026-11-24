import {wifiNetworks} from './features/wifi/index.js';
import {isFriendsTest} from '../../system/runtime/friends-test.js';
import {settingsHome} from './features/home/index.js';
import {settingsDetail} from './features/details/index.js';
import {cloudSaveView,cloudSaveAction,cloudSaveSubmit,cloudSaveInput} from './features/cloud-save/index.js';
export const manifest={id:'settings',name:'设置',icon:6,defaultRoute:'/',kicker:'SYSTEM'};
export function render({store},loc){const s=store.get();return loc.route==='/cloud-save'?cloudSaveView(store):loc.route==='/'?settingsHome(s):settingsDetail(s,loc.route.slice(1));}
export function handle(a,t,c){
 if(cloudSaveAction(a,t,c))return;
 if(a==='settings-change-wallpaper')return c.pickImage(src=>{c.store.update(s=>{s.wallpaper=src;});c.toast('已更換壁紙');},{cropAspect:9/19.5,maxEdge:540,quality:.86});
 if(a==='settings-wifi-network'&&wifiNetworks.includes(t.dataset.network))c.store.update(s=>{s.wifi=true;s.wifiNetwork=t.dataset.network;});
 if(a==='settings-back')c.router.back();
 if(a==='settings-open'){
  const route=t.dataset.route;
  if(route==='editor')return isFriendsTest?undefined:c.router.open({appId:'editor',route:'/'});
  if(route==='lock')return c.store.update(s=>{s.unlocked=false;s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};});
  if(route==='export')return c.download();
  c.router.open({appId:'settings',route:'/'+route});
 }
 if(a==='settings-toggle')c.store.update(s=>{const key=t.dataset.key;s[key]=!(s[key]??(['wifi','bluetooth','allowNotifications','haptics','airdrop','rotationLock'].includes(key)));});
}
export const submit=(form,ctx)=>cloudSaveSubmit(form,ctx);

export const input=(target,ctx)=>cloudSaveInput(target,ctx);
