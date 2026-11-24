import {esc} from '../../system/ui.js';
import {activePhoneCall,canPresentPhoneCall} from './store.js';
import {authoredPhoneView} from './native-view.js';
export function callDuration(call,now=Date.now()){
 const n=call?.answeredAt==null?0:Math.max(0,Math.floor((now-call.answeredAt)/1000));
 return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
}
const handset="<svg viewBox=\"0 0 24 24\" width=\"31\" height=\"31\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.25a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.68A2 2 0 0 1 22 16.92z\"/></svg>";

const backChevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
// Standard calls reuse the existing telephony actions and timings.
function standardPhoneView(c,duration){
 const connected=c.state==='connected',incoming=c.direction==='incoming';
 const name=esc(c.displayName||'未知號碼'),label=c.node?'返回通訊':'返回手機';
 const wave=connected&&c.speaking?'<span class="tel-standard-voice" aria-label="對方正在說話"><i></i><i></i><i></i><i></i><i></i></span>':'';
 const action=(id,text,style)=>'<button type="button" class="tel-standard-action '+style+'" data-action="'+id+'" aria-label="'+text+'"><span>'+handset+'</span><small>'+text+'</small></button>';
 const buttons=connected?action('tel-end','掛斷','is-end'):
  incoming?action('tel-decline','拒接','is-end')+action('tel-answer','接聽','is-answer'):
  action('tel-end','取消','is-end');
 return '<section class="power-fullscreen tel-call-screen tel-standard-call'+(connected?' is-connected':'')+'" role="dialog" aria-modal="true" aria-label="'+(connected?'通話控制':'來電')+'">'+
  '<div class="tel-standard-backdrop" aria-hidden="true"></div>'+
  (connected?'<button type="button" class="tel-standard-back" data-action="tel-chat" aria-label="'+label+'">'+backChevron+'<span>'+label+'</span></button>':'')+
  '<header class="tel-standard-identity">'+
   '<h1>'+name+'</h1>'+(connected?'<p>'+duration+'</p>':incoming?'':'<p>正在撥號…</p>')+wave+
  '</header>'+
  '<footer class="tel-standard-bottom">'+
   (c.resumeRequired?'<button type="button" class="tel-call-resume" data-action="tel-resume">繼續通話</button>':'')+
   '<div class="tel-standard-actions">'+buttons+'</div>'+
  '</footer>'+
 '</section>';
}

export function telephonyFullscreen(s){
 if(!canPresentPhoneCall(s))return '';
 if(s.story55?.d13?.phase==='green')return '<section class="power-fullscreen tel-green-screen" role="presentation"></section>';
 const c=activePhoneCall(s);if(!c)return '';
 if(c.scriptId==='d55-fulongsheng-last'&&c.state==='ringing'&&!s.story55?.d55FatherTakeover)return '';
 if(c.state==='connected'&&!c.resumeRequired&&!c.showControls)return '';
 if(c.source==='authored-phone')return authoredPhoneView(c,callDuration(c));
 return standardPhoneView(c,callDuration(c));
}
export function telephonyIncomingBanner(s){
 const call=activePhoneCall(s);
 if(call?.scriptId!=='d55-fulongsheng-last'||call.state!=='ringing'||s.story55?.d55FatherTakeover)return '';
 return '<div class="tai-incoming-banner d55-father-incoming" role="status" aria-label="傅隆生來電">'+
  '<div class="tai-banner-info"><strong>傅隆生</strong><small>電話 · 來電</small></div></div>';
}
export function telephonyIsland(s){
 const c=activePhoneCall(s);if(c?.state!=='connected')return '';
 return `<button type="button" class="dynamic-island tel-call-island" data-action="tel-return" aria-label="開啟通話控制"><span class="tel-call-record-dot" aria-hidden="true"></span><span class="tel-call-time">${callDuration(c)}</span></button>`;
}
