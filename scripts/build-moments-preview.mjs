// A self-contained, offline review of the actual Moments renderer and data.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const read=file=>readFile(file,'utf8');
const sources=['src/services/calendar.js','src/apps/wechat/avatars.js','src/apps/wechat/components/icons.js','src/apps/wechat/features/moments/icons.js','src/apps/wechat/features/moments/data.js','src/apps/wechat/features/moments/index.js'];
const assets={};
for(const folder of ['public/apps/wechat/avatars/originals','public/apps/wechat/media'])for(const file of await readdir(folder)){
 if(!/\.(?:jpe?g|webp|mp4)$/.test(file))continue;
 const type=file.endsWith('.mp4')?'video/mp4':file.endsWith('.webp')?'image/webp':'image/jpeg';
 assets['/'+folder.slice(7)+'/'+file]='data:'+type+';base64,'+(await readFile(folder+'/'+file)).toString('base64');
}
let code="const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst embedded="+JSON.stringify(assets)+';\n';
for(const file of sources){
 let text=(await read(file)).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
 if(file.endsWith('/avatars.js'))text=text.replace(/'(\/apps\/wechat\/avatars\/originals\/[^']+)'/g,(_all,path)=>'embedded['+JSON.stringify(path)+']');
 text=text.replace("const local=filename=>new URL('../../../../../apps/wechat/media/'+filename,import.meta.url).href;","const local=filename=>embedded['/apps/wechat/media/'+filename];");
 code+='\n'+text;
}
code+=`
let state={day:1,clock:'13:00',calendar:calendarAnchor(1),content:{}},current='/moments',stack=[];
try{const saved=JSON.parse(localStorage.getItem('bbbtai-moments-offline-v1'));if(saved?.content)state.content=saved.content;}catch{}
const pane=document.querySelector('#moments'),toast=document.querySelector('#notice');
function render(){const scroll=pane.querySelector('.wx-moments-scroll')?.scrollTop||0;pane.innerHTML=renderMoments(state,current);const scroller=pane.querySelector('.wx-moments-scroll');if(scroller)scroller.scrollTop=scroll;}
const ctx={store:{get:()=>state,update:fn=>{fn(state);try{localStorage.setItem('bbbtai-moments-offline-v1',JSON.stringify({content:state.content}));}catch{}render();}},router:{open:loc=>{stack.push(current);current=loc.route;render();pane.querySelector('.wx-moments-scroll')?.scrollTo(0,0);}},refresh:render,toast:msg=>{toast.textContent=msg;setTimeout(()=>toast.textContent='',2200);},pickImage:handler=>{const file=document.createElement('input');file.type='file';file.accept='image/*';file.onchange=()=>{if(!file.files[0])return;const reader=new FileReader();reader.onload=()=>handler(reader.result);reader.readAsDataURL(file.files[0]);};file.click();}};
document.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target){if(openActions){openActions=null;render();}return;}if(target.dataset.action==='back'){openActions=null;replyTo=null;current=stack.pop()||'/moments';render();}else handleMoment(target.dataset.action,target,ctx);});
document.addEventListener('submit',event=>{if(!event.target.dataset.form)return;event.preventDefault();submitMoment(event.target,ctx);});
document.querySelector('#profile').onchange=event=>{openActions=null;replyTo=null;current=event.target.value?'/moments/profile/'+encodeURIComponent(event.target.value):'/moments';stack=[];render();pane.querySelector('.wx-moments-scroll')?.scrollTo(0,0);};
document.querySelector('#date').onchange=event=>{if(!validDate(event.target.value))return;openActions=null;replyTo=null;state.calendar={anchorDay:1,anchorDate:event.target.value};render();};
document.querySelector('#clock').onchange=event=>{state.clock=event.target.value||'13:00';document.querySelector('#status-time').textContent=state.clock;render();};
render();
`;
const css=await read('src/apps/wechat/features/moments/styles.css');
const notices=(await read('public/licenses/FoundPhone-Studio-MIT.txt'))+'\n'+(await read('public/assets/lucide/LICENSE')); 
const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>BBBTAI · 朋友圈修正版预览</title><style>'+css+`
*{box-sizing:border-box}body{margin:0;background:#e9ebee;color:#191919;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px 8px}button{cursor:pointer} .review-controls{width:min(100%,430px);display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.review-controls select,.review-controls input{font:12px inherit;height:32px;border:1px solid #d6d8db;border-radius:6px;background:#fff;color:#333;padding:4px 7px;min-width:0}.device{width:min(100%,393px);height:min(852px,calc(100dvh - 74px));min-height:470px;overflow:hidden;border-radius:36px;background:#fff;box-shadow:0 10px 40px #0001;position:relative;display:flex;flex-direction:column}.status{height:54px;flex:0 0 54px;display:flex;align-items:center;justify-content:space-between;padding:0 23px;font-size:13px;font-weight:600}.island{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:114px;height:30px;background:#050608;border-radius:30px;box-shadow:0 2px 5px #0002}.signals{font-size:11px;letter-spacing:.5px}.battery{background:#111;color:#fff;border-radius:4px;padding:1px 4px;letter-spacing:0}#moments{flex:1;min-height:0}.homebar{height:5px;position:absolute;bottom:9px;left:50%;transform:translateX(-50%);width:134px;background:#191919;border-radius:10px;pointer-events:none}.wx-moments-scroll{padding-bottom:30px}#notice{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);background:#333;color:#fff;border-radius:8px;font-size:13px}#notice:not(:empty){padding:10px 15px}@media(max-width:450px){body{padding:0;gap:0}.review-controls{height:46px;flex-shrink:0}.device{width:100%;height:calc(100dvh - 46px);max-height:none;border-radius:0;box-shadow:none}.wx-moments-cover{height:215px}}
</style></head><body><div class="review-controls"><select id="profile" aria-label="查看谁的朋友圈"><option value="">朋友圈</option>`+['熙蒙','熙旺','胡枫','小辛','阿威','仔仔','傅隆生'].map(name=>'<option>'+name+'</option>').join('')+`</select><input id="date" type="date" aria-label="预览日期" value="2025-05-19"><input id="clock" type="time" aria-label="预览时间" value="13:00"></div><main class="device"><div class="status"><span id="status-time">13:00</span><div class="island"></div><span class="signals">▴▴▴ 5G　<span class="battery">82</span></span></div><div id="moments"></div><div class="homebar"></div></main><div id="notice" role="status"></div><script>`+code.replace(/<\/script/gi,'<\\/script')+'</script><!-- '+notices.replace(/--/g,'—')+' --></body></html>';
await mkdir('qa',{recursive:true});
await writeFile('qa/BBBTAI-moments-offline.html',html);
await mkdir('dist',{recursive:true});await writeFile('dist/moments-preview.html',html);
console.log('Offline Moments review: qa/BBBTAI-moments-offline.html ('+Math.round(Buffer.byteLength(html)/1024)+' KB)');
