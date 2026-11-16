// The slot moves on the compositor; the canvas backing size never follows the
// conversation layout. Keep this visual-only controller outside phone/task time.
if(typeof customElements!=='undefined'&&!customElements.get('xm-tear-stage')){
 class TearStage extends HTMLElement{
  static observedAttributes=['expanded'];
  constructor(){
   super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;position:absolute;left:50%;top:50%;width:100cqw;aspect-ratio:1;transform:translate(-50%,-50%)}[part=visual]{position:absolute;inset:0;transform-origin:center;will-change:transform;backface-visibility:hidden}</style><div part="visual"><slot></slot></div>';
   this.visual=this.shadowRoot.querySelector('[part=visual]');
   this.follow=e=>{if(this.reduced)return;const r=this.visual.getBoundingClientRect();if(r.width&&r.height)this.querySelector('xm-tear-orbit')?.scene?.pointer?.((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1);};
   this.resetPointer=()=>this.querySelector('xm-tear-orbit')?.scene?.pointer?.(0,0);
  }
  connectedCallback(){
   this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   this.observer=new ResizeObserver(()=>this.schedule());
   this.observer.observe(this.parentElement);this.observer.observe(this);this.schedule();
   this.addEventListener('pointermove',this.follow,{passive:true});this.addEventListener('pointerleave',this.resetPointer);
  }
  attributeChangedCallback(){this.schedule();}
  schedule(){if(!this.isConnected||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.position();});}
  position(){
   const host=this.getBoundingClientRect(),slot=this.parentElement.getBoundingClientRect();
   if(!host.width||!slot.height)return;
   const target={x:host.left+host.width/2,y:host.top+host.height/2,width:host.width,scale:Math.max(.15,Math.min(1,slot.height/host.width))};
   const prior=this.target;
   if(prior&&['x','y','width','scale'].every(k=>Math.abs(target[k]-prior[k])<.001))return;
   // Read the in-flight pose against its PREVIOUS layout, so a new message can
   // reverse an unfinished zoom without jumping to either endpoint.
   const matrix=new DOMMatrixReadOnly(getComputedStyle(this.visual).transform);
   const from=prior?{x:prior.x+matrix.e,y:prior.y+matrix.f,scale:matrix.a*prior.width/target.width}:target;
   this.animation?.cancel();this.target=target;
   this.visual.style.transform=`translate3d(0,0,0) scale(${target.scale})`;
   this.visual.style.setProperty('--tear-task-hit-size',`${44/Math.min(from.scale,target.scale)}px`);
   if(!prior||this.reduced)return;
   const animation=this.visual.animate([
    {transform:`translate3d(${from.x-target.x}px,${from.y-target.y}px,0) scale(${from.scale})`},
    {transform:`translate3d(0,0,0) scale(${target.scale})`}
   ],{duration:720,easing:'cubic-bezier(.22,1,.36,1)'});
   this.animation=animation;
   animation.onfinish=()=>{if(this.animation!==animation)return;this.animation=null;this.visual.style.setProperty('--tear-task-hit-size',`${44/target.scale}px`);};
  }
  disconnectedCallback(){this.removeEventListener('pointermove',this.follow);this.removeEventListener('pointerleave',this.resetPointer);this.observer?.disconnect();cancelAnimationFrame(this.frame);this.frame=0;this.animation?.cancel();this.animation=null;this.target=null;}
 }
 customElements.define('xm-tear-stage',TearStage);
}
