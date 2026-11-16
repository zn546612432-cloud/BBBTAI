const idleSrc='/apps/ghost/deployment/field-idle.mp4',pulseSrc='/apps/ghost/deployment/field-pulse.mp4',poster='/apps/ghost/deployment/field-poster.webp';
// No task clock, synthetic completion, or saved state. The actual receipt
// count triggers a short visual response, and the normal store owns progress.
const lastToken=new Map();
if(typeof customElements!=='undefined'&&!customElements.get('xm-ghost-deploy-motion')){
 class GhostDeployMotion extends HTMLElement{
  static observedAttributes=['token'];
  constructor(){
   super();
   const root=this.attachShadow({mode:'open'});
   root.innerHTML=`<style>:host{display:block;pointer-events:none;position:relative}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;transition:opacity .24s ease}video.pulse{opacity:0}video.idle.is-pulsing{opacity:0}video.pulse.is-pulsing{opacity:1}@media(prefers-reduced-motion:reduce){video{transition:none}}</style><video class="idle" muted playsinline loop preload="metadata" poster="${poster}" src="${idleSrc}"></video><video class="pulse" muted playsinline preload="auto" src="${pulseSrc}"></video>`;
   this.idle=root.querySelector('.idle');this.pulse=root.querySelector('.pulse');
   this.idle.muted=this.pulse.muted=true;
   this.pulse.addEventListener('ended',()=>this.finishPulse());
   this.pulse.addEventListener('error',()=>this.finishPulse());
  }
  connectedCallback(){this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.sync();if(!this.reduced)this.idle.play().catch(()=>{});}
  attributeChangedCallback(){if(this.isConnected)this.sync();}
  disconnectedCallback(){this.idle.pause();this.pulse.pause();this.setPulse(false);}
  setPulse(active){this.idle.classList.toggle('is-pulsing',active);this.pulse.classList.toggle('is-pulsing',active);}
  sync(){
   const id=this.getAttribute('project'),token=Number(this.getAttribute('token'));
   if(!id||!Number.isFinite(token))return;
   const previous=lastToken.get(id);lastToken.set(id,token);
   if(this.reduced||previous===undefined||token<=previous)return;
   this.pulse.currentTime=0;
   this.pulse.play().then(()=>{if(this.isConnected&&!this.pulse.paused){this.setPulse(true);this.idle.pause();}}).catch(()=>this.finishPulse());
  }
  finishPulse(){this.setPulse(false);if(this.isConnected&&!this.reduced)this.idle.play().catch(()=>{});}
 }
 customElements.define('xm-ghost-deploy-motion',GhostDeployMotion);
}
