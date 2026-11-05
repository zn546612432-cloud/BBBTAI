import {esc} from '../../../../system/ui.js';
import {callTaiPhoneTool,taiPhoneAccessGranted} from '../../../../services/ai/phone-mcp/index.js';
const readState=s=>s.aiDraft?.phoneMcp||{};
export function taiPhonePanel(s){
 const p=readState(s),granted=taiPhoneAccessGranted(s);
 const entries=(Array.isArray(p.observations)?p.observations:[]).slice(-10).reverse();
 const result=p.lastProbe;
 return '<section class="editor-section tai-phone-mcp" style="padding:16px;max-width:720px">'
  +'<h2>熙泰 · 虚拟手机访问工具</h2>'
  +'<p>这里管理的是熙蒙的游戏手机，不是现实设备。熙泰可偶尔主动查看已发生的聊天及相册；默认不扫描。日程、未发消息、未来剧情和原始存档一律不在工具目录中。</p>'
  +'<p><strong>当前授权：</strong>'+(granted?'已允许读取当前存档':'尚未授权读取')+'</p>'
  +'<button type="button" data-action="tai-phone-dev-toggle">'+(p.developerEnabled?'关闭当前存档测试授权':'开启当前存档测试授权')+'</button>'
  +'<p><small>这是开发测试授权，不代表剧情已经发生入侵。未来正式解锁应由独立的剧情事件触发。</small></p>'
  +'<hr>'
  +'<h3>手动测试工具</h3>'
  +'<label>搜索词 <input name="tai-phone-query" placeholder="例如：熙旺、胡枫、程序" value="'+esc(p.lastQuery||'')+'"></label>'
  +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
  +'<button type="button" data-action="tai-phone-dev-search">搜索历史聊天</button>'
  +'<button type="button" data-action="tai-phone-dev-latest">查看最新消息</button>'
  +'<button type="button" data-action="tai-phone-dev-photos">列出相册</button>'
  +'</div>'
  +(result?'<pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto">'+esc(JSON.stringify(result,null,2).slice(0,3500))+'</pre>':'')
  +'<h3>最近真实查看记录</h3>'
  +(entries.length?'<ul>'+entries.map(e=>'<li>D'+Number(e.day||0)+' '+esc(e.clock||'')+' · '+esc(e.tool||'')+' · '+Number(e.viewedCount||0)+' 条</li>').join('')+'</ul>':'<p>还没有自动查询记录。</p>')
  +'<p><small>查询日志不等于长期记忆；只有经过记忆模块审核的内容才能进入Supabase长期记忆。</small></p>'
  +'</section>';
}
export function taiPhoneAction(action,target,ctx){
 if(!action.startsWith('tai-phone-dev-'))return false;
 if(action==='tai-phone-dev-toggle'){
  ctx.store.update(s=>{
   s.aiDraft??={};s.aiDraft.phoneMcp??={};
   s.aiDraft.phoneMcp.developerEnabled=!s.aiDraft.phoneMcp.developerEnabled;
  });
  ctx.toast('当前存档的熙泰手机访问测试授权已切换');
  return true;
 }
 const input=target.closest('.tai-phone-mcp')?.querySelector('[name="tai-phone-query"]');
 const query=input?.value?.trim().slice(0,40)||'';
 const name=action==='tai-phone-dev-search'?'search_messages':
  action==='tai-phone-dev-photos'?'list_photos':'check_new_messages';
 const args=name==='search_messages'?{query,limit:8}:{limit:8};
 const result=callTaiPhoneTool(ctx.store.get(),name,args);
 ctx.store.update(s=>{
  s.aiDraft??={};s.aiDraft.phoneMcp??={};
  s.aiDraft.phoneMcp.lastQuery=query;
  s.aiDraft.phoneMcp.lastProbe=result;
 });
 ctx.toast(result.ok?'查询已完成':'查询被拒绝：'+result.error);
 return true;
}
