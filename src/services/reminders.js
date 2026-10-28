import {uid} from './id.js';
export const reminders = s => s.content.reminders || [];
export function toggleReminder(store, id) {
  store.update(s => { const item = reminders(s).find(r => r.id === id); if (item) item.done = !item.done; });
}
export function addReminder(store, title) {
  title = title.trim().slice(0, 120);
  if (!title) return false;
  store.update(s => { (s.content.reminders ||= []).push({id:uid(), title, done:false}); });
  return true;
}
