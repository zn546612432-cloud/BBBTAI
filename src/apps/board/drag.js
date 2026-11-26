// Scoped pointer handling; the shell already excludes data-native-scroll.
const bindings=new WeakMap();
export function mountBoardDrag(ctx,moveNote){
 const doc=globalThis.document;if(!doc)return;
 if(bindings.has(doc)){bindings.get(doc).ctx=ctx;return;}
 const b={ctx,active:null};bindings.set(doc,b);
 const finish=(e,commit)=>{const a=b.active;if(!a||a.pointer!==e.pointerId)return;b.active=null;
  if(commit&&a.moved&&b.ctx.store.get().nav.current.appId==='board'){
   try{b.ctx.store.update(s=>moveNote(s,a.id,a.x,a.y));}catch(err){b.ctx.toast?.(err.message);}
  }else if(a.paper.isConnected){a.paper.style.left=a.startX+'px';a.paper.style.top=a.startY+'px';}
 };
 doc.addEventListener('pointerdown',e=>{const h=e.target.closest?.('[data-board-drag]');if(!h||e.button!==0||b.active)return;
  const paper=h.closest('[data-board-note]'),wall=h.closest('.board-wall');if(!paper||!wall)return;
  e.preventDefault();h.setPointerCapture?.(e.pointerId);
  b.active={id:h.dataset.boardDrag,paper,pointer:e.pointerId,scale:Number(wall.dataset.boardScale)||1,px:e.clientX,py:e.clientY,startX:parseFloat(paper.style.left),startY:parseFloat(paper.style.top),moved:false};
 });
 doc.addEventListener('pointermove',e=>{const a=b.active;if(!a||a.pointer!==e.pointerId)return;
  const dx=(e.clientX-a.px)/a.scale,dy=(e.clientY-a.py)/a.scale;
  if(!a.moved&&Math.hypot(dx,dy)<5)return;
  a.moved=true;a.x=Math.max(0,Math.min(784,a.startX+dx));a.y=Math.max(0,Math.min(564,a.startY+dy));
  const current=Array.from(doc.querySelectorAll('.board-paper')).find(p=>p.dataset.boardNote===a.id);if(current)a.paper=current;
  a.paper.style.left=a.x+'px';a.paper.style.top=a.y+'px';
 });
 doc.addEventListener('pointerup',e=>finish(e,true));
 doc.addEventListener('pointercancel',e=>finish(e,false));
}
