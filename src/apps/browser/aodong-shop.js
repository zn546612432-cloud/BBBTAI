import {LEGACY_PRODUCTS} from './aodong-legacy.js';
import {esc} from '../../system/ui.js';
import {HARDWARE_GOAL,hardwareOwned} from '../../story/d02/hardware.js';
export {HARDWARE_GOAL} from '../../story/d02/hardware.js';
const prices=[680,11446,280,480,1400,420,690,9800,1800,1180,1900];
const tiles=[0,1,2,3,4,5,6,7,8,9,0];
const orderDate=day=>new Date(Date.parse('2025-05-19T00:00:00Z')+(Number(day)-1)*86400000).toISOString().slice(0,10);
// Prices are authored in-world USD prices. Specs and quantities follow the uploaded list.
export const AODONG_PRODUCTS=[...HARDWARE_GOAL.map((p,i)=>({...p,price:prices[i],tile:tiles[i],section:'hardware',spec:p.name,goal:p.qty})),
 {id:'daily-headphones',name:'无线头戴式耳机',spec:'降噪 · 蓝牙 · 轻量耳罩',price:89,tile:10,section:'digital'},
 {id:'daily-groceries',name:'每日鲜选生活组合',spec:'牛奶与时令鲜果 · 家庭装',price:19,tile:11,section:'daily'},...LEGACY_PRODUCTS.map(p=>({...p,tile:({cpu:1,motherboard:6,gpu:7,ram:3,ssd:4,psu:8,cooler:2,case:0})[p.category],section:'hardware',legacy:true}))];
export const aodongSale=s=>s.story55?.version===1&&s.day>=2&&s.day<=13;
export const aodongPrice=(s,p)=>Math.round(p.price*(p.section==='hardware'&&aodongSale(s)?0.8:1)*100)/100;
const data=s=>s.story55?.d02||{};
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const rows=s=>(data(s).cart||[]).map(row=>({row,p:AODONG_PRODUCTS.find(p=>p.id===row.id)})).filter(x=>x.p&&Number.isInteger(x.row.qty)&&x.row.qty>0);
const total=s=>Math.round(rows(s).reduce((n,{p,row})=>n+aodongPrice(s,p)*row.qty,0)*100)/100;
const btn=(a,text,extra='')=>`<button type="button" data-action="browser-aodong-${a}" ${extra}>${text}</button>`;
const pic=(p,cls='')=>`<div class="aod-photo ${cls}" role="img" aria-label="${esc(p.name)} 商品示意图" style="--px:${(p.tile%4)*100/3}%;--py:${Math.floor(p.tile/4)*50}%"></div>`;
const tabs=[['all','精选'],['hardware','电脑配件'],['digital','数码影音'],['daily','生活食品']];
function nav(){return `<nav class="aod-nav">${btn('home','⌂<span>首页</span>')}${btn('category','▦<span>分类</span>','data-category="hardware"')}${btn('cart','♧<span>购物车</span>')}${btn('orders','☰<span>我的订单</span>')}</nav>`;}
function header(s,subtitle='澳门本地 · 好物到家'){return `<header class="aod-top"><div><b>澳东<span>商城</span></b><small>${subtitle}</small></div>${btn('plan','我的采购清单','class="aod-plan-link"')}</header><form data-form="aodong-search" class="aod-search"><span>⌕</span><input name="query" aria-label="搜索商城商品" placeholder="搜索商品、品牌、型号" value="${esc(data(s).shopQuery||'')}"><button>搜索</button></form>`;}
function card(s,p){return `<article class="product-card"><button class="aod-product-open" data-action="browser-aodong-product" data-id="${p.id}"><div class="product-card__img">${pic(p)}<span class="aod-badge">${p.goal?'澳东自营':'生活精选'}</span></div><div class="product-card__body"><small class="product-card__brand">${p.goal?'专业硬件 / 单件价格':'每日好物'}</small><h3 class="product-card__name">${esc(p.name)}</h3><div class="product-card__price"><b>${money(aodongPrice(s,p))}</b>${aodongPrice(s,p)<p.price?`<s>${money(p.price)}</s>`:''}</div></div></button>${btn('add','加入购物车','data-id="'+p.id+'" class="aod-add"')}</article>`;}
export function renderAodong(s,loc){
 const d=data(s),route=loc.route,chosen=d.shopCategory||'all',query=(d.shopQuery||'').toLowerCase();let body='';
 if(route==='/aodong-product'){
  const p=AODONG_PRODUCTS.find(p=>p.id===loc.params?.product);
  if(!p)body='<p class="aod-empty">此商品暂不可用</p>';
  else body=`${btn('home','‹ 返回商城','class="aod-back"')}${pic(p,'aod-detail-photo')}<div class="aod-panel"><div class="aod-detail-price">${money(aodongPrice(s,p))}<small>USD / 件</small></div><h2>${esc(p.name)}</h2><p>${esc(p.spec)}</p><p class="aod-muted">商品示意图，具体规格以文字说明为准。</p><dl><dt>销售服务</dt><dd>澳东自营 · 澳门配送</dd><dt>规格与数量</dt><dd>${p.goal?'采购清单计划 '+p.goal+' 件，可分批购买':'可在购物车调整数量'}</dd><dt>安装支持</dt><dd>${p.goal?'随硬件订单提供 CUDA 驱动、工具包与 Samples，以及 TensorFlow / PyTorch 安装支持':'订单内查看配送信息'}</dd></dl>${btn('add','加入购物车','data-id="'+p.id+'" class="aod-primary"')}${btn('cart','查看购物车','class="aod-secondary"')}</div>`;
 }else if(route==='/aodong-plan'){
 const goals=HARDWARE_GOAL.map(g=>{const p=AODONG_PRODUCTS.find(p=>p.id===g.id),owned=hardwareOwned(s,g.id);return `<div class="aod-goal"><div><strong>${esc(g.name)}</strong><small>已购 ${owned} / ${g.qty} 件</small></div>${btn('product',owned>=g.qty?'查看':'选购','data-id="'+g.id+'"')}</div>`;}).join('');
 body=`${btn('home','‹ 返回商城','class="aod-back"')}<div class="aod-panel"><small class="aod-eyebrow">我的采购清单</small><h2>机房 · 工作站升级</h2><p class="aod-muted">按需添置，分批购齐。购买记录会一直保留。</p>${goals}<p class="aod-muted">系统授权计一份。CUDA 环境与应用软件安装支持随单提供。</p></div>`;
 }else if(route==='/aodong-cart'||route==='/aodong-checkout'){
 const checkout=route==='/aodong-checkout';body=`${btn('home','‹ 返回商城','class="aod-back"')}<h2 class="aod-heading">${checkout?'确认订单':'购物车'}</h2>`;
 body+=rows(s).map(({p,row})=>`<div class="aod-row">${pic(p)}<div><strong>${esc(p.name)}</strong><b>${money(aodongPrice(s,p))}</b><div class="aod-quantity">${btn('minus','−',`data-id="${p.id}" aria-label="减少 ${esc(p.name)} 数量"`)}<span>${row.qty}</span>${btn('add','＋',`data-id="${p.id}" aria-label="增加 ${esc(p.name)} 数量"`)}</div></div></div>`).join('')||'<p class="aod-empty">购物车还是空的，去看看喜欢的商品吧。</p>';
 if(rows(s).length)body+=`<div class="aod-panel">${checkout?'<h3>配送信息</h3><p>陈熙蒙 · 澳门 · 默认收货地址</p><p class="aod-muted">配送至已保存地址，运费 $0.00</p><h3>付款方式</h3><p>太平洋银行 · 账户余额支付</p>':''}<p class="aod-total"><span>商品合计 · USD</span><b>${money(total(s))}</b></p><p class="aod-total aod-muted"><span>银行可用余额</span><span>${money(s.bankData?.balance)}</span></p>${btn(checkout?'pay':'checkout',checkout?'确认付款':'去结算','class="aod-primary"')}</div>`;
 }else if(route==='/aodong-orders'){
 body=`${btn('home','‹ 返回商城','class="aod-back"')}<h2 class="aod-heading">我的订单</h2>`+(d.shopOrders||[]).map(o=>`<article class="aod-panel"><div class="aod-total"><small>${esc(o.number)}</small><b class="aod-green">付款成功</b></div><p class="aod-muted">${orderDate(o.day)} · ${esc(o.clock)}　${money(o.total)}</p>${o.items.map(i=>`<p>${esc(i.name)} × ${i.qty}</p>`).join('')}<p class="aod-muted">配送至默认收货地址 · 已提交配送安排</p></article>`).join('');
 if(!d.shopOrders?.length)body+='<p class="aod-empty">还没有订单，已购配件可在采购清单查看。</p>';
 }else{
 const list=AODONG_PRODUCTS.filter(p=>!p.legacy&&(chosen==='all'||chosen===p.section)&&(!query||(p.name+' '+p.spec).toLowerCase().includes(query)));
 body=`${header(s)}<div class="aod-categories">${tabs.map(([id,label])=>btn('category',label,`data-category="${id}" class="${chosen===id?'active':''}"`)).join('')}</div>`;
 if(!query&&chosen==='all')body+=`<section class="aod-hero"><div><small>MAY / 澳东好物季</small><h1>五月好物上新<br>专业算力之选</h1><p>${aodongSale(s)?'五月数码专场 · 配件全场八折':'专业硬件 · 按需选购'}</p>${btn('category','逛电脑配件 →','data-category="hardware"')}</div><div class="aod-hero-art">${pic(AODONG_PRODUCTS[0])}</div></section><div class="aod-services"><span>澳东自营</span><span>澳门配送</span><span>订单可查</span></div>`;
 body+=`<div class="aod-section"><h2>${query?'搜索结果':tabs.find(t=>t[0]===chosen)?.[1]||'为你精选'}</h2><small>${list.length} 件好物</small></div><div class="products-grid">${list.map(p=>card(s,p)).join('')}</div>${!list.length?'<p class="aod-empty">没有找到相关商品，换个关键词试试。</p>':''}`;
 }
 return `<div class="aod">${body}<footer class="aod-footer">澳东商城　AODONG<br>澳门本地 · 好物到家</footer>${nav()}</div>`;
}
function go(c,route,params={}){c.router.open({appId:'browser',route,params});}
export function submitAodong(form,c){if(form.dataset.form!=='aodong-search')return false;const query=String(new FormData(form).get('query')||'').trim();c.store.update(s=>{if(s.story55?.d02){s.story55.d02.shopQuery=query;s.story55.d02.shopCategory='all';}});go(c,'/aodong');return true;}
export function handleAodong(a,t,c){
 if(!a.startsWith('browser-aodong-'))return false;
 const action=a.slice(15),id=t.dataset.id,p=AODONG_PRODUCTS.find(p=>p.id===id);
 if(['home','cart','orders','plan','checkout'].includes(action)){if(action==='checkout'&&!rows(c.store.get()).length){c.toast?.('购物车为空');return true;}go(c,action==='home'?'/aodong':'/aodong-'+action);return true;}
 if(action==='category'){c.store.update(s=>{if(s.story55?.d02){s.story55.d02.shopCategory=t.dataset.category||'all';s.story55.d02.shopQuery='';}});go(c,'/aodong');return true;}
 if(action==='product'&&p){go(c,'/aodong-product',{product:id});return true;}
 if((action==='add'||action==='minus')&&p){c.store.update(s=>{const d=s.story55?.d02;if(!d)return;const cart=d.cart??=[],row=cart.find(r=>r.id===id);if(action==='add'){if(row)row.qty=Math.min(99,row.qty+1);else cart.push({id,qty:1});}else if(row){row.qty--;if(row.qty<=0)cart.splice(cart.indexOf(row),1);}});if(action==='add')c.toast?.('已加入购物车');return true;}
 if(action==='pay'){
  let result='empty';c.store.update(s=>{const d=s.story55?.d02;if(!d)return;const cart=rows(s),sum=total(s);if(!cart.length)return;
   if((Number(s.bankData?.balance)||0)<sum){result='balance';return;}
   const seq=(d.shopOrderSequence||0)+1;d.shopOrderSequence=seq;const number='AD-'+String(s.day).padStart(2,'0')+'-'+String(seq).padStart(4,'0');
   s.bankData.balance=Math.round((s.bankData.balance-sum)*100)/100;s.bankData.transactions??=[];s.bankData.transactions.unshift({id:'aodong-'+number,label:'澳东商城 '+number,amount:-sum,day:s.day,time:s.clock});
   d.purchased??=[];for(const {p,row} of cart)d.purchased.push({id:p.id,category:p.category,qty:row.qty,price:aodongPrice(s,p),day:s.day,clock:s.clock,order:number});
   d.shopOrders??=[];d.shopOrders.unshift({number,day:s.day,clock:s.clock,total:sum,items:cart.map(({p,row})=>({id:p.id,name:p.name,qty:row.qty,price:aodongPrice(s,p)}))});d.cart=[];result='ok';
  });if(result==='balance')c.toast?.('余额不足，可调整购物车后再试。');else if(result==='ok'){c.toast?.('付款成功');go(c,'/aodong-orders');}else c.toast?.('购物车为空');return true;
 }
 return true;
}
