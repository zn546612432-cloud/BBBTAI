import {esc} from '../ui.js';

export function powerFullscreen(s,{passcode=''}={}){
 if(s.deathPhase==='draining')return '';
 if(s.deathPhase==='off')return '<section class="power-fullscreen power-off-screen"><button class="power-wake" data-action="story-wake" aria-label="唤醒屏幕"></button></section>';
 if(s.deathPhase==='passcode')return `<section class="power-fullscreen power-recovery-screen" aria-label="输入密码">${passcode}</section>`;
 if(s.dayChargeRemainingMs>0)return '<section class="power-fullscreen power-day-charge" aria-label="充电中"><div class="power-emergency-battery"><i></i></div></section>';

 if(s.alarmRinging)return `<section class="power-fullscreen power-alarm-screen" role="alertdialog" aria-label="闹钟响起"><div class="power-alarm-orbit"><span>◉</span></div><span class="power-screen-kicker">闹钟</span><div class="power-alarm-time">${esc(s.clock)}</div><h2>${esc(s.alarmRinging.label||'闹钟')}</h2><div class="power-screen-actions"><button data-action="power-dismiss-alarm" class="power-control power-control-primary">停止</button>${s.alarmRinging.fromSleep?'<button data-action="power-snooze" class="power-control power-control-secondary">继续睡觉</button>':''}</div></section>`;
 if(s.poweredOff)return `<section class="power-fullscreen power-off-screen" aria-label="手机已关机"><button data-action="power-plug" class="power-off-charge">充电</button></section>`;
 if(s.emergencyCharge||s.batteryPercent===1&&s.powerMode!=='charging')return `<section class="power-fullscreen power-emergency-screen" role="alertdialog" aria-label="电量 1%"><div class="power-emergency-battery"><i></i></div><div class="power-emergency-percent">1%</div><div class="power-emergency-actions"><button data-action="power-shutdown" class="power-control power-control-secondary">关机</button><button data-action="power-plug" class="power-control power-control-primary">充电</button></div></section>`;
 if(s.powerMode==='sleeping')return `<section class="power-fullscreen power-sleep-screen" aria-label="睡眠中"><span class="power-sleep-moon">☾</span><div class="power-sleep-clock">${esc(s.clock)}</div><div class="power-sleep-progress"><i></i></div></section>`;
 return '';
}
