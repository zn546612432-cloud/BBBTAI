import {ntIcon} from '../../components/icons.js';

export function openSketch(){
 const page=globalThis.document?.querySelector('.nt-editor-page');if(!page||page.querySelector('.nt-sketch-overlay'))return;
 page.insertAdjacentHTML('beforeend',`<div class="nt-sketch-overlay"><section class="nt-sketch-sheet" role="dialog" aria-modal="true" aria-label="手绘画板">
  <header><button type="button" data-action="notes-sketch-cancel">取消</button><strong>速写</strong><button type="button" data-action="notes-sketch-save">完成</button></header>
  <canvas width="360" height="420" aria-label="画布，拖动手指或鼠标绘画"></canvas>
  <div class="nt-sketch-help">${ntIcon('pen',19)} 用手指或鼠标绘画</div>
 </section></div>`);
 const canvas=page.querySelector('.nt-sketch-sheet canvas'),context=canvas.getContext('2d');
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
 context.strokeStyle='#242424';context.lineWidth=3.5;context.lineCap='round';context.lineJoin='round';
 let drawing=false;
 const point=e=>{const box=canvas.getBoundingClientRect();return [(e.clientX-box.left)*canvas.width/box.width,(e.clientY-box.top)*canvas.height/box.height];};
 canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const [x,y]=point(e);context.beginPath();context.moveTo(x,y);context.lineTo(x+.01,y+.01);context.stroke();});
 canvas.addEventListener('pointermove',e=>{if(!drawing)return;const [x,y]=point(e);context.lineTo(x,y);context.stroke();});
 const finish=()=>{drawing=false;};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
}
export function saveSketch(ctx,noteId){
 const canvas=globalThis.document?.querySelector('.nt-sketch-sheet canvas');if(!canvas)return;
 const src=canvas.toDataURL('image/png');
 ctx.store.update(s=>{const note=s.content.notes.find(n=>n.id===noteId);if(!note)return;
  if(!Array.isArray(note.attachments))note.attachments=[];
  note.attachments.push({src,title:'手绘'});note.updatedDay=s.day;note.updatedClock=s.clock;
 });
}
