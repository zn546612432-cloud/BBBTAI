import {ghostEditor,saveGhostConfig} from '../apps/ghost/editor.js';
import {ensureGhost} from '../apps/ghost/state.js';
import {uid} from '../services/id.js';
import {datePreset,messageDate,messageClock,setMessageDate} from '../services/messaging/timestamps.js';
import {dateParts,dateLabel,setPreviewDate} from '../services/calendar.js';
import {phoneData} from '../services/phone-data.js';
import {btn,card,demo,empty,esc} from '../system/ui.js';
import {conversations as allConversations,selectedConversation,actors,actorName,renameConversation,renameActor,setSchedule,newMessage,reorderMessage,moveMessageTo,clearDelivery,scheduleLabel,createConversation,chatApps,isGroup} from './conversations/model.js';
import {presetEditor,handlePresetAction,changePresetField,isPresetTextField,presetTestSubmit,stagePresetFile} from './presets/index.js';
export const manifest={id:'editor',name:'内容编辑器',glyph:'✎',tone:'#65798c',hidden:true,defaultRoute:'/',kicker:'DEVELOPER / LOCAL DRAFT'};
const tabs=[['ghost','GHOST'],['conversations','对话'],['presets','剧情预设'],['sms','短信编辑'],['phone','电话编辑'],['assets','图片'],['preview','预览']];
const attr=v=>esc(v);
function nav(route){return `<div class="editor-tabs">${tabs.map(([id,name])=>btn('editor-tab',name,route===id?'active':'',`data-tab="${id}"`)).join('')}</div>`;}
function messageCard(m,c,s,index){
 const mode=m.schedule?.mode||'immediate',options=actors(c),key=attr(m.id),sentPreset=datePreset(m,s);
 return `<article class="edit-message" data-message-id="${key}"><div class="edit-message-head"><button type="button" class="drag-message" data-drag-message="${key}" aria-label="拖动第 ${index+1} 条消息排序" title="按住拖动；也可使用下方上移和下移">⠿</button><span class="edit-number">${String(index+1).padStart(2,'0')}</span><span class="edit-kind">${m.kind==='image'?'图片':m.kind==='app_invitation'?'棋局邀请':'文字'} ${m.demo?demo():''}</span>${btn('duplicate-message','复制','text-button',`data-id="${key}"`)}${btn('delete-message','删除','text-button danger',`data-id="${key}"`)}</div><div class="editor-field-pair"><label>谁说这句话<select data-message-field="from" data-id="${key}" aria-label="第 ${index+1} 条发言人">${options.map(a=>`<option value="${attr(a.id)}" ${m.from===a.id?'selected':''}>${esc(a.name)}${a.id==='me'?'（我方）':''}</option>`).join('')}</select></label><label>发送时间<input type="time" data-message-field="time" data-id="${key}" value="${attr(messageClock(m,s)||s.clock)}" aria-label="第 ${index+1} 条显示时间"></label></div><div class="editor-field-pair"><label>发送日期<select data-sent-date="${key}" aria-label="第 ${index+1} 条发送日期">${[['today','今天'],['yesterday','昨天'],['before-yesterday','前天'],['custom','指定日期']].map(([id,label])=>`<option value="${id}" ${sentPreset===id?'selected':''}>${label}</option>`).join('')}</select></label>${sentPreset==='custom'?`<label>具体日期<input type="date" data-message-field="sentDate" data-id="${key}" value="${messageDate(m,s)}" aria-label="第 ${index+1} 条具体发送日期"></label>`:''}</div>${m.kind==='image'?`<img src="${attr(m.text)}" alt="消息图片">${btn('replace-message-image','替换图片','button-quiet',`data-id="${key}"`)}`:m.kind==='app_invitation'?`<p>国际象棋邀请 · ${esc(m.invitationId)}</p>`:`<label class="editor-message-label">对话内容<textarea data-message-field="text" data-id="${key}" aria-label="第 ${index+1} 条对话内容">${esc(m.text)}</textarea></label>`}<div class="message-schedule"><div class="schedule-heading"><span>什么时候出现</span><span class="schedule-badge ${m.delivery?'delivered':''}">${esc(scheduleLabel(m))}</span></div><select data-schedule-field="mode" data-id="${key}" aria-label="第 ${index+1} 条出现条件"><option value="immediate" ${mode==='immediate'?'selected':''}>直接保留在聊天记录</option><option value="game-time" ${mode==='game-time'?'selected':''}>到指定游戏日与时间弹出</option><option value="chat-delay" ${mode==='chat-delay'?'selected':''}>打开这段对话后延迟弹出</option></select>${mode==='game-time'?`<div class="editor-field-pair"><label>游戏日<input type="number" min="1" max="90" data-schedule-field="day" data-id="${key}" value="${m.schedule.day}" aria-label="第 ${index+1} 条触发游戏日"></label><label>游戏时间<input type="time" data-schedule-field="clock" data-id="${key}" value="${attr(m.schedule.clock)}" aria-label="第 ${index+1} 条触发游戏时间"></label></div>`:mode==='chat-delay'?`<label>延迟秒数<input type="number" min="0" max="3600" step="0.1" data-schedule-field="seconds" data-id="${key}" value="${m.schedule.seconds}" aria-label="第 ${index+1} 条延迟秒数"></label>`:''}${mode!=='immediate'?`<div class="edit-order">${btn('test-message','▶ 预览弹出','text-button',`data-id="${key}"`)}${m.delivery?btn('rearm-message','重新等待触发','text-button',`data-id="${key}"`):''}</div>`:''}</div><div class="edit-order edit-order-footer">${btn('move-up','↑ 上移','text-button',`data-id="${key}" ${index===0?'disabled':''}`)}${btn('move-down','↓ 下移','text-button',`data-id="${key}" ${index===c.messages.length-1?'disabled':''}`)}<label>移到第 <input type="number" min="1" max="${c.messages.length}" value="${index+1}" data-order-message="${key}" aria-label="第 ${index+1} 条排序位置"> 条</label></div></article>`;
}
function newConversationForm(s){return `<details class="new-conversation"><summary>＋ 新建对话窗口</summary><form data-form="new-conversation"><label>聊天软件<select name="channel" aria-label="新对话聊天软件">${chatApps.map(([id,name])=>`<option value="${id}" ${(s.editor.channel||selectedConversation(s)?.channel)===id?'selected':''}>${name}</option>`).join('')}</select></label><label>窗口类型<select name="type" aria-label="新对话窗口类型"><option value="direct">私聊</option><option value="group">群聊</option></select></label><label>联系人或群聊名称<input name="name" placeholder="例如：Rookery 13 或周末计划" maxlength="60" aria-label="新对话名称" required></label><label>群聊成员<textarea name="members" placeholder="自动包含熙蒙；其余成员一行一人，私聊留空" aria-label="新群聊成员"></textarea></label><p class="editor-help">创建后会自动选中新窗口。可直接添加文字或图片，再点“预览整段对话”打开。所有修改保存在本机。</p><button class="button-primary wide" type="submit">创建并编辑</button></form></details>`;}
function conversations(s){
 const selected=selectedConversation(s);if(!selected)return `<div class="editor-panel">${newConversationForm(s)}${empty('暂无对话')}</div>`;
 const {c,channel}=selected,list=allConversations(s),pending=c.messages.filter(m=>m.schedule&&m.schedule.mode!=='immediate'&&!m.delivery).length;
 return `<div class="editor-panel">${newConversationForm(s)}<label>选择对话</label><select id="editor-conversation" aria-label="选择对话">${list.map(x=>`<option value="${attr(x.channel+':'+x.c.id)}" ${x.channel===channel&&x.c.id===c.id?'selected':''}>${esc({wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'信息'}[x.channel]||x.channel)} / ${esc(x.c.name)}</option>`).join('')}</select><section class="editor-conversation-info"><label>联系人／群聊名称<input id="editor-conversation-name" value="${attr(c.name)}" maxlength="60" aria-label="联系人或群聊名称"></label><details class="editor-actors"><summary>编辑发言人名字 <span>${actors(c).length} 人</span></summary><div class="editor-actor-list">${actors(c).map(a=>`<label>${a.id==='me'?'我方':isGroup(c)?'群成员':'对方'}<input data-actor-name="${attr(a.id)}" value="${attr(a.name)}" maxlength="60" aria-label="${attr(a.name)}的显示名称"></label>`).join('')}</div></details><p class="editor-save-note">输入即时保存到本机。</p></section><div class="editor-list-heading"><strong>${c.messages.length} 条消息</strong><span>${pending} 条待触发</span></div><p class="editor-help">按住 ⠿ 拖动排序，手机也可操作。发送日期和几点发控制聊天里的时间标记；下方出现条件控制何时弹出，两者分开设置。定时按游戏日与游戏时间触发；在“预览”页调整时间。“预览弹出”会切到聊天，定时消息会同步调整本机游戏时间。</p><div class="editor-message-list">${c.messages.map((m,i)=>messageCard(m,c,s,i)).join('')}</div><div class="editor-add-actions">${btn('add-message','＋ 添加文字','button-primary')}${btn('add-image-message','＋ 添加图片','button-quiet')}</div>${btn('preview-chat','预览整段对话　↗','button-quiet wide')}<p class="editor-help">已弹出的消息会保留为记录；重新测试时可点“重新等待触发”。</p><div class="editor-drag-status" role="status" aria-live="polite"></div></div>`;
}
function assets(s){return `<div class="editor-panel">${card(`<strong>手机壁纸</strong><p>当前图片可从本机替换。</p>${btn('replace-wallpaper','更换壁纸','button-primary wide')}`)}<div class="section-heading">独立 App 图标</div><div class="surface-list">${Object.entries({wechat:'微信',noapp:'NoApp',chess:'国际象棋',mirage:'MIRAGE',photos:'照片',music:'音乐'}).map(([id,name])=>`<div class="list-row"><span class="list-copy"><strong>${name}</strong></span>${btn('replace-icon','替换','text-button',`data-id="${id}"`)}</div>`).join('')}</div><div class="section-heading">相册</div>${btn('add-photo','导入照片','button-primary wide')}</div>`;}
function sms(s){const list=s.content.conversations.messages||[],c=list.find(x=>x.id===s.editor.conversation)||list[0];return `<div class="editor-panel"><p class="editor-help">发件人、发送日期和时间、正文、出现条件可在这里修改。设为“指定游戏日与时间弹出”后，玩家到达该时间才会收到短信。</p><details class="new-conversation"><summary>＋ 新建短信发件人</summary><form data-form="new-sms"><label>号码或发件人<input name="name" maxlength="60" required placeholder="例如 106900000004"></label><button type="submit" class="button-primary wide">创建短信窗口</button></form></details>${c?`<label>选择发件人</label><select id="editor-conversation" aria-label="选择短信发件人">${list.map(x=>`<option value="messages:${attr(x.id)}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><div class="editor-list-heading"><strong>${c.messages.length} 条短信</strong></div><div class="editor-message-list">${c.messages.map((m,i)=>messageCard(m,c,s,i)).join('')}</div>${btn('add-message','＋ 添加短信','button-primary wide')}${btn('preview-chat','预览短信对话 ↗','button-quiet wide')}`:'<p>暂无短信发件人</p>'}</div>`;}
function phoneEditor(s){
 const data=phoneData(s),textInput=(name,value,label,required=false)=>`<label>${label}<input name="${name}" value="${attr(value||'')}" maxlength="60" ${required?'required':''}></label>`;
 return `<div class="editor-panel editor-phone"><p class="editor-help">电话 App 与这里共用同一份本机数据。姓名、电话号码和通话记录修改后刷新也会保留。尚未提供的真实号码保持空白或遮罩，不会编造剧情联系人号码。</p>
 <div class="section-heading">我的名片</div><form class="edit-message" data-form="phone-self">${textInput('name',data.self.name,'姓名',true)}${textInput('number',data.self.number,'电话号码（澳门 +853）',true)}${textInput('region',data.self.region,'地区',true)}<button type="submit" class="button-primary wide">保存我的名片</button></form>
 <div class="section-heading">联系人 · ${data.contacts.length} 位</div><details class="new-conversation"><summary>＋ 新建联系人</summary><form data-form="phone-add-contact">${textInput('name','','联系人姓名',true)}${textInput('number','','电话号码（可暂时留空）')}<button class="button-primary wide" type="submit">添加联系人</button></form></details>
 ${data.contacts.map(person=>`<details class="phone-editor-item"><summary><strong>${esc(person.name)}</strong><small>${esc(person.number||'未设置号码')}　›</small></summary><form data-form="phone-edit-contact"><input type="hidden" name="id" value="${attr(person.id)}">${textInput('name',person.name,'姓名',true)}${textInput('number',person.number,'电话号码')}<div class="phone-editor-actions"><button class="button-primary" type="submit">保存联系人</button>${btn('delete-phone-contact','删除','text-button danger',`type="button" data-id="${attr(person.id)}"`)}</div></form></details>`).join('')}
 <div class="section-heading">通话记录 · ${data.calls.length} 条</div><details class="new-conversation"><summary>＋ 新增通话记录</summary><form data-form="phone-add-call">${textInput('number','','电话号码',true)}${textInput('name','','显示名称（可选）')}${textInput('place',data.self.region,'地区',true)}${textInput('day','今天','通话日期／显示时间',true)}<label class="phone-checkbox"><input type="checkbox" name="missed"> 未接来电</label><button class="button-primary wide" type="submit">添加通话记录</button></form></details>
 ${data.calls.map(call=>`<details class="phone-editor-item"><summary><strong>${esc(call.name||call.number)}</strong><small>${esc(call.place)} · ${esc(call.day)} ${call.missed?' · 未接来电':''}　›</small></summary><form data-form="phone-edit-call"><input type="hidden" name="id" value="${attr(call.id)}">${textInput('number',call.number,'电话号码',true)}${textInput('name',call.name,'显示名称（可选）')}${textInput('place',call.place,'地区',true)}${textInput('day',call.day,'通话日期／显示时间',true)}<label class="phone-checkbox"><input type="checkbox" name="missed" ${call.missed?'checked':''}> 未接来电</label><div class="phone-editor-actions"><button class="button-primary" type="submit">保存通话记录</button>${btn('delete-phone-call','删除','text-button danger',`type="button" data-id="${attr(call.id)}"`)}</div></form></details>`).join('')}
 <p class="editor-help">开发者修改仅保存在当前浏览器。如需迁移至其他设备，请使用“预览”页的导出功能。</p></div>`;
}
function preview(s){const d=dateParts(s);return `<div class="editor-panel">${card(`<span class="eyebrow">TIMELINE</span><h2>${dateLabel(s)}</h2><p>D1 · 2025.05.19 — D90 · 2025.08.16</p>`)}<form data-form="preview"><label>手机显示日期</label><input type="date" value="${d.iso}" aria-label="手机显示日期" readonly><label>游戏时间</label><input name="clock" type="time" value="${s.clock}" required><label>剧情天数</label><input name="day" type="number" min="1" value="${s.day}" required><button class="button-primary wide" type="submit">应用预览</button></form><div class="section-heading">重大剧情 · 暂停充电</div><form data-form="charge-gate"><label>剧情天数</label><input name="day" type="number" min="1" max="89" value="${Math.min(89,s.day)}" required><label>完成标记</label><input name="flag" placeholder="day-57-complete" required><button class="button-primary wide" type="submit">保存</button></form><p class="editor-help">剧情规则写入完成标记后，即可充电跳日。第 90 天固定禁止充电。</p>${(s.storyChargeGates||[]).map(g=>`<div class="card">D${g.day} · ${esc(g.untilFlag)} ${btn('remove-charge-gate','删除','text-button',`data-day="${g.day}"`)}</div>`).join('')}${btn('export-content','导出全部本机内容','button-quiet wide')}</div>`;}

export function render({store},loc){const s=store.get(),route=loc.route.slice(1)||'conversations';return `<div class="page-pad editor-page"><span class="eyebrow">LOCAL DRAFT ${demo()}</span><div class="large-title">内容编辑器</div>${nav(route)}${route==='ghost'?ghostEditor(s):route==='presets'?presetEditor(s):route==='assets'?assets(s):route==='preview'?preview(s):route==='sms'?sms(s):route==='phone'?phoneEditor(s):conversations(s)}</div>`;}
export function handle(a,t,ctx){
 const {store,router}=ctx,id=t.dataset.id;
 if(a==='editor-bank-rate'){const el=document.getElementById('gh-rate'),rate=el.value===''?null:Number(el.value);if(rate!==null&&(!Number.isFinite(rate)||rate<=0)){el.reportValidity();return;}store.update(s=>{s.bankData??={balance:0,transactions:[],rate:null};s.bankData.rate=rate;});return;}
 if(a==='editor-ghost-save'){saveGhostConfig(t,ctx);return;}
 if(a==='editor-ghost-mission'){const type=document.getElementById('gh-mission-type').value,input=document.getElementById('gh-order-seconds'),seconds=input.value===''?null:Number(input.value);if(seconds!==null&&(!Number.isInteger(seconds)||seconds<10||seconds>600)){input.reportValidity();return;}store.update(s=>{const g=ensureGhost(s);g.missionTypes??={};g.orderConfigs??={};g.missionTypes['mirage-recruit-hacker']=type;g.orderConfigs['mirage-recruit-hacker']={seconds};});return;}
 if(a==='editor-tab'){if(t.dataset.tab==='sms')store.update(s=>{s.editor.channel='messages';s.editor.conversation=s.content.conversations.messages?.[0]?.id||'';});router.open({appId:'editor',route:'/'+t.dataset.tab});return;}
 if(a.startsWith('preset-')&&handlePresetAction(a,t,ctx))return;
 if(a==='delete-phone-contact'){store.update(s=>{s.content.phone.contacts=s.content.phone.contacts.filter(p=>p.id!==id);});ctx.toast('联系人已删除');return;}
 if(a==='delete-phone-call'){store.update(s=>{s.content.phone.calls=s.content.phone.calls.filter(call=>call.id!==id);});ctx.toast('通话记录已删除');return;}
 if(a==='remove-charge-gate'){store.update(s=>{s.storyChargeGates=(s.storyChargeGates||[]).filter(g=>g.day!==Number(t.dataset.day));});return;}
 if(a==='preview-chat'){const x=selectedConversation(store.get());if(x)router.open({appId:x.channel,route:'/chat/'+x.c.id});return;}
 if(a==='add-message')store.update(s=>{const {c}=selectedConversation(s);c.messages.push(newMessage(s,c));});
 if(a==='duplicate-message')store.update(s=>{const {c}=selectedConversation(s),i=c.messages.findIndex(m=>m.id===id);if(i<0)return;const m=structuredClone(c.messages[i]);m.id=uid();delete m.delivery;delete m.actual;m.authored=true;c.messages.splice(i+1,0,m);});
 if(a==='delete-message')store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(m)clearDelivery(s,c,m);c.messages=c.messages.filter(m=>m.id!==id);});
 if(a==='move-up'||a==='move-down')store.update(s=>{const {c}=selectedConversation(s),i=c.messages.findIndex(m=>m.id===id);moveMessageTo(c,id,i+(a==='move-up'?-1:1));});
 if(a==='rearm-message')store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(m)clearDelivery(s,c,m);});
 if(a==='test-message'){
  const x=selectedConversation(store.get());
  store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===id);if(!m)return;clearDelivery(s,c,m);if(m.schedule?.mode==='game-time'){s.day=m.schedule.day;s.clock=m.schedule.clock;}if(x.channel==='noapp'&&s.day<56)s.day=56;});
  router.open({appId:x.channel,route:'/chat/'+x.c.id});return;
 }
 if(a==='add-image-message'||a==='replace-message-image'){
  const x=selectedConversation(store.get());
  ctx.pickImage(src=>store.update(s=>{const c=s.content.conversations[x.channel].find(c=>c.id===x.c.id);if(a==='add-image-message')c.messages.push({...newMessage(s,c,'image'),text:src});else {const m=c.messages.find(m=>m.id===id);if(m)m.text=src;}}));
 }
 if(a==='replace-wallpaper')ctx.pickImage(src=>store.update(s=>s.wallpaper=src));
 if(a==='replace-icon')ctx.pickImage(src=>store.update(s=>s.iconOverrides[id]=src));
 if(a==='add-photo')ctx.pickImage((src,name)=>store.update(s=>s.content.photos.push({id:uid(),title:name,src,actual:true})));
 if(a==='export-content')ctx.download();
}
export function change(t,ctx){
 const {store}=ctx;
 if(changePresetField(t,ctx))return;
 if(t.id==='editor-conversation'){const i=t.value.indexOf(':');store.update(s=>{s.editor.channel=t.value.slice(0,i);s.editor.conversation=t.value.slice(i+1);});return;}
 if(t.id==='editor-conversation-name')store.update(s=>renameConversation(selectedConversation(s).c,t.value));
 if(t.dataset.actorName)store.update(s=>renameActor(selectedConversation(s).c,t.dataset.actorName,t.value));
 if(t.dataset.messageField)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.id);if(!m)return;const field=t.dataset.messageField;if(field==='from'&&actors(c).some(a=>a.id===t.value))m.from=t.value;else if(field==='time')setMessageDate(m,s,{time:t.value});else if(field==='sentDate')setMessageDate(m,s,{date:t.value});else if(field==='text'&&(!m.kind||m.kind==='text'))m.text=t.value;});
 if(t.dataset.sentDate)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.sentDate);if(m)setMessageDate(m,s,{preset:t.value});});
 if(t.dataset.scheduleField)store.update(s=>{const {c}=selectedConversation(s),m=c.messages.find(m=>m.id===t.dataset.id);if(!m)return;const field=t.dataset.scheduleField,mode=field==='mode'?t.value:m.schedule?.mode;const input=field==='mode'?{mode}:{...m.schedule,[field]:t.value};setSchedule(s,c,m,input);});
 if(t.dataset.orderMessage){const value=Number(t.value);if(!Number.isInteger(value)||value<1)throw Error('排序位置需为正整数');store.update(s=>moveMessageTo(selectedConversation(s).c,t.dataset.orderMessage,value-1));}
}
export const isTextEdit=t=>isPresetTextField(t)||t.id==='editor-conversation-name'||!!t.dataset.actorName||!!t.dataset.messageField&&['text','time','sentDate'].includes(t.dataset.messageField)||!!t.dataset.scheduleField&&t.dataset.scheduleField!=='mode';
export function input(t,ctx){
 if(!isTextEdit(t))return;
 if(isPresetTextField(t)){changePresetField(t,ctx);return;}
 if((t.dataset.scheduleField||['date','time'].includes(t.type))&&(!t.value||!t.checkValidity()))return;
 if((t.id==='editor-conversation-name'||t.dataset.actorName)&&!t.value.trim())return;
 change(t,ctx);
 const root=t.closest('.editor-panel');if(!root)return;
 const {c,channel}=selectedConversation(ctx.store.get());
 const edited=c.messages.find(m=>m.id===t.dataset.id),badge=t.closest('[data-message-id]')?.querySelector('.schedule-badge');if(edited&&badge){badge.textContent=scheduleLabel(edited);badge.classList.toggle('delivered',!!edited.delivery);}
 const people=new Map(actors(c).map(a=>[a.id,a.name]));
 const choice=root.querySelector('#editor-conversation');
 if(choice?.selectedOptions[0])choice.selectedOptions[0].textContent=({wechat:'微信',noapp:'NoApp',mirage:'MIRAGE',messages:'信息'}[channel]||channel)+' / '+c.name;
 root.querySelectorAll('select[data-message-field="from"]').forEach(select=>{for(const option of select.options)option.textContent=(people.get(option.value)||option.value)+(option.value==='me'?'（我方）':'');});
 root.querySelectorAll('[data-actor-name]').forEach(field=>{const name=people.get(field.dataset.actorName);if(name){field.setAttribute('aria-label',name+'的显示名称');if(field!==t)field.value=name;}});
 const title=root.querySelector('#editor-conversation-name');if(title&&title!==t)title.value=c.name;
}
export function submit(f,ctx){const {store,toast}=ctx,data=new FormData(f),form=f.dataset.form;
 if(form==='preset-test'){presetTestSubmit(f,ctx);return;}
 if(form?.startsWith('phone-')){
  const value=key=>String(data.get(key)||'').trim();
  const name=value('name'),number=value('number'),place=value('place'),day=value('day'),id=value('id');
  if(form==='phone-self'){
   if(!name||!number||!value('region'))throw Error('请填写姓名、澳门号码和地区');
   store.update(s=>{s.content.phone.self={name,number,region:value('region')};});toast('我的名片已保存');return;
  }
  if(form==='phone-add-contact'||form==='phone-edit-contact'){
   if(!name)throw Error('请输入联系人姓名');
   store.update(s=>{const list=s.content.phone.contacts;if(form==='phone-add-contact')list.push({id:uid(),name,number});else{const person=list.find(x=>x.id===id);if(!person)throw Error('联系人不存在');Object.assign(person,{name,number});}});
   toast(form==='phone-add-contact'?'联系人已添加':'联系人已保存');return;
  }
  if(form==='phone-add-call'||form==='phone-edit-call'){
   if(!number||!place||!day)throw Error('请填写电话号码、地区和时间');
   store.update(s=>{const list=s.content.phone.calls,call={name,number,place,day,missed:data.has('missed')};if(form==='phone-add-call')list.unshift({id:uid(),...call});else{const existing=list.find(x=>x.id===id);if(!existing)throw Error('通话记录不存在');Object.assign(existing,call);}});
   toast(form==='phone-add-call'?'通话记录已添加':'通话记录已保存');return;
  }
 }
 if(form==='new-conversation'||form==='new-sms'){createConversation(store,{channel:form==='new-sms'?'messages':String(data.get('channel')),name:String(data.get('name')||''),type:form==='new-sms'?'direct':String(data.get('type')),members:String(data.get('members')||'')});const pane=document.querySelector('#app-content');if(pane)pane.scrollTop=0;toast('对话窗口已创建，可以添加消息');}
 if(form==='charge-gate'){const day=Number(data.get('day')),untilFlag=String(data.get('flag')||'').trim();if(!Number.isInteger(day)||day<1||day>89||!untilFlag)throw Error('请填写天数与完成标记');store.update(s=>{s.storyChargeGates=[...(s.storyChargeGates||[]).filter(g=>g.day!==day),{day,untilFlag}];});toast('已保存');return;}
 if(form==='preview'){store.update(s=>setPreviewDate(s,{day:Number(data.get('day')),clock:String(data.get('clock'))}));toast('预览日期已更新');}
}
export function mountInteractions(root,ctx){
 let drag=null;
 root.addEventListener('change',async e=>{
  if(e.target.id!=='preset-import-file')return;
  const file=e.target.files?.[0];
  if(!file)return;
  try{await stagePresetFile(file,ctx);}catch(error){ctx.toast(error.message||'剧情文件无法导入');}
  finally{e.target.value='';}
 });
 const cleanup=()=>{root.querySelectorAll('.drag-active,.drop-before,.drop-after').forEach(el=>el.classList.remove('drag-active','drop-before','drop-after'));root.classList.remove('editor-dragging');};
 root.addEventListener('pointerdown',e=>{
  const grip=e.target.closest('[data-drag-message]');if(!grip||!e.isPrimary||e.button!==0||ctx.store.get().nav.current.appId!=='editor')return;
  e.preventDefault();drag={id:grip.dataset.dragMessage,pointerId:e.pointerId,targetId:null,after:false};root.setPointerCapture(e.pointerId);grip.closest('[data-message-id]').classList.add('drag-active');root.classList.add('editor-dragging');
 });
 root.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const pane=root.querySelector('#app-content'),rect=pane?.getBoundingClientRect();
  if(rect){if(e.clientY<rect.top+55)pane.scrollTop-=18;else if(e.clientY>rect.bottom-55)pane.scrollTop+=18;}
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-message-id]');
  root.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));
  if(!target||target.dataset.messageId===drag.id){drag.targetId=null;return;}
  drag.targetId=target.dataset.messageId;const box=target.getBoundingClientRect();drag.after=e.clientY>box.top+box.height/2;target.classList.add(drag.after?'drop-after':'drop-before');
 });
 root.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const moved=drag;drag=null;if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);cleanup();
  if(moved.targetId){ctx.store.update(s=>reorderMessage(selectedConversation(s).c,moved.id,moved.targetId,moved.after));const status=root.querySelector('.editor-drag-status');if(status)status.textContent='消息顺序已保存';}
 });
 root.addEventListener('pointercancel',()=>{drag=null;cleanup();});
}
