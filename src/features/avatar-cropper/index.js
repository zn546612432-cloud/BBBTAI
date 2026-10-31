// Editable crop workspace for author-provided photos. Square for portraits,
// wide for moments covers. No remote uploads or generated replacement imagery.
export function cropGeometry({imageWidth,imageHeight,canvasWidth,canvasHeight,zoom=1,offsetX=0,offsetY=0}){
 const scale=Math.max(canvasWidth/imageWidth,canvasHeight/imageHeight)*Math.max(1,zoom);
 const w=imageWidth*scale,h=imageHeight*scale;
 const maxX=Math.max(0,(w-canvasWidth)/2),maxY=Math.max(0,(h-canvasHeight)/2);
 const x=Math.max(-maxX,Math.min(maxX,offsetX)),y=Math.max(-maxY,Math.min(maxY,offsetY));
 return {x:(canvasWidth-w)/2+x,y:(canvasHeight-h)/2+y,width:w,height:h,offsetX:x,offsetY:y};
}
export function openAvatarCropper({bitmap,aspect=1,size=512,quality=.86,onSave,onCancel,host=document.querySelector('#phone')||document.body}){
 if(!bitmap?.width||!bitmap?.height)throw Error('图片无法读取');
 const ratio=aspect>0?aspect:1;
 const width=size,height=Math.max(1,Math.round(size/ratio));
 const overlay=document.createElement('div');
 overlay.className='asset-cropper-overlay';
 overlay.innerHTML='<section class="asset-cropper" role="dialog" aria-modal="true" aria-label="裁剪图片">'+
  '<header><button type="button" data-crop-action="cancel" aria-label="取消">取消</button><strong>移动和缩放图片</strong><button type="button" data-crop-action="save">保存</button></header>'+
  '<div class="asset-cropper-frame"><canvas width="'+width+'" height="'+height+'" aria-label="拖动以调整图片位置"></canvas></div>'+
  '<label>缩放<input type="range" min="1" max="3" step="0.01" value="1" aria-label="缩放照片"></label>'+
  '<small>仅在本机裁剪。原图不会上传到服务器。</small></section>';
 host.appendChild(overlay);
 const canvas=overlay.querySelector('canvas'),range=overlay.querySelector('input');
 const context=canvas.getContext('2d',{alpha:false});
 let zoom=1,dx=0,dy=0,gesture=null,closed=false;
 const repaint=()=>{
  const rect=cropGeometry({imageWidth:bitmap.width,imageHeight:bitmap.height,canvasWidth:width,canvasHeight:height,zoom,offsetX:dx,offsetY:dy});
  dx=rect.offsetX;dy=rect.offsetY;
  context.clearRect(0,0,width,height);
  context.drawImage(bitmap,rect.x,rect.y,rect.width,rect.height);
 };
 const close=()=>{
  if(closed)return;
  closed=true;gesture=null;overlay.remove();bitmap.close?.();
 };
 repaint();
 range.addEventListener('input',()=>{
  zoom=Number(range.value);repaint();
 });
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dx,dy};
  try{canvas.setPointerCapture(e.pointerId);}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  dx=gesture.dx+(e.clientX-gesture.x)*width/Math.max(1,rect.width);
  dy=gesture.dy+(e.clientY-gesture.y)*height/Math.max(1,rect.height);
  repaint();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  canvas.addEventListener(event,()=>{gesture=null;});
 overlay.addEventListener('click',e=>{
  const action=e.target.closest('[data-crop-action]')?.dataset.cropAction;
  if(action==='cancel'){close();onCancel?.();return;}
  if(action==='save'){
   try{
    const data=canvas.toDataURL('image/jpeg',quality);
    close();onSave?.(data);
   }catch(error){close();onCancel?.(error);}
  }
 });
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){close();onCancel?.();}});
 overlay.querySelector('[data-crop-action="cancel"]').focus({preventScroll:true});
 return {cancel:close};
}
