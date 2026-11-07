import {esc} from '../../system/ui.js';
import {activePhoneCall,canPresentPhoneCall} from './store.js';
export function callDuration(call,now=Date.now()){
 const n=call?.answeredAt==null?0:Math.max(0,Math.floor((now-call.answeredAt)/1000));
 return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
}
export function telephonyFullscreen(s){
 if(!canPresentPhoneCall(s))return '';
 if(s.story55?.d13?.phase==='green')return '<section class="power-fullscreen tel-green-screen" role="alert" aria-label="連線中斷"><p>屏幕失去響應，重啟沒有恢復。</p><div aria-hidden="true">SESSION INTERRUPTED<br>RESTART / FAILED</div></section>';
 const c=activePhoneCall(s);if(!c)return '';
 if(c.state==='connected'&&!c.resumeRequired)return '';
 const incoming=c.direction==='incoming';
 return `<section class="power-fullscreen tel-call-screen" role="dialog" aria-modal="true" aria-label="${c.state==='connected'?'繼續通話':'系統來電'}"><small>${c.state==='connected'?'通話暫停':incoming?'INCOMING CALL':'OUTGOING CALL'}</small><h1>${esc(incoming?'未知號碼':c.displayName)}</h1><p>${incoming?'UNKNOWN':'正在撥號'}</p>${c.state==='connected'?'<button type="button" data-action="tel-resume">點擊繼續通話</button>':incoming?'<button type="button" data-action="tel-answer">接聽</button>'+(!c.forced?'<button type="button" data-action="tel-decline">拒接</button>':'<small>REMOTE OVERRIDE · 8 秒後自動接通</small>'):'<button type="button" data-action="tel-end">取消</button>'}</section>`;
}
export function telephonyIsland(s){
 const c=activePhoneCall(s);if(c?.state!=='connected')return '';
 return `<button class="dynamic-island tel-call-island" data-action="tel-return" aria-label="返回通話">☎ <span>${callDuration(c)}</span>${c.remoteOverride?'<small>REMOTE OVERRIDE</small>':''}</button>`;
}
