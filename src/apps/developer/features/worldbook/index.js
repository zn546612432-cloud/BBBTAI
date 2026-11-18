import {btn,esc} from '../../../../system/ui.js';
import {taiRecognized} from '../../../../services/story55/state.js';
import {buildTaiPrompt} from '../../../../services/ai/tai-profile.js';
import {taiActionDecisionPrompt} from '../../../../services/ai/action-protocol-v10.js';
import {defaultWorldbook,readWorldbook,ensureWorldbook,normalizeEntry,normalizeSettings,importWorldbook,exportWorldbook,POSITIONS} from '../../../../services/ai/worldbook/format.js';
import {previewTaiWorldbook,assembleTaiMessages} from '../../../../services/ai/worldbook/index.js';

const v=esc,attr=x=>`data-id="${v(x)}"`,field=(name,label,value,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${v(value??'')}" ${extra}></label>`;
const check=(name,label,value)=>`<label><input type="checkbox" name="${name}"${value?' checked':''}> ${label}</label>`;
const opts=(name,label,items,current)=>`<label>${label}<select name="${name}">${items.map(([id,title])=>`<option value="${v(id)}"${String(id)===String(current)?' selected':''}>${v(title)}</option>`).join('')}</select></label>`;
const area=(name,label,value,rows=4)=>`<label>${label}<textarea name="${name}" rows="${rows}">${v(value??'')}</textarea></label>`;
const parts=v=>String(v||'').split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
const listText=v=>(v||[]).join(', ');
const selected=(s,w)=>w.books.find(b=>b.id===s.editor?.worldbookBook)||w.books[0];
const picked=(s,b)=>b?.entries.find(e=>e.id===s.editor?.worldbookEntry)||b?.entries[0];
const flags=[['constant','🔵 常駐'],['vectorized','🔗 允許向量激活'],['disable','停用'],['selective','啟用次關鍵詞'],['useProbability','使用激活概率'],['ignoreBudget','忽略可選預算'],['excludeRecursion','不被遞歸激活'],['preventRecursion','不觸發後續遞歸'],['groupOverride','優先組內選擇'],['matchPersonaDescription','掃描玩家設定'],['matchCharacterDescription','掃描人物描述'],['matchCharacterPersonality','掃描性格'],['matchCharacterDepthPrompt','掃描人物深度提示'],['matchScenario','掃描場景'],['matchCreatorNotes','掃描作者備註']];
const numbers=[['order','優先級'],['depth','插入深度'],['scanDepth','掃描深度（空白＝全局）'],['sticky','持續消息數'],['cooldown','冷卻消息數'],['delay','延遲消息數'],['probability','概率 %'],['groupWeight','互斥組權重'],['delayUntilRecursion','遞歸延遲層數'],['minDay','最早天數'],['maxDay','最晚天數']];
const settingsNumbers=[['scanDepth','掃描深度'],['budgetTokens','Token 預算'],['budgetPercent','上下文預算百分比'],['contextTokens','上下文上限'],['maxRecursion','最大遞歸層數'],['minActivations','最少激活條目'],['maxScanDepth','最深歷史掃描'],['vectorMax','向量結果上限'],['vectorThreshold','向量相似度門檻']];
const settingsFlags=[['recursive','遞歸掃描'],['caseSensitive','區分大小寫'],['matchWholeWords','匹配完整詞'],['includeNames','掃描角色名稱'],['useGroupScoring','組內關鍵詞計分']];
const tri=(name,label,value)=>opts(name,label,[['','繼承全局'],['true','是'],['false','否']],value===null?'':String(value));

export function worldbookPanel(s){
 const w=readWorldbook(s),book=selected(s,w),e=picked(s,book),last=w.runtime?.noapp?.snapshot;
 return `<section class="editor-panel"><div class="card"><span class="eyebrow">XITAI / WORLD INFO</span><h2>熙泰 · 專屬世界書</h2><p class="editor-help">酒館 JSON 相容格式。條目僅在符合情境時注入；人格、劇情鎖與聲線仍以已確認設定為準。修改保存於當前手機存檔，匯出備份可跨裝置匯入。</p><p>${w.books.length} 本世界書 · ${w.books.reduce((n,b)=>n+b.entries.length,0)} 條目</p></div>
 <div class="card"><h3>世界書庫</h3>${w.books.map(b=>btn('worldbook-select-book',v(b.name)+(b.enabled?'':'（停用）'),b.id===book?.id?'button-primary':'button-quiet',attr(b.id))).join(' ')}${btn('worldbook-new-book','＋ 新建','button-quiet wide')}
 <form data-form="worldbook-import">${area('json','貼上酒館 JSON / 角色卡 JSON','',4)}<button class="button-primary wide" type="submit">匯入世界書</button></form></div>
 ${book?`<form class="card" data-form="worldbook-book" ${attr(book.id)}><h3>世界書設定</h3>${field('name','名稱',book.name)}${opts('scope','範圍',[['character','人物'],['global','全局'],['chat','對話'],['persona','玩家設定']],book.scope)}${field('character','限定人物（可留空）',book.character)}${field('chat','限定對話 ID（可留空）',book.chat)}${field('persona','限定玩家設定（可留空）',book.persona)}${check('enabled','啟用此世界書',book.enabled!==false)}<button type="submit" class="button-primary wide">保存世界書</button>${btn('worldbook-export','匯出酒館 JSON','button-quiet',attr(book.id))}${book.id!=='xitai'?btn('worldbook-delete-book','刪除世界書','button-quiet',attr(book.id)):''}</form>
 <div class="card"><h3>條目 · ${book.entries.length}</h3><details><summary>選擇條目 ${v(e?.comment||e?.id||'')}</summary>${book.entries.map(x=>btn('worldbook-select-entry',(x.constant?'🔵':x.vectorized?'🔗':'🟢')+' '+v(x.comment||x.id)+(x.disable?' · 停用':''),x.id===e?.id?'button-primary wide':'button-quiet wide',attr(x.id))).join('')}</details>${btn('worldbook-new-entry','＋ 新增條目','button-quiet wide',attr(book.id))}</div>`:''}
 ${e?`<form class="card" data-form="worldbook-entry" ${attr(e.id)}><h3>編輯條目</h3>${field('comment','標題',e.comment)}${area('content','注入內容',e.content,8)}${area('key','主關鍵詞（逗號或換行）',listText(e.key),2)}${area('keysecondary','次關鍵詞',listText(e.keysecondary),2)}${opts('selectiveLogic','次關鍵詞邏輯',[[0,'AND ANY'],[3,'AND ALL'],[2,'NOT ANY'],[1,'NOT ALL']],e.selectiveLogic)}${flags.slice(0,4).map(([k,l])=>check(k,l,e[k])).join('')}
 <details><summary>注入位置、時效、遞歸與互斥組</summary>${opts('position','注入位置',POSITIONS.map((x,i)=>[i,['人物之前','人物之後','作者備註開頭','作者備註結尾','指定深度','範例之前','範例之後','Outlet'][i]]),e.position)}${opts('role','深度角色',[[0,'System'],[1,'User'],[2,'Assistant']],e.role)}${field('outletName','Outlet 名稱',e.outletName)}${numbers.map(([k,l])=>field(k,l,e[k],'number')).join('')}${field('group','互斥組（可逗號分隔）',e.group)}${flags.slice(4).map(([k,l])=>check(k,l,e[k])).join('')}${tri('caseSensitive','區分大小寫',e.caseSensitive)}${tri('matchWholeWords','完整詞匹配',e.matchWholeWords)}${tri('useGroupScoring','組內計分',e.useGroupScoring)}</details>
 <details><summary>頻道、角色、事件與權限</summary>${field('channels','頻道 noapp / chess / mirage',listText(e.channels))}${field('events','真實事件 ID',listText(e.events))}${field('triggers','生成類型 normal / quiet / continue / regenerate',listText(e.triggers))}${opts('recognized','相認限制',[['','不限'],['true','已相認'],['false','未相認']],e.recognized===null?'':String(e.recognized))}${opts('phase','階段',[['','決策＋表達'],['decision','決策'],['expression','表達']],e.phase||'')}${field('filterNames','人物過濾',listText(e.characterFilter?.names))}${field('filterTags','標籤過濾',listText(e.characterFilter?.tags))}${check('filterExclude','排除匹配人物',e.characterFilter?.isExclude)}${field('automationId','自動化 ID（僅允許已授權動作）',e.automationId)}</details><button type="submit" class="button-primary wide">保存條目</button>${!e.protected?btn('worldbook-delete-entry','刪除此條目','button-quiet',attr(e.id)):''}</form>`:''}
 <form class="card" data-form="worldbook-settings"><h3>全局激活與預算</h3>${settingsNumbers.map(([k,l])=>field(k,l,w.settings[k],'number',k==='vectorThreshold'?'step="0.01"':'')).join('')}${settingsFlags.map(([k,l])=>check(k,l,w.settings[k])).join('')}${area('authorNote','作者備註（可使用 Outlet 巨集）',w.settings.authorNote,4)}<p class="editor-help">本地概念向量不額外消耗 API，非神經網絡 embedding。自動化允許 tai:consider-call / voice / hangup / decline / silence，其他 ID 不執行。</p><button type="submit" class="button-primary wide">保存設定</button></form>
 <div class="card"><h3>激活診斷 · 不消耗 API</h3>${area('sample','輸入測試訊息','給我發條語音',3).replace('name="sample"','id="worldbook-test-text"')}${opts('testEvent','模擬真實事件',[['','無'],['voice_requested','語音請求'],['call_requested','電話請求'],['call_connected','已接通'],['call_ringing','來電'],['call_ended_player','熙蒙掛斷'],['call_ended_tai','熙泰掛斷'],['call_ended_error','連線異常'],['proactive','主動聯繫']], '').replace('name="testEvent"','id="worldbook-test-event"')}${btn('worldbook-preview','預覽激活結果與完整提示詞','button-primary wide')}<pre id="worldbook-preview-output" class="ai-prompt-preview" hidden></pre><details><summary>最近實際 NoApp 激活</summary><pre class="ai-prompt-preview">${v(last?JSON.stringify({used:last.used,budget:last.budget,trace:last.trace},null,2):'尚無實際激活紀錄')}</pre></details></div></section>`;
}

function edit(ctx,fn){ctx.store.update(s=>{const w=ensureWorldbook(s);w.runtime={};fn(w,s);});}
function select(ctx,bookId,entryId){ctx.store.update(s=>{s.editor??={};if(bookId!==undefined)s.editor.worldbookBook=bookId;if(entryId!==undefined)s.editor.worldbookEntry=entryId;});}
const unique=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
export function handleWorldbook(action,target,ctx){
 if(!action.startsWith('worldbook-'))return false;
 const s=ctx.store.get(),w=readWorldbook(s),book=selected(s,w),id=target.dataset.id;
 try{
  if(action==='worldbook-select-book')select(ctx,id,'');
  else if(action==='worldbook-select-entry')select(ctx,book.id,id);
  else if(action==='worldbook-new-book'){const id='book-'+unique();edit(ctx,(w,s)=>{w.books.push({id,name:'新世界書',scope:'character',enabled:true,entries:[]});s.editor??={};s.editor.worldbookBook=id;s.editor.worldbookEntry='';});}
  else if(action==='worldbook-new-entry'){const entryId=book.id+':'+unique();edit(ctx,(w,s)=>{w.books.find(b=>b.id===book.id).entries.push(normalizeEntry({comment:'新條目',recognized:true,channels:['noapp']},entryId,book.id));s.editor??={};s.editor.worldbookEntry=entryId;});}
  else if(action==='worldbook-delete-entry'){if(!globalThis.confirm('刪除這個條目？'))return true;edit(ctx,w=>{const b=w.books.find(x=>x.id===book.id);b.entries=b.entries.filter(e=>e.id!==id||e.protected);});}
  else if(action==='worldbook-delete-book'){if(id==='xitai'||!globalThis.confirm('刪除此世界書？'))return true;edit(ctx,w=>{w.books=w.books.filter(b=>b.id!==id);});}
  else if(action==='worldbook-export'){const file=exportWorldbook(w.books.find(b=>b.id===id)),url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='worldbook-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else if(action==='worldbook-preview'){
   const sample=document.getElementById('worldbook-test-text')?.value||'',event=document.getElementById('worldbook-test-event')?.value||'',recognized=taiRecognized(s),channel=recognized?'noapp':'mirage',context={day:s.day,channel,recognized,messages:[{role:'user',content:sample}],worldbookEvents:event?[event]:[],outputMode:event==='call_connected'?'call':'text',profile:s.aiDraft?.profile,memories:s.aiDraft?.memories};
   const snapshot=previewTaiWorldbook(w,context),el=document.getElementById('worldbook-preview-output');if(el){el.hidden=false;const decision=taiActionDecisionPrompt({...context,mode:context.outputMode,worldbookSnapshot:snapshot}),expression=buildTaiPrompt({...context,worldbookSnapshot:snapshot});el.textContent=JSON.stringify({used:snapshot.used,budget:snapshot.budget,trace:snapshot.trace,active:snapshot.entries.map(e=>e.comment)},null,2)+'\n\n決策提示詞（實際消息順序）\n'+JSON.stringify(assembleTaiMessages(decision,context.messages,snapshot,'decision'),null,2)+'\n\n表達提示詞（實際消息順序）\n'+JSON.stringify(assembleTaiMessages(expression,context.messages,snapshot),null,2);}
  }
 }catch(error){ctx.toast(error.message);}return true;
}
export function submitWorldbook(form,ctx){
 const action=form.dataset.form;if(!action?.startsWith('worldbook-'))return false;
 const data=new FormData(form),id=form.dataset.id,get=k=>String(data.get(k)||''),nullable=k=>get(k)===''?null:get(k)==='true';
 try{
  if(action==='worldbook-import'){const book=importWorldbook(get('json'),{id:'import-'+unique()});edit(ctx,(w,s)=>{w.books.push(book);s.editor??={};s.editor.worldbookBook=book.id;s.editor.worldbookEntry='';});}
  if(action==='worldbook-book')edit(ctx,w=>{const b=w.books.find(b=>b.id===id);Object.assign(b,{name:get('name').trim()||b.name,enabled:data.has('enabled'),scope:get('scope'),character:get('character'),chat:get('chat'),persona:get('persona')});});
  if(action==='worldbook-settings')edit(ctx,w=>{w.settings=normalizeSettings({...w.settings,authorNote:get('authorNote').slice(0,4000),...Object.fromEntries(settingsNumbers.map(([k])=>[k,get(k)])),...Object.fromEntries(settingsFlags.map(([k])=>[k,data.has(k)]))});});
  if(action==='worldbook-entry')edit(ctx,w=>{const b=w.books.find(b=>b.entries.some(e=>e.id===id)),i=b.entries.findIndex(e=>e.id===id),old=b.entries[i];const raw={...old,...Object.fromEntries(['comment','content','group','outletName','automationId','phase','position','role','selectiveLogic',...numbers.map(([k])=>k)].map(k=>[k,get(k)])),...Object.fromEntries(flags.map(([k])=>[k,data.has(k)])),...Object.fromEntries(['key','keysecondary','channels','events','triggers'].map(k=>[k,parts(get(k))])),...Object.fromEntries(['caseSensitive','matchWholeWords','useGroupScoring','recognized'].map(k=>[k,nullable(k)])),characterFilter:{names:parts(get('filterNames')),tags:parts(get('filterTags')),isExclude:data.has('filterExclude')}};if(raw.protected){raw.constant=true;raw.disable=false;}b.entries[i]=normalizeEntry(raw,id,b.id);});
  ctx.toast('世界書已保存');
 }catch(error){ctx.toast(error.message);}return true;
}
