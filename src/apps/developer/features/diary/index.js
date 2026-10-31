import {entryFor,diaryDate,allDiaryDays,saveDiaryEntry} from '../../../../story/diary/entries.js';
import {esc} from '../../../../system/ui.js';

export function diaryEditor(s){
 const day=Number(s.editor?.diaryDay)||s.day||1;
 const item=entryFor(s,day)||{title:'',weather:'晴',body:''};
 const days=Array.from({length:55},(_,i)=>i+1);
 const imported=s.content?.historicalWechat;
 return '<section class="editor-panel"><h2>日程 · 剧情日记编辑器</h2><p>与 iOS 日历、提醒事项和 GHOST 任务分开管理。这里只写当天发生的故事，不能直接完成任务或弹出剧情面板。</p>'+
  '<p>微信历史：'+(imported?.loaded?'已加载 '+imported.count+' 条D01之前的消息':'尚未完成导入，请检查刷新后的记录')+'</p>'+
  '<label>选择游戏日 <select data-diary-day>'+days.map(d=>'<option value="'+d+'" '+(day===d?'selected':'')+'>D'+String(d).padStart(2,'0')+' · '+diaryDate(d)+'</option>').join('')+'</select></label>'+
  '<form data-form="diary-save" class="card"><input type="hidden" name="day" value="'+day+'"><h3>'+diaryDate(day)+'</h3>'+
  '<label>天气<input name="weather" maxlength="30" value="'+esc(item.weather||'晴')+'" required placeholder="晴"></label>'+
  '<label>日记标题<input name="title" maxlength="150" value="'+esc(item.title||'')+'" placeholder="例如：老狼归巢"></label>'+
  '<label>当天的剧情记录<textarea name="body" rows="14" maxlength="6000" placeholder="写下这一天发生的事……">'+esc(item.body||'')+'</textarea></label>'+
  '<p>需要玩家自行决定是否加入提醒事项的词，写作 <code>[[据点碰面|前往据点碰面]]</code>。游戏里只把「据点碰面」标成蓝色下划线，点击后才询问是否加入。</p>'+
  '<button class="button-primary" type="submit">保存这一天的日程</button></form>'+
  '<button type="button" data-action="diary-preview" data-day="'+day+'">在日程 App 中测试这一天</button>'+
  '<h3>已写入 '+allDiaryDays(s).length+' 天</h3>'+
  allDiaryDays(s).map(d=>'<button type="button" data-action="diary-select" data-day="'+d+'">D'+String(d).padStart(2,'0')+' '+esc(entryFor(s,d)?.title||'未命名')+'</button>').join('')+
  '</section>';
}
export function diaryEditorAction(action,target,ctx){
 if(action==='diary-select'){
  ctx.store.update(s=>{s.editor.diaryDay=Number(target.dataset.day);});return true;
 }
 if(action==='diary-preview'){
  const day=Number(target.dataset.day);
  ctx.store.update(s=>{s.day=day;s.clock='12:00';});
  ctx.router.open({appId:'schedule',route:'/',params:{day:String(day)}});
  return true;
 }
 return false;
}
export function diaryEditorChange(target,ctx){
 if(target.matches?.('[data-diary-day]')){ctx.store.update(s=>{s.editor.diaryDay=Number(target.value);});return true;}
 return false;
}
export function diaryEditorSubmit(form,ctx){
 if(form.dataset.form!=='diary-save')return false;
 const data=new FormData(form),day=Number(data.get('day'));
 ctx.store.update(s=>saveDiaryEntry(s,day,{
  weather:String(data.get('weather')||'晴'),
  title:String(data.get('title')||''),
  body:String(data.get('body')||'')
 }));
 ctx.toast('日程已保存');return true;
}
