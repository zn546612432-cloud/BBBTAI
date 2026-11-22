import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

// Keep the press target as well as the click target. A lock-screen redraw can
// otherwise hide the reason a GHOST check ended up in a different App.
export async function tracePhoneInteractions(page,key){
 await page.addInitScript(key=>{
  const events=[];window.__phoneTestInteractions=events;
  for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>{
   const target=event.target.closest?.('[data-action],#xm-boot-next');
   if(!target)return;
   let state;try{state=JSON.parse(localStorage.getItem(key));}catch{}
   events.push({type,at:Date.now(),action:target.dataset.action,id:target.dataset.id,
    key:target.dataset.key,x:event.clientX,y:event.clientY,
    unlocked:state?.unlocked,nav:state?.nav?.current});
   if(events.length>60)events.shift();
  },true);
 },key);
}

export async function capturePhoneFailure(page,key,directory,label){
 const filename=label.replace(/[^a-z0-9_-]/gi,'-');
 try{
  const details=await page.evaluate(key=>{
   let state;try{state=JSON.parse(localStorage.getItem(key));}catch{}
   return {url:location.href,nav:state?.nav?.current,unlocked:state?.unlocked,
    day:state?.day,clock:state?.clock,activeScene:state?.story55?.activeScene,
    interactions:window.__phoneTestInteractions||[],
    buttons:[...document.querySelectorAll('#screen-layer [data-action],#toast')].map(b=>({action:b.dataset.action,id:b.dataset.id,key:b.dataset.key,text:b.textContent.slice(0,70)}))};
  },key);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,filename+'.json'),JSON.stringify(details,null,2));
  await page.screenshot({path:path.join(directory,filename+'.png'),fullPage:true});
  console.error('PHONE FAILURE DIAGNOSTICS',JSON.stringify(details));
 }catch(error){console.error('Phone diagnostic capture failed:',error.message);}
}
