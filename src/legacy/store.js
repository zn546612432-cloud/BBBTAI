import {seed,apps} from './data.js';
export const KEY='ximeng-phone-ui-v1';
export const clone=x=>JSON.parse(JSON.stringify(x));
export function validate(s){
 if(!s||s.schemaVersion!==1)throw Error('檔案版本不相容');
 for(const k of ['conversations','notes','photos','reminders','orders','mail','transactions','calls','notifications','pages'])if(!Array.isArray(s[k]))throw Error('缺少欄位：'+k);
 if(!Number.isInteger(s.day)||s.day<1||s.day>90)throw Error('日期必須介乎 D01–D90');
 if(!['light','dark'].includes(s.theme)||typeof s.clock!=='string'||!/^\d{2}:\d{2}$/.test(s.clock))throw Error('介面設定無效');
 const safeImage=v=>typeof v==='string'&&(v==='assets/wallpaper.png'||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v));
 if(!safeImage(s.wallpaper))throw Error('牆紙只接受本機圖片');
 if(s.icons!==undefined&&(!s.icons||typeof s.icons!=='object'||Array.isArray(s.icons)||Object.entries(s.icons).some(([id,src])=>!apps.some(a=>a.id===id)||!safeImage(src))))throw Error('圖標格式無效');
 for(const p of s.photos)if(!safeImage(p.src)||typeof p.title!=='string')throw Error('相片格式無效');
 const ids=new Set();for(const c of s.conversations){if(typeof c.id!=='string'||ids.has(c.id)||!['wechat','mirage','noapp','messages'].includes(c.app)||!Array.isArray(c.messages)||typeof c.name!=='string')throw Error('對話格式或ID無效');ids.add(c.id);for(const m of c.messages)if(typeof m.text!=='string'||typeof m.from!=='string'||typeof m.id!=='string'||(m.kind==='image'&&!safeImage(m.text)))throw Error('訊息格式無效');}
 const appIds=apps.map(a=>a.id);if(s.pages.length!==3||s.pages.some(p=>!Array.isArray(p)||p.some(id=>!appIds.includes(id))))throw Error('桌面格式無效');
 for(const n of s.notes)if(typeof n.title!=='string'||typeof n.text!=='string')throw Error('備忘錄格式無效');
 return s;
}
export function restore(storage){try{const s=JSON.parse(storage.getItem(KEY));return validate(s);}catch{return clone(seed);}}
export function persist(storage,s){validate(s);storage.setItem(KEY,JSON.stringify(s));}
export function moveMessage(messages,id,delta){const i=messages.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=messages.length)return messages;[messages[i],messages[j]]=[messages[j],messages[i]];return messages;}
export function canOpen(app,day){return !['noapp','ig'].includes(app)||day>=56;}
