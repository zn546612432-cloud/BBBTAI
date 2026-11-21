import {trackById} from '../../apps/music/features/shared/catalog.js';
import {glyph} from './icons.js';
export const controlsSettings=s=>({muted:s.silent===true,volume:s.deviceControls?.volume??.7,brightness:s.deviceControls?.brightness??1});
const button=(action,name,label,extra='')=>`<button type="button" data-cc="${action}" aria-label="${label}" ${extra}>${glyph(name)}</button>`;
const toggle=(key,name,label,on,tint,extra='')=>button('toggle-'+key,name,label,`class="cc-toggle ${on?'is-on cc-'+tint:''} ${extra}" aria-pressed="${!!on}"`);
export function batteryGlyph(s){
 const level=Math.max(0,Math.min(100,Math.round(Number(s.batteryPercent??82))));
 const charging=['charging','short-charging','sleeping'].includes(s.powerMode);
 const color=charging?'#4cdb73':s.lowPower?'#ffd65c':level<=20?'#ff5c5c':'currentColor';
 return `<svg class="cc-battery-icon" viewBox="0 0 30 16" fill="none" aria-hidden="true"><rect x=".75" y=".75" width="25.5" height="14.5" rx="3.25" stroke="currentColor" stroke-opacity=".55" stroke-width="1.5"/><rect data-cc-battery-fill x="2.5" y="2.5" width="${(21.5*level/100).toFixed(3)}" height="11" rx="1.5" fill="${color}"/><path d="M28 5v6a3 3 0 0 0 0-6" fill="currentColor" opacity=".5"/></svg>`;
}
export function controlCenter(s,{flashlight=false,outputOpen=false}={}){
 const p=controlsSettings(s),level=p.muted?0:p.volume,playing=s.musicPlaying===true,track=trackById(s.musicTrack);
 const slider=(name,value,icon)=>`<label class="cc-slider" style="--fill:${Math.round(value*100)}%"><input type="range" min="${name==='brightness'?30:0}" max="100" value="${Math.round(value*100)}" data-cc-slider="${name}" aria-label="${name==='brightness'?'螢幕亮度':'音量'}"><span class="cc-slider-fill"></span>${glyph(icon)}</label>`;
 return `<section class="cc-surface" role="dialog" aria-label="控制中心" aria-modal="true">
  <button class="cc-backdrop" data-cc="dismiss" aria-label="關閉控制中心"></button>
  <div class="cc-content">
   <header class="cc-top">${button('settings','settings','設定')}<span class="cc-island"></span>${button('lock','power','鎖定螢幕')}</header>
   <div class="cc-carrier"><span>${glyph(s.airplane?'airplane':'signal')} ${s.airplane?'飛行模式':'中國電信 <b>5G</b>'}</span><span class="cc-battery" aria-label="電量 ${Math.round(s.batteryPercent??82)}%">${Math.round(s.batteryPercent??82)}% ${batteryGlyph(s)}</span><small>${glyph('signal')} 中國移動</small></div>
   <div class="cc-grid">
    <section class="cc-glass cc-connections" aria-label="連線狀態">
     ${toggle('airplane','airplane','飛行模式',s.airplane,'orange','cc-orb')}
     ${toggle('airdrop','airdrop','AirDrop',s.airdrop!==false,'blue','cc-orb')}
     ${toggle('wifi','wifi','Wi-Fi',s.wifi!==false,'white','cc-orb')}
     <div class="cc-mini-connections">
      ${toggle('cellular','signal','行動數據',s.cellular===true,'green')}
      ${toggle('bluetooth','bluetooth','藍牙',s.bluetooth!==false,'blue')}
      ${toggle('hotspot','link','個人熱點',s.hotspot,'green')}
      ${toggle('vpn','globe','VPN',s.vpn,'blue')}
     </div>
    </section>
    <section class="cc-glass cc-media ${playing?'is-playing':'is-idle'}" aria-label="媒體播放">
     <div class="cc-media-top">${playing?`<span class="cc-album" style="background-image:url('${track.cover}')"></span>`:''}${button('output','airdrop','音訊輸出',`class="cc-output ${outputOpen?'is-on':''}" aria-expanded="${outputOpen}"`)}</div>
     ${playing?`<strong class="cc-track-title">${track.title}</strong><span class="cc-track-subtitle">${track.artist}</span>`:'<span class="cc-not-playing">未在播放</span>'}
     <div class="cc-transport">${button('previous','back','上一首',playing?'':'disabled')}${button('play',playing?'pause':'play',playing?'暫停':'播放')}${button('next','next','下一首',playing?'':'disabled')}</div>
     ${outputOpen?'<div class="cc-output-menu"><strong>音訊輸出</strong><button data-cc="output" aria-label="使用 iPhone 揚聲器">iPhone <span>✓</span></button></div>':''}
    </section>
    ${toggle('rotationLock','rotation','直向鎖定',s.rotationLock!==false,'red','cc-glass cc-round cc-lock')}
    ${button('mute',p.muted?'quiet':'bell',p.muted?'取消靜音':'一鍵靜音',`class="cc-glass cc-round cc-mute cc-toggle ${p.muted?'is-on cc-red':''}" aria-pressed="${p.muted}"`)}
    <div class="cc-brightness">${slider('brightness',p.brightness,'sun')}</div>
    <div class="cc-volume">${slider('volume',level,level?'volume':'mute')}</div>
    <button class="cc-glass cc-focus cc-toggle ${s.focus?'is-on':''}" data-cc="toggle-focus" aria-label="勿擾模式" aria-pressed="${s.focus===true}">${glyph('moon')}<span><strong>勿擾模式</strong><small>${s.focus?'已開啟':'已關閉'}</small></span></button>
    ${button('play','music',playing?'暫停音樂':'播放音樂',`class="cc-glass cc-round cc-toggle ${playing?'is-on cc-white':''}" aria-pressed="${playing}"`)}
    ${button('clock','clock','開啟時鐘','class="cc-glass cc-round cc-shortcut"')}
    ${toggle('lowPower','battery','低耗電模式',s.lowPower,'yellow','cc-glass cc-round')}
    ${button('torch','torch',flashlight?'關閉手電筒':'開啟手電筒',`class="cc-glass cc-round cc-toggle ${flashlight?'is-on cc-white':''}" aria-pressed="${flashlight}"`)}
    ${button('camera','camera','開啟相機','class="cc-glass cc-round cc-shortcut"')}
    ${button('notes','note','開啟備忘錄','class="cc-glass cc-round cc-shortcut"')}
    ${button('settings','settings','開啟設定','class="cc-glass cc-round cc-shortcut"')}
   </div>
   <p class="cc-announcement" role="status">${p.muted?'靜音模式':''}${p.muted&&s.focus?' · ':''}${s.focus?'勿擾模式':''}</p>
  </div>${button('dismiss','close','關閉控制中心','class="cc-dismiss"')}
 </section>`;
}
