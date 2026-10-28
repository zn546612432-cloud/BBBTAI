import {btn} from '../../../../system/ui.js';
let elapsed=0,running=false,started=0;
const format=ms=>{const n=Math.floor(ms/10);return `${String(Math.floor(n/6000)).padStart(2,'0')}:${String(Math.floor(n/100)%60).padStart(2,'0')}.${String(n%100).padStart(2,'0')}`;};
export const stopwatchView=()=>`<h1>秒表</h1><div class="clock-counter">${format(elapsed+(running?Date.now()-started:0))}</div><div class="clock-actions">${btn('stopwatch-reset','复位')}${btn('stopwatch-toggle',running?'暂停':'启动',running?'':'green')}</div>`;
export function stopwatchAction(a,c){if(a==='stopwatch-reset'){elapsed=0;running=false;}if(a==='stopwatch-toggle'){if(running)elapsed+=Date.now()-started;else started=Date.now();running=!running;}c.refresh();}
