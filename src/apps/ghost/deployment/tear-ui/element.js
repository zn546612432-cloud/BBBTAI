import './stage.js';
import {createTearScene} from './scene.js';
// Shadow ownership survives the phone's normal patchHTML refreshes without any
// shell exception, additional business timer or duplicated executor state.
if(typeof customElements!=='undefined'&&!customElements.get('xm-tear-orbit')){
 class TearOrbit extends HTMLElement{
  static observedAttributes=['status','progress','layout','attention'];
  constructor(){
   super();const root=this.attachShadow({mode:'open'});
   root.innerHTML='<style>:host{display:block;position:absolute;inset:0;pointer-events:none;background:#060608}:host([layout=agent]){background:transparent}canvas{display:block;width:100%;height:100%}</style><canvas aria-hidden="true"></canvas>';
   this.scene=createTearScene(root.querySelector('canvas'),{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
   this.resize=()=>this.scene.resize(this.clientWidth,this.clientHeight);
  }
  connectedCallback(){
   this.resize();this.attributeChangedCallback();this.scene.start();
   this.observer=new ResizeObserver(this.resize);this.observer.observe(this);
  }
  attributeChangedCallback(){this.scene?.update(this.model());this.scene?.attention?.(this.getAttribute('attention')==='1');}
  disconnectedCallback(){this.observer?.disconnect();this.scene.stop();}
  model(){return {status:this.getAttribute('status')||'running',progress:Number(this.getAttribute('progress'))||0,layout:this.getAttribute('layout')};}
 }
 customElements.define('xm-tear-orbit',TearOrbit);
}
