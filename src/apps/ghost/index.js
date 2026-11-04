import {D01_REPAIR,deployD01} from '../../story/d01/runtime.js';
import {d02OrderOfStep,d02NextStep} from '../../story/d02/runtime.js';
import {isStory55} from '../../services/story55/state.js';
import {renderFlowD03,handleFlowD03,submitFlowD03Form} from './features/flow-d03/index.js';
import {deploymentHome,deploymentView} from './deployment/index.js';
import {miningView55} from '../../services/story55/mining-view.js';
import {WALLET_CHALLENGE_ID} from '../mirage/contacts-seed.js';
import {esc} from '../../system/ui.js';
import {tools,stages,moduleLabel} from './catalog.js';
import {ensureGhost,configFor,begin,finish,submit as submitGhostOrder,settle,authorize,nextGhostRound,exitD01Puzzle,startD01PipePreview,startD02PipePreview} from './state.js';
import {swap,puzzleSolved,rotate,connected,fingerprints,newCode,createBoard} from './games/logic.js';
import {circuit,pipe,emblem,toolIcon} from './visuals.js';
import {pipeFlow,pipeSolved} from './games/pipe-network.js';
import {arcadeAction,arcadeTick} from './games/arcade.js';
import {renderArcade} from './games/arcade-ui.js';
import {ghostDevSkipAvailable,previewSkipD01} from './features/dev-skip/index.js';
export const manifest={id:'ghost',name:'GHOST',icon:9,defaultRoute:'/',supportsDeepLink:true,kicker:'工具程序'};
const button=(action,label,attrs='',cls='')=>`<button class="gh-button ${cls}" data-action="gh-${action}" ${attrs}>${label}</button>`;
const nav=(ctx,route='/',params={})=>ctx.router.open({appId:'ghost',route,params});
const fmt=ms=>`${Math.floor(Math.max(0,ms)/60000).toString().padStart(2,'0')}:${Math.floor(Math.max(0,ms)/1000%60).toString().padStart(2,'0')}`;
const title=(back,label,right='')=>`<div class="gh-top">${button(back,'‹','aria-label="返回"','gh-back')}<span>${label}</span><span>${right||'●'}</span></div>`;
let clock=null,lastContext=null,pointer=null,suppressClick=false,exitDialogFor=null;
function bindControls(){if(typeof document==='undefined'||document.documentElement.dataset.ghostBound)return;document.documentElement.dataset.ghostBound='1';document.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-action=gh-tile]');if(t)pointer={index:t.dataset.index,x:e.clientX,y:e.clientY};});document.addEventListener('pointerup',e=>{if(!pointer)return;const from=pointer;pointer=null;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-action=gh-tile]');if(!to||to.dataset.index===from.index||Math.hypot(e.clientX-from.x,e.clientY-from.y)<12)return;const ctx=lastContext,id=ctx?.store.get().nav.current.params?.orderId;ctx?.store.update(s=>{const o=s.ghost?.orders[id];if(!o||o.status!=='running')return;if(o.deadline!==null&&Date.now()>=o.deadline){finish(s,id,false);return;}o.board.tiles=swap(o.board.tiles,Number(from.index),Number(to.dataset.index));o.board.selected=null;o.moves++;if(puzzleSolved(o.board.tiles))finish(s,id,true);});suppressClick=true;setTimeout(()=>suppressClick=false,100);});document.addEventListener('keydown',e=>{const ctx=lastContext,loc=ctx?.store.get().nav.current,o=ctx?.store.get().ghost?.orders[loc?.params?.orderId];if(loc?.appId!=='ghost'||loc.route!=='/run'||o?.type!=='veil'||o.status!=='running'||!/^([0-9]|Backspace|Enter)$/.test(e.key))return;e.preventDefault();handle('gh-key',{dataset:{key:e.key==='Backspace'?'⌫':e.key==='Enter'?'↵':e.key}},ctx,loc);});}
export function tick(ctx){
 const s=ctx.store.get(),o=s.ghost?.orders[s.nav.current.params?.orderId],now=Date.now();
 if(o?.status==='preview-win'&&now>=o.previewUntil){ctx.store.update(n=>finish(n,o.id,true,now));return;}
 if(o?.status==='running'){
  if(o.board?.arcade?.kind==='extract'&&o.board.arcade.lockUntil&&now>=o.board.arcade.lockUntil){
   ctx.store.update(n=>arcadeTick(n.ghost.orders[o.id].board.arcade,now));return;
  }
  const legacyStrike=o.type==='strike'&&!o.board?.arcade&&now-o.startedAt>=configFor(s,o.type,o.id).attackMs;
  const expired=o.deadline!==null&&now>=o.deadline;
  if(legacyStrike||expired){ctx.store.update(n=>finish(n,o.id,legacyStrike,now));return;}
  if(o.deadline!==null||o.board?.arcade?.lockUntil)ctx.refresh();
 }
 if(Object.values(s.ghost?.orders||{}).some(x=>x.status==='settling'&&now>=x.dueAt&&Number.isFinite(configFor(s,x.type,x.id).reward)))ctx.store.update(n=>settle(n));
}
export function render(ctx,loc){lastContext=ctx;bindControls();if(!clock&&typeof window!=='undefined'){clock=setInterval(()=>{if(lastContext)tick(lastContext);},250);}const s=ctx.store.get();if(isStory55(s)&&['/flow-deploy','/flow-install','/flow-projects','/flow-record'].includes(loc.route))return renderFlowD03(s,loc);if(isStory55(s)&&['/deployments','/deployment','/mining'].includes(loc.route))return loc.route==='/mining'?miningView55(s):loc.route==='/deployment'?deploymentView(s,loc.params?.project):deploymentHome(s);const g=s.ghost||{orders:{},history:[]},o=g.orders[loc.params?.orderId],tool=tools.find(t=>t.id===(o?.type||loc.params?.tool));let body='';
 if(loc.route==='/history')body=title('home','执行记录')+`<h1>历史记录<span>记录 / ${g.history.length.toString().padStart(2,'0')}</span></h1><div class="gh-history">${g.history.length?g.history.map(h=>`<div><i>${h.success?'↗':'—'}</i><section><b>${tools.find(t=>t.id===h.type)?.name}</b><small>${esc(h.orderId)}<br>${new Date(h.at).toLocaleString('zh-CN',{hour12:false})}</small></section><span>${h.success?'成功':'失败'}</span></div>`).join(''):'<div class="gh-empty">暂无记录</div>'}</div>`;
 else if(loc.route==='/deploy-info'){
  body=title('home','GHOST / 01 部署')+'<h1>01 部署</h1><div class="gh-keybox"><small>工具部署</small><p>导入来自 KIRA 或授权联系人提供的接入凭证，验证后安装并初始化工具。</p><p>请选择已获授权的项目凭证。</p></div>';
 }
 else if(loc.route==='/contract'||loc.route==='/tool'){
  body=title('home',`GHOST / ${tool?.name||'工具'}`)+`<h1>${tool?.name||'工具'}<span>执行授权</span></h1><div class="gh-key-art">${emblem()}</div><div class="gh-keybox"><small>授权密钥</small><input id="gh-key" aria-label="授权密钥" placeholder="•••• — ••••" value="${esc(o?.key||'')}" autocomplete="off" spellcheck="false" ${o?'readonly':''}/><p>${o?'已载入密钥':'需要密钥'}</p></div>${o?button('start',(o.status==='running'||o.status==='preview-win')?'繼續':o.status==='success'||['settling','paid'].includes(o.status)?'查看报告':o.id===D01_REPAIR?(s.story55?.d01?.deployed?'繼續修復':'部署'):'开始',`data-id="${esc(o.id)}"`,'gh-primary'):button('locked','开始','','gh-primary')}<p class="gh-hint">${o?esc(o.id):'请先从 KIRA 获取授权密钥'}</p>`;
 }
 else if(loc.route==='/run'&&o){
  const cfg=configFor(s,o.type,o.id),remaining=o.deadline-Date.now();
  if(o.status!=='running'&&o.status!=='preview-win'){
   const success=['success','settling','paid'].includes(o.status);body=title('close',`GHOST / 执行报告`)+`<div class="gh-report"><div class="gh-result-mark">${success?'✓':'×'}</div><small>执行报告</small><h1>${success?'成功':'失败'}</h1><p>${d02OrderOfStep(o.id)?(d02NextStep(s,o.id)?esc(tool?.name||'执行完成'):'项目完成'):esc(tool?.name||'工具')+' / '+esc(o.id)}</p>${o.id===D01_REPAIR?`<p>已修復 ${Math.min(100,(s.story55?.d01?.completedRounds||0)*20)}%</p>`:''}${o.id===D01_REPAIR&&success?button('d01-next',(s.story55?.d01?.completedRounds||0)>=5?'返回 KIRA' :'修復下一處',`data-id="${esc(o.id)}"`,'gh-primary'):success&&d02OrderOfStep(o.id)?button('d02-next',d02NextStep(s,o.id)?'繼續處理':'返回 KIRA',`data-id="${esc(o.id)}"`,'gh-primary'):button('close','关闭',`data-id="${esc(o.id)}"`,'gh-primary')}</div>`;
  }else{
   const devSkipTop=o.id===D01_REPAIR&&o.type==='route'&&o.status==='running'&&ghostDevSkipAvailable(globalThis.document,ctx.store.get())
    ?button('d01-dev-skip','跳过本关','aria-label="跳过当前 LINK 测试关卡"','gh-dev-skip-top'):'';
   body=(o.status==='preview-win'?'<div class="gh-top"><span>●</span><span>GHOST / 連線確認</span><span>✓</span></div>':title('exit',tool.name,devSkipTop||(o.deadline!==null?fmt(remaining):'')))+`<div class="gh-game-head"><small>${o.id===D01_REPAIR?'已修復 '+((s.story55?.d01?.completedRounds||0)*20)+'%':'会话 '+String(o.attempts).padStart(2,'0')}</small><h1>${tool.name}</h1><p>${{cipher:'根据参考映射调整模块排列，恢复完整的数据结构',route:'调整路径组件，使源点与目标端建立连接',extract:'校验数据块指纹并提取匹配内容',veil:'分析监测路径，调整访问序列以维持隐匿',strike:'正在进行定向测试，收集目标响应',verify:'根据依赖关系验证模块顺序'}[o.type]}</p></div>`;
   const b=o.board;
   if(o.type==='cipher')body+=`<p class="gh-cipher-tip">点选两个模块以调整排列。依据右下角编号 01–09 校准参考结构。</p><div class="gh-reference">${circuit()}<small>参考图</small></div><div class="gh-grid" id="gh-puzzle">${b.tiles.map((tile,i)=>button('tile',circuit(tile)+`<small class="gh-tile-id">${String(tile+1).padStart(2,'0')}</small>`,`data-index="${i}" aria-label="方块 ${tile+1}，当前位置 ${i+1}"`,b.selected===i?'selected':'')).join('')}</div>${b.arcade?button('cipher-easy-reset','重新解析','','gh-primary'):''}`;
   if(o.type==='route'){
    const size=b.size||3,source=b.size?b.source:0,sink=b.size?b.sink:8;
    const lit=b.size?pipeFlow(b.masks,source,size):connected(b.masks);
    const linked=lit.has(sink),preview=o.status==='preview-win';
    body+=`<div class="gh-port-label"><span><i class="gh-port-dot gh-source-dot"></i>源點 / ${String(Math.floor(source/size)+1).padStart(2,'0')}-${source%size+1}</span><span><i class="gh-port-dot gh-target-dot"></i>終點 / ${String(Math.floor(sink/size)+1).padStart(2,'0')}-${sink%size+1}</span></div><div class="gh-grid gh-pipes ${preview?'gh-network-complete':''}" style="--pipe-columns:${size}">${b.masks.map((mask,i)=>button('pipe',pipe(mask,lit.has(i),i===source?'source':i===sink?'target':''),`data-index="${i}" aria-label="${i===source?'源點（固定）':i===sink?'終點（固定）':'旋轉管線 '+(i+1)}" ${preview||b.size&&(i===source||i===sink)?'disabled':''}`,i===source?'gh-source-tile':i===sink?'gh-target-tile':'')).join('')}</div><div class="gh-progress-label"><span>${preview?'連線成功 · 正在驗收':linked?'終點已接通':'請接通高亮終點'}</span><span>${preview||linked?'✓ 起點已連至終點':'可達 '+lit.size+' 格 · 無最低格數'}</span></div><div class="gh-meter"><i style="width:${linked||preview?100:Math.max(4,lit.size/b.masks.length*100)}%"></i></div>${preview?'<div class="gh-success-preview" role="status"><span class="gh-success-check">✓</span><strong>連線已建立</strong><small>'+(o.id===D01_REPAIR?'3 秒後完成本次修復':'3 秒後完成連線驗證')+'</small></div>':''}`;
   }
   if(o.type==='route'&&o.id===D01_REPAIR&&o.status==='running'&&ghostDevSkipAvailable(globalThis.document,ctx.store.get())){
    body+='<p class="gh-dev-skip-note">开发者跳关已开启 · 成功仍需展示 3 秒</p>';
   }
   if(o.type==='extract'&&!b.arcade)body+=`<div class="gh-target"><small>目标指纹</small><strong>${b.target.split('').join(' ')}</strong><div class="gh-bars">${b.target.split('').map(v=>`<i style="height:${12+Number(v)*3}px"></i>`).join('')}</div></div><div class="gh-options">${b.options.map((code,i)=>button('match',`<small>数据块 / 0${i+1}</small><b>${code.split('').join(' ')}</b><span>↗</span>`,`data-index="${i}"`)).join('')}</div><p class="gh-hint">${b.round+1} / ${cfg.rounds}</p>`;
   if(o.type==='veil'&&!b.arcade)body+=`<div class="gh-code"><small>覆盖序列</small><strong>${b.code.split('').map((v,i)=>`<span class="${i<b.input.length?'typed':''}">${v}</span>`).join('')}</strong><div>${Array.from({length:cfg.codeLength},(_,i)=>`<i class="${i<b.input.length?'filled':''}"></i>`).join('')}</div></div><div class="gh-keypad">${['1','2','3','4','5','6','7','8','9','⌫','0','↵'].map(key=>button('key',key,`data-key="${key}" aria-label="${key}"`)).join('')}</div><p class="gh-hint">${b.round+1} / ${cfg.rounds}　·　错误 ${o.errors}</p>`;
   if(o.type==='verify')body+=`<div class="gh-target"><small>模块正确顺序</small><strong>${b.target.map(moduleLabel).join(' · ')}</strong><p>${b.input.map(moduleLabel).join(' · ')||'—'}</p></div><div class="gh-options">${b.tokens.map((token,i)=>button('verify-token',esc(moduleLabel(token)),`data-index="${i}" ${b.used.includes(i)?'disabled':''}`)).join('')}</div>`;
   if(o.type==='strike'&&!b.arcade){const p=Math.min(1,(Date.now()-o.startedAt)/cfg.attackMs);body+=`<div class="gh-strike">${emblem()}<small>会话 ${esc(b.signature||'—')}</small><div class="gh-stream">${stages.slice(0,Math.floor(p*4)+1).map((v,i)=>`<p><span>0${i+1}</span> ${v}<b>${i<Math.floor(p*4)?'OK':'…'}</b></p>`).join('')}</div><div class="gh-meter"><i style="width:${p*100}%"></i></div><small>${Math.round(p*100)}% / 执行中</small></div>`;}
   if(b.arcade&&o.type!=='cipher')body+=renderArcade(b.arcade,o,remaining);
    body+=`<div class="gh-game-footer"><span>● 加密 会话</span><span>操作記錄 ${o.moves.toString().padStart(2,'0')}</span></div>`;
  }
 }else body=(isStory55(s)?'<nav class="gh-project-nav" aria-label="GHOST 项目工具">'+button('flow-projects','项目')+'</nav>':'')+`<div class="gh-brand"><span class="gh-wordmark">GHOST<span>®</span></span><span class="gh-live">● 本地 / 在线</span></div><div class="gh-hero">${emblem()}<small>工具程序</small></div><div class="gh-list-label"><span>程序</span><span>${String(tools.length).padStart(2,'0')} 可用</span></div><div class="gh-tools">${tools.map((t,i)=>button('tool',`<span class="gh-number">0${i+1}</span><span class="gh-tool-glyph">${toolIcon(t.id)}</span><section><b>${t.name}<small>第 ${String(i+1).padStart(2,'0')} 项</small></b><p>${t.detail}</p></section><span class="gh-arrow">↗</span>`,`data-tool="${t.id}"`)).join('')}</div><div class="gh-bottom">${button('history','历史记录 <span>↗</span>')}<small>GHOST 系统 / 版本 01</small></div>`;
 const exitDialog=loc.route==='/run'&&o?.id===D01_REPAIR&&o.status==='running'&&exitDialogFor===o.id?`<div class="gh-exit-confirm" role="dialog" aria-modal="true" aria-label="保存修復進度"><div class="gh-exit-card"><h2>退出數據修復？</h2><p>已完成的修復進度不會丟失。你可以保留本關的線路，或重新生成本關。</p>${button('d01-save','保存並退出','','gh-primary')}${button('d01-discard','放棄並退出','','gh-secondary')}${button('d01-cancel','繼續修復','','gh-secondary')}</div></div>`:'';
 return `<div class="gh-shell" data-view-key="ghost-${loc.route}">${body}${exitDialog}</div>`;
}
export function handle(action,t,ctx,loc){if(!action.startsWith('gh-'))return;if(suppressClick&&action==='gh-tile')return;if(handleFlowD03(action,ctx))return;if(action==='gh-tool'&&t.dataset.tool==='verify'&&isStory55(ctx.store.get())){ctx.router.open({appId:'ghost',route:'/flow-deploy',params:{}});return;}const a=action.slice(3),id=loc.params?.orderId,s=ctx.store.get(),o=s.ghost?.orders[id];
 if(a==='home')return nav(ctx);
 if(a==='deployments')return nav(ctx,'/deployments');
 if(a==='mining')return nav(ctx,'/mining');
 if(a==='history')return nav(ctx,'/history');
 if(a==='tool'){if(t.dataset.tool==='verify')return isStory55(ctx.store.get())?nav(ctx,'/flow-deploy'):nav(ctx,'/deploy-info');return nav(ctx,'/tool',{tool:t.dataset.tool});}
 if(a==='locked'){document.getElementById('gh-key')?.focus();return;}
 if(a==='d01-dev-skip'){
  if(!ghostDevSkipAvailable(globalThis.document,ctx.store.get())||id!==D01_REPAIR)return;
  let skipped=false;
  ctx.store.update(n=>{skipped=previewSkipD01(n,id);});
  if(!skipped)ctx.toast?.('当前关卡无法跳过');
  return;
 }
 if(a==='d01-cancel'){exitDialogFor=null;ctx.refresh();return;}
 if(a==='d01-save'&&id===D01_REPAIR){exitDialogFor=null;return ctx.router.open({appId:'kira',route:'/mail/d01-mirage001-attachment',params:{}});}
 if(a==='d01-discard'&&id===D01_REPAIR){exitDialogFor=null;ctx.store.update(n=>exitD01Puzzle(n,{discard:true}));return ctx.router.open({appId:'kira',route:'/mail/d01-mirage001-attachment',params:{}});}
 if(a==='d02-next'&&id&&o?.status==='success'){
  const next=d02NextStep(s,id);return next?nav(ctx,'/contract',{orderId:next}):ctx.router.open({appId:'kira',route:'/mail/'+o.mailId,params:{}});
 }
 if(a==='d01-next'&&id===D01_REPAIR){exitDialogFor=null;if((s.story55?.d01?.completedRounds||0)>=5)return ctx.router.open({appId:'kira',route:'/mail/d01-mirage001-attachment'});ctx.store.update(n=>{n.ghost.orders[id].status='authorized';begin(n,id);});return nav(ctx,'/run',{orderId:id});}
 if(a==='start'){exitDialogFor=null;if(!o)return;
 if(id===D01_REPAIR)ctx.store.update(n=>deployD01(n));if(['running','preview-win','success','settling','paid'].includes(o.status))return nav(ctx,'/run',{orderId:id});let started=false;ctx.store.update(n=>{started=begin(n,id);});if(!started)return;return nav(ctx,'/run',{orderId:id});}
 if(a==='close'){if(o?.story55Project)return nav(ctx,'/deployment',{project:o.story55Project});if(o?.story55Commission)return ctx.router.open({appId:'mirage',route:'/',params:{}});if(id===WALLET_CHALLENGE_ID)return ctx.router.open({appId:'mirage',route:'/chat/mc-ourob-d05',params:{}});if(d02OrderOfStep(id))return ctx.router.open({appId:'kira',route:'/mail/'+o.mailId,params:{}});if(o?.mailId)return ctx.router.open({appId:'kira',route:'/mail/'+o.mailId});return nav(ctx);}
 if(a==='exit'){if(id===D01_REPAIR&&o?.status==='running'){exitDialogFor=id;ctx.refresh();return;}return nav(ctx,'/contract',{orderId:id});}
 if(a==='cipher-easy-reset'){
  if(o?.type!=='cipher'||o.status!=='running'||!o.board?.arcade)return;
  ctx.store.update(n=>{
   const run=n.ghost.orders[id];run.board=createBoard('cipher',{cipherSwaps:2});run.moves=0;run.errors=0;
  });
  return;
 }
 if(!o||o.status!=='running')return;
 if(o.deadline!==null&&Date.now()>=o.deadline){ctx.store.update(n=>finish(n,id,false));return;}
 if(a.startsWith('arcade-')&&o.board?.arcade){
  const command=a.slice(7),value=t.dataset.value;
  ctx.store.update(n=>{
   const run=n.ghost.orders[id],now=Date.now();
   if(run.status!=='running')return;
   if(run.deadline!==null&&now>=run.deadline){finish(n,id,false,now);return;}
   const result=arcadeAction(run.board.arcade,command,value,now);
   if(!result.changed)return;
   run.moves++;
   if(result.won||result.lost)finish(n,id,!!result.won,now);
  });
  return;
 }
 ctx.store.update(n=>{const run=n.ghost.orders[id],b=run.board,cfg=configFor(n,run.type,run.id);run.moves++;
  if(a==='verify-token'){const i=Number(t.dataset.index);if(b.used.includes(i)||!b.tokens[i])return;if(b.tokens[i]===b.target[b.input.length]){b.input.push(b.tokens[i]);b.used.push(i);if(b.input.length===b.target.length)finish(n,id,true);}else{run.errors++;b.input=[];b.used=[];}}
  if(a==='tile'){const index=Number(t.dataset.index);if(b.selected===null)b.selected=index;else{b.tiles=swap(b.tiles,b.selected,index);b.selected=null;if(puzzleSolved(b.tiles))finish(n,id,true);}}
  if(a==='pipe'){const i=Number(t.dataset.index);if(b.size&&(i===b.source||i===b.sink)){run.moves--;return;}b.masks[i]=rotate(b.masks[i]);const solved=b.size?pipeSolved(b):connected(b.masks).has(8);if(solved){if(id===D01_REPAIR)startD01PipePreview(n,id);else if(d02OrderOfStep(id))startD02PipePreview(n,id);else finish(n,id,true);}}
  if(a==='match'){if(Number(t.dataset.index)===b.correct){b.round++;if(b.round>=cfg.rounds)finish(n,id,true);else nextGhostRound(n,id);}else{run.errors++;}}
  if(a==='key'){const key=t.dataset.key;if(key==='⌫')b.input=b.input.slice(0,-1);else if(key!=='↵'){if(key===b.code[b.input.length])b.input+=key;else{run.errors++;b.input='';}if(b.input.length===b.code.length){b.round++;if(b.round>=cfg.rounds)finish(n,id,true);else nextGhostRound(n,id);}}}
 });
}
export {authorize,submitGhostOrder as submitOrder,settle};
export function submit(form,ctx){return submitFlowD03Form(form,ctx);}
