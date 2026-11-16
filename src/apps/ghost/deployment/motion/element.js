const idleSrc='/apps/ghost/deployment/field-idle.mp4',pulseSrc='/apps/ghost/deployment/field-pulse.mp4',idleWebm='/apps/ghost/deployment/field-idle.webm',pulseWebm='/apps/ghost/deployment/field-pulse.webm',poster='/apps/ghost/deployment/field-poster.webp';
// No task clock, synthetic completion, or saved state. The actual receipt
// count triggers a short visual response, and the normal store owns progress.
const lastToken=new Map();
if(typeof customElements!=='undefined'&&!customElements.get('xm-ghost-deploy-motion')){
 class GhostDeployMotion extends HTMLElement{
  static observedAttributes=['token'];
  constructor(){
   super();
   const root=this.attachShadow({mode:'open'});
   root.innerHTML=`<style>:host{display:block;pointer-events:none;position:relative}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;transition:opacity .24s ease}video.pulse{opacity:0}video.idle.is-pulsing{opacity:0}video.pulse.is-pulsing{opacity:1}@media(prefers-reduced-motion:reduce){video{transition:none}}</style><video class="idle" muted playsinline loop preload="auto" poster="${poster}"><source src="${idleWebm}" type="video/webm"><source src="${idleSrc}" type="video/mp4"></video><video class="pulse" muted playsinline preload="auto"><source src="${pulseWebm}" type="video/webm"><source src="${pulseSrc}" type="video/mp4"></video>`;
   this.idle=root.querySelector('.idle');this.pulse=root.querySelector('.pulse');
   for(const video of [this.idle,this.pulse]){video.muted=true;video.defaultMuted=true;video.playsInline=true;}
   this.idle.loop=true;
   this.recover=()=>{
    if(this.isConnected&&!document.hidden&&this.pulse.classList.contains('is-pulsing')&&this.pulse.paused)this.finishPulse();
    else this.resumeIdle();
   };
   this.idle.addEventListener('ended',()=>this.resumeIdle());
   this.idle.addEventListener('pause',()=>this.resumeIdle());
   this.pulse.addEventListener('ended',()=>this.finishPulse());
   this.pulse.addEventListener('pause',this.recover);
   this.pulse.addEventListener('error',()=>this.finishPulse());
  }
  connectedCallback(){
   this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   this.idle.autoplay=!this.reduced;this.sync();this.resumeIdle();
   document.addEventListener('visibilitychange',this.recover);window.addEventListener('pageshow',this.recover);window.addEventListener('focus',this.recover);
   document.addEventListener('pointerdown',this.recover,{passive:true});
   this.lastTime=null;this.stale=0;
   this.watch=setInterval(()=>{
    if(!this.canResume()){this.lastTime=null;this.stale=0;this.recover();return;}
    const v=this.idle;
    if(v.paused||v.ended){this.resumeIdle();return;}
    // iOS can freeze a media element without a pause event. Recover only
    // after several unchanged samples, never while intentionally pulsing.
    this.stale=v.currentTime===this.lastTime?this.stale+1:0;this.lastTime=v.currentTime;
    if(this.stale>=3&&v.readyState>=2&&!v.seeking&&Number.isFinite(v.duration)&&v.duration>0){this.stale=0;v.currentTime=(v.currentTime+.05)%v.duration;this.resumeIdle();}
   },1000);
  }
  canResume(){return this.isConnected&&!this.reduced&&!document.hidden&&!this.pulse.classList.contains('is-pulsing');}
  resumeIdle(){
   if(!this.canResume())return;
   const v=this.idle;if(v.ended)v.currentTime=0;
   if(v.paused&&!this.playing){this.playing=true;v.play().catch(()=>{}).finally(()=>{this.playing=false;});}
  }
  attributeChangedCallback(){if(this.isConnected)this.sync();}
  disconnectedCallback(){clearInterval(this.watch);document.removeEventListener('visibilitychange',this.recover);window.removeEventListener('pageshow',this.recover);window.removeEventListener('focus',this.recover);document.removeEventListener('pointerdown',this.recover);this.idle.pause();this.pulse.pause();this.setPulse(false);}
  setPulse(active){this.idle.classList.toggle('is-pulsing',active);this.pulse.classList.toggle('is-pulsing',active);}
  sync(){
   const id=this.getAttribute('project'),token=Number(this.getAttribute('token'));
   if(!id||!Number.isFinite(token))return;
   const previous=lastToken.get(id);lastToken.set(id,token);
   if(this.reduced||previous===undefined||token<=previous)return;
   this.pulse.currentTime=0;
   this.pulse.play().then(()=>{if(this.isConnected&&!this.pulse.paused){this.setPulse(true);this.idle.pause();}}).catch(()=>this.finishPulse());
  }
  finishPulse(){this.setPulse(false);this.resumeIdle();}
 }
 customElements.define('xm-ghost-deploy-motion',GhostDeployMotion);
}
