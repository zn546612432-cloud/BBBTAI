// Authored journal: narrative prose, not a task board or hidden progression UI.
// Game D01 is 2025-05-19. [[label|reminder title]] marks optional reminders.
export const DIARY_START='2025-05-19';
export const DEFAULT_DIARY_ENTRIES={
  1:{
    weather:'晴',
    title:'老狼归巢',
    body:'这是傅隆生回澳门的第三天。他谁也没通知，只悄悄告诉了熙旺。当天早上，熙旺给大家发群聊说了这件事，要大家去[[据点碰面|前往据点碰面]]。\n\n三年了。傅隆生这次回来，一定有什么大动静。老狼归巢，忍饥挨饿了三年的狼崽也蠢蠢欲动……'
  }
};
export function diaryDate(day,start=DIARY_START){
 const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+Number(day)-1);
 return d.toISOString().slice(0,10);
}
export function entryFor(s,day){
 const extra=s.content?.storyDiary?.[String(day)];
 return extra||DEFAULT_DIARY_ENTRIES[day]||null;
}
export function allDiaryDays(s){
 const days=new Set([...Object.keys(DEFAULT_DIARY_ENTRIES),...Object.keys(s.content?.storyDiary||{})]);
 return [...days].map(Number).filter(d=>Number.isInteger(d)&&d>=1&&d<=55&&entryFor(s,d)).sort((a,b)=>a-b);
}
export function saveDiaryEntry(s,day,data){
 if(!Number.isInteger(day)||day<1||day>55)throw Error('日程只支持D01—D55');
 if(typeof data.body!=='string'||data.body.length>6000||typeof data.title!=='string'||data.title.length>150||typeof data.weather!=='string'||data.weather.length>30)throw Error('日程内容超出长度限制');
 s.content.storyDiary??={};
 s.content.storyDiary[String(day)]={title:data.title.trim(),weather:data.weather.trim()||'晴',body:data.body.trim()};
}
