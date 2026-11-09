import {btn,esc,empty} from '../../../../system/ui.js';
import {datePreset,messageDate,messageClock} from '../../../../services/messaging/timestamps.js';
import {isStory55} from '../../../../services/story55/state.js';
import {story55Config} from '../../../../services/story55/state.js';
import {conversations as allConversations,actors,isGroup,chatApps,scheduleLabel} from './model.js';
import {selection,historyDates,rowsFor,activeConversation,PAGE_SIZE,dayDate,isEditableMessage} from './navigation.js';
import {renderStagedChatImport} from './ui-transfer.js';
import {messageCard as classicMessageCard} from './classic.js';
import {trackKey,tracksForDay,trackValues,trackEditReason} from '../../../../story/d14-d24/editor-overrides.js';
const attr=esc;
const channelName=id=>({wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'信息'}[id]||id);
const pad=n=>String(n).padStart(2,'0');
const labelDay=n=>`D${pad(n)} · ${dayDate(n)}`;

// Date browsing retains every original sender, display-date, scheduling,
// preview, reorder and delayed-delivery control from the classic editor.
export function messageCard(m,c,s,index){
 if(!isEditableMessage(m))return `<article class="edit-message chat-readonly" data-message-id="${attr(m.id)}"><div class="edit-message-head"><strong>${esc(m.from||'系統')}</strong><small>已發送的劇情／系統消息 · 唯讀</small></div><p>${esc(m.text||'[非文字消息]')}</p></article>`;
 return classicMessageCard(m,c,s,index);
}
export function newConversationForm(s){
 return `<details class="new-conversation"><summary>＋ 新建聊天窗口</summary><form data-form="new-conversation">
 <label>聊天軟件<select name="channel">${chatApps.map(([id,name])=>`<option value="${id}" ${s.editor?.channel===id?'selected':''}>${name}</option>`).join('')}</select></label>
 <label>類型<select name="type"><option value="direct">私聊</option><option value="group">群聊</option></select></label>
 <label>窗口名稱<input name="name" maxlength="60" required placeholder="姓名或群聊名稱"></label>
 <label>群聊成員<textarea name="members" placeholder="私聊留空；群聊每行一人"></textarea></label>
 <button class="button-primary wide" type="submit">建立聊天</button></form></details>`;
}
function dateNavigation(s,v){
 const dates=historyDates(s),idx=dates.indexOf(v.historyDate);
 const history=v.scope==='history';
 return `<div class="chat-date-navigation">
 <div class="chat-scope-tabs" role="group" aria-label="聊天歷史分區">
  ${[['history','歷史聊天'],['story','D01–D55'],['other','未歸檔']].map(([value,label])=>btn('chat-scope',label,value===v.scope?'active':'',`data-scope="${value}"`)).join('')}
 </div>
 ${history?`<label>歷史日期<input type="date" id="chat-history-date" min="2024-03-10" max="2025-05-18" value="${v.historyDate}"></label>
 <label>快速跳到有記錄的日期<select id="chat-history-select"><option value="">選擇日期…</option>${dates.map(d=>`<option value="${d}" ${d===v.historyDate?'selected':''}>${d}</option>`).join('')}</select></label>`:v.scope==='story'?`<label>選擇劇情日期<select id="chat-story-day">${Array.from({length:55},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===v.day?'selected':''}>${labelDay(n)}</option>`).join('')}</select></label>`:'<p class="editor-help">沒有有效日期或超出主線範圍的消息集中在這裡；不會自動刪除。</p>'}
 ${v.scope!=='other'?`<div class="chat-date-arrows">
 ${btn('chat-prev','← 上一日','button-quiet',`${history&&idx<=0||!history&&v.day<=1?'disabled':''}`)}
 ${btn('chat-next','下一日 →','button-quiet',`${history&&idx>=dates.length-1||!history&&v.day>=55?'disabled':''}`)}
 </div>`:''}
 </div>`;
}
function fixedScenes(s,v){
 if(v.scope!=='story'||!isStory55(s))return '';
 const config=story55Config(s),nodes=config.nodes.filter(n=>n.day===v.day);
 const scenes=tracksForDay(v.day);
 const sources=scenes.map(scene=>{
  const key=trackKey(scene),current=trackValues(s,scene),reason=trackEditReason(s,scene);
  return `<details class="chat-source-scene"><summary>${esc(scene.chat==='group'?'狼崽團':'微信私聊')} · ${esc(scene.chat)} · ${esc(current.at)} · ${current.lines.length} 條${reason?'（已播放，唯讀）':''}</summary>
  <form data-form="chat-track-edit" data-key="${esc(key)}">
  <label>發送時間<input type="time" name="at" required value="${esc(current.at)}" ${reason?'disabled':''}></label>
  ${current.lines.map((line,index)=>`<label><span>${index+1}. ${esc(line.who)}（原發言人不變）</span><textarea name="line-${index}" rows="2" required maxlength="3000" ${reason?'disabled':''}>${esc(line.text)}</textarea></label>`).join('')}
  ${reason?`<p class="editor-help">${esc(reason)}。請在未播放的周目中修改，再匯出 JSON。</p>`:`<button class="button-primary wide" type="submit">保存此段來源對話</button>`}
  </form></details>`;
 }).join('');
 return `<section class="chat-fixed-scenes"><strong>當日正式劇情來源</strong>
 <p>直接修改原消息生命週期引擎所讀取的台詞。不增加第二套排程；不修改已發送玩家消息。</p>
 ${sources||'<small>本日沒有可直接編輯的日常對話來源</small>'}
 <strong>固定劇情節點</strong>
 ${nodes.map(n=>btn('chat-open-node',`${esc(n.title)} · 原劇情樹編輯`,'chat-node-link',`data-node="${esc(n.id)}"`)).join('')||'<small>本日沒有固定劇情節點</small>'}
 </section>`;
}
function transferControls(){
 return `<section class="chat-transfer">
 <strong>劇情備份與交換</strong>
 <p>只匯出可編輯的作者消息，不包含玩家真實發送記錄、手機存檔或 AI 動態對話。</p>
 <div class="chat-export-buttons">
 ${btn('chat-export-date','匯出當日','button-quiet')}
 ${btn('chat-export-history','匯出歷史','button-quiet')}
 ${btn('chat-export-story','匯出55天','button-quiet')}
 ${btn('chat-export-all','完整作者備份','button-primary')}
 </div>
 <label class="chat-upload-label">導入聊天 JSON<input type="file" id="chat-import-file" accept=".json,application/json"></label>
 <div id="chat-import-preview">${renderStagedChatImport()}</div>
 </section>`;
}
function pager(page,pages,count){
 return `<div class="chat-pager" aria-label="分頁">
 <span>共 ${count} 條 · 第 ${page+1} / ${pages} 頁，每頁最多 ${PAGE_SIZE} 條</span>
 <div>${btn('chat-page','第一頁','button-quiet',`data-page="0" ${page===0?'disabled':''}`)}
 ${btn('chat-page','上一頁','button-quiet',`data-page="${Math.max(0,page-1)}" ${page===0?'disabled':''}`)}
 ${btn('chat-page','下一頁','button-quiet',`data-page="${Math.min(pages-1,page+1)}" ${page===pages-1?'disabled':''}`)}
 ${btn('chat-page','末頁','button-quiet',`data-page="${pages-1}" ${page===pages-1?'disabled':''}`)}</div></div>`;
}
export function conversations(s){
 const v=selection(s),list=allConversations(s),picked=activeConversation(s);
 if(!picked)return `<div class="editor-panel">${newConversationForm(s)}${empty('尚無聊天窗口')}</div>`;
 const {c,channel}=picked,all=rowsFor(s,channel,c),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE)),page=Math.min(v.page,pages-1),rows=all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 const pending=rows.filter(({m})=>m.schedule?.mode!=='immediate'&&m.schedule&&!m.delivery).length;
 return `<div class="editor-panel chat-editor">
 <div class="chat-editor-toolbar">
  <strong>聊天劇情 · 按日期編輯</strong><div class="chat-jump-tools">
  ${btn('chat-jump-top','↑ 回到頂部','button-quiet')}
  ${btn('chat-jump-bottom','↓ 跳到最後','button-quiet')}</div>
 </div>
 <div class="chat-editor-layout">
 <aside class="chat-editor-sidebar">
  ${dateNavigation(s,v)}
  <label>搜索人物／正文／ID<input type="search" id="chat-search" value="${attr(s.editor?.chatSearch||'')}" placeholder="輸入後按 Enter"></label>
  ${btn('chat-search-go','搜索消息','button-quiet wide')}
  <label>聊天類型<select id="chat-kind"><option value="all" ${v.kind==='all'?'selected':''}>全部</option><option value="group" ${v.kind==='group'?'selected':''}>群聊</option><option value="direct" ${v.kind==='direct'?'selected':''}>私聊</option></select></label>
  <label>選擇聊天窗口<select id="editor-conversation">${list.map(x=>`<option value="${attr(x.channel+':'+x.c.id)}" ${x.c===c?'selected':''}>${esc(channelName(x.channel))} / ${esc(x.c.name)} (${rowsFor(s,x.channel,x.c).length})</option>`).join('')}</select></label>
  ${fixedScenes(s,v)}
  ${newConversationForm(s)}
  ${transferControls()}
 </aside>
 <section class="chat-editor-workspace">
  <header class="chat-editor-current">
   <small>${v.scope==='story'?labelDay(v.day):v.scope==='history'?v.historyDate:'未歸檔'} · ${esc(channelName(channel))}</small>
   <h2>${esc(c.name)}</h2>
   <p>${all.length} 條符合目前篩選 · 本頁 ${pending} 條待觸發 · 即時保存在本機</p>
  </header>
  <details class="chat-conversation-details"><summary>聊天窗口／發言人設置</summary>
   <section class="editor-conversation-info">
    <label>聊天窗口名稱<input id="editor-conversation-name" maxlength="60" value="${attr(c.name)}"></label>
    <details class="editor-actors"><summary>編輯發言人名稱</summary><div class="editor-actor-list">${actors(c).map(a=>`<label>${a.id==='me'?'我方':isGroup(c)?'群成員':'對方'}<input data-actor-name="${attr(a.id)}" value="${attr(a.name)}" maxlength="60"></label>`).join('')}</div></details>
   </section>
  </details>
  ${pager(page,pages,all.length)}
  <div class="editor-message-list" id="chat-message-list">${rows.map(({m,index},i)=>messageCard(m,c,s,index,{position:page*PAGE_SIZE+i+1})).join('')||empty('這個日期沒有符合篩選條件的消息','可選擇其他聊天窗口、清除搜索或新增作者消息。')}</div>
  <div id="chat-messages-end"></div>
  ${pager(page,pages,all.length)}
  <div class="editor-add-actions">${btn('add-message','＋ 本日文字','button-primary')}${btn('add-image-message','＋ 本日圖片','button-quiet')}</div>
  ${btn('preview-chat','打開手機聊天預覽 ↗','button-quiet wide')}
  <p class="editor-help">此頁直接編輯原有聊天數據。已發送的玩家消息和系統生成消息只讀；固定節點請從左側原 Story55 編輯器開啟。</p>
  <div class="editor-drag-status" role="status" aria-live="polite"></div>
 </section></div></div>`;
}
