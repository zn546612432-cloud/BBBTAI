import {dateParts,validDate} from '../calendar.js';
const DAY=86400000;
export const shiftDate=(iso,days)=>new Date(new Date(iso+'T00:00:00Z').getTime()+days*DAY).toISOString().slice(0,10);
export function messageDate(m,s){if(validDate(m.sentDate))return m.sentDate;if(Number.isInteger(m.day))return dateParts({...s,day:m.day}).iso;const ago=String(m.time||'').includes('前天')?2:String(m.time||'').includes('昨天')?1:0;return shiftDate(dateParts(s).iso,-ago);}
export function messageClock(m,s){const found=String(m.time||'').match(/(?:^|\s)((?:[01]\d|2[0-3]):[0-5]\d)(?:$|\s)/);return found?.[1]||(!m.time?s.clock:'');}
export function timestampLabel(m,s){const iso=messageDate(m,s),today=dateParts(s).iso,ago=Math.round((Date.parse(today)-Date.parse(iso))/DAY),clock=messageClock(m,s);let prefix=ago===0?'':ago===1?'昨天':ago===2?'前天':iso.slice(0,4)===today.slice(0,4)?`${Number(iso.slice(5,7))}月${Number(iso.slice(8))}日`:`${iso.slice(0,4)}年${Number(iso.slice(5,7))}月${Number(iso.slice(8))}日`;return [prefix,clock].filter(Boolean).join(' ')||'今天';}
export function timestampGroups(messages,s){let last=null;return messages.map(m=>{const date=messageDate(m,s),clock=messageClock(m,s),minutes=clock?Number(clock.slice(0,2))*60+Number(clock.slice(3)):null;const show=!last||date!==last.date||minutes===null||last.minutes===null||Math.abs(minutes-last.minutes)>=5;last={date,minutes};return {m,separator:show?timestampLabel(m,s):null};});}
export function datePreset(m,s){if(m.sentDateMode==='custom')return 'custom';const diff=Math.round((Date.parse(dateParts(s).iso)-Date.parse(messageDate(m,s)))/DAY);return diff===0?'today':diff===1?'yesterday':diff===2?'before-yesterday':'custom';}
export function setMessageDate(m,s,{preset,date,time}){
 if(preset){if(!['today','yesterday','before-yesterday','custom'].includes(preset))throw Error('发送日期无效');m.sentDateMode=preset;m.sentDate=preset==='custom'?messageDate(m,s):shiftDate(dateParts(s).iso,preset==='yesterday'?-1:preset==='before-yesterday'?-2:0);}
 if(date!==undefined){if(!validDate(date))throw Error('请输入有效的发送日期');m.sentDate=date;m.sentDateMode='custom';}
 if(time!==undefined){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('请输入有效的发送时间');m.time=time;}
}
