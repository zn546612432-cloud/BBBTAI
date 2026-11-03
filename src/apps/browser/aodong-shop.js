// Offline, fictional Aodong electronics storefront in the in-game Safari browser.
import {esc} from '../../system/ui.js';
import {D02_PARTS,d02CompleteBuild} from '../../story/d02/runtime.js';
export const AODONG_PRODUCTS=[
 {id:'ad-cpu',category:'cpu',name:'AMD Ryzen 9 9950X',spec:'16核32线程 · AM5',price:549,icon:'◈'},
 {id:'ad-board',category:'motherboard',name:'ASRock X870E Creator',spec:'DDR5 · PCIe 5.0 · AM5',price:349,icon:'▤'},
 {id:'ad-gpu',category:'gpu',name:'GeForce RTX 5070 Ti 16GB',spec:'16GB GDDR7 · 图形计算',price:849,icon:'▣'},
 {id:'ad-ram',category:'ram',name:'DDR5 64GB 6000MHz (2×32)',spec:'双通道大内存',price:189,icon:'▥'},
 {id:'ad-ssd',category:'ssd',name:'Samsung 990 PRO 4TB',spec:'NVMe · PCIe 4.0',price:339,icon:'▰'},
 {id:'ad-psu',category:'psu',name:'Corsair RM1000x 1000W',spec:'80 PLUS Gold',price:169,icon:'◉'},
 {id:'ad-cooler',category:'cooler',name:'Noctua NH-D15 G2',spec:'AM5 双塔风冷',price:149,icon:'❄'},
 {id:'ad-case',category:'case',name:'Fractal Design Define 7',spec:'ATX · 静音机箱',price:189,icon:'▧'}
];
const CATS={cpu:'处理器',motherboard:'主板',gpu:'显卡',ram:'内存',ssd:'固态硬盘',psu:'电源',cooler:'散热',case:'机箱'};
export const aodongSale=s=>s.story55?.version===1&&s.day>=2&&s.day<=13;
export const aodongPrice=(s,p)=>Math.round(p.price*(aodongSale(s) ? 0.8 : 1)*100)/100;
const cash=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const data=s=>s.story55?.d02||{};
const cartRows=s=>(data(s).cart||[]).map(row=>({row,p:AODONG_PRODUCTS.find(p=>p.id===row.id)})).filter(x=>x.p);
const cartTotal=s=>cartRows(s).reduce((acc,{p,row})=>acc+aodongPrice(s,p)*row.qty,0);
const css='<style>'+
'.aod{font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;background:#f5f6f8;min-height:100%;color:#19202b;padding-bottom:20px}.aod *{box-sizing:border-box}.aod button{font:inherit;cursor:pointer}'+
'.aod-top{display:flex;align-items:center;justify-content:space-between;padding:14px 10px;background:white;position:sticky;top:0;z-index:3;border-bottom:1px solid #f0f0f0}.aod-top b{font-size:18px;color:#e83747}.aod-top small{display:block;font-size:10px;color:#697182}.aod-top button{background:none;border:0;color:#242b38;font-size:12px}'+
'.aod-hero{margin:12px;border-radius:19px;padding:22px 20px;background:linear-gradient(112deg,#a91732,#ef4b58 62%,#ff978e);color:white;box-shadow:0 6px 24px #e837472a}.aod-hero small{font-size:10px;letter-spacing:2px}.aod-hero h1{font-size:28px;line-height:1.22;margin:12px 0}.aod-hero p{font-size:12px;margin:8px 0}.aod-hero strong{font-size:25px}'+
'.aod-pills{display:flex;gap:8px;padding:4px 13px 13px;overflow:auto}.aod-pill{background:white;white-space:nowrap;padding:8px 11px;border-radius:12px;color:#727887;font-size:11px}.aod-section{font-size:16px;font-weight:750;margin:12px 16px}.aod-section small{font-size:11px;color:#7b8290;font-weight:400}'+
'.aod-products{padding:0 12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.aod-card{background:white;border:1px solid #ebedf1;border-radius:15px;padding:10px;min-width:0;overflow:hidden}.aod-visual{height:102px;background:linear-gradient(140deg,#e4e9ef,#f7f8fb);display:flex;align-items:center;justify-content:center;border-radius:12px;color:#71869f;position:relative}.aod-visual b{font-size:49px;font-weight:300}.aod-visual small{position:absolute;top:7px;left:7px;background:#e83747;color:white;border-radius:5px;padding:3px 5px;font-size:9px}'+
'.aod-card h3{font-size:12px;line-height:1.35;min-height:35px;margin:11px 0 5px;overflow-wrap:anywhere}.aod-card p{font-size:10px;color:#7f8590;min-height:30px;margin:0 0 8px}.aod-pricing{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.aod-price{font-size:16px;font-weight:800;color:#df293c}.aod-was{font-size:10px;color:#9da1aa;text-decoration:line-through}.aod-buy{width:100%;background:#191f2b;color:white;border:0;border-radius:9px;font-size:12px;margin-top:10px;padding:9px 5px}.aod-sold{background:#e9f7ee;color:#248852}'+
'.aod-foot{margin:18px 15px 0;color:#9296a0;font-size:10px;text-align:center;line-height:1.7}.aod-row{margin:12px;background:white;border-radius:13px;padding:13px;display:flex;gap:12px;align-items:center}.aod-row i{font-size:30px;background:#f0f2f6;border-radius:9px;padding:9px;font-style:normal}.aod-row strong{font-size:12px}.aod-row p{color:#818898;font-size:11px;margin:4px 0}.aod-row b{color:#db2c45}.aod-qty{margin-left:auto;display:flex;align-items:center;gap:6px}.aod-qty button{border:1px solid #d6dce5;border-radius:6px;background:white;width:23px;height:24px}.aod-checkout{position:sticky;bottom:0;background:white;border-top:1px solid #ecedf0;padding:15px}.aod-checkout p{font-size:13px;display:flex;justify-content:space-between;margin:0 0 8px}.aod-checkout button{background:#dc3246;color:white;border:0;border-radius:10px;width:100%;padding:12px}.aod-empty{text-align:center;padding:50px 20px;color:#8992a0}.aod-progress{margin:12px;background:white;padding:13px;border-radius:12px;font-size:12px;color:#667}.aod-progress b{color:#df3450}'+
'</style>';
const hdr=(subtitle='电脑数码 / 2025')=>'<header class="aod-top"><button type="button" data-action="browser-aodong-home">‹ 返回</button><div><b>澳东商城</b><small>'+subtitle+'</small></div><button data-action="browser-aodong-cart">购物车 ♧</button></header>';
export function renderAodong(s,loc){
 const cart=loc.route==='/aodong-cart',owned=new Set((data(s).purchased||[]).map(p=>p.category));
 let body='';
 if(cart){
  body=hdr('购物车')+'<h2 class="aod-section">我的购物车</h2>'+
   (cartRows(s).length?cartRows(s).map(({p,row})=>'<div class="aod-row"><i>'+p.icon+'</i><div><strong>'+esc(p.name)+'</strong><p>'+esc(CATS[p.category])+'</p><b>'+cash(aodongPrice(s,p)*row.qty)+'</b></div><div class="aod-qty"><button data-action="browser-aodong-minus" data-id="'+p.id+'">−</button>'+row.qty+'<button data-action="browser-aodong-add" data-id="'+p.id+'">+</button></div></div>').join(''):'<p class="aod-empty">购物车还是空的</p>')+
   '<div class="aod-checkout"><p><span>折后合计</span><strong>'+cash(cartTotal(s))+'</strong></p><p><span>银行可用余额</span><span>'+cash(s.bankData?.balance)+'</span></p><button data-action="browser-aodong-pay">确认购买（游戏内交易）</button></div>';
 }else{
  body=hdr()+'<div class="aod-hero"><small>MAY TECH FESTIVAL · 2025</small><h1>五月澳东<br>电脑数码打八折</h1><p>精选硬件 · 本地到货 · '+(aodongSale(s)?'活动进行中':'活动已结束')+'</p><p><strong>8折</strong>　电子产品专场</p></div><div class="aod-pills">'+Object.values(CATS).map(label=>'<span class="aod-pill">'+label+'</span>').join('')+'</div><div class="aod-progress">工作站配件已购齐 <b>'+owned.size+'/'+D02_PARTS.length+'</b>　'+(d02CompleteBuild(s)?'✓ 可以去提醒事项划掉任务':'还差 '+(D02_PARTS.length-owned.size)+' 类')+'</div><div class="aod-section">热门配置 <small>· 2025 年剧情价</small></div><div class="aod-products">'+AODONG_PRODUCTS.map(p=>'<article class="aod-card"><div class="aod-visual"><small>官方促销</small><b>'+p.icon+'</b></div><h3>'+esc(p.name)+'</h3><p>'+esc(p.spec)+'</p><div class="aod-pricing"><span class="aod-price">'+cash(aodongPrice(s,p))+'</span><s class="aod-was">'+cash(p.price)+'</s></div><button class="aod-buy '+(owned.has(p.category)?'aod-sold':'')+'" data-action="browser-aodong-add" data-id="'+p.id+'">'+(owned.has(p.category)?'已购买 · 再加购':'加入购物车 +')+'</button></article>').join('')+'</div><p class="aod-foot">虚构店铺 · 价格仅供游戏剧情使用<br>所有购买均为游戏模拟，不会发生真实付款。</p>';
 }
 return '<div class="aod">'+css+body+'</div>';
}
export function handleAodong(a,t,c){
 if(!a.startsWith('browser-aodong-'))return false;
 const action=a.slice('browser-aodong-'.length),id=t.dataset.id,product=AODONG_PRODUCTS.find(p=>p.id===id);
 if(action==='home'){c.router.open({appId:'browser',route:'/aodong',params:{}});return true;}
 if(action==='cart'){c.router.open({appId:'browser',route:'/aodong-cart',params:{}});return true;}
 if((action==='add'||action==='minus')&&product){
  c.store.update(s=>{if(!s.story55?.d02)return;const cart=s.story55.d02.cart??(s.story55.d02.cart=[]),row=cart.find(r=>r.id===id);
   if(action==='add'){if(row)row.qty=Math.min(9,row.qty+1);else cart.push({id,qty:1});}
   else if(row){row.qty--;if(row.qty<=0)cart.splice(cart.indexOf(row),1);}
  });c.toast?.(action==='add'?'已加入购物车':'已调整数量');return true;
 }
 if(action==='pay'){
  let result='empty';
  c.store.update(s=>{
   const d=s.story55?.d02;if(!d||!d.cart?.length)return;
   const rows=cartRows(s),total=cartTotal(s);if(!rows.length)return;
   if((Number(s.bankData?.balance)||0)<total){result='balance';return;}
   s.bankData.balance=Math.round((s.bankData.balance-total)*100)/100;
   s.bankData.transactions??=[];
   s.bankData.transactions.unshift({id:'aodong-purchase-'+Date.now(),label:'澳东商城 电脑配件',amount:-total,day:s.day,time:s.clock});
   d.purchased??=[];for(const {p,row} of rows)d.purchased.push({id:p.id,category:p.category,qty:row.qty,price:aodongPrice(s,p),day:s.day,clock:s.clock});
   d.cart=[];result='ok';
  });
  if(result==='balance')c.toast?.('银行余额不足，先完成委托再来购买。');
  else if(result==='ok'){c.toast?.('购买成功！可以继续配齐工作站。');c.router.open({appId:'browser',route:'/aodong',params:{}});}
  else c.toast?.('购物车为空');
  return true;
 }
 return true;
}
