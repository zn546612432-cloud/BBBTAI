// Real-browser regression for the exact symptom "地图是整张空白".
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 try{
  let target=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(target.endsWith('/'))target+='index.html';
  const file=path.resolve(root,'.'+target);
  if(!file.startsWith(root+path.sep)&&file!==root)throw Error('bad path');
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public,max-age=31536000'}).end(body);
 }catch(e){res.writeHead(404).end('not found '+e.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
await mkdir('preview/browser-smoke',{recursive:true});
try{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   // The lock must be completely covered until preload has reported completion.
   await page.locator('#xm-boot').waitFor({state:'attached',timeout:10000});
   await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
   await page.locator('.lock-screen').waitFor({timeout:10000});
   await page.locator('.unlock-hint').click();
   await page.locator('.passcode-grid').waitFor({timeout:8000});
   for(const digit of '0816')await page.locator(`[data-action="passcode-key"][data-key="${digit}"]`).click();
   await page.locator('.home-screen').waitFor({timeout:10000});
   await page.locator('[data-action="open-app"][data-app="maps"]').click();
   await page.locator('xm-leaflet-map .xm-map-search').waitFor({timeout:12000});
   try{
    await page.waitForFunction(()=>{
     const img=document.querySelector('xm-leaflet-map img.leaflet-image-layer');
     return !!img&&img.complete&&img.naturalWidth>0;
    },null,{timeout:15000});
   }catch(error){
    const diag=await page.evaluate(()=>{
     const node=document.querySelector('xm-leaflet-map');
     const image=node?.querySelector('img.leaflet-image-layer');
     return {url:location.href,markup:node?.outerHTML.slice(0,1500),img:image?{src:image.src,complete:image.complete,naturalWidth:image.naturalWidth}:null,leaflet:typeof window.L,boot:!!document.querySelector('#xm-boot'),resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('macau-offline')||x.name.includes('leaflet')).map(x=>({name:x.name,size:x.transferSize})).slice(-12)};
    });
    console.error(name+' MAP IMAGE LOAD DIAGNOSTIC '+JSON.stringify({diag,errors}));
    await page.screenshot({path:`preview/browser-smoke/${name}-failed.png`});
    throw error;
   }
   const metrics=await page.evaluate(()=>{
    const img=document.querySelector('xm-leaflet-map img.leaflet-image-layer');
    const map=document.querySelector('xm-leaflet-map');
    const rect=map.getBoundingClientRect();
    const imageRect=img.getBoundingClientRect();return {imageNaturalWidth:img.naturalWidth,imageNaturalHeight:img.naturalHeight,mapWidth:rect.width,mapHeight:rect.height,hasSearch:!!map.querySelector('.xm-map-search'),imageTopOffset:imageRect.top-rect.top,imageBottomOffset:imageRect.bottom-rect.bottom};
   });
   if(metrics.mapWidth<150||metrics.mapHeight<200||metrics.imageNaturalWidth<1000||!metrics.hasSearch||metrics.imageTopOffset>55||metrics.imageBottomOffset< -55)throw Error('Map raster failed to fill the screen: '+JSON.stringify(metrics));

   // Exercise native Leaflet TouchEvents, not just zoom buttons. Events start
   // on the actual map canvas and bubble through the whole iPhone shell.
   const touchStats=await page.evaluate(async()=>{
    const host=document.querySelector('xm-leaflet-map');
    const map=host?.map, canvas=host?.querySelector('.xm-map-tiles.leaflet-container');
    if(!map||!canvas||typeof Touch!=='function'||typeof TouchEvent!=='function')
      throw Error('Mobile touch APIs or Leaflet are unavailable');
    if(!map.dragging.enabled()||!map.touchZoom.enabled())
      throw Error('Map dragging or pinch zoom handler is disabled');
    const bounds=canvas.getBoundingClientRect(),cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
    const touch=(id,x,y)=>new Touch({identifier:id,target:canvas,clientX:x,clientY:y,screenX:x,screenY:y,pageX:x,pageY:y});
    const fire=(type,points)=>{
     const list=points.map(p=>touch(...p));
     return canvas.dispatchEvent(new TouchEvent(type,{
      bubbles:true,cancelable:true,composed:true,
      touches:type==='touchend'?[]:list,
      targetTouches:type==='touchend'?[]:list,
      changedTouches:list
     }));
    };
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    map.options.inertia=false;
    const start=map.getCenter();
    fire('touchstart',[[1,cx,cy]]);
    for(let step=1;step<=9;step++){
     fire('touchmove',[[1,cx+step*12,cy+step*4]]);
     await sleep(24);
    }
    fire('touchend',[[1,cx+108,cy+36]]);
    await sleep(250);
    const panned=map.getCenter();
    const panDelta=Math.abs(panned.lat-start.lat)+Math.abs(panned.lng-start.lng);
    const beforeZoom=map.getZoom();
    fire('touchstart',[[2,cx-30,cy],[3,cx+30,cy]]);
    for(let step=1;step<=9;step++){
     const spread=30+step*8;
     fire('touchmove',[[2,cx-spread,cy],[3,cx+spread,cy]]);
     await sleep(28);
    }
    fire('touchend',[[2,cx-102,cy],[3,cx+102,cy]]);
    await sleep(440);
    const afterZoom=map.getZoom();
    return {panDelta,beforeZoom,afterZoom,dragging:map.dragging.enabled(),touchZoom:map.touchZoom.enabled(),hasMap:!!document.querySelector('xm-leaflet-map .leaflet-container')};
   });
   console.log(name+' mobile pan and pinch',JSON.stringify(touchStats));
   if(touchStats.panDelta<0.00001||touchStats.afterZoom-touchStats.beforeZoom<0.45)
    throw Error(name+' mobile gestures did not move and zoom map: '+JSON.stringify(touchStats));
   await page.screenshot({path:`preview/browser-smoke/${name}-macau.png`});
   try{
    await page.locator('.xm-map-form input').fill('昌宁',{timeout:7000});
   }catch(error){
    const diag=await page.evaluate(()=>({title:document.title,url:location.href,app:document.querySelector('.app-view')?.className,screen:document.querySelector('#screen-layer')?.innerHTML.slice(0,1200),count:document.querySelectorAll('xm-leaflet-map').length,leaflet:typeof window.L}));
    console.error(name+' LOST MAP SEARCH '+JSON.stringify({diag,errors}));
    await page.screenshot({path:`preview/browser-smoke/${name}-lost-map.png`});
    throw error;
   }
   const found=page.locator('.xm-map-results button');
   await found.first().waitFor({timeout:5000});
   // On iPhone/WebKit the software keyboard shifts the visual viewport while
   // tapping dropdowns. Verify the native keyboard Search action separately.
   if(name==='webkit')await page.locator('.xm-map-form input').press('Enter');
   else await found.first().click();
   await page.waitForFunction(()=>document.querySelector('.xm-map-bottom b')?.textContent.includes('昌宁'),null,{timeout:6000});
   await page.locator('.app-nav [data-action="home"]').click();
   await page.locator('.home-screen').waitFor();
   await context.setOffline(true);
   await page.locator('[data-action="open-app"][data-app="maps"]').click();
   await page.waitForFunction(()=>{
    const img=document.querySelector('xm-leaflet-map img.leaflet-image-layer');
    return !!img&&img.complete&&img.naturalWidth>0;
   },null,{timeout:15000});
   if(errors.length)throw Error('Browser pageerrors: '+errors.join(' | '));
   console.log(name+' mobile OFFLINE map smoke OK',JSON.stringify(metrics));
   await context.close();
  }finally{await browser.close();}
 }
}finally{
 server.close();
}
