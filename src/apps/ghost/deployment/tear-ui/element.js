import {createTearScene} from './scene.js';
// Shadow ownership survives the phone's normal patchHTML refreshes without any
// shell exception, additional business timer or duplicated executor state.
if(typeof customElements!=='undefined'&&!customElements.get('xm-tear-orbit')){
 class TearOrbit extends HTMLElement{
  static observedAttributes=['status','progress'];
  constructor(){
   super();const root=this.attachShadow({mode:'open'});
   root.innerHTML='<style>:host{display:block;position:absolute;inset:0;pointer-events:none;background:#060608}canvas{display:block;width:100%;height:100%}</style><canvas aria-hidden="true"></canvas>';
   this.scene=createTearScene(root.querySelector('canvas'),{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
   this.resize=()=>{const r=this.getBoundingClientRect();this.scene.resize(r.width,r.height);};
  }
  connectedCallback(){
   this.resize();this.scene.update(this.model());this.scene.start();
   this.observer=new ResizeObserver(this.resize);this.observer.observe(this);
  }
  attributeChangedCallback(){this.scene?.update(this.model());}
  disconnectedCallback(){this.observer?.disconnect();this.scene.stop();}
  model(){return {status:this.getAttribute('status')||'running',progress:Number(this.getAttribute('progress'))||0};}
 }
 customElements.define('xm-tear-orbit',TearOrbit);
}
