import {isStory55} from '../../services/story55/state.js';
import {files55} from '../../services/story55/views.js';
import {btn,card,esc} from '../../system/ui.js';
import {linkedArtifacts} from '../mirage/linked-contract-runtime.js';
import {linkedMission} from '../mirage/linked-missions.js';
import {D01_REPAIR,D01_ATTACHMENT,revealD01Key} from '../../story/d01/runtime.js';
import {authorize} from '../ghost/state.js';
function d01FileAvailable(s){
 return !!s.story55?.d01?.repairAccepted&&s.content.mail.some(m=>m.id===D01_ATTACHMENT);
}
function d01FilePreview(s){
 if(!d01FileAvailable(s))return '<div class="page-pad">無法打開附件 · 郵件或憑證不可用</div>';
 const d=s.story55.d01,progress=Math.min(100,(d.completedRounds||0)*20);
 const status=d.rewardPaid?'已完成驗收':d.submitted?'正在驗收':progress?'修復進度 '+progress+'%':'已加密';
 return `<div class="files-d01-preview">
  <header class="files-d01-nav"><button type="button" data-action="files-d01-back">‹　KIRA</button><span>檔案預覽</span><span aria-hidden="true">•••</span></header>
  <section class="files-d01-document" aria-label="加密密鑰檔案">
   <div class="files-d01-document-symbol" aria-hidden="true"><svg viewBox="0 0 64 80" fill="none"><path d="M14 2h28l19 19v50c0 4-3 7-7 7H14c-7 0-11-4-11-11V13C3 6 7 2 14 2Z" stroke="currentColor" stroke-width="3"/><path d="M42 3v19h19" stroke="currentColor" stroke-width="3"/><path d="M25 43h16m-16 9h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div>
   <h1>mirage001.key</h1><p>加密憑證 · MIRAGE</p><span class="files-d01-status">${status}</span>
   <p class="files-d01-explanation">此加密檔案無法直接預覽。已找到可以處理此格式的應用程式。</p>
  </section>
  <section class="files-d01-open-with" aria-label="打開方式">
   <small>使用應用程式打開</small>
   <button type="button" class="files-d01-open-app" data-action="files-d01-open-ghost">
    <span class="files-d01-ghost-icon" aria-hidden="true">G</span>
    <span><strong>GHOST</strong><small>${d.deployed?'繼續數據修復':'加密檔案處理工具'}</small></span>
    <span aria-hidden="true" class="files-d01-chevron">›</span>
   </button>
  </section>
 </div>`;
}
export const manifest={id:'files',name:'文件',icon:15,defaultRoute:'/',supportsDeepLink:true,kicker:'ON THIS PHONE'};
export function render({store},loc){const state=store.get();if(loc.route==='/attachment/d01-mirage001')return d01FilePreview(state);if(loc.route.startsWith('/linked/')){const id=decodeURIComponent(loc.route.slice('/linked/'.length)),files=linkedArtifacts(state).filter(f=>f.orderId===id),mission=linkedMission(state,id);
 const d02File=(state.content.missionFiles||[]).find(f=>f.orderId===id&&f.id==='d02-target-intelligence.enc');
 if(d02File)return '<div class="page-pad"><span class="eyebrow">ON THIS PHONE / GHOST · D02</span><div class="large-title">'+esc(d02File.title)+'</div>'+card('<strong>目标资料包 · 已完整提取</strong><p>芯片标识：TALIA-CHIP-0520</p><p>加密状态：DECRYPTED / VERIFIED</p><p>数据包类型：身份索引、通信摘要、访问日志（剧情虚构）</p><p>操作结果：链路已验证，痕迹已隐匿，资料已回收。</p><small>D'+esc(d02File.createdDay)+' · '+esc(d02File.createdTime)+'</small>')+btn('d02-return','‹ 返回 MIRAGE 查看委托','button-quiet wide')+'</div>';
 return '<div class="page-pad"><span class="eyebrow">ON THIS PHONE / GHOST</span><div class="large-title">'+esc(mission?.title||'加密成果')+'</div>'+files.map(f=>card('<strong>'+esc(f.title)+'</strong><p>'+esc(f.description)+'</p><small>D'+esc(f.createdDay)+' · '+esc(f.createdTime)+'</small>')).join('')+(files.length?'':'<p>尚无成果文件。完成 GHOST 后会自动生成。</p>')+btn('linked-return','‹ 返回 KIRA 选择附件','button-quiet wide','data-order="'+esc(id)+'"')+'</div>';}if(isStory55(state))return files55(state,loc);const mail=store.get().content.mail.find(m=>m.id===loc.params.mailId);if(loc.route==='/attachment'&&mail)return `<div class="page-pad"><span class="eyebrow">附件</span><div class="large-title">${esc(mail.subject)}</div>${card(`<p>${esc(mail.body)}</p>`)}${btn('open-map','打开邮件地点 → 地图','button-quiet wide')}</div>`;return `<div class="page-pad"><div class="large-title">文件</div><div class="surface-list">${btn('export-backup','<span class="file-symbol">▤</span><span class="list-copy"><strong>导出本机备份</strong><small>本机数据</small></span>','list-row')}${btn('open-photos','<span class="file-symbol">▧</span><span class="list-copy"><strong>图片</strong><small>本机相册</small></span>','list-row')}</div></div>`;}
export function handle(a,t,c){if(a==='files-d01-back')return c.router.open({appId:'kira',route:'/mail/'+D01_ATTACHMENT,params:{}});
if(a==='files-d01-open-ghost'){
 const s=c.store.get();if(!d01FileAvailable(s))return c.toast?.('附件未授權');
 c.store.update(s=>{
  revealD01Key(s);
  const o=authorize(s,{orderId:D01_REPAIR,mailId:D01_ATTACHMENT,type:'route'});
  o.key='mirage001';o.settings.seconds=null;o.settings.randomRoute=true;
 });
 return c.router.open({appId:'ghost',route:'/contract',params:{orderId:D01_REPAIR}});
}
if(a==='d02-return')return c.router.open({appId:'mirage',route:'/order/d02-chip-peace',params:{}});
if(a==='linked-return')return c.router.open({appId:'kira',route:'/compose/linked/'+encodeURIComponent(t.dataset.order),params:{}});if(a==='linked-file')return c.router.open({appId:'files',route:'/linked/'+encodeURIComponent(t.dataset.order),params:{}});if(a==='export-backup')c.download();if(a==='open-photos')c.router.open({appId:'photos',route:'/'});if(a==='open-map')c.router.open({appId:'maps',route:'/place',params:{id:'macau'}});}
