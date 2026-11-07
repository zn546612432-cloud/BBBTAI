import {esc} from '../../system/ui.js';
import {activePhoneCall,canPresentPhoneCall} from './store.js';
export function callDuration(call,now=Date.now()){
 const n=call?.answeredAt==null?0:Math.max(0,Math.floor((now-call.answeredAt)/1000));
 return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
}
const callButton=(action,symbol,label,style)=>`<button type="button" class="tel-call-action ${style}" data-action="${action}" aria-label="${label}"><span aria-hidden="true">${symbol}</span><small>${label}</small></button>`;
export function telephonyFullscreen(s){
 if(!canPresentPhoneCall(s))return '';
 if(s.story55?.d13?.phase==='green')return '<section class="power-fullscreen tel-green-screen" role="alert" aria-label="連線中斷"><p>屏幕失去響應，重啟沒有恢復。</p><div aria-hidden="true">SESSION INTERRUPTED<br>RESTART / FAILED</div></section>';
 const c=activePhoneCall(s);if(!c)return '';
 if(c.state==='connected'&&!c.resumeRequired&&!c.showControls)return '';
 const connected=c.state==='connected',incoming=c.direction==='incoming';
 const name=esc(c.displayName||'未知號碼');
 const label=connected?'通話中':incoming?'來電':'撥號中';
 const subtitle=connected?callDuration(c):incoming?'手機':'正在撥號';
 const actions=connected
  ?callButton('tel-chat','⌄',c.node?'返回通訊':'返回手機','is-secondary')+callButton('tel-end','✕','掛斷','is-decline')
  :incoming
   ?callButton('tel-decline','✕','拒接','is-decline')+callButton('tel-answer','☎','接聽','is-answer')
   :callButton('tel-end','✕','取消','is-decline');
 return `<section class="power-fullscreen tel-call-screen" role="dialog" aria-modal="true" aria-label="${connected?'通話控制':'來電'}">
  <div class="tel-call-identity"><small>${label}</small><h1>${name}</h1><p>${subtitle}</p></div>
  <div class="tel-call-bottom">
   ${c.resumeRequired?'<button type="button" class="tel-call-resume" data-action="tel-resume">繼續通話</button>':''}
   <div class="tel-call-actions">${actions}</div>
   ${!connected&&c.forced?'<p class="tel-call-auto">將自動接通</p>':''}
  </div>
 </section>`;
}
export function telephonyIsland(s){
 const c=activePhoneCall(s);if(c?.state!=='connected')return '';
 return `<button type="button" class="dynamic-island tel-call-island" data-action="tel-return" aria-label="開啟通話控制"><span aria-hidden="true">☎</span> <span>${callDuration(c)}</span></button>`;
}
