// The target scene is never pre-completed: every player line uses native Send.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const url=process.env.SMOKE_URL||'http://127.0.0.1:5173/BBBTAI/',root='qa-results/chat-v2';await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({...devices['iPhone 13'],recordVideo:{dir:root+'/video',size:{width:390,height:844}}});
const origin=new URL(url).origin,external=[];
await context.route('**/*',route=>{
 const r=route.request(),address=r.url();
 if(address.startsWith(origin+'/')||/^(data:|blob:)/.test(address)||r.method()==='GET'&&address.startsWith('https://zmnufhswpnreeseyamlv.supabase.co/storage/v1/object/public/ximeng-assets/'))return route.continue();
 external.push(address.split('?')[0]);return route.abort('blockedbyclient');
});
const page=await context.newPage(),errors=[],exports=[];page.on('pageerror',e=>errors.push(e.message));
const screen=page.locator('#screen-layer'),action=a=>screen.locator(`[data-action="${a}"]`).last();
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
let release,serial=0;
async function unlock(){await screen.locator('.lock-screen').waitFor({timeout:90000});await action('unlock').click();await action('passcode-key').first().waitFor();for(const key of '0816')await screen.locator(`[data-action="passcode-key"][data-key="${key}"]`).click();}
async function load(s){
 await page.goto('about:blank');const token='chat-v2-'+(++serial);
 await page.addInitScript(({s,origin,token})=>{if(location.origin===origin&&!sessionStorage.getItem(token)){localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(s));sessionStorage.setItem(token,'1');}},{s,origin,token});
 await page.goto(url,{waitUntil:'domcontentloaded'});await unlock();
}
async function prepare(day,clock,appId,path,params={}){
 const s=await page.evaluate(async({release,day,clock,appId,path,params})=>{
  const {initialState}=await import(release.url+'src/services/storage.js');const {rebuildStory55AtDay}=await import(release.url+'src/services/story55/rebuild.js');
  const s=initialState();rebuildStory55AtDay(s,day,clock);s.unlocked=false;s.story55.minutesPerSecond=0;s.story55.activeScene=null;
  Object.assign(s,{batteryPercent:95,poweredOff:false,emergencyCharge:false});s.nav={current:{appId,route:path,params},stack:[]};return s;
 },{release,day,clock,appId,path,params});await load(s);
}
async function capture(id){await page.waitForFunction(()=>!document.querySelector('#transition-layer')?.childElementCount);await page.screenshot({path:root+'/'+id+'.png'});}
async function nativeDraft(text,channel='wechat'){
 const cls=channel==='wechat'?'.wx-composer':'.mc-composer';await page.waitForFunction(({cls,text})=>document.querySelector('#screen-layer '+cls+' input')?.value===text,{cls,text},{timeout:30000});
 // The actual transcript must still lack this next player bubble until click.
 await screen.locator(cls+' button[type="submit"]').click();
}
async function trackStatus(prefix,id,chat){return page.evaluate(async({release,prefix,id,chat})=>{
 const {AUTHORED_CHAT_TRACKS}=await import(release.url+'src/services/messaging/lifecycle/registry.js');const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));
 const track=AUTHORED_CHAT_TRACKS.find(x=>x.track.name===prefix).track,q=track.ensure(s)[id];const d=track.defs.find(d=>d.id===id);return {q,draft:track.draft(s,chat),lines:typeof d.lines==='function'?d.lines(s):d.lines};
 },{release,prefix,id,chat});}
async function finishTrack(prefix,id,chat,shot){
 console.log('BEGIN_TRACK',prefix+':'+id);
 for(let i=0;i<120;i++){
  const status=await trackStatus(prefix,id,chat);if(status.q.completed)break;
  if(status.draft?.stage.startsWith(prefix+':'+id+':'))await nativeDraft(status.draft.text);
  else await page.waitForFunction(({prefix,id,index,draftText})=>{const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));const map=prefix==='d07-reply'?s.story55.d07Replies:Number(prefix.slice(1))>=14?s.story55.authoredDays?.[prefix]:s.story55[prefix+'Chats'];const q=map?.[id];return q?.completed||(q?.index??0)!==index||!!(draftText&&document.querySelector('#screen-layer .wx-composer input')?.value===draftText);},{prefix,id,index:status.q.index,draftText:status.lines[status.q.index]?.who==='me'?status.lines[status.q.index].text:null},{timeout:30000});
 }
 const status=await trackStatus(prefix,id,chat);assert.ok(status.q.completed,prefix+':'+id);
 const s=await state(),messages=s.content.conversations.wechat.find(c=>c.id===chat).messages.filter(m=>m.lifecycleId===prefix+':'+id);
 assert.deepEqual(messages.map(m=>[m.from,m.text]),status.lines.map(l=>[l.who,l.text]));exports.push({scene:prefix+':'+id,messages});await capture(shot||prefix+'-'+id);console.log('PASS_TRACK',prefix+':'+id,messages.length);
}
async function signIn(){await screen.locator('.mc-login-panel,.mc-composer').first().waitFor({timeout:16000});const form=screen.locator('form[data-form="mc-login"]');if(await form.isVisible())await form.locator('button[type="submit"]').click();await screen.locator('.mc-composer').waitFor();const decrypt=action('mc-decrypt');if(await decrypt.isVisible())await decrypt.click();}
async function finishStory(id,channel,chat){
 for(let i=0;i<130;i++){
  const status=await page.evaluate(async({release,id,channel,chat})=>{const {currentScript55}=await import(release.url+'src/services/story55/scripted-chat.js');const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));return {done:!!s.story55.completed[id],index:s.story55.scenes[id]?.index||0,line:currentScript55(s,channel,chat)};},{release,id,channel,chat});
  if(status.done)break;
  if(status.line?.kind==='me')await nativeDraft(status.line.text,channel);
  else if(status.line?.kind==='disconnect'){await capture('d15-camera');await action('s55-disconnect-session').click();}
  else await page.waitForFunction(({id,index})=>{const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));return s.story55.completed[id]||(s.story55.scenes[id]?.index||0)!==index;},{id,index:status.index},{timeout:30000});
 }
 const s=await state();assert.ok(s.story55.completed[id],id);const node=s.story55.config.nodes.find(n=>n.id===id),messages=s.content.conversations[channel].find(c=>c.id===chat).messages.filter(m=>m.id.startsWith((node.messagePrefix||'s55-'+id)+'-'));exports.push({scene:id,messages});await capture('node-'+id);return s;
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await screen.locator('.lock-screen').waitFor({timeout:90000});release=await page.evaluate(async()=>await(await fetch(new URL('release.json',location.href))).json());
 await prepare(5,'10:35','wechat','/chat/group');await finishTrack('d05','computer','group');
 // Real wish link -> Add -> native Send. No money is spent by adding.
 await prepare(7,'11:12','wechat','/chat/awei');await screen.locator('[data-wish-id="d07-headphones"]').waitFor({timeout:30000});
 let s=await state(),bank=s.bankData.balance;await screen.locator('[data-wish-id="d07-headphones"]').click();await action('wx-wish-confirm').click();
 await finishTrack('d07-reply','headphones-promise','awei');s=await state();assert.equal(s.bankData.balance,bank);assert.equal(s.story55.wishes.records['d07-headphones'].status,'saved');
 // Carry the real wishlist through the original reminder purchase sheet.
 s.unlocked=false;s.nav={current:{appId:'reminders',route:'/all',params:{}},stack:[]};await load(s);
 await screen.locator('[data-action="reminder-wish-open"][data-id="d07-headphones"]').click();await action('reminder-wish-buy').click();
 s=await state();assert.equal(s.story55.wishes.records['d07-headphones'].status,'ordered');assert.equal(s.story55.wishes.records['d07-headphones'].deliveryDay,9);await capture('d07-real-order');
 s.clock='14:10';s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/wang',params:{}},stack:[]};await load(s);
 await screen.locator('[data-wish-id="d07-tableware"]').waitFor({timeout:30000});await screen.locator('[data-wish-id="d07-tableware"]').click();await action('wx-wish-confirm').click();await finishTrack('d07-reply','tableware-promise','wang');
 s=await state();s.unlocked=false;s.nav={current:{appId:'reminders',route:'/all',params:{}},stack:[]};await load(s);await screen.locator('[data-action="reminder-wish-open"][data-id="d07-tableware"]').click();await action('reminder-wish-buy').click();
 s=await state();s.day=8;s.clock='18:00';s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/wang',params:{}},stack:[]};await load(s);assert.equal((await state()).story55.wishes.records['d07-tableware'].status,'ordered');
 s=await state();s.day=9;s.unlocked=false;await load(s);await finishTrack('d07-reply','tableware-received','wang');
 // An earlier real D06 purchase is a fixture; D08 arrival and replies remain live.
 await prepare(8,'18:00','wechat','/chat/xiaoxin');
 s=await page.evaluate(async({release})=>{
  const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));
  const {beginD06Celebration,tickWishes,addWish,purchaseWish}=await import(release.url+'src/services/wishes/index.js');
  s.day=6;s.clock='17:00';beginD06Celebration(s,0);
  for(let i=0;i<100;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,i*3000);}
  addWish(s,'d06-keyboard');purchaseWish(s,'d06-keyboard');s.day=8;s.clock='18:00';s.unlocked=false;return s;
 },{release});await load(s);await finishTrack('d07-reply','keyboard-received','xiaoxin','d08-keyboard-received');
 await prepare(7,'18:00','wechat','/chat/wang');await screen.locator('.wx-composer input:not([disabled])').waitFor();
 await screen.locator('.wx-composer input').fill('哥哥');await screen.locator('.wx-composer button[type="submit"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.brotherEgg?.stage==='waiting',null,{timeout:15000});
 await screen.locator('.wx-composer input').fill('想你啦');await screen.locator('.wx-composer button[type="submit"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.brotherEgg?.stage==='done',null,{timeout:15000});
 s=await state();exports.push({scene:'brother-free-chat',messages:s.content.conversations.wechat.find(c=>c.id==='wang').messages.filter(m=>m.lifecycleId?.startsWith('d07-reply:brother-')||[s.story55.brotherEgg.firstMessageId,s.story55.brotherEgg.secondMessageId].includes(m.id))});await capture('d07-brother-free-chat');
 // Separate fixtures reconstruct completed prior days only. Target copy is live.
 for(const [day,at,prefix,id,chat] of [[10,'11:50','d10','noodles','group'],[10,'17:46','d10','carry','group'],[10,'22:20','d10','night','group'],[11,'09:15','d11','notice','group'],[11,'15:20','d11','afternoon','group']]){
  await prepare(day,at,'wechat','/chat/'+chat);await finishTrack(prefix,id,chat);
 }
 // Real D11 morning and D12 moving scripts retain original native composer.
 await prepare(11,'08:40','wechat','/chat/wang');await finishStory('return','wechat','wang');
 await prepare(11,'22:18','wechat','/chat/wang');
 // Reunion is an earlier same-day prerequisite, reconstructed independently.
 s=await state();s.story55.completed.return={day:11,clock:'09:00',fixturePrior:true};s.unlocked=false;await load(s);
 const worry=await page.evaluate(async({release})=>{const {d11Track}=await import(release.url+'src/story/d11/wechat.js');return d11Track.defs.find(d=>d.chat==='wang'&&d.at==='22:18').id;},{release});
 await finishTrack('d11',worry,'wang');s=await state();s.clock='22:20';s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/group',params:{}},stack:[]};await load(s);await finishTrack('d11','after-meeting','group');
 await prepare(12,'10:10','wechat','/chat/group');await finishStory('move','wechat','group');
 // Preserve this completed move when advancing into same-day incidental chats.
 for(const [at,id,chat] of [['13:40','separate-work','group'],['18:41','wang-airport','wang'],['21:50','arrival','group'],['23:02','settling','group']]){
  s=await state();s.clock=at;s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/'+chat,params:{}},stack:[]};await load(s);await finishTrack('d12',id,chat);
 }
 await prepare(13,'19:03','wechat','/chat/fulongsheng');await finishTrack('d13','father-planning','fulongsheng');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).content.mail.some(m=>m.id==='s55-d13-wallet-mail'),null,{timeout:10000});
 s=await state();const mail=s.content.mail.find(m=>m.id==='s55-d13-wallet-mail');assert.equal(mail.time,'19:03');s.unlocked=false;s.nav={current:{appId:'kira',route:'/mail/'+mail.id,params:{}},stack:[]};await load(s);
 await screen.locator('.kira-d13-mail').waitFor();s=await state();assert.equal(s.clock,'22:30');assert.equal(s.content.mail.filter(m=>m.id===mail.id).length,1);await capture('d13-mail-2230');exports.push({scene:'d13-mail',mail,clockAfterOpening:s.clock});
 await prepare(14,'09:16','kira','/mail/code-mail');await screen.getByText('Ouroboros’ Tear — Framework Package',{exact:true}).waitFor();await capture('d14-mail');
 await prepare(15,'15:36','mirage','/chat/s55-ouroboros');await signIn();s=await finishStory('loan','mirage','s55-ouroboros');assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);assert.ok(s.notifications.some(n=>n.id==='s55-loan-receipt'));
 s.clock='16:30';s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/wang',params:{}},stack:[]};await load(s);await finishTrack('d15','room','wang');
 await prepare(16,'10:08','wechat','/chat/group');await finishTrack('d16','briefing','group');s=await state();s.clock='16:00';s.unlocked=false;await load(s);await finishTrack('d16','after-rehearsal','group');
 await prepare(17,'19:00','mirage','/chat/s55-ouroboros');await signIn();s=await finishStory('azathoth-invitation','mirage','s55-ouroboros');assert.equal(exports.at(-1).messages.length,30);assert.equal(s.story55.browserReadIds,undefined);
 assert.deepEqual(errors,[]);await writeFile(root+'/native-output.json',JSON.stringify(exports,null,2));await writeFile(root+'/summary.json',JSON.stringify({ok:true,scenes:exports.length,errors,blockedExternal:external},null,2));
 console.log('PASS_CHAT_V2_MOBILE',JSON.stringify({scenes:exports.length,errors}));
}catch(error){await page.screenshot({path:root+'/failure.png'}).catch(()=>{});await writeFile(root+'/native-output.json',JSON.stringify(exports,null,2));await writeFile(root+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,state:await state().catch(()=>null),errors,composer:await screen.locator('.wx-composer input,.mc-composer input').first().evaluate(el=>({value:el.value,stage:el.dataset.storyStage,type:el.dataset.storyType,disabled:el.disabled})).catch(()=>null)},null,2));throw error;}
finally{await context.close();await browser.close();}
