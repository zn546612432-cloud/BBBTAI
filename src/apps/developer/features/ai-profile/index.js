import {isStory55,taiRecognized} from '../../../../services/story55/state.js';
import {btn,esc} from '../../../../system/ui.js';
import {uid} from '../../../../services/id.js';
import {askTai} from '../../../../services/ai/gateway.js';
import {buildTaiPrompt,defaultTaiDraft,taiProfileFields,visibleTaiMemories} from '../../../../services/ai/tai-profile.js';

const value=v=>esc(String(v??''));
const option=(id,label,selected)=>`<option value="${id}"${selected===id?' selected':''}>${label}</option>`;
const draft=s=>s.aiDraft||defaultTaiDraft();
function memoryForm(m){return `<form data-form="ai-memory-edit" data-id="${value(m.id)}" class="card"><h4>记忆 · ${value(m.source||'开发者记录')}</h4><label>发生于 D<input name="day" type="number" min="1" max="90" value="${value(m.day)}" required></label><label>来源<input name="source" maxlength="80" value="${value(m.source)}" required></label><label>可见频道<select name="visibility">${option('shared','MIRAGE／NoApp／象棋共享',m.visibility)}${option('mirage','仅 MIRAGE',m.visibility)}${option('noapp','仅 NoApp',m.visibility)}${option('chess','仅象棋',m.visibility)}</select></label><label>已发生的事实<textarea name="text" rows="3" maxlength="600" required>${value(m.text)}</textarea></label><button class="button-primary" type="submit">保存这条记忆</button>${btn('ai-delete-memory','移除记忆','button-quiet',`data-id="${value(m.id)}"`)}</form>`;}
export function taiReviewPanel(s){
 const d=draft(s),channel=taiRecognized(s)?'noapp':'mirage';
 const prompt=buildTaiPrompt({day:s.day,channel,profile:d.profile,memories:d.memories});
 const visible=visibleTaiMemories(d.memories,s.day,channel);
 return `<section class="editor-panel ai-review-panel">
  <div class="card"><span class="eyebrow">TAI / REVIEW DRAFT</span><h2>熙泰 · 人设与记忆审阅</h2><p class="editor-help">下列文字使用作者新人设v5：纯台词、完整长句、精英感与阶段保密；人物卡优先于旧风格。真实共同经历还没有完整资料，不会编造成已发生记忆。修改只保存在此浏览器的预览存档，记得导出备份。</p></div>
  ${d.previousPersona?'<div class="card"><details><summary>旧人设归档（已停用）</summary><p class="editor-help">仅供核对旧编辑，不发送给模型。当前v5修改请在下方保存。</p><pre class="ai-prompt-preview">'+value(JSON.stringify(d.previousPersona.profile,null,2))+'</pre></details></div>':''}
  <form data-form="ai-profile" class="card"><h3>人物设定 · 逐项修改</h3>${taiProfileFields.map(f=>`<label><strong>${value(f.title)}</strong> <small>来源：${value(f.source)}</small><textarea name="${f.key}" rows="5" maxlength="1800" required>${value(d.profile[f.key]??f.text)}</textarea></label>`).join('')}<button class="button-primary wide" type="submit">保存人物设定</button></form>
  <div class="card"><h3>事件记忆 · 可审阅</h3><p class="editor-help">规则：只读取发生天数不晚于当前测试天数、且频道可见的记忆。草稿、私人微信、无权限笔记不会自动进入记忆。当前 D${s.day} / ${channel} 可见 ${visible.length} 条。</p>${d.memories.length?d.memories.map(memoryForm).join(''):'<p class="editor-help">尚无已录入的个人事件记忆。</p>'}</div>
  <form data-form="ai-memory-add" class="card"><h3>新增已发生记忆</h3><label>发生于 D<input name="day" type="number" min="1" max="90" value="${s.day}" required></label><label>来源<input name="source" maxlength="80" placeholder="例如：NoApp 对话、MIRAGE 任务" required></label><label>可见频道<select name="visibility">${option('shared','MIRAGE／NoApp／象棋共享','shared')}${option('mirage','仅 MIRAGE','shared')}${option('noapp','仅 NoApp','shared')}${option('chess','仅象棋','shared')}</select></label><label>事实内容<textarea name="text" rows="3" maxlength="600" placeholder="只填写已经发生且熙泰有合理来源知道的事" required></textarea></label><button class="button-primary wide" type="submit">添加记忆</button></form>
  <div class="card"><h3>本次模型可见内容</h3><p class="editor-help">下面是 D${s.day} / ${channel} 的实际提示词预览。更改人设或记忆后先保存；测试时还可以指定天数与频道。</p><details><summary>展开完整提示词</summary><pre class="ai-prompt-preview">${value(prompt)}</pre></details></div>
  <div class="card"><h3>DeepSeek · 熙泰试聊</h3><p class="editor-help">测试对话单独保存，不写入正式剧情；联网调用需要本机服务端配置 API Key。公开静态站点只供审阅。</p><div class="ai-test-context"><label>测试天数<input id="ai-test-day" type="number" min="1" max="90" value="${s.day}"></label><label>频道<select id="ai-test-channel">${option('mirage','MIRAGE',channel)}${option('noapp','NoApp',channel)}${option('chess','国际象棋',channel)}</select></label></div><textarea id="ai-chat-sample" rows="3" maxlength="2000" placeholder="输入要测试的玩家消息">你今天在忙什么？</textarea>${btn('ai-preview-prompt','预览测试提示词','button-quiet wide')}${btn('ai-test-chat','试聊熙泰（会消耗 DeepSeek 额度）','button-primary wide')}<p id="ai-chat-result" class="editor-help" aria-live="polite">尚无测试回复</p><pre id="ai-test-prompt" class="ai-prompt-preview" hidden></pre>${d.testTurns.length?'<h4>本机测试记录</h4>'+d.testTurns.slice(-12).map(t=>`<p><strong>${t.role==='user'?'玩家':'熙泰'}：</strong>${value(t.content)}</p>`).join(''):''}</div>
 </section>`;
}
function testContext(ctx){const day=Number(document.getElementById('ai-test-day')?.value),channel=document.getElementById('ai-test-channel')?.value;if(!Number.isInteger(day)||day<1||day>(isStory55(ctx.store.get())?55:90))throw Error('测试天数超出当前故事范围');if(!['mirage','noapp','chess'].includes(channel)||channel==='noapp'&&(isStory55(ctx.store.get())?!taiRecognized(ctx.store.get())||day<30:day<56))throw Error('当前尚未通过剧情相认，NoApp不可用');return {day,channel,d:draft(ctx.store.get())};}
export async function handleTaiReview(action,target,ctx){
 if(action==='ai-delete-memory'){ctx.store.update(s=>{s.aiDraft.memories=s.aiDraft.memories.filter(m=>m.id!==target.dataset.id);});ctx.toast('记忆已移除');return true;}
 if(!['ai-preview-prompt','ai-test-chat'].includes(action))return false;
 try{
  const {day,channel,d}=testContext(ctx);
  if(action==='ai-preview-prompt'){const el=document.getElementById('ai-test-prompt');if(el){el.textContent=buildTaiPrompt({day,channel,profile:d.profile,memories:d.memories});el.hidden=false;}return true;}
  const sample=document.getElementById('ai-chat-sample')?.value?.trim();if(!sample)throw Error('请先输入测试消息');
  const result=document.getElementById('ai-chat-result');if(result)result.textContent='正在生成回复…';
  const messages=[...d.testTurns.filter(t=>t.channel===channel&&t.day===day).slice(-10).map(t=>({role:t.role,content:t.content})),{role:'user',content:sample}];
  const answer=await askTai({day,channel,messages,storyVersion:isStory55(ctx.store.get())?'55-v1':undefined,recognized:taiRecognized(ctx.store.get()),profile:d.profile,memories:d.memories});
  ctx.store.update(s=>{s.aiDraft.testTurns.push({role:'user',content:sample,day,channel},{role:'assistant',content:answer.text,day,channel});s.aiDraft.testTurns=s.aiDraft.testTurns.slice(-24);});
  const shown=document.getElementById('ai-chat-result');if(shown)shown.textContent=answer.text;
 }catch(error){const result=document.getElementById('ai-chat-result');if(result)result.textContent=error.message;ctx.toast(error.message);}
 return true;
}
export function submitTaiReview(form,ctx){
 const kind=form.dataset.form;if(!['ai-profile','ai-memory-add','ai-memory-edit'].includes(kind))return false;
 const data=new FormData(form);
 if(kind==='ai-profile'){
  const profile={};for(const field of taiProfileFields){const text=String(data.get(field.key)||'').trim();if(!text||text.length>1800)throw Error(field.title+'须为 1–1800 字');profile[field.key]=text;}
  ctx.store.update(s=>{s.aiDraft.profile=profile;});ctx.toast('人物设定已保存');return true;
 }
 const day=Number(data.get('day')),source=String(data.get('source')||'').trim(),visibility=String(data.get('visibility')),text=String(data.get('text')||'').trim();
 if(!Number.isInteger(day)||day<1||day>90||!source||source.length>80||!text||text.length>600||!['shared','mirage','noapp','chess'].includes(visibility))throw Error('请检查记忆的天数、来源、频道和内容');
 ctx.store.update(s=>{const item={id:kind==='ai-memory-add'?uid():form.dataset.id,day,source,visibility,text,enabled:true};if(kind==='ai-memory-add')s.aiDraft.memories.push(item);else{const i=s.aiDraft.memories.findIndex(m=>m.id===item.id);if(i<0)throw Error('记忆不存在');s.aiDraft.memories[i]=item;}});
 ctx.toast(kind==='ai-memory-add'?'记忆已添加':'记忆已保存');return true;
}
