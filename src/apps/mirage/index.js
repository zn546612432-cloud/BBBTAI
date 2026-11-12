import {walletPage} from './features/wallet/index.js';
import {bindD13Wallet,transferD13Wallet,D13_WALLET_ID} from '../../story/d13/runtime.js';
import {exchange} from '../../services/bank.js';
import {storySessionControls} from './features/story-controls/index.js';
import {D01_REPAIR,D01_CONTACT,acceptD01Repair,deliverD01Attachment,queueD01ContactReply} from '../../story/d01/runtime.js';
import {D02_S,D02_A,D02_STAGES,D02_MAIL,D02_TALIA,acceptD02,submitD02,armD02Ghost,d02StepId,d02State,d02TaliaDraft,onD02TaliaMessage} from '../../story/d02/runtime.js';
import {D03_ORDER,D03_MAIL,D03_STAGES,acceptD03Contract,submitD03Contract,armD03Ghost,d03StepId} from '../../story/d03/contract.js';
import {DAILY_CONTRACTS as D04_CONTRACTS,D04_ORDER_IDS,D04_MAIL,D04_STEP,acceptD04Contract,submitD04Contract,armD04Ghost} from '../../story/d04/contract.js';
import {mirageAIEnabled} from '../../services/ai/channel-controls.js';
import {replyToOuroboros} from './features/ai-replies/index.js';
import {currentScript55,scriptedDraft55,sendScriptedDraft55} from '../../services/story55/scripted-chat.js';
import {isStory55,nodeStatus} from '../../services/story55/state.js';
import {anonymousPresence55} from '../../services/story55/runtime.js';
import {TAI_GHOST_THREAD,canSendGhostShareRemoteText,sendGhostShareRemoteText} from '../../services/story55/ghost-share.js';
import {STORY55_BOUNTY_ID,STORY55_WALLET_MAIL_ID,acceptStory55Wallet} from './data.js';
import {mirage55} from '../../services/story55/views.js';
import {acceptOuroborosChallenge,ouroborosDraft,sendOuroborosPreset,isOuroborosScriptActive} from './ouroboros-flow.js';
import {linkedMission,linkedMissionVisible,linkedMailId,acceptLinkedMission} from './linked-missions.js';
import {isMirageAuthenticated,setMirageAuthenticated} from './session.js';
import {authorize} from '../ghost/state.js';
import {uid} from '../../services/id.js';
import {timestampLabel} from '../../services/messaging/timestamps.js';
import {esc,btn} from '../../system/ui.js';
import {rebaseBundledPublicAsset} from '../../services/public-assets.js';
import {sendMessage} from '../../services/messaging/index.js';
import {visibleMessages} from '../../services/messaging/delivery.js';
import {FLOW_CONTACT,FLOW_INVITE,openFlowTest,flowOnMirageEntry} from '../../services/story55/flow-d03.js';
import {glyph,face,web,productArt,skull} from './art.js';
import {initializeMirage,mirageData,contacts,money,cipher,saveRecord,purchase,MIRAGE_ACCOUNT,MIRAGE_PASSWORD,bountyGroups,isCompletedBounty,WALLET_CHALLENGE_ID,completeWalletChallenge} from './data.js';
import {acceptHackerBounty,HACKER_BOUNTY_ID,HACKER_MAIL_ID} from './mission.js';
export const manifest={id:'mirage',name:'MIRAGE',icon:8,defaultRoute:'/',supportsDeepLink:true,kicker:'CIPHER NETWORK'};
let decrypted=new Set(),decrypting=new Set(),pendingDelete=null,newMailNotice=false,filter='ALL',query='',draftAvatar,accountTapCount=0,lastAccountTap=0;
export function onEnter(){setMirageAuthenticated(false);decrypted.clear();decrypting.clear();pendingDelete=null;newMailNotice=false;draftAvatar=undefined;accountTapCount=0;}
export function accountTap(input){const now=Date.now();accountTapCount=now-lastAccountTap<=850?accountTapCount+1:1;lastAccountTap=now;if(accountTapCount>=3){input.value=MIRAGE_ACCOUNT;accountTapCount=0;}}
const at=(action,label,icon,attrs='')=>btn(action,glyph(icon),'mc-icon-button',`aria-label="${label}" title="${label}" ${attrs}`);
const route=(ctx,path='/',params={})=>ctx.router.open({appId:'mirage',route:path,params});
const goTab=(ctx,path)=>{ctx.store.update(s=>{s.nav.current={appId:'mirage',route:path,params:{}};});};
const codeLines=['IMPORT NUMPY AS NP','FROM DATETIME IMPORT DATETIME','INITIALIZE SELF.MODEL()','CLASS THREATLEVEL(ENUM):','  BENIGN = 0  // LOW RISK','  SUSPICIOUS = 1','  MALICIOUS = 2','  CRITICAL = 3','DEF INIT_AI_MODEL(SELF):','  SELF.BEHAVIOR_PROFILES = []','  SELF.MODEL_WEIGHTS = 0.03','  NORMAL : AVG_DURATION 120','GATEWAY : CLOUD SYNC','SELF.SUSPECTED_USERS = []','ENTROPY : 6.7','DATA EXFILTRATION DETECTED','DEF SIMULATE_LOGS(SELF):','  GENERATE SIMULATED DATA','RETURN CONNECTION(SELF)','SESSION.KEY : 8E1560D0'];
const telemetry=()=>`<div class="mc-telemetry" aria-hidden="true"><pre>${esc([...codeLines,...codeLines].join('\n'))}</pre><pre>${esc([...codeLines.slice(3),...codeLines].join('\n'))}</pre><div class="mc-circuit"></div><div class="mc-node n1"></div><div class="mc-node n2"></div><div class="mc-node n3"></div></div>`;
function login(s,binding=false){const account=MIRAGE_ACCOUNT;return `<div class="mc-screen mc-login">${telemetry()}<div class="mc-login-top"><button class="mc-login-back" type="button" data-action="${binding?'mc-wallet-back':'mc-exit'}" aria-label="${binding?'返回錢包':'返回手機'}">‹</button>MIRAGE NETWORK<span>PRIVATE RELAY / 04</span></div><form class="mc-login-panel" data-form="${binding?'mc-wallet-bind':'mc-login'}"><div class="mc-login-title"><span>MIRAGE</span>${web()}<span>CIPHER</span></div><div class="mc-login-fields"><label><b>ACCOUNT</b><input aria-label="ACCOUNT" name="account" data-mirage-account autocomplete="off" value="${esc(account)}" required maxlength="60" spellcheck="false"></label><label><b>PASSWORD</b><input aria-label="PASSWORD" name="password" type="password" autocomplete="off" value="${MIRAGE_PASSWORD}" required maxlength="100"></label><div class="mc-login-buttons"><button type="submit">${binding?'綁定':'SIGN IN'}</button><button type="button" data-action="mc-sign-up">SIGN UP</button></div></div><div class="mc-login-avatar">${skull()}</div></form><span class="mc-signup-warning" role="status" aria-live="polite">REGISTRATION IS TEMPORARILY UNAVAILABLE</span><div class="mc-login-tables" aria-hidden="true">${[0,1].map(n=>`<div><i></i>${Array.from({length:7},(_,i)=>`<span>${['Cre','Del','Mv','Cre','Cre','Op','Mv'][i]}　${i%3?'UPDATED PROXY':'CREATED PROXY'} HOST@${i+n}8E15…　<em>view details</em></span>`).join('')}</div>`).join('')}</div><div class="mc-login-footer"><span>CONNECTION ENCRYPTED</span><span>22° N / 113° E</span></div></div>`;}
function tabs(active,s){const count=mirageData(s).cart.reduce((a,b)=>a+b.qty,0);return `<nav class="mc-tabs" aria-label="MIRAGE navigation">${[['/','chat','CONTACTS'],['/bounties','money','BOUNTIES'],['/market','cart','MARKET']].map(([path,icon,label])=>btn('mc-tab',`${glyph(icon)}<span>${label}</span>${path==='/market'&&count?`<i>${count}</i>`:''}`,active===path?'is-active':'',`data-route="${path}" aria-label="${label}" ${active===path?'aria-current="page"':''}`)).join('')}</nav>`;}
function header(title,tools='',back=false){return `<header class="mc-header">${back?at('mc-contacts','BACK','back'):`${at('mc-exit','BACK TO PHONE','back')}<span class="mc-header-mark">${web()}</span>`}<div><strong>${esc(title)}</strong><small><i></i> ENCRYPTED CONNECTION</small></div><div class="mc-header-tools">${tools}</div></header>`;}
function contactsPage(s){
 const list=contacts(s);
 const row=c=>{const online=isStory55(s)&&c.id==='s55-ouroboros'?anonymousPresence55(s).online:c.online;return `<div class="mc-contact" data-key="contact-${esc(c.id)}">${btn('mc-chat',`${face(c)}<span><strong>${esc(c.name)}</strong><small>${Number(c.unread||0)>0?'<i class="mc-unread-green"></i> NEW MESSAGE':online?'ONLINE':'NO NEW MESSAGE'}</small></span><i class="mc-contact-dot ${online?'is-online':''}"></i>`,'mc-contact-open',`data-id="${esc(c.id)}" aria-label="Chat with ${esc(c.name)}"`)}</div>`;};
 return `${header('MIRAGE CIPHER')}<div class="mc-contact-scroll mc-scroll"><div class="mc-online-list">${list.length?list.map(row).join(''):'<div class="mc-list-label">NO CONTACTS</div>'}</div><div class="mc-list-end">END OF DIRECTORY / ${list.length} IDENTITIES</div></div>${tabs('/',s)}`;
}
const ghostCardMarkup=m=>{const a=m.attachment||{};return `<button type="button" class="mc-ghost-card" data-action="mc-ghost-project" data-message-id="${esc(m.id)}" aria-label="打開 GHOST 專案"><span>GHOST / PROJECT</span><strong>${esc(a.title||'項目')}</strong><small>${a.type==='ghost-project'?esc(String(a.percent??0))+'%':esc(a.status||'')}</small><b>打開 GHOST　↗</b></button>`;};
const flowMarkup=m=>m.id===FLOW_INVITE?esc(m.text).replace('测试','<button type="button" class="mc-flow-link" data-action="mc-flow-test">测试</button>'):/^s55-d17-invitation-/.test(m.id||'')?esc(m.text).replaceAll('Azathoth','<button type="button" class="mc-flow-link" data-action="mc-azathoth-reference">Azathoth</button>'):esc(m.text);
function chatPage(s,id){const c=contacts(s).find(c=>c.id===id);if(!c)return `${header('CHANNEL NOT FOUND','',true)}<div class="mc-empty">THIS IDENTITY IS NO LONGER AVAILABLE.</div>`;const messages=visibleMessages(c,s).filter(m=>!(id==='s55-ouroboros'&&m.from==='system'&&/熙蒙正在開啟反追蹤|反追蹤失敗/.test(String(m.text||'')))),unlocked=decrypted.has(id)||id===FLOW_CONTACT||(id==='s55-ouroboros'&&s.story55?.d13?.phase==='chat'),busy=decrypting.has(id),sceneLine=currentScript55(s,'mirage',id),script=scriptedDraft55(s,'mirage',id),taliaDraft=d02TaliaDraft(s,id);return `${header(c.name,'',true)}<div class="mc-channel ${unlocked?'is-decrypted':''}" data-key="channel-${esc(id)}"><div class="mc-channel-status"><span>PRIVATE CHANNEL / ${esc(id)}</span><span>256-BIT</span></div><div class="mc-cipher-scroll mc-scroll" aria-label="Encrypted messages">${messages.length?messages.map(m=>['divider','system','terminal-status'].includes(m.kind)?`<div class="mc-session-divider ${m.kind==='terminal-status'?'is-terminal-status':''}" data-key="cipher-${esc(m.id)}">${esc(m.text)}</div>`:m.kind==='call-avatar'?`<div class="mc-cipher-row mc-voice-avatar" data-key="cipher-${esc(m.id)}">${face(c)}</div>`:`<div class="mc-cipher-row ${m.from==='me'?'is-mine':''}" data-key="cipher-${esc(m.id)}">${face(c,m.from==='me')}<div><small>${esc(m.from==='me'?mirageData(s).account:c.name)} · ${esc(timestampLabel(m,s))}</small><p>${esc(cipher(m.kind==='image'?'[IMAGE]':m.text,m.id))}</p></div></div>`).join(''):`<div class="mc-channel-empty">${face(c)}<p>SECURE CHANNEL ESTABLISHED</p><span>NO MESSAGES</span></div>`}</div>${unlocked?`<section class="mc-decoded" aria-label="Decrypted chat"><div class="mc-decoded-heading"><span>${glyph('unlock')} DECRYPTED</span>${at('mc-encrypt','ENCRYPT CHAT','lock',`data-id="${esc(id)}"`)}</div><div class="mc-clear-messages chat-messages" role="log" aria-label="聊天消息">${messages.map(m=>['divider','system','terminal-status'].includes(m.kind)?`<div class="mc-session-divider ${m.kind==='terminal-status'?'is-terminal-status':''}" data-key="message-${esc(m.id)}">${esc(m.text)}</div>`:m.kind==='call-avatar'?`<div class="mc-clear-row mc-voice-avatar" data-key="message-${esc(m.id)}">${face(c)}</div>`:`<div class="mc-clear-row message-row ${m.from==='me'?'is-mine mine':''}" data-key="message-${esc(m.id)}">${face(c,m.from==='me')}<div><span class="mc-clear-sender">${esc(m.from==='me'?mirageData(s).account:c.name)} <time>${esc(timestampLabel(m,s))}</time></span><div class="mc-clear-text">${m.kind==='ghost-project'?ghostCardMarkup(m):m.kind==='image'?`<img class="mc-message-image" src="${esc(rebaseBundledPublicAsset(m.text))}" alt="Chat attachment">`:flowMarkup(m)}</div></div></div>`).join('')||'<div class="mc-empty">NO MESSAGES YET</div>'}</div></section>`:`<div class="mc-decrypt-bar">${btn('mc-decrypt',`${glyph(busy?'unlock':'lock')}<span>${busy?'DECRYPTING…':'DECRYPT MESSAGES'}</span>`,'mc-decrypt-button',`data-id="${esc(id)}" ${busy?'disabled':''}`)}</div>`}<div class="mc-channel-monitor" aria-hidden="true"><div class="mc-wave">${Array.from({length:60},(_,i)=>`<i style="height:${10+((i*37)%29)}px"></i>`).join('')}</div><div class="mc-identities">${face(c)}${face(null,true)}</div></div></div>${storySessionControls(s,id)}<form class="mc-composer composer" data-form="mc-send" data-id="${esc(id)}"${script?` data-story-scene="${esc(script.id)}"`:''}>${at('mc-attach','ATTACH IMAGE','plus',`data-id="${esc(id)}"`)}<input name="text" value="${script?'':esc(s.drafts[id]||'')}" ${script?`data-story-type="${esc(script.text)}" data-story-stage="${esc(script.id+':'+script.index)}"`:ouroborosDraft(s,id)?`data-story-type="${esc(ouroborosDraft(s,id))}" data-story-stage="${esc(s.content.mirage?.ouroborosScript?.stage||'')}"`:taliaDraft?`data-story-type="${esc(taliaDraft)}" data-story-stage="d02-talia-${d02State(s).taliaStage||0}"`:''} ${sceneLine&&!script?'disabled':''} aria-label="消息内容" placeholder="ENCRYPT A MESSAGE…" autocomplete="off" maxlength="6000"><button type="submit" aria-label="SEND MESSAGE">${glyph('send')}</button></form>`;}
function orderRow(o,i){return btn('mc-open-bounty',`<div class="mc-order-top"><span>MC / ${String(i+1).padStart(4,'0')}</span><i>${esc(o.status||'OPEN')}</i></div><h2>${esc(o.title)}</h2><p>${esc(o.owner||'ANONYMOUS')}</p><div class="mc-order-foot"><span>${esc(o.category||'CONTRACT')}</span><strong>${esc(o.reward||'$ 0')}</strong></div>`,'mc-order',`data-id="${esc(o.id)}"`);}
function bountyPage(s){
 const d=mirageData(s),list=(s.content.orders||[]).filter(o=>o.status==='OPEN'&&linkedMissionVisible(s,o.id));
 return `${header('BOUNTY EXCHANGE')}<div class="mc-scroll mc-board"><button class="mc-wallet-summary" data-action="mc-wallet"><span>AVAILABLE FUNDS <small>USD</small></span><strong>$ ${money(s.bankData?.balance||0)}</strong><span>VIEW LEDGER <b>↗</b></span></button>${btn('mc-my-orders','MY ORDERS · 我的订单　›','mc-my-orders')}<div class="mc-board-label"><span>OPEN CONTRACTS (${list.length})</span></div>${list.map(orderRow).join('')||'<div class="mc-empty">NO CONTRACTS AVAILABLE</div>'}</div>${tabs('/bounties',s)}`;
}
function myOrdersPage(s,view='active'){
 const all=(s.content.orders||[]).filter(o=>linkedMissionVisible(s,o.id));
 const groups={
  active:all.filter(o=>!['OPEN','COMPLETED','EXPIRED','FAILED','CANCELLED'].includes(o.status)),
  completed:all.filter(isCompletedBounty),
  expired:all.filter(o=>['EXPIRED','FAILED','CANCELLED'].includes(o.status)&&(!D02_STAGES[o.id]||o.wasAccepted===true))
 };
 const labels={active:'进行中',completed:'已完成',expired:'已失效'};
 const list=groups[view]||groups.active;
 return `${header('MY ORDERS','',true)}<div class="mc-scroll mc-board"><div class="mc-bounty-switch" role="group" aria-label="我的订单状态">${Object.entries(labels).map(([key,label])=>btn('mc-order-view',label+' <span>'+groups[key].length+'</span>',key===view?'is-active':'',`data-view="${key}"`)).join('')}</div><div class="mc-board-label"><span>${labels[view]} · ${list.length}</span></div>${list.map(orderRow).join('')||'<div class="mc-empty">暂无'+labels[view]+'订单</div>'}</div>${tabs('/bounties',s)}`;
}
function d02BountyActions(s,o){
 if(!D02_STAGES[o.id])return '';
 const progress=D02_STAGES[o.id].filter((_,i)=>s.ghost?.orders?.[d02StepId(o.id,i)]?.status==='success').length;
 if(o.status==='READY')return '<p class="mc-brief">任务 '+progress+' / '+D02_STAGES[o.id].length+' · 待提交</p>';
 if(o.status==='ACCEPTED')return '<p class="mc-brief">任务 '+progress+' / '+D02_STAGES[o.id].length+' · '+(d02State(s).deployed?.[o.id]?'已部署':'待部署')+'</p>';
 if(o.status==='EXPIRED')return '<p class="mc-brief">已失效：超过截止时间</p>';
 return '';
}
function d03BountyActions(s,o){
 if(o.id!==D03_ORDER)return '';
 const done=D03_STAGES.filter((_,i)=>s.ghost?.orders?.[d03StepId(i)]?.status==='success').length;
 if(o.status==='ACCEPTED')return '<p class="mc-brief">程序 '+done+' / '+D03_STAGES.length+' · 破譯 → 連結 → 隱匿</p>'
  +btn('mc-d03-mail','OPEN ORDER EMAIL · KIRA','mc-secondary',`data-id="${esc(o.id)}"`);
 if(o.status==='READY')return '<p class="mc-brief">程序 3 / 3 · READY TO SUBMIT</p>';
 if(o.status==='COMPLETED')return '<p class="mc-brief">✓ 文件已驗收 · 交易回執已寄送</p>';
 return '';
}
function d04BountyActions(s,o){
 const def=D04_CONTRACTS.find(x=>x.id===o.id);if(!def)return '';
 const done=def.stages.filter((_,i)=>s.ghost?.orders?.[D04_STEP(o.id,i)]?.status==='success').length;
 if(o.status==='ACCEPTED')return '<p class="mc-brief">程序 '+done+' / '+def.stages.length+' · '+def.stages.map(x=>({cipher:'破譯',veil:'隱匿',route:'連結',extract:'竊取',strike:'攻擊'})[x]||x).join(' → ')+'</p>'
  +btn('mc-d04-mail','OPEN ORDER EMAIL · KIRA','mc-secondary','data-id="'+esc(o.id)+'"');
 if(o.status==='READY')return '<p class="mc-brief">程序 '+done+' / '+def.stages.length+' · READY TO SUBMIT</p>';
 if(o.status==='COMPLETED')return '<p class="mc-brief">✓ 文件已驗收 · 交易回執已寄送</p>';
 if(o.status==='EXPIRED')return '<p class="mc-brief">委託已過期，無法再提交</p>';
 return '';
}
function bountyDetail(s,id){const o=s.content.orders.find(o=>o.id===id);if(!o||!linkedMissionVisible(s,id))return `${header('CONTRACT NOT FOUND','',true)}`;const d01Expired=id===D01_REPAIR&&isStory55(s)&&s.day!==1&&o.status==='OPEN';const d02Expired=!!D02_STAGES[id]&&o.status==='EXPIRED';return `${header('CONTRACT / DETAIL','',true)}<div class="mc-scroll mc-detail"><small>${esc(o.id)}</small><h1>${esc(o.title)}</h1><div class="mc-detail-state">${esc(o.status||'OPEN')}</div><label>CLIENT</label><p>${esc(o.owner||'ANONYMOUS')}</p><label>REWARD</label><strong class="mc-reward">${esc(o.reward)}</strong><label>BRIEF</label><p class="mc-brief">${esc(o.description||'Contract details have not been provided.')}</p>${o.d01ViewOnly?'':id===D03_ORDER&&o.status==='READY'?btn('mc-d03-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):D04_ORDER_IDS.includes(id)&&o.status==='READY'?btn('mc-d04-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):D02_STAGES[id]&&o.status==='READY'?btn('mc-d02-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):btn('mc-accept-bounty',d01Expired?'D01 ONLY · UNAVAILABLE':d02Expired?'EXPIRED':o.status==='READY'?'READY TO SUBMIT':o.status==='ACCEPTED'?'CONTRACT ACCEPTED':isCompletedBounty(o)?'CONTRACT COMPLETED':'ACCEPT CONTRACT','mc-primary',`data-id="${esc(id)}" ${d01Expired||d02Expired||o.status!=='OPEN'?'disabled':''}`)}${d01Expired?'<p class="mc-brief">此委托仅限 D01 接取；使用开发者入口重建后续日期时将自动标记已完成。</p>':''}${o.status==='ACCEPTED'&&linkedMission(s,id)?btn('mc-open-linked-kira','OPEN ORDER EMAIL · KIRA','mc-secondary',`data-id="${esc(id)}"`):o.status==='REVIEWING'&&linkedMission(s,id)?'<p>UNDER REVIEW · KIRA</p>':o.status==='ACCEPTED'&&id===HACKER_BOUNTY_ID?btn('mc-open-kira-mail','OPEN ORDER EMAIL · KIRA','mc-secondary'):o.status==='ACCEPTED'&&id===D01_REPAIR?btn('mc-open-d01-mail','打開 KIRA 附件郵件','mc-secondary'):o.status==='ACCEPTED'&&isStory55(s)&&id===STORY55_BOUNTY_ID&&!D04_ORDER_IDS.includes(id)?btn('mc-open-wallet-d06-mail','OPEN KIRA AUTHORIZATION','mc-secondary'):o.status==='ACCEPTED'&&!D02_STAGES[id]&&id!==D03_ORDER&&!D04_ORDER_IDS.includes(id)?btn('mc-complete-bounty',id===WALLET_CHALLENGE_ID?'TRY THE WALLET CHALLENGE':'MARK COMPLETED','mc-secondary',`data-id="${esc(id)}"`):''}${d02BountyActions(s,o)}${d03BountyActions(s,o)}${d04BountyActions(s,o)}</div>${tabs('/bounties',s)}`;}
function market(s){const d=mirageData(s);const products=d.products.filter(p=>(filter==='ALL'||p.category===filter)&&(!query||`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query.toLowerCase())));const cats=[...new Set(['ALL',...d.products.map(p=>p.category)])];return `${header('PRIVATE MARKET',at('mc-cart','VIEW CART','cart'))}<div class="mc-market-search"><input aria-label="SEARCH INVENTORY" name="mc-search" value="${esc(query)}" placeholder="SEARCH INVENTORY…" autocomplete="off"></div><div class="mc-market-categories">${cats.map(c=>btn('mc-filter',esc(c),c===filter?'is-active':'',`data-category="${esc(c)}"`)).join('')}</div><div class="mc-scroll mc-market-scroll"><div class="mc-product-grid">${products.map(p=>btn('mc-product',`<div class="mc-product-picture"><span>${esc(p.category)}</span>${productArt(p.art)}</div><div class="mc-product-info"><strong>${esc(p.name)}</strong><small>STOCK / ${Number(p.stock)||0}</small><b>$ ${money(p.price)}</b></div>`,'mc-product',`data-id="${esc(p.id)}"`)).join('')}</div>${products.length?'':'<div class="mc-empty">NO MATCHING INVENTORY</div>'}<div class="mc-market-footer">PRIVATE INVENTORY / USD</div></div>${tabs('/market',s)}`;}
function product(s,id){const p=mirageData(s).products.find(p=>p.id===id);if(!p)return `${header('ITEM NOT FOUND','',true)}`;return `${header('INVENTORY / DETAIL','',true)}<div class="mc-scroll mc-detail"><div class="mc-product-hero">${productArt(p.art)}</div><small>${esc(p.category)} / ${esc(p.id)}</small><h1>${esc(p.name)}</h1><strong class="mc-reward">$ ${money(p.price)}</strong><p class="mc-brief">${esc(p.description)}</p><div class="mc-stock">AVAILABLE STOCK <b>${Number(p.stock)||0}</b></div>${btn('mc-add-cart',Number(p.stock)>0?'ADD TO CART':'OUT OF STOCK','mc-primary',`data-id="${esc(id)}" ${Number(p.stock)>0?'':'disabled'}`)}${btn('mc-cart','VIEW CART','mc-secondary')}</div>${tabs('/market',s)}`;}
function cart(s){const d=mirageData(s),rows=d.cart.map(row=>({row,p:d.products.find(p=>p.id===row.id)})).filter(x=>x.p),total=rows.reduce((a,{p,row})=>a+p.price*row.qty,0);return `${header('SHOPPING CART','',true)}<div class="mc-scroll mc-detail">${rows.map(({p,row})=>`<div class="mc-cart-row"><div>${productArt(p.art)}</div><section><strong>${esc(p.name)}</strong><span>$ ${money(p.price)}</span><div class="mc-qty">${btn('mc-cart-minus','−','',`data-id="${esc(p.id)}" aria-label="Decrease ${esc(p.name)}"`)}<b>${row.qty}</b>${btn('mc-add-cart','+','',`data-id="${esc(p.id)}" aria-label="Increase ${esc(p.name)}"`)}</div></section>${at('mc-cart-remove','REMOVE ITEM','trash',`data-id="${esc(p.id)}"`)}</div>`).join('')||'<div class="mc-empty">YOUR CART IS EMPTY</div>'}<div class="mc-total"><span>TOTAL / USD</span><strong>$ ${money(total)}</strong></div><p class="mc-cart-balance">AVAILABLE FUNDS / $ ${money(d.balance)}</p>${btn('mc-checkout','CONFIRM PURCHASE','mc-primary',rows.length?'':'disabled')}${d.assets.length?`<div class="mc-board-label">OWNED ASSETS (${d.assets.length})</div>${d.assets.map(a=>`<div class="mc-asset-row"><span>${esc(a.name)}</span><b>×${a.quantity}</b></div>`).join('')}`:''}</div>${tabs('/market',s)}`;}
function newMailOverlay(){return newMailNotice?`<div class="mc-overlay" role="dialog" aria-modal="true" aria-label="收到一条邮件"><section class="mc-dialog mc-mail-notice"><header>NEW MESSAGE ${at('mc-close-mail-notice','CLOSE','close')}</header><p>收到一条邮件</p><strong>【mirage】新订单</strong><div class="mc-dialog-buttons">${btn('mc-close-mail-notice','稍后查看','mc-secondary')}${btn('mc-open-kira-mail','打开 KIRA 邮件','mc-primary')}</div></section></div>`:'';}

export function render({store},loc){const s=store.get();if(!isMirageAuthenticated())return login(s);/* Original MIRAGE terminal, contacts, bounties, and market stay visible in every story version. */let body;if(loc.route.startsWith('/chat/'))body=chatPage(s,loc.route.slice(6));else if(loc.route==='/bounties')body=bountyPage(s);else if(loc.route.startsWith('/my-orders/'))body=myOrdersPage(s,loc.route.slice('/my-orders/'.length));else if(loc.route==='/bounties/completed')body=myOrdersPage(s,'completed');else if(loc.route.startsWith('/order/'))body=bountyDetail(s,loc.route.slice(7));else if(loc.route==='/market')body=market(s);else if(loc.route.startsWith('/product/'))body=product(s,loc.route.slice(9));else if(loc.route==='/cart')body=cart(s);else if(loc.route==='/wallet/bind')body=login(s,true);else if(loc.route.startsWith('/wallet'))body=walletPage(s,loc.route);else body=contactsPage(s);return `<div class="mc-screen">${telemetry()}<div class="mc-interface">${body}</div>${newMailOverlay()}</div>`;}
export function handle(action,t,ctx,loc){
 if(action==='mc-azathoth-reference'&&isStory55(ctx.store.get())&&ctx.store.get().day>=17)return ctx.router.open({appId:'browser',route:'/page',params:{page:'d17-azathoth'}});const id=t.dataset.id,s=ctx.store.get();
 if(action==='mc-exit'){ctx.router.back();return;}
 if(action==='mc-sign-up'&&!isMirageAuthenticated()){const message=t.closest('.mc-login')?.querySelector('.mc-signup-warning');if(message){message.classList.add('is-visible');message.style.opacity='1';clearTimeout(message._hideTimer);message._hideTimer=setTimeout(()=>{message.style.opacity='0';message.classList.remove('is-visible');},3800);}return;}
 if(!isMirageAuthenticated())return;
 if(action==='mc-ghost-project'){
  const c=ctx.store.get().content.conversations?.mirage?.find(c=>c.id===TAI_GHOST_THREAD);
  const m=c?.messages?.find(m=>m.id===t.dataset.messageId);
  if(m?.kind!=='ghost-project'||m.from!=='me'||m.attachment?.type!=='ghost-project'&&m.attachment?.type!=='ghost-order')return;
  const item=m.attachment,state=ctx.store.get();
  if(item.type==='ghost-project'&&!state.story55?.projects?.[item.projectId])return;
  if(item.type==='ghost-order'&&!state.ghost?.orders?.[item.orderId])return;
  return ctx.router.open({appId:'ghost',route:item.route,params:item.type==='ghost-project'?{project:item.projectId}:{orderId:item.orderId}});
 }
 if(action==='mc-flow-test'){ctx.store.update(state=>openFlowTest(state));ctx.router.open({appId:'ghost',route:'/flow-deploy',params:{}});return;}
 if(action==='mc-tab'){pendingDelete=null;goTab(ctx,t.dataset.route);}
 if(action==='mc-contacts'){if(loc.route.startsWith('/my-orders/'))goTab(ctx,'/bounties');else if(loc.route.startsWith('/chat/')||loc.route==='/manage')goTab(ctx,'/');else ctx.router.back();}
 if(action==='mc-chat'){
  ctx.store.update(s=>{
   const list=s.content.conversations.mirage||[],c=list.find(c=>c.id===id);
   if(c)c.lastOpened=Math.max(Date.now(),...list.map(x=>(Number(x.lastOpened)||0)+1));
  });
  route(ctx,'/chat/'+id);
 }
 if(action==='mc-decrypt'){decrypting.add(id);ctx.refresh();setTimeout(()=>{decrypting.delete(id);decrypted.add(id);ctx.refresh();},360);}
 if(action==='mc-encrypt'){decrypted.delete(id);ctx.refresh();}
 if(action==='mc-attach')ctx.pickImage(src=>sendMessage(ctx.store,{channel:'mirage',conversationId:id,text:src,kind:'image'}));
 if(action==='mc-my-orders')route(ctx,'/my-orders/active');
 if(action==='mc-order-view')goTab(ctx,'/my-orders/'+t.dataset.view);
 if(action==='mc-open-bounty')route(ctx,'/order/'+id);
 if(action==='mc-open-d01-mail')return ctx.router.open({appId:'kira',route:'/mail/d01-mirage001-attachment',params:{}});
 if(action==='mc-open-wallet-d06-mail')return ctx.router.open({appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}});
 if(action==='mc-open-linked-kira')return ctx.router.open({appId:'kira',route:'/mail/'+linkedMailId(id),params:{}});
 if(action==='mc-d02-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D02_MAIL,params:{}});
 if(action==='mc-d03-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D03_MAIL,params:{}});
 if(action==='mc-d04-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D04_MAIL(id),params:{}});
 // Cached old buttons follow the one approved KIRA file flow.
 if(action==='mc-d04-run')return ctx.router.open({appId:'kira',route:'/mail/'+D04_MAIL(id),params:{}});
 if(action==='mc-d03-run')return ctx.router.open({appId:'kira',route:'/mail/'+D03_MAIL,params:{}});
 if(action==='mc-d02-run'){const st=ctx.store.get(),seq=D02_STAGES[id];if(!seq)return;const nextIndex=seq.findIndex((_,i)=>st.ghost?.orders?.[d02StepId(id,i)]?.status!=='success');if(nextIndex<0)return ctx.toast('请返回 MIRAGE 提交');let step=d02StepId(id,nextIndex);ctx.store.update(n=>armD02Ghost(n,id,nextIndex));return ctx.router.open({appId:'ghost',route:'/contract',params:{orderId:step}});}
 if(action==='mc-d04-submit'){
  let ok=false;ctx.store.update(s=>{ok=submitD04Contract(s,id);});
  ctx.toast(ok?'✓ 文件已驗收 · 交易回執已寄送':'請先完成 GHOST 全部程序');
  if(ok)route(ctx,'/my-orders/completed');return;
 }
 if(action==='mc-d03-submit'){
  let ok=false;ctx.store.update(n=>{ok=submitD03Contract(n);});
  ctx.toast(ok?'✓ 文件已驗收 · 交易回執已寄送':'請先完成 GHOST 全部程序');
  if(ok)route(ctx,'/my-orders/completed');return;
 }
 if(action==='mc-d02-submit'){let ok=false;ctx.store.update(n=>{ok=submitD02(n,id);});ctx.toast(ok?'委托已提交，赏金到账':'先完成 GHOST 的所有关卡');if(ok)route(ctx,'/my-orders/completed');return;}
 if(action==='mc-accept-bounty'||action==='mc-complete-bounty'){
  if(id==='d01-hunt-view')return;
  if(action==='mc-accept-bounty'&&D04_ORDER_IDS.includes(id)){
   let ok=false;ctx.store.update(n=>{ok=acceptD04Contract(n,id);});
   ctx.toast(ok?'ORDER ACCEPTED · KIRA':'委託暫不可接取');
   if(ok)route(ctx,'/order/'+id);return;
  }
  if(action==='mc-accept-bounty'&&id===D03_ORDER){
   let ok=false;ctx.store.update(n=>{ok=acceptD03Contract(n);});
   ctx.toast(ok?'ORDER ACCEPTED · KIRA':'委託暫不可接取');
   if(ok)route(ctx,'/order/'+id);return;
  }
  if(action==='mc-accept-bounty'&&D02_STAGES[id]){let ok=false;ctx.store.update(n=>{ok=acceptD02(n,id);});if(!ok)return ctx.toast('该委托只可按 D02 规定接取');return route(ctx,'/order/'+id);}
  if(action==='mc-accept-bounty'&&id===D01_REPAIR){let ok=false;ctx.store.update(s=>{ok=acceptD01Repair(s);});ctx.toast(ok?'CONTRACT ACCEPTED · KIRA':'仅限 D01 接单，且委托必须为 OPEN');if(ok)setTimeout(()=>ctx.store.update(s=>deliverD01Attachment(s)),2000);return;}
  if(action==='mc-complete-bounty'&&linkedMission(s,id))return ctx.router.open({appId:'kira',route:'/mail/'+linkedMailId(id),params:{}});
  if(isStory55(s)&&id===STORY55_BOUNTY_ID){
   let accepted=false;
   if(action==='mc-accept-bounty')ctx.store.update(next=>{accepted=acceptStory55Wallet(next);});
   if(!accepted&&action==='mc-accept-bounty'){ctx.toast('挑战尚未开放或已接取');return;}
   ctx.router.open({appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}});
   return;
  }
  if(action==='mc-complete-bounty'&&id===WALLET_CHALLENGE_ID){
   const o=ctx.store.get().content.orders.find(x=>x.id===id);
   if(o?.status!=='ACCEPTED'){ctx.toast('CONTRACT NOT ACCEPTED');return;}
   ctx.store.update(s=>{
    const g=s.ghost??={orders:{},history:[],balance:0,config:{}};
    g.orderConfigs??={};
    g.orderConfigs[id]={seconds:90,rounds:1,codeLength:3,retries:3,reward:null};
    authorize(s,{orderId:id,type:'veil',mailId:null});
   });
   ctx.router.open({appId:'ghost',route:'/contract',params:{orderId:id}});
   return;
  }else if(action==='mc-accept-bounty'&&id===WALLET_CHALLENGE_ID){
   let accepted=false;ctx.store.update(s=>{accepted=acceptOuroborosChallenge(s);});
   ctx.toast(accepted?'ORDER CREATED · 10 BTC':'ORDER NOT AVAILABLE');
  }else if(action==='mc-accept-bounty'&&linkedMission(ctx.store.get(),id)){
   let accepted=false;
   ctx.store.update(s=>{accepted=acceptLinkedMission(s,id);});
   ctx.toast(accepted?'ORDER ACCEPTED · KIRA':'ORDER ALREADY ACCEPTED');
  }else if(action==='mc-accept-bounty'&&id===HACKER_BOUNTY_ID){
   newMailNotice=true;acceptHackerBounty(ctx.store);ctx.refresh();
  }else{
   ctx.store.update(s=>{const o=s.content.orders.find(x=>x.id===id);if(o)o.status=action==='mc-accept-bounty'?'ACCEPTED':'COMPLETED';});
   ctx.toast(action==='mc-accept-bounty'?'CONTRACT ACCEPTED':'CONTRACT COMPLETED');
  }
  if(action==='mc-complete-bounty')goTab(ctx,'/bounties/completed');
 }
 if(action==='mc-close-mail-notice'){newMailNotice=false;ctx.refresh();}
 if(action==='mc-open-kira-mail'){newMailNotice=false;ctx.router.open({appId:'kira',route:'/mail/'+HACKER_MAIL_ID});}
 if(action==='mc-wallet')return route(ctx,'/wallet');
  if(action==='mc-wallet-back'||action==='mc-wallet-cancel-transfer'){ctx.router.back();return;}
 if(action==='mc-bind-wallet')return route(ctx,'/wallet/bind');
 if(action==='mc-wallet-main')return route(ctx,'/wallet/main');
 if(action==='mc-wallet-usd')return route(ctx,'/wallet/usd');
 if(action==='mc-wallet-detail')return route(ctx,'/wallet/'+D13_WALLET_ID);
 if(action==='mc-wallet-transfer')return route(ctx,'/wallet/'+D13_WALLET_ID,{confirm:'yes'});
 if(action==='mc-wallet-transfer-confirm'){
  const status=nodeStatus(ctx.store.get(),'d13-wallet-transfer');
  if(status.state!=='ready')throw Error(status.reason);
  ctx.store.update(n=>{if(!transferD13Wallet(n))throw Error('轉帳尚未完成');});
  return;
 }
 if(action==='mc-product')route(ctx,'/product/'+id);if(action==='mc-cart')route(ctx,'/cart');
 if(action==='mc-filter'){filter=t.dataset.category;ctx.refresh();}
 if(action==='mc-add-cart'){ctx.store.update(s=>{const d=s.content.mirage,p=d.products.find(x=>x.id===id),row=d.cart.find(x=>x.id===id);if(!p||Number(p.stock)<(row?.qty||0)+1)throw Error('INSUFFICIENT STOCK');if(row)row.qty++;else d.cart.push({id,qty:1});});ctx.toast('ADDED TO CART');}
 if(action==='mc-cart-minus'||action==='mc-cart-remove')ctx.store.update(s=>{const d=s.content.mirage,row=d.cart.find(x=>x.id===id);if(!row)return;if(action==='mc-cart-remove'||row.qty===1)d.cart=d.cart.filter(x=>x.id!==id);else row.qty--;});
 if(action==='mc-checkout'){purchase(ctx.store);ctx.toast('PURCHASE COMPLETE / ASSETS UPDATED');}
 if(action==='mc-export')ctx.download();
 if(action==='mc-logout'){setMirageAuthenticated(false);decrypted.clear();pendingDelete=null;goTab(ctx,'/');}
}

export function submit(form,ctx,loc){const fd=new FormData(form),f=form.dataset.form,val=n=>String(fd.get(n)||'').trim();
 if(f==='mc-login'){if(val('account')!==MIRAGE_ACCOUNT||val('password')!==MIRAGE_PASSWORD){ctx.toast('ACCOUNT OR PASSWORD INCORRECT');return;}initializeMirage(ctx.store);ctx.store.update(s=>{s.content.mirage.account=MIRAGE_ACCOUNT;flowOnMirageEntry(s);});setMirageAuthenticated(true);goTab(ctx,(loc?.route?.startsWith('/chat/')||loc?.route?.startsWith('/wallet'))?loc.route:'/');return;}
 if(!isMirageAuthenticated())return;
 if(f==='mc-send'){
  const text=val('text'),id=form.dataset.id;
  if(text){
   form.elements.text.value='';decrypted.add(id);
   if(id===TAI_GHOST_THREAD&&isStory55(ctx.store.get())&&ctx.store.get().day>=15&&ctx.store.get().day<=24&&/熙泰/u.test(text)){
    ctx.store.update(s=>{if(s.drafts)delete s.drafts[id];});return;
   }
   // During Tai's first takeover, the phone's real SEND action commits an
   // Xi Meng outgoing bubble. This is not a Tai/NPC reply or a free-chat turn.
   if(id===TAI_GHOST_THREAD&&
      ctx.store.get().story55?.ghostShare?.phase==='controlling'&&
      ctx.store.get().story55?.ghostShare?.remote?.active){
    // During exclusive control no human/free-chat fallback is permitted.
    // Only Tai's one authored sentence can pass the native outgoing path.
    if(canSendGhostShareRemoteText(ctx.store.get(),text))
     ctx.store.update(s=>sendGhostShareRemoteText(s,text));
    return;
   }
   const scripted=scriptedDraft55(ctx.store.get(),'mirage',id);
   if(scripted){
    // Native story55 send gate: only player action creates the green bubble.
    ctx.store.update(s=>sendScriptedDraft55(s,'mirage',id,text));
    return;
   }
   if(currentScript55(ctx.store.get(),'mirage',id)){
    ctx.toast('請等待對方的消息');
    return;
   }
   if(isOuroborosScriptActive(ctx.store.get(),id)){
    let completed=false;ctx.store.update(s=>{completed=sendOuroborosPreset(s,id,text);});
    if(!completed)ctx.toast('请先发送已经输入的内容');
    return;
   }
   const messageId=sendMessage(ctx.store,{channel:'mirage',conversationId:id,text});
   if(id===D01_CONTACT)ctx.store.update(s=>queueD01ContactReply(s,id));
   if(id===D02_TALIA)ctx.store.update(s=>onD02TaliaMessage(s,id,text));
   const contact=ctx.store.get().content.conversations.mirage?.find(c=>c.id===id);
   if(mirageAIEnabled(ctx.store.get())&&/(ouroboros|衔尾蛇)/i.test(contact?.name||''))setTimeout(()=>replyToOuroboros(ctx,id,messageId).catch(e=>ctx.toast('MIRAGE AI：'+e.message)),3200);
  }
 }
 if(f==='mc-wallet-bind'){
  if(val('account')!==MIRAGE_ACCOUNT||val('password')!==MIRAGE_PASSWORD){ctx.toast('ACCOUNT OR PASSWORD INCORRECT');return;}
  let bound=false;ctx.store.update(s=>{bound=bindD13Wallet(s);});
  if(!bound){ctx.toast('目前沒有待綁定錢包');return;}
  form.reset();return route(ctx,'/wallet');
 }
 if(f==='mc-exchange'){exchange(ctx.store,val('amount'));return;}

}
export function input(el,ctx){if(el.name==='mc-search'){query=el.value;ctx.refresh();return;}if(el.name==='text'&&el.form?.dataset.form==='mc-send')ctx.store.update(s=>{s.drafts[el.form.dataset.id]=el.value;});}
export function change(el,ctx){if(el.name==='mc-search'){query=el.value;ctx.refresh();}}
