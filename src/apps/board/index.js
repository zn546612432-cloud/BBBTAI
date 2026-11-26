import {esc,btn} from '../../system/ui.js';
import {uid} from '../../services/id.js';
import {boardNotes,addNote,updateNote,moveNote,removeNote,COLORS,WIDTH,HEIGHT} from './state.js';
import {mountBoardDrag} from './drag.js';
export const manifest={id:'board',name:'BOARD',tone:'#655744',defaultRoute:'/',kicker:'BOARD',unlockDay:1};
const names={yellow:'黃色',ivory:'米白',blue:'灰藍',rose:'淡粉'};
const scales=[0.4,0.6,0.8,1,1.2];
const scaleOf=loc=>scales.includes(Number(loc.params?.scale))?Number(loc.params.scale):0.6;
function editView(note,scale){
 return '<main class="board-editor" data-native-scroll><header>私人便條</header><form data-form="board-note" data-id="'+esc(note?.id||'')+'" data-scale="'+scale+'"><label>內容<textarea name="text" maxlength="400" rows="6" required placeholder="寫點什麼…">'+esc(note?.text||'')+'</textarea></label><label>紙張<select name="color">'+COLORS.map(c=>'<option value="'+c+'" '+(c===(note?.color||'yellow')?'selected':'')+'>'+names[c]+'</option>').join('')+'</select></label><button type="submit" class="board-primary">儲存</button>'+ (note?btn('board-delete','刪除便條','board-delete','data-id="'+esc(note.id)+'"'):'')+'</form></main>';
}
function noteMarkup(n){const x=Number(n.x)||0,y=Number(n.y)||0,a=Math.max(-8,Math.min(8,Number(n.angle)||0)),color=COLORS.includes(n.color)?n.color:'yellow';
 return '<article class="board-paper board-paper-'+color+'" data-key="board-note-'+esc(n.id)+'" data-board-note="'+esc(n.id)+'" style="left:'+x+'px;top:'+y+'px;rotate:'+a+'deg">'+btn('board-drag','<span></span>','board-pin','data-board-drag="'+esc(n.id)+'" aria-label="拖動便條"')+btn('board-edit',esc(n.text),'board-paper-text','data-id="'+esc(n.id)+'" aria-label="編輯便條"')+'</article>';
}
export function render(ctx,loc){
 const s=ctx.store.get(),notes=boardNotes(s),scale=scaleOf(loc);
 if(loc.route==='/edit')return editView(notes.find(n=>n.id===loc.params?.id),scale);
 mountBoardDrag(ctx,moveNote);
 const hour=Number(String(s.clock||'12:00').slice(0,2)),light=hour>=7&&hour<17?'day':hour>=17&&hour<19?'dusk':'night';
 return '<main class="board-screen board-'+light+'"><div class="board-toolbar"><div><strong>私人工作台</strong><small>MY BOARD</small></div>'+btn('board-add','＋','board-add','aria-label="新增便條"')+'</div><div class="board-viewport" data-native-scroll><div class="board-stage" style="width:'+WIDTH*scale+'px;height:'+HEIGHT*scale+'px"><div class="board-wall" data-board-scale="'+scale+'" style="transform:scale('+scale+')"><div class="board-glass"><i></i><i></i><i></i><i></i><i></i><i></i></div>'+notes.map(noteMarkup).join('')+'</div></div></div><footer class="board-footer"><span>'+notes.length+' 張便條</span><div>'+btn('board-zoom','−','','data-direction="-1" aria-label="縮小"')+'<span>'+Math.round(scale*100)+'%</span>'+btn('board-zoom','＋','','data-direction="1" aria-label="放大"')+'</div></footer></main>';
}
export function handle(action,target,ctx,loc){
 const scale=scaleOf(loc),id=target.dataset.id;
 if(action==='board-add'||action==='board-edit')ctx.router.open({appId:'board',route:'/edit',params:{scale,...(id?{id}:{})}});
 if(action==='board-delete'){ctx.store.update(s=>removeNote(s,id));ctx.router.back();}
 if(action==='board-zoom'){const next=scales[Math.max(0,Math.min(scales.length-1,scales.indexOf(scale)+Number(target.dataset.direction)))];if(next!==scale){ctx.store.update(s=>{if(s.nav.current.appId==='board')s.nav.current.params={...s.nav.current.params,scale:next};});}}
}
export function submit(form,ctx){
 if(form.dataset.form!=='board-note')return;
 const f=new FormData(form),id=form.dataset.id,text=String(f.get('text')||'').trim(),color=String(f.get('color')||'yellow');
 if(!text)return;
 let ok=false;ctx.store.update(s=>{ok=id?updateNote(s,id,text,color):addNote(s,uid(),text,color);});
 if(ok)ctx.router.back();else ctx.toast('無法儲存便條');
}
