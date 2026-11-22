// Fixed dialogue consumes authored story time, not real elapsed world speed.
// Optional catch-up chatter and the dedicated D55/D13 sequences stay separate.
export const fixedSceneTimeline=n=>n?.kind==='scene'&&n.delivery==='queued'&&!n.optional&&!n.authoredPending&&!['ending','intrusion'].includes(n.id);
export function presetReplyDelay(text,base=1900){
 const length=Array.from(String(text||'')).length;
 return Math.max(base,length>35?Math.min(14000,1200+length*85):base);
}
const minute=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
const clock=m=>`${String(Math.floor(m%1440/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const seconds=text=>Math.min(75,Math.max(18,10+Array.from(String(text||'')).length*1.1));
// Each line has a deterministic stamp (HH:mm); explicit authored times win.
// A paused player or background tab never advances ordinary game time.
export function stampFixedLine(s,progress,lines,index,{at,explicit,afterMidnight=false,day=s.day,precision='minute'}={}){
 if(s.day!==day)return s.clock; // late migration never rewinds/changes a date.
 const night=afterMidnight||s.story55?.overnightHold?.day===s.day&&s.story55.overnightHold.nightAfterMidnight||s.day===23&&s.story55?.d23?.nightAfterMidnight||s.day===1&&s.story55?.d01?.nightAfterMidnight;
 const now=minute(s.clock)+(night?1440:0);
 progress.timelineStartMinute??=Math.max(now,at?minute(at)+(afterMidnight?1440:0):now);
 const elapsedSeconds=lines.slice(0,index).reduce((sum,line)=>sum+seconds(line[1]??line.text),0)
  +(precision==='second'?lines.slice(0,index+1).reduce((sum,line)=>sum+(Number(line.delayMs)||0)/1000,0):0);
 const offset=Math.floor(elapsedSeconds/60);
 const desired=explicit?minute(explicit)+(night?1440:0):progress.timelineStartMinute+offset;
 const next=Math.max(now,Math.min(night?1620:1439,desired));
 if(explicit)progress.timelineStartMinute=next-offset;
 s.clock=clock(next);s.worldMinuteFraction=0;
 return precision==='second'?`${s.clock}:${String(Math.floor(elapsedSeconds%60)).padStart(2,'0')}`:s.clock;
}
