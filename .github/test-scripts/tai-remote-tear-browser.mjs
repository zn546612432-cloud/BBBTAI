import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {startDeploymentStep,completeDeploymentRun} from '../../src/services/story55/projects.js';
import {seedD04Contracts,acceptD04Contract} from '../../src/story/d04/contract.js';
const key='ximeng-phone-story55-v1';
const url=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.TAI_REMOTE_CHROMIUM_PATH?{executablePath:process.env.TAI_REMOTE_CHROMIUM_PATH}:{})});
const fixture=()=>{
 const s=activateStory55(initialState());s.day=15;s.clock='11:00';s.batteryPercent=90;
 s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.story55.d13={phase:'chat'};
 for(const n of s.story55.config.nodes)if(n.day<=15&&n.id!=='base')s.story55.completed[n.id]={day:n.day,clock:'12:00',test:true};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 s.bankData.balance=1000000;s.unlocked=false;
 s.nav={current:{appId:'ghost',route:'/deployment',params:{project:'base'}},stack:[]};
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 return s;
};
const win=(s,n)=>{for(let i=0;i<n;i++){const id=startDeploymentStep(s,'base'),o=s.ghost.orders[id];o.status='success';completeDeploymentRun(s,o);}};
async function open(s){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
 await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,state);},{key,state:JSON.stringify(s)});
 const page=await context.newPage();page.on('pageerror',e=>console.error('PAGE',e));page.on('console',m=>{if(m.type()==='warning')console.log(m.text());});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('is-locked'));
 return {context,page};
}
try{
 const s=fixture();s.day=14;win(s,5);s.day=15;win(s,3);
 const {context,page}=await open(s);
 await page.locator('[data-action="gh-share"]').click();await page.locator('[data-action="gh-share-yes"]').click();
 for(const line of ['你寫的程序，你自己來。','售後服務。']){
  await page.waitForFunction(text=>{const i=document.querySelector('.mc-composer input[name="text"]');return i?.value===text&&!i.disabled;},line);
  await page.locator('.mc-composer button[type="submit"]').click();
 }
 await page.getByText('好了。下不為例。',{exact:true}).waitFor({timeout:180000});
 const done=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal(done.story55.projects.base.batches[1].steps.filter(Boolean).length,5);
 assert.equal(done.story55.projects.base.batches[1].complete,false);
 assert.equal(done.story55.ghostShareTakeovers||0,0);
 assert.equal(done.ghost.history.filter(h=>h.orderId.startsWith('s55:base:1:')&&h.success).length,2);
 assert.equal(done.story55.ghostShare.remote.active,false);
 console.log('PASS native phone: offline Tear, two remaining live LINK boards, no auto payment, approved closing line');
 await context.close();
 const t=fixture();t.day=25;t.story55.completed.base={day:24,clock:'21:00'};
 for(const n of t.story55.config.nodes)if(n.day<=25&&n.id!=='base')t.story55.completed[n.id]={day:n.day,clock:'12:00',test:true};
 t.story55.projects.base.batches=Array.from({length:11},(_,i)=>({complete:true,steps:Array.from({length:5},()=>({day:i+14})),testedDay:i+14,day:i+14}));
 seedD04Contracts(t);assert.ok(acceptD04Contract(t,'M-024'));
 t.nav={current:{appId:'mirage',route:'/order/M-024',params:{}},stack:[]};
 const auto=await open(t);
 // MIRAGE is authenticated by its standard login form if needed.
 const login=auto.page.locator('form[data-form="mc-login"]');
 const bounties=auto.page.locator('[data-action="mc-tab"][data-route="/bounties"]');
 await login.or(bounties).first().waitFor({state:'visible'});
 if(await login.isVisible())await login.locator('button[type="submit"]').click();
 await bounties.click();
 await auto.page.locator('[data-action="mc-my-orders"]').click();
 await auto.page.locator('[data-action="mc-open-bounty"][data-id="M-024"]').click();
 await auto.page.locator('[data-action="mc-tear-share"]').click();
 await auto.page.locator('xm-tear-orbit').waitFor({state:'visible'});
 await auto.page.locator('.gh-tear-screen[data-tear-status="complete"]').waitFor({timeout:30000});
 await auto.page.getByText('執行完成 · 待提交',{exact:true}).waitFor({timeout:30000});
 await auto.page.locator('.gh-tear-return').click();
 await auto.page.locator('[data-action="mc-d04-submit"]').click();
 const settled=await auto.page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal(settled.content.orders.find(o=>o.id==='M-024').status,'COMPLETED');
 console.log('PASS native phone: D25 Ouroboros canvas, return to MIRAGE, manual submission');
 await auto.context.close();
}finally{await browser.close();}
