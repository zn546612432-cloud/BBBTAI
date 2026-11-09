import {btn,esc} from '../../../../system/ui.js';
import {makeChatBundle,previewChatImport,applyChatImport} from './transfer.js';
import {selection} from './navigation.js';

let staged=null;
function downloadJSON(data,name){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export function renderStagedChatImport(){
 if(!staged)return '<p class="editor-help">選擇檔案後先檢查新增、衝突和受保護的消息，確認後才會套用。</p>';
 const r=staged.report;
 return `<div class="chat-import-report"><strong>導入預覽 · 尚未修改</strong>
 <p>新增窗口 ${r.conversationsNew} · 新消息 ${r.messagesNew} · 異動衝突 ${r.conflicts} · 已存在 ${r.unchanged} · 受保護 ${r.protected}</p>
 ${r.details.length?`<details><summary>查看衝突（最多顯示20條）</summary><ul>${r.details.slice(0,20).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}
 <label>衝突處理<select id="chat-import-mode"><option value="merge">合併：保留本機同 ID 消息</option><option value="replace-conflicts">僅覆蓋同 ID 的作者消息</option></select></label>
 <p>導入前自動下載作者聊天備份。遊戲進度、玩家實發消息不會被替換。</p>
 ${btn('chat-import-apply','備份並確認導入','button-primary wide')}
 ${btn('chat-import-cancel','取消本次導入','button-quiet wide')}
 </div>`;
}
export async function stageChatImportFile(file,ctx){
 if(!file||file.size>8*1024*1024)throw Error('JSON 檔案不可超過 8MB');
 const text=await file.text(),{bundle,report}=previewChatImport(ctx.store.get(),text);
 staged={bundle,report};
 const preview=document.getElementById('chat-import-preview');
 if(preview)preview.innerHTML=renderStagedChatImport();
 ctx.toast('文件已檢查；請核對衝突後再確認導入');
}
export function handleChatTransferAction(a,t,ctx){
 if(a==='chat-import-cancel'){
  staged=null;const el=document.getElementById('chat-import-preview');if(el)el.innerHTML=renderStagedChatImport();
  return true;
 }
 if(a==='chat-import-apply'){
  if(!staged)throw Error('請先選擇要導入的 JSON 文件');
  const mode=document.getElementById('chat-import-mode')?.value||'merge';
  // The durable recovery point is a portable, full authored-chat JSON file.
  downloadJSON(makeChatBundle(ctx.store.get(),{scope:'all'}),'BBBTAI-chat-before-import-'+new Date().toISOString().slice(0,10)+'.json');
  let result;ctx.store.update(s=>{result=applyChatImport(s,staged.bundle,{mode});});
  staged=null;
  ctx.toast(`導入完成：新增 ${result.messagesNew} 條，${result.protected} 條受保護消息未修改`);
  return true;
 }
 const scopes={'chat-export-date':'date','chat-export-history':'history','chat-export-story':'story','chat-export-all':'all'};
 if(!Object.hasOwn(scopes,a))return false;
 const scope=scopes[a],v=selection(ctx.store.get());
 const suffix=scope==='date'?(v.date||'other'):scope;
 const data=makeChatBundle(ctx.store.get(),{scope});
 downloadJSON(data,`BBBTAI-chat-${suffix}-${new Date().toISOString().slice(0,10)}.json`);
 ctx.toast(`已開始下載：${data.conversations.reduce((n,c)=>n+c.messages.length,0)} 條作者消息`);
 return true;
}
