export function persistCalendarItem(store,event){
 store.update(s=>{
  if(event.kind==='reminder'){
   if(!Array.isArray(s.content.reminders))s.content.reminders=[];
   const reminder={id:event.id,title:event.title,done:false,dueDate:event.startDate,dueTime:event.startTime,notes:event.notes};
   const index=s.content.reminders.findIndex(item=>item.id===event.id);
   if(index>=0)s.content.reminders[index]={...s.content.reminders[index],...reminder};else s.content.reminders.push(reminder);
   return;
  }
  if(!Array.isArray(s.content.calendarEvents))s.content.calendarEvents=[];
  const index=s.content.calendarEvents.findIndex(item=>item.id===event.id);
  if(index>=0)s.content.calendarEvents[index]=event;else s.content.calendarEvents.push(event);
 });
}
