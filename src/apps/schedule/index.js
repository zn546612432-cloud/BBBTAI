import {diaryView,diaryAction} from './features/diary/index.js';
export const manifest={id:'schedule',name:'日程',glyph:'▦',tone:'#597482',defaultRoute:'/',kicker:'JOURNAL'};
export function render({store},loc={route:'/',params:{}}){return diaryView(store.get(),loc);}
export function handle(action,target,ctx){return diaryAction(action,target,ctx);}
