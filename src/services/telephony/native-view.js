import {esc} from '../../system/ui.js';

const svg=(body,filled=false)=>`<svg viewBox="0 0 24 24" aria-hidden="true" ${filled?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
const icons={
 down:svg('<path d="m6 9 6 6 6-6"/>'),
 person:svg('<circle cx="12" cy="8" r="4.2"/><path d="M3 23v-2a9 9 0 0 1 18 0v2Z"/>',true),
 speaker:svg('<path d="M11 4 6 8H2v8h4l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),
 video:svg('<rect x="2" y="5" width="13" height="14" rx="3"/><path d="m15 9 7-4v14l-7-4"/>'),
 mic:svg('<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>'),
 micOff:svg('<path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2m1-5V5a3 3 0 0 0-6 0M5 10v2a7 7 0 0 0 12 5m2-5v-2M12 19v3m-4 0h8"/>'),
 plus:svg('<path d="M12 4v16M4 12h16"/>'),
 end:svg('<path d="M2.5 10.1C8 5.9 16 5.9 21.5 10.1c.9.7 1.3 1.9.8 2.9l-1 2.1c-.4.9-1.5 1.3-2.4.9l-3.1-1.3c-.6-.3-1-1-1-1.7v-1.5a18.7 18.7 0 0 0-5.6 0V13c0 .7-.4 1.4-1 1.7L5.1 16c-.9.4-2 0-2.4-.9l-1-2.1c-.5-1 .1-2.2.8-2.9Z"/>',true),
 keypad:svg([4,12,20].flatMap(x=>[4,12,20].map(y=>`<circle cx="${x}" cy="${y}" r="2"/>`)).join(''),true)
};
const tool=(name,label,{action,disabled=false,selected=false,red=false}={})=>`<button type="button" class="tel-native-tool${red?' is-end':''}${selected?' is-selected':''}" ${action?`data-action="${action}"`:''} aria-label="${label}"${disabled?' disabled':''}${action==='tel-microphone'?` aria-pressed="${selected}"`:''}><span>${icons[name]}</span><small>${label}</small></button>`;
export function authoredPhoneView(call,duration){
 const connected=call.state==='connected';
 return `<section class="power-fullscreen tel-call-screen tel-native-call${connected?' is-connected':''}" role="dialog" aria-modal="true" aria-label="${connected?'通話控制':'來電'}">
  <div class="tel-native-backdrop" aria-hidden="true"></div>
  ${connected?`<button type="button" class="tel-native-minimize" data-action="tel-chat" aria-label="返回手機">${icons.down}</button>`:''}
  <div class="tel-call-identity tel-native-identity"><span class="tel-native-portrait" aria-hidden="true">${icons.person}</span><h1>${esc(call.displayName)}</h1><p>${connected?duration:'手機'}</p></div>
  <div class="tel-call-caption tel-native-caption" aria-live="polite" aria-atomic="true">${connected&&call.caption?`<small>${esc(call.caption.speaker)}</small><p>${esc(call.caption.text)}</p>`:''}</div>
  <div class="tel-native-bottom">
   ${call.resumeRequired?'<button type="button" class="tel-call-resume" data-action="tel-resume">繼續通話</button>':''}
   ${connected?`<div class="tel-native-tools">
    ${tool('speaker','擴音',{disabled:true})}${tool('video','FaceTime',{disabled:true})}${tool(call.microphoneMuted?'micOff':'mic','靜音',{action:'tel-microphone',selected:call.microphoneMuted===true})}
    ${tool('plus','加入通話',{disabled:true})}${tool('end','結束',{action:'tel-end',red:true})}${tool('keypad','鍵盤',{disabled:true})}
   </div>`:`<div class="tel-native-incoming">${tool('end','拒接',{action:'tel-decline',red:true})}<button type="button" class="tel-native-tool is-answer" data-action="tel-answer" aria-label="接聽"><span>${icons.end}</span><small>接聽</small></button></div>`}
  </div>
 </section>`;
}
