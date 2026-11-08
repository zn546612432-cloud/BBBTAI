import {esc} from '../../system/ui.js';
import {activePhoneCall,canPresentPhoneCall} from './store.js';
export function callDuration(call,now=Date.now()){
 const n=call?.answeredAt==null?0:Math.max(0,Math.floor((now-call.answeredAt)/1000));
 return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
}
const handset="<svg viewBox=\"0 0 24 24\" width=\"31\" height=\"31\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.25a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.68A2 2 0 0 1 22 16.92z\"/></svg>";
const callButton=(action,symbol,label,style)=>`<button type="button" class="tel-call-action ${style}" data-action="${action}" aria-label="${label}"><span aria-hidden="true">${symbol}</span><small>${label}</small></button>`;
export function telephonyFullscreen(s){
 if(!canPresentPhoneCall(s))return '';
 if(s.story55?.d13?.phase==='green')return '<section class="power-fullscreen tel-green-screen" role="presentation"></section>';
 const c=activePhoneCall(s);if(!c)return '';
 if(c.state==='connected'&&!c.resumeRequired&&!c.showControls)return '';
 const connected=c.state==='connected',incoming=c.direction==='incoming';
 const name=esc(c.displayName||'未知號碼');
 const label=connected?'通話中':incoming?'來電':'撥號中';
 const subtitle=connected?callDuration(c):incoming?'手機':'正在撥號';
 const actions=connected
  ?callButton('tel-chat','⌄',c.node?'返回通訊':'返回手機','is-secondary')+callButton('tel-end',handset,'掛斷','is-decline')
  :incoming
   ?callButton('tel-decline',handset,'拒接','is-decline')+callButton('tel-answer',handset,'接聽','is-answer')
   :callButton('tel-end',handset,'取消','is-decline');
 return `<section class="power-fullscreen tel-call-screen" role="dialog" aria-modal="true" aria-label="${connected?'通話控制':'來電'}">
  <div class="tel-call-identity"><small>${label}</small><h1>${name}</h1><p>${subtitle}</p></div>
  <div class="tel-call-bottom">
   ${c.resumeRequired?'<button type="button" class="tel-call-resume" data-action="tel-resume">繼續通話</button>':''}
   <div class="tel-call-actions">${actions}</div>
  </div>
 </section>`;
}
export function telephonyIsland(s){
 const c=activePhoneCall(s);if(c?.state!=='connected')return '';
 return `<button type="button" class="dynamic-island tel-call-island" data-action="tel-return" aria-label="開啟通話控制"><span class="tel-call-record-dot" aria-hidden="true"></span><span class="tel-call-time">${callDuration(c)}</span></button>`;
}
