import {linkedMissions,linkedMission,saveLinkedMission,resetLinkedMission} from '../../../mirage/linked-missions.js';
import {esc,btn} from '../../../../system/ui.js';
import {initializeMirage,WALLET_CHALLENGE_ID} from '../../../mirage/data.js';
import {HACKER_BOUNTY_ID,HACKER_MAIL_ID,acceptHackerBounty,hackerBounty} from '../../../mirage/mission.js';
import {ensureGhost,authorize,configFor} from '../../../ghost/state.js';
import {tools as ghostTools} from '../../../ghost/catalog.js';

let selectedLinkedId='';
function linkedMissionEditor(s){
 const list=linkedMissions(s),edit=linkedMission(s,selectedLinkedId)||null;
 const id=edit?.id||'',cfg=s.content.orders?.find(o=>o.id===id);
 const selected=(value,expected)=>value===expected?' selected':'';
 return '<div class="card"><h3>多悬赏任务链</h3>'+
 '<p>每份悬赏拥有独立 KIRA 邮件、浏览器检索、GHOST 成果文件、手动回复附件、游戏时间审核与钱包流水。</p>'+
 list.map(m=>'<div class="mission-step"><b>'+esc(m.title)+'</b><span>D · '+esc(m.stage)+'/6</span>'+btn('mission-linked-select','编辑','button-quiet','data-id="'+esc(m.id)+'"')+btn('mission-linked-open','打开','button-quiet','data-id="'+esc(m.id)+'"')+'</div>').join('')+
 btn('mission-linked-new','新建悬赏','button-quiet wide')+'</div>'+
 '<form class="card" data-form="mission-linked-config"><h3>'+(edit?'编辑 '+esc(edit.title):'创建新悬赏')+'</h3>'+
 '<label>订单 ID<input required pattern="[a-zA-Z0-9][a-zA-Z0-9-]{2,62}" maxlength="63" name="id" value="'+esc(id)+'" '+(edit?'readonly':'')+' placeholder="contract-002"></label>'+
 '<label>悬赏名称<input required maxlength="120" name="title" value="'+esc(edit?.title||'')+'"></label>'+
 '<label>悬赏详情<textarea name="description" rows="3">'+esc(cfg?.description||'')+'</textarea></label>'+
 '<label>发布者<input name="owner" value="'+esc(cfg?.owner||'ANONYMOUS')+'"></label>'+
 '<label>网站报酬文案<input name="rewardLabel" value="'+esc(cfg?.reward||'1500 CREDITS')+'"></label>'+
 '<label>邮件标题<input name="subject" value="'+esc(edit?.subject||'【MIRAGE】新订单')+'"></label>'+
 '<label>邮件内容<textarea name="body" rows="5">'+esc(edit?.body||'')+'</textarea></label>'+
 '<label>浏览器检索词<input name="browserQuery" value="'+esc(edit?.browserQuery||'')+'"></label>'+
 '<label>Ghost 类型<select name="type">'+ghostTools.map(t=>'<option value="'+t.id+'"'+selected(t.id,edit?.type||'cipher')+'>'+esc(t.name)+'</option>').join('')+'</select></label>'+
 '<label>限时（秒）<input type="number" min="10" max="600" name="seconds" value="'+esc(edit?.seconds??'')+'"></label>'+
 '<label>发布日 D<input type="number" min="1" max="55" required name="publishDay" value="'+esc(edit?.publishDay??1)+'"></label>'+' <label>下架日 D<input type="number" min="1" max="55" required name="expiryDay" value="'+esc(edit?.expiryDay??55)+'"></label>'+' <label>交付截止日 D（留空不限制）<input type="number" min="1" max="55" name="deadlineDay" value="'+esc(edit?.deadlineDay??'')+'"></label>'+' <label>交付截止时间<input type="time" name="deadlineClock" value="'+esc(edit?.deadlineClock||'23:59')+'"></label>'+' <label>雇主审核时间（游戏分钟）<input type="number" min="1" max="10080" required name="reviewMinutes" value="'+esc(edit?.reviewMinutes??30)+'"></label>'+' <label>成功到账（游戏币）<input type="number" min="0" max="1000000000" step="1" required name="reward" value="'+esc(edit?.reward??1500)+'"></label>'+
 '<button class="button-primary wide" type="submit">保存并绑定所有 App</button>'+
 (edit?btn('mission-linked-reset','重置此任务进度','button-quiet wide','data-id="'+esc(edit.id)+'"'):'')+'</form>';
}
export function missionProgress(s){
 const order=s.content.orders?.find(x=>x.id===HACKER_BOUNTY_ID);
 const mail=s.content.mail?.find(x=>x.id===HACKER_MAIL_ID);
 const run=s.ghost?.orders?.[HACKER_BOUNTY_ID];
 const step=Number(mail?.missionStep||0);
 return {order,mail,run,steps:[
  {key:'mirage',title:'MIRAGE · 接取订单',done:!!order&&order.status!=='OPEN',appId:'mirage',route:'/order/'+HACKER_BOUNTY_ID},
  {key:'kira',title:'KIRA · 收到订单邮件',done:!!mail,appId:'kira',route:'/mail/'+HACKER_MAIL_ID},
  {key:'browser',title:'浏览器 · 检索目标资料',done:step>=2,appId:'browser',route:'/mission-search'},
  {key:'mail',title:'KIRA · 完成邮件选择与发送',done:step>=3,appId:'kira',route:'/compose/'+HACKER_BOUNTY_ID},
  {key:'ghost',title:'GHOST · 授权任务并执行',done:!!run,appId:'ghost',route:run?'/contract':'/'},
  {key:'complete',title:'GHOST · 执行成功',done:['success','settling','paid'].includes(run?.status),appId:'ghost',route:'/run'},
  {key:'payout',title:'KIRA → GHOST · 提交与结算',done:run?.status==='paid',appId:'kira',route:'/mail/'+HACKER_MAIL_ID}
 ]};
}
export function missionEditor(s){
 const x=missionProgress(s),o=x.order,mail=x.mail;
 const chosen=s.ghost?.missionTypes?.[HACKER_BOUNTY_ID]||'cipher';
 const cfg=s.ghost?.orderConfigs?.[HACKER_BOUNTY_ID]||{};
 return '<div class="editor-panel mission-editor"><h2>任务链 · MIRAGE / KIRA / 浏览器 / GHOST</h2>'
 +'<div class="card"><h3>当前实际流程</h3>'+x.steps.map((t,i)=>'<div class="mission-step"><span>'+(t.done?'✓':'○')+'</span><b>'+esc(t.title)+'</b>'+btn('mission-visit','打开','button-quiet', 'data-step="'+i+'"')+'</div>').join('')+'</div>'
 +'<form class="card" data-form="mission-config"><h3>剧情与技术设置</h3>'
 +'<label>悬赏名称<input name="title" value="'+esc(o?.title||'招募黑客')+'" required></label>'
 +'<label>悬赏描述<textarea name="description" rows="3" required>'+esc(o?.description||'窃取目标信息。')+'</textarea></label>'
 +'<label>悬赏报酬（文字）<input name="rewardLabel" value="'+esc(o?.reward||'$ 3,000,000')+'"></label>'
 +'<label>KIRA 邮件标题<input name="subject" value="'+esc(mail?.subject||'【mirage】新订单')+'"></label>'
 +'<label>KIRA 邮件内容<textarea name="body" rows="7">'+esc(mail?.body||'')+'</textarea></label>'
 +'<label>任务对应的 GHOST 子程序<select name="type">'+ghostTools.map(t=>'<option value="'+t.id+'"'+(t.id===chosen?' selected':'')+'>'+t.name+'</option>').join('')+'</select></label>'
 +'<label>时限秒数（留空不限）<input name="seconds" type="number" min="10" max="600" value="'+esc(cfg.seconds??'')+'"></label>'
 +'<label>数字币奖励金额（留空待结算）<input name="reward" type="number" min="0" step="1" value="'+esc(cfg.reward??'')+'"></label>'
 +'<button class="button-primary wide" type="submit">保存整条任务链的设定</button></form>'
 +linkedMissionEditor(s)
 +'<div class="card"><h3>D05 · 衔尾蛇博士</h3><p>10 BTC 钱包挑战 / GHOST 程序 / 领奖后的联系人与对话</p><div class="mission-step"><b>'+(s.content.orders?.find(x=>x.id===WALLET_CHALLENGE_ID)?.status||'NOT RELEASED')+'</b><span>'+(s.events?.some(e=>e.type==='mirage_wallet_challenge_completed')?'已收到恭喜消息':'尚未完成')+'</span></div>'+btn('mission-wallet-test','进入 D05 钱包挑战','button-quiet wide')+btn('mission-wallet-reset','重置 D05 任务测试','button-quiet wide')+'</div>'
 +'<div class="card"><h3>任务链测试</h3>'+btn('mission-start','初始化并接取订单','button-quiet wide')
 +btn('mission-authorize','检测邮件步骤并授权 GHOST','button-quiet wide')
 +btn('mission-reset','重置这条任务的测试进度','button-quiet wide')+'</div></div>';
}
export function missionAction(action,t,ctx){
 const x=missionProgress(ctx.store.get());
 if(action==='mission-linked-new'){selectedLinkedId='';ctx.refresh();return true;}
 if(action==='mission-linked-select'){selectedLinkedId=t.dataset.id;ctx.refresh();return true;}
 if(action==='mission-linked-open'){
  ctx.router.open({appId:'mirage',route:'/order/'+t.dataset.id,params:{}});return true;
 }
 if(action==='mission-linked-reset'){
  ctx.store.update(s=>resetLinkedMission(s,t.dataset.id));
  ctx.toast('此悬赏已重置');return true;
 }

 if(action==='mission-wallet-test'){
  ctx.store.update(s=>{if(s.day<5){s.day=5;s.clock='21:00';}});
  initializeMirage(ctx.store);
  ctx.router.open({appId:'mirage',route:'/order/'+WALLET_CHALLENGE_ID,params:{}});
  return true;
 }
 if(action==='mission-wallet-reset'){
  ctx.store.update(s=>{
   const o=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
   if(o)o.status='OPEN';
   if(s.ghost?.orders)delete s.ghost.orders[WALLET_CHALLENGE_ID];
   if(s.ghost?.history)s.ghost.history=s.ghost.history.filter(h=>h.orderId!==WALLET_CHALLENGE_ID);
   s.events=s.events.filter(e=>e.type!=='mirage_wallet_challenge_completed');
   s.notifications=s.notifications.filter(n=>n.id!=='mirage-ouroboros-complete');
   if(s.content.mirage?.transactions)s.content.mirage.transactions=s.content.mirage.transactions.filter(x=>x.id!=='ou-btc10');
   const contact=s.content.conversations.mirage.find(c=>c.id==='mc-ourob-d05');
   if(contact){
    contact.messages=contact.messages.filter(m=>!/^ou-d05-after-/.test(m.id));
    if(contact.storySeed&&!contact.messages.length)s.content.conversations.mirage=s.content.conversations.mirage.filter(c=>c.id!==contact.id);
   }
  });ctx.toast('D05 钱包挑战已重置');return true;
 }

 if(action==='mission-visit'){
  const step=x.steps[Number(t.dataset.step)];if(step)ctx.router.open({appId:step.appId,route:step.route,params:step.key==='ghost'||step.key==='complete'?{orderId:HACKER_BOUNTY_ID}:{}});
  return true;
 }
 if(action==='mission-start'){
  initializeMirage(ctx.store);acceptHackerBounty(ctx.store);ctx.toast('订单已接取，KIRA 邮件已送达');return true;
 }
 if(action==='mission-authorize'){
  if(!x.mail||x.mail.missionStep<3||x.order?.status!=='ACCEPTED'){ctx.toast('先完成 KIRA 邮件与浏览器的前置步骤');return true;}
  ctx.store.update(s=>authorize(s,{orderId:HACKER_BOUNTY_ID,mailId:HACKER_MAIL_ID,type:s.ghost?.missionTypes?.[HACKER_BOUNTY_ID]||'cipher'}));ctx.toast('GHOST 已授权');return true;
 }
 if(action==='mission-reset'){
  ctx.store.update(s=>{
   const o=s.content.orders.find(o=>o.id===HACKER_BOUNTY_ID);if(o)o.status='OPEN';
   s.content.mail=s.content.mail.filter(m=>m.id!==HACKER_MAIL_ID);
   if(s.ghost?.orders)delete s.ghost.orders[HACKER_BOUNTY_ID];
   if(s.ghost?.history)s.ghost.history=s.ghost.history.filter(h=>h.orderId!==HACKER_BOUNTY_ID);
   if(s.content.mirage?.digitalTransactions)s.content.mirage.digitalTransactions=s.content.mirage.digitalTransactions.filter(x=>x.orderId!==HACKER_BOUNTY_ID);
  });ctx.toast('本次任务进度已清空');return true;
 }
 return false;
}
export function missionSubmit(form,ctx){
 if(form.dataset.form==='mission-linked-config'){
  const v=new FormData(form);
  initializeMirage(ctx.store);
  const entry={};
  for(const key of ['id','title','description','owner','rewardLabel','subject','body','browserQuery','type','seconds','reward','publishDay','expiryDay','deadlineDay','deadlineClock','reviewMinutes'])entry[key]=v.get(key);
  ctx.store.update(s=>saveLinkedMission(s,entry));
  selectedLinkedId=entry.id;
  ctx.toast('悬赏已绑定 KIRA、浏览器和 GHOST');return true;
 }
 if(form.dataset.form!=='mission-config')return false;
 const v=new FormData(form);
 const seconds=v.get('seconds')===''?null:Number(v.get('seconds'));
 const reward=v.get('reward')===''?null:Number(v.get('reward'));
 if(seconds!==null&&(!Number.isInteger(seconds)||seconds<10||seconds>600))throw Error('时限范围 10–600 秒');
 if(reward!==null&&(!Number.isSafeInteger(reward)||reward<0))throw Error('奖励必须是非负整数');
 ctx.store.update(s=>{
  let o=s.content.orders.find(o=>o.id===HACKER_BOUNTY_ID);
  if(!o){o={...hackerBounty};s.content.orders.push(o);}
  if(o){o.title=String(v.get('title')||'').slice(0,120);o.description=String(v.get('description')||'').slice(0,5000);o.reward=String(v.get('rewardLabel')||'').slice(0,80);}
  const m=s.content.mail.find(m=>m.id===HACKER_MAIL_ID);
  if(m){m.subject=String(v.get('subject')||'').slice(0,150);m.body=String(v.get('body')||'').slice(0,8000);}
  const g=ensureGhost(s);g.missionTypes??={};g.orderConfigs??={};
  g.missionTypes[HACKER_BOUNTY_ID]=String(v.get('type'));
  g.orderConfigs[HACKER_BOUNTY_ID]={...g.orderConfigs[HACKER_BOUNTY_ID],seconds,reward};
  if(g.orders[HACKER_BOUNTY_ID]&&['authorized','failed','settling'].includes(g.orders[HACKER_BOUNTY_ID].status)){
   g.orders[HACKER_BOUNTY_ID].settings.seconds=seconds;
   g.orders[HACKER_BOUNTY_ID].settings.reward=reward;
  }
 });
 ctx.toast('任务链设置已保存');return true;
}
