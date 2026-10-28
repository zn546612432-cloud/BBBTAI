import {esc,btn} from '../../system/ui.js';
import {blankPreset} from '../../story/presets/defaults.js';
import {ensurePresets,matchReplyRule} from '../../story/presets/engine.js';
import {applyPresetImport,previewPresetImport} from '../../story/presets/io/import.js';
import {parsePresetPayload} from '../../story/presets/io/format.js';
import {serializePresetExport} from '../../story/presets/io/export.js';

let pendingImport=null; // Intentionally ephemeral: an unapproved upload is never part of a save.
const filenameFor=day=>day===null?'ximeng-story-presets-all.json':`ximeng-story-D${String(day).padStart(3,'0')}.json`;
function saveJSON(name,json){
 const blob=new Blob([json],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

const choice=(list,value)=>list.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
const contentChannels=[['wechat','微信'],['noapp','NoApp'],['mirage','MIRAGE'],['messages','短信']];
const conditions=[['any','任意回复'],['keywords-any','命中任意关键词'],['keywords-all','同时命中所有关键词'],['message-count','消息数量达到门槛']];
const kindName=r=>r.kind==='reply'?'收到玩家消息':'NPC 主动发送';
const conditionName=r=>r.condition==='any'?'任意内容':r.condition==='message-count'?`至少 ${r.minMessages||1} 条`:r.keywords?.join(' / ')||'未设置关键词';
const selectedRule=s=>(s.storyPresets?.rules||[]).find(r=>r.id===s.editor.presetId);
const selectedDay=s=>Math.max(1,Math.min(90,Number(s.editor.presetDay||s.day)));
const inputField=(label,field,value,type='text',extra='')=>`<label>${label}<input data-preset-field="${field}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;
const selectField=(label,field,items,value)=>`<label>${label}<select data-preset-field="${field}">${choice(items,value)}</select></label>`;

function ruleEditor(r,s){
 const conversations=Object.entries(s.content.conversations).flatMap(([channel,list])=>list.map(c=>[`${channel}:${c.id}`,`${{wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'短信'}[channel]} · ${c.name}`]));
 return `<section class="preset-editor-card" data-rule="${esc(r.id)}">
 <div class="preset-section-heading"><strong>编辑规则</strong><span>${esc(r.id)}</span></div>
 ${inputField('规则名称','title',r.title)}
 <div class="preset-two-col">${selectField('规则类型','kind',[['reply','玩家触发回复'],['proactive','NPC 主动消息']],r.kind)}${inputField('游戏日','day',r.day,'number','min="1" max="90"')}</div>
 <label>聊天窗口<select data-preset-field="conversation">${choice(conversations,`${r.channel}:${r.conversationId}`)}</select></label>
 <div class="preset-two-col">${inputField('开始时间','from',r.from,'time')}${inputField('结束时间','to',r.to,'time')}</div>
 ${r.kind==='proactive'?`${selectField('主动发送条件','mode',[['scheduled','到指定时间主动发送'],['conditional','满足消息数量后发送']],r.mode)}${r.mode==='conditional'?inputField('需要玩家已发送至少几条消息','minMessages',r.minMessages,'number','min="1" max="100"'):''}`:
 `${selectField('输入匹配方式','condition',conditions,r.condition)}${['keywords-any','keywords-all'].includes(r.condition)?inputField('关键词 · 用逗号隔开','keywords',(r.keywords||[]).join('，')):''}${r.condition==='message-count'?inputField('本批消息数量','minMessages',r.minMessages,'number','min="1" max="100"'):''}`}
 <label>NPC 回复气泡 <small>每行一条，可一次发送多条</small><textarea data-preset-field="messages" rows="4" placeholder="在这里输入台词">${esc((r.messages||[]).join('\n'))}</textarea></label>
 <details class="preset-advanced"><summary>高级条件与一次性标记</summary>
 <div class="preset-two-col">${inputField('优先级','priority',r.priority,'number','min="0" max="999"')}${selectField('使用次数','once',[['true','一次性'],['false','可重复']],String(r.once))}</div>
 ${inputField('需要已有剧情标记','requiresFlag',r.requiresFlag,'text','placeholder="可留空"')}
 ${inputField('完成后写入标记','setsFlag',r.setsFlag,'text','placeholder="可留空"')}
 ${inputField('互斥组 · 一组只触发一次','group',r.group,'text','placeholder="例如 wang-morning-answer"')}
 </details>
 <div class="preset-editor-actions"><button type="button" class="preset-primary" data-action="preset-toggle" data-id="${esc(r.id)}">${r.enabled?'暂停此规则':'启用此规则'}</button><button type="button" class="preset-danger" data-action="preset-delete" data-id="${esc(r.id)}">删除</button></div>
 </section>`;
}

function previewTest(s){
 const day=selectedDay(s),t=s.editor.presetTest||{},result=s.editor.presetResult;
 const conversations=Object.entries(s.content.conversations).flatMap(([channel,list])=>list.map(c=>[`${channel}:${c.id}`,`${{wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'短信'}[channel]} · ${c.name}`]));
 return `<details class="preset-test" ${s.editor.presetTestOpen?'open':''}><summary>模拟发送 · 测试预设匹配</summary>
 <form data-form="preset-test"><div class="preset-two-col"><label>模拟游戏日<input name="day" type="number" min="1" max="90" value="${esc(t.day||day)}"></label><label>发送时间<input name="clock" type="time" value="${esc(t.clock||'03:15')}"></label></div>
 <label>聊天对象<select name="conversation">${choice(conversations,t.conversation||'wechat:wang')}</select></label>
 <label>模拟玩家连续发送 <small>一行一条，最后统一分析</small><textarea name="messages" rows="3" placeholder="哥。&#10;早安！&#10;喜欢你！">${esc(t.messages||'哥。\n早安！嘿嘿。\n喜欢你！')}</textarea></label>
 <label class="preset-test-check"><input type="checkbox" name="ignoreState" ${t.ignoreState?'checked':''}> 单独测试台词（忽略使用记录和前置剧情）</label>
 <button class="preset-primary" type="submit">▶ 测试匹配结果</button></form>
 ${result?`<div class="preset-result"><strong>${result.rule?'命中：'+esc(result.rule.title):'当前没有符合条件的回复'}</strong>${result.rule?`<p>${result.rule.messages.map(esc).join('<br>')}</p>`:`<p>在这个时间或状态下，NPC 会保持沉默。可调整时间、前置标记或关键词。</p>`}<small>只做模拟，不会真正发送消息或消耗规则。</small></div>`:''}
 </details>`;
}

function importExportPanel(s){
 const day=selectedDay(s),pending=pendingImport,report=pending?.report;
 return `<section class="preset-transfer">
 <div class="preset-section-heading"><strong>JSON 剧情文件</strong><span>可独立导入与导出</span></div>
 <p class="editor-help">每个游戏日可以按聊天软件分文件保存；支持单日文件或多日合集。选择文件后先核对冲突，不会立刻覆盖。</p>
 <input id="preset-import-file" type="file" accept=".json,application/json" hidden aria-label="选择剧情 JSON 文件">
 <div class="preset-transfer-buttons"><button type="button" class="preset-primary" data-action="preset-import-choose">导入 JSON…</button><button type="button" class="preset-secondary" data-action="preset-export-day">导出第 ${day} 天</button><button type="button" class="preset-secondary" data-action="preset-export-all">导出全部剧情</button></div>
 ${pending?`<div class="preset-import-preview"><div class="preset-section-heading"><strong>待导入：${esc(pending.name)}</strong><span>${report.packs} 份文件</span></div><p>第 ${report.days.join('、')} 天 · 新规则 ${report.rulesNew} 条 · 同编号规则 ${report.rulesConflict} 条</p><p>新增历史消息 ${report.historyNew} 条 · 重复历史 ${report.historyConflict} 条${report.newConversations?` · 新窗口 ${report.newConversations} 个`:''}</p>${report.conflicts.length?`<details><summary>查看 ${report.conflicts.length} 条规则冲突</summary><ul>${report.conflicts.slice(0,100).map(r=>`<li>${esc(r.id)} · ${esc(r.title)}</li>`).join('')}</ul></details>`:''}
 <p class="editor-help">导入不会删除已发送的消息，也不会重置一次性剧情记录或改变当前游戏日。</p>
 <div class="preset-transfer-buttons"><button type="button" class="preset-primary" data-action="preset-import-merge">合并 · 已有规则保留</button><button type="button" class="preset-secondary" data-action="preset-import-replace">仅覆盖同编号规则</button><button type="button" class="preset-danger" data-action="preset-import-cancel">取消</button></div></div>`:''}
 </section>`;
}

export function presetEditor(s){
 const p=ensurePresets(s),day=selectedDay(s),rules=p.rules.filter(r=>r.day===day),selected=selectedRule(s);
 return `<div class="editor-panel preset-page">
 <div class="preset-intro"><strong>剧情预设中心</strong><p>每天独立编写，NPC 不会为每个关键词机械回复。连续发送以最后一条后 3 秒为一批，每批最多选择一条剧情规则。</p></div>
 <div class="preset-day-control"><button type="button" data-action="preset-day-prev" aria-label="前一天">‹</button><label>正在编辑的游戏日<input id="preset-day" type="number" min="1" max="90" value="${day}"></label><button type="button" data-action="preset-day-next" aria-label="后一天">›</button></div>
 <div class="preset-summary"><span><b>${rules.length}</b> 条剧情</span><span><b>${rules.filter(r=>r.kind==='reply').length}</b> 条回复</span><span><b>${rules.filter(r=>r.kind==='proactive').length}</b> 条主动消息</span></div>
 <div class="preset-add"><button type="button" class="preset-primary" data-action="preset-add" data-kind="reply">＋ 预设回复</button><button type="button" class="preset-secondary" data-action="preset-add" data-kind="proactive">＋ 主动消息</button></div>
 <div class="preset-rule-list">${rules.map(r=>`<button type="button" class="preset-rule ${r.id===selected?.id?'is-selected':''}" data-action="preset-select" data-id="${esc(r.id)}"><span class="preset-rule-tag ${r.kind}">${kindName(r)}</span><strong>${esc(r.title)}</strong><small>${r.from}–${r.to} · ${esc(r.kind==='proactive'?(r.mode==='scheduled'?'定时':'条件主动'):conditionName(r))} ${r.enabled?'':'· 已暂停'} ${p.usedIds.includes(r.id)?'· 已使用':''}</small><span class="preset-rule-chevron">›</span></button>`).join('')||'<p class="preset-empty">这一天还没有预设剧情，可以新增一条。</p>'}</div>
 ${selected?ruleEditor(selected,s):'<p class="preset-empty">选择上面的规则编辑，或添加一条新剧情。</p>'}
 ${previewTest(s)}
 ${importExportPanel(s)}
 <p class="editor-help">开发者在此修改的规则保存在本机；导出 JSON 后可放入项目的每日剧情文件夹，正式发布时由游戏自动加载。</p>
 </div>`;
}

export function handlePresetAction(a,t,ctx){
 const {store}=ctx,id=t.dataset.id;
 if(a==='preset-import-choose'){document.querySelector('#preset-import-file')?.click();return true;}
 if(a==='preset-import-cancel'){pendingImport=null;ctx.refresh();return true;}
 if(a==='preset-export-day'||a==='preset-export-all'){
  const day=a==='preset-export-day'?selectedDay(store.get()):null;
  saveJSON(filenameFor(day),serializePresetExport(store.get(),{day}));ctx.toast('已准备剧情 JSON 文件');return true;
 }
 if(a==='preset-import-merge'||a==='preset-import-replace'){
  if(!pendingImport)throw Error('请先选择一个剧情 JSON 文件');
  const mode=a==='preset-import-replace'?'replace-conflicts':'merge';
  const fresh=previewPresetImport(store.get(),pendingImport.packs);
  if(mode==='replace-conflicts'&&fresh.rulesConflict&&!confirm(`要覆盖本机 ${fresh.rulesConflict} 条同编号预设规则吗？已发送消息不会变化。`))return true;
  store.update(s=>{applyPresetImport(s,pendingImport.packs,{mode,restoreDeleted:true});s.editor.presetResult=null;s.editor.presetId=null;s.editor.presetDay=pendingImport.packs[0].day;});
  pendingImport=null;ctx.toast(`剧情已导入 · 新增 ${fresh.rulesNew} 条`);return true;
 }
 if(a==='preset-select'){store.update(s=>s.editor.presetId=id);return true;}
 if(a==='preset-day-prev'||a==='preset-day-next'){store.update(s=>{s.editor.presetDay=Math.max(1,Math.min(90,selectedDay(s)+(a==='preset-day-prev'?-1:1)));s.editor.presetId=null;s.editor.presetResult=null;});return true;}
 if(a==='preset-add'){store.update(s=>{const r=blankPreset({day:selectedDay(s),kind:t.dataset.kind});ensurePresets(s).rules.push(r);s.editor.presetId=r.id;});return true;}
 if(a==='preset-toggle'){store.update(s=>{const r=ensurePresets(s).rules.find(r=>r.id===id);if(r)r.enabled=!r.enabled;});return true;}
 if(a==='preset-delete'){
  if(!confirm('删除这条预设规则？此操作不会删除已经发出的聊天记录。'))return true;
  store.update(s=>{const presets=ensurePresets(s);presets.rules=presets.rules.filter(r=>r.id!==id);presets.deletedRuleIds??=[];if(!presets.deletedRuleIds.includes(id))presets.deletedRuleIds.push(id);s.editor.presetId=null;});return true;
 }
 return false;
}

export async function stagePresetFile(file,ctx){
 if(!file)return;
 if(file.size>2_000_000)throw Error('剧情 JSON 文件需小于 2MB，可按日期拆分导入');
 const packs=parsePresetPayload(await file.text());
 pendingImport={name:file.name,packs,report:previewPresetImport(ctx.store.get(),packs)};
 ctx.refresh();
}

export function changePresetField(t,ctx){
 if(t.id==='preset-day'){const day=Number(t.value);if(Number.isInteger(day)&&day>=1&&day<=90)ctx.store.update(s=>{s.editor.presetDay=day;s.editor.presetId=null;s.editor.presetResult=null;});return true;}
 if(!t.dataset.presetField)return false;
 const field=t.dataset.presetField;
 if(t.type==='number'&&!t.checkValidity()||t.type==='time'&&!t.value)return true;
 ctx.store.update(s=>{const r=selectedRule(s);if(!r)return;
  if(field==='conversation'){const [channel,...id]=t.value.split(':');r.channel=channel;r.conversationId=id.join(':');}
  else if(field==='keywords')r.keywords=t.value.split(/[，,\n]/).map(x=>x.trim()).filter(Boolean);
  else if(field==='messages')r.messages=t.value.split(/\r?\n/);
  else if(field==='day'||field==='priority'||field==='minMessages')r[field]=Number(t.value);
  else if(field==='once')r.once=t.value==='true';
  else if(field==='kind'){r.kind=t.value;if(r.kind==='proactive'&&!r.mode)r.mode='scheduled';}
  else r[field]=t.value;
 });
 return true;
}
export const isPresetTextField=t=>!!t.dataset.presetField&&['title','keywords','messages','requiresFlag','setsFlag','group'].includes(t.dataset.presetField);

export function presetTestSubmit(f,ctx){
 const values=new FormData(f),conversation=String(values.get('conversation')||'wechat:wang'),colon=conversation.indexOf(':'),day=Number(values.get('day')),clock=String(values.get('clock')),messages=String(values.get('messages')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),ignoreState=values.has('ignoreState');
 if(!Number.isInteger(day)||day<1||day>90||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)||!messages.length)throw Error('请填写有效的日期、时间及消息');
 const result=matchReplyRule(ctx.store.get(),{day,clock,channel:conversation.slice(0,colon),conversationId:conversation.slice(colon+1),messages},{ignoreUsed:ignoreState,ignoreFlags:ignoreState});
 ctx.store.update(s=>{s.editor.presetTest={day,clock,conversation,messages:messages.join('\n'),ignoreState};s.editor.presetResult={rule:result.rule?{title:result.rule.title,messages:result.rule.messages}:null};s.editor.presetTestOpen=true;});
}
