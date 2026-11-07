// D11 evening meeting is off-screen. The phone records only Ximeng's own note,
// not invented WeChat speech from Fu Longsheng or NPCs standing in the room.
export const D11_MEETING_NOTE_ID='xm-note-d11-meeting';
export function tickD11MeetingNote(s){
 if(s.story55?.version!==1||s.day<11||!s.story55.completed?.return||
    s.day===11&&s.clock<'22:00')return false;
 const notes=s.content.notes??=([]);
 if(notes.some(n=>n.id===D11_MEETING_NOTE_ID))return false;
 notes.push({
  id:D11_MEETING_NOTE_ID,title:'5/29 · 备忘',authored:true,
  createdDay:11,updatedDay:11,updatedClock:'22:00',
  text:[
   '今晚到老地方。人来得差不多了，胡枫还在韩国，明晚到。',
   '干爹回澳门已经几天，住美景大厦。',
   '大家各忙各的太久了，明天开始整理旧据点。',
   '他问这段时间我都在做什么。',
   '汪杰那份五亿美元电子钱包的线索，我提了。现在还不能把话说满。',
   '干爹说，给我时间，让我做出点东西给他看。',
   '三个月。三千万。账得重新算。',
   '明天哥要去机场接胡枫。'
  ].join('\n')
 });
 return true;
}
