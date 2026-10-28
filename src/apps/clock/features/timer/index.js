import {btn} from '../../../../system/ui.js';
let remaining=300,running=false,ends=0;
export const timerView=()=>`<h1>计时器</h1><div class="clock-counter">${String(Math.floor((running?Math.max(0,ends-Date.now())/1000:remaining)/60)).padStart(2,'0')}:${String(Math.floor(running?Math.max(0,ends-Date.now())/1000:remaining)%60).padStart(2,'0')}</div><div class="clock-actions">${btn('timer-reset','取消')}${btn('timer-toggle',running?'暂停':'开始','green')}</div>`;
export function timerAction(a,c){if(a==='timer-reset'){remaining=300;running=false;}if(a==='timer-toggle'){if(running)remaining=Math.max(0,Math.ceil((ends-Date.now())/1000));else ends=Date.now()+remaining*1000;running=!running;}c.refresh();}
