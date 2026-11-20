import {dateLabel} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {esc} from '../../../../system/ui.js';
import {rebaseBundledPublicAsset} from '../../../../services/public-assets.js';

let context;
const glyph=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const flip=glyph('<path d="M3 13a9 9 0 0 1 15-7l3 3m0-5v5h-5M21 11a9 9 0 0 1-15 7l-3-3m0 5v-5h5"/>');
const photo=glyph('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m3 16 6-5 4 4 3-3 5 5"/>');
const close=glyph('<path d="m15 5-7 7 7 7"/>');
export function cameraView(ctx){
 context=ctx;
 const src=ctx.store.get().content.photos?.[0]?.src;
 return `<xm-native-camera data-key="native-camera" latest="${esc(rebaseBundledPublicAsset(src||''))}"></xm-native-camera>`;
}
// Shadow DOM keeps the stream and its controls independent of clock redraws.
if(typeof customElements!=='undefined'&&!customElements.get('xm-native-camera')){
 class NativeCamera extends HTMLElement{
  static observedAttributes=['latest'];
  constructor(){
   super();this.facing='environment';this.zoom=1;this.request=0;
   const root=this.attachShadow({mode:'open'});
   root.innerHTML=`<style>
    :host{display:flex;flex-direction:column;height:100%;min-height:0;background:#000;color:white;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;box-sizing:border-box;overflow:hidden}*{box-sizing:border-box}button{border:0;background:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:focus-visible{outline:2px solid #ffd60a;outline-offset:3px}button:disabled{opacity:.45}svg{width:24px;height:24px}header{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex:none}header button{border-radius:50%;width:38px;height:38px;display:grid;place-items:center;background:#242424}.top-mode{font-size:12px;color:#a8a8a8;letter-spacing:.08em}.preview{position:relative;overflow:hidden;flex:1;min-height:0;background:#111;display:grid;place-items:center}.preview video{height:100%;width:100%;object-fit:cover;position:absolute;inset:0;transform-origin:center;opacity:0}.preview.live video{opacity:1}.permission{z-index:1;max-width:78%;padding:18px;text-align:center}.permission p{color:#b9b9b9;font-size:13px;line-height:1.6;margin:0 0 12px}.permission button{border-radius:22px;background:#fff;color:#121212;font-weight:600;padding:10px 20px}.preview.live .permission{display:none}.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:3}.flash.on{animation:blink .22s ease-out}@keyframes blink{0%{opacity:.85}100%{opacity:0}}.zoom{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px;background:#121212b5;border-radius:24px;padding:4px;z-index:2}.zoom button{border-radius:50%;width:36px;height:36px;font-size:12px;font-weight:650}.zoom button[aria-pressed=true]{background:#444;color:#ffd60a}.mode{color:#ffd60a;font-size:13px;font-weight:600;letter-spacing:.04em;text-align:center;padding:17px 0 10px}.controls{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;justify-items:center;padding:5px 19px 28px;flex:none}.round{background:#252525;border-radius:50%;width:46px;height:46px;display:grid;place-items:center;overflow:hidden}.thumb{border-radius:9px;background:#242424;padding:0}.thumb img{width:100%;height:100%;object-fit:cover}.shutter{width:72px;height:72px;background:none;border:3px solid white;border-radius:50%;display:grid;place-items:center;padding:4px}.shutter span{display:block;width:100%;height:100%;background:#fff;border-radius:50%}.shutter:active span{background:#c6c6c6}@media(max-height:550px){.controls{padding-bottom:17px}.mode{padding:8px 0}.shutter{width:58px;height:58px}}
   </style><header><button id="back" aria-label="返回">${close}</button><span class="top-mode">4:3</span><span style="width:38px"></span></header><section class="preview"><video muted autoplay playsinline></video><div class="permission"><p>開啟相機以拍攝照片</p><button id="enable">啟用相機</button></div><div class="zoom"><button data-zoom="1" aria-pressed="true">1×</button><button data-zoom="2" aria-pressed="false">2×</button></div><div class="flash"></div></section><div class="mode">照片</div><div class="controls"><button class="round thumb" id="gallery" aria-label="相片">${photo}</button><button class="shutter" id="capture" disabled aria-label="拍照"><span></span></button><button class="round" id="flip" aria-label="切換前後鏡頭">${flip}</button></div>`;
   this.video=root.querySelector('video');this.preview=root.querySelector('.preview');this.message=root.querySelector('.permission p');this.captureButton=root.querySelector('#capture');
   root.querySelector('#enable').onclick=()=>this.start();
   root.querySelector('#back').onclick=()=>context?.router.back();
   root.querySelector('#gallery').onclick=()=>context?.router.open({appId:'photos',route:'/',params:{}});
   root.querySelector('#flip').onclick=()=>{this.facing=this.facing==='environment'?'user':'environment';this.start();};
   this.captureButton.onclick=()=>this.capture();
   for(const b of root.querySelectorAll('[data-zoom]'))b.onclick=()=>{this.zoom=Number(b.dataset.zoom);this.updateZoom();};
   this.onVisibility=()=>{if(document.hidden)this.stop();};
  }
  connectedCallback(){this.updateThumbnail();document.addEventListener('visibilitychange',this.onVisibility);}
  disconnectedCallback(){document.removeEventListener('visibilitychange',this.onVisibility);this.stop();}
  attributeChangedCallback(){this.updateThumbnail();}
  updateThumbnail(){const thumb=this.shadowRoot?.querySelector('#gallery');if(!thumb)return;const src=this.getAttribute('latest');thumb.innerHTML=src?`<img src="${esc(src)}" alt="">`:photo;}
  updateZoom(){this.video.style.transform=`scale(${this.zoom})${this.facing==='user'?' scaleX(-1)':''}`;for(const b of this.shadowRoot.querySelectorAll('[data-zoom]'))b.setAttribute('aria-pressed',String(Number(b.dataset.zoom)===this.zoom));}
  stop(){this.request++;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.preview.classList.remove('live');this.captureButton.disabled=true;this.message.textContent='開啟相機以拍攝照片';}
  async start(){
   this.stop();const request=this.request;this.message.textContent='正在啟用相機…';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('此瀏覽器不支援相機');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:this.facing},width:{ideal:1280},height:{ideal:960}}});
    if(!this.isConnected||request!==this.request||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}
    this.stream=stream;this.video.srcObject=stream;await this.video.play();
    if(request!==this.request||!this.isConnected)return;
    this.updateZoom();this.preview.classList.add('live');this.captureButton.disabled=false;
   }catch(error){if(request!==this.request)return;this.stop();this.message.textContent=error.name==='NotAllowedError'?'請在瀏覽器設定允許相機權限':error.name==='NotFoundError'?'找不到可用的攝像頭':'無法開啟相機，請重試';}
  }
  capture(){
   const v=this.video;if(!this.stream||!v.videoWidth||!v.videoHeight)return;
   const ratio=this.preview.clientWidth/Math.max(1,this.preview.clientHeight),w=v.videoWidth,h=v.videoHeight;
   const cropW=Math.min(w,h*ratio)/this.zoom,cropH=Math.min(h,w/ratio)/this.zoom;
   const canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(cropW,cropH));canvas.width=Math.max(1,Math.round(cropW*scale));canvas.height=Math.max(1,Math.round(cropH*scale));
   const g=canvas.getContext('2d');if(this.facing==='user'){g.translate(canvas.width,0);g.scale(-1,1);}g.drawImage(v,(w-cropW)/2,(h-cropH)/2,cropW,cropH,0,0,canvas.width,canvas.height);
   try{const src=canvas.toDataURL('image/jpeg',.75);context.store.update(s=>s.content.photos.unshift({id:uid(),title:'照片 · '+dateLabel(s),src,actual:true,favorite:false}));const flash=this.shadowRoot.querySelector('.flash');flash.classList.remove('on');void flash.offsetWidth;flash.classList.add('on');}
   catch{context?.toast?.('本機空間不足，無法儲存照片');}
  }
 }
 customElements.define('xm-native-camera',NativeCamera);
}
