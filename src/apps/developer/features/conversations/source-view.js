import {btn,esc} from '../../../../system/ui.js';
import {date55,story55Config} from '../../../../services/story55/state.js';
import {readChatSources,daySourceSummary} from './source-model.js';

const optionDay=(s,day)=>{
 const x=daySourceSummary(s,day);
 const n=x.lines?x.lines+'句':x.nodeCount?'待触发节点':'尚无原稿';
 return '<option value="'+day+'" '+(Number(s.editor?.chatSourceDay||s.day)===day?'selected':'')+
  '>D'+String(day).padStart(2,'0')+' · '+date55(day)+' · '+n+'</option>';
};
const note=(x)=>x.type==='track'?'已接入统一微信消息生命週期':
 x.type==='d01'?'D01 原生互动聊天':
 x.type==='wish'?'由既有心愿、奖励及生活消息系统触发':'Story55 主线剧情节点';
function sceneCard(x,{first=false}={}){
 const locked=!!x.reason;
 return '<details class="chat-source-card" '+(first?'open':'')+'><summary><span class="chat-source-caption">'+esc(x.title)+'</span>'+
  '<span>'+esc(x.type==='node'?'主线':'聊天')+' · '+x.lines.length+' 条 · '+esc(x.at||x.timingLabel)+'</span></summary>'+
  '<form data-form="chat-source-edit" data-key="'+esc(x.key)+'">'+
  '<p class="editor-help">'+esc(note(x))+'；'+esc(x.deliveryLabel||'')+'</p>'+
  '<p class="chat-source-trigger"><strong>触发方式：</strong>'+esc(x.timingLabel)+'</p>'+
  (x.details?.length?'<p class="editor-help">'+esc(x.details.join(' · '))+'</p>':'')+
  (x.at!==undefined&&x.type!=='wish'&&x.type!=='d01'
   ?'<label class="chat-source-time">触发时间 <input type="time" name="at" value="'+esc(x.at)+'" '+(locked?'disabled':'')+
    (x.type==='track'?'required':'')+'></label>':'')+
  '<div class="chat-source-line-list">'+x.lines.map((line,i)=>{
    const actor=line.who==='me'?'熙蒙 · 玩家点击发送':line.who;
    const isText=line.kind==='text',readonly=locked||!isText;
    const title=(i+1)+'. '+actor+(line.kind!=='text'?' ['+line.kind+']':'')+
     (line.after!==undefined?' · 间隔基础 '+(line.after/1000).toFixed(1)+' 秒':'')+
     (line.id&&x.type==='d01'?' · '+line.id:'');
    if(readonly){
      return '<div class="chat-source-line chat-source-readonly"><strong>'+esc(title)+'</strong><p>'+esc(line.text)+'</p>'+
       '<input type="hidden" name="line-'+i+'" value="'+esc(line.text)+'"></div>';
    }
    return '<label class="chat-source-line"><strong>'+esc(title)+'</strong><textarea name="line-'+i+
      '" maxlength="3000" rows="2" required>'+esc(line.text)+'</textarea></label>';
  }).join('')+'</div>'+
  (locked?'<p class="chat-source-warning">'+esc(x.reason)+'</p>':
   '<button type="submit" class="button-primary wide">保存此段原稿（不会自动发送）</button>')+
  '<small class="editor-help">固定的消息 ID、发言人、图片和玩家发送步骤不会被编辑器重排；已送达的手机记录仍保持原样。</small>'+
  '</form></details>';
}
export function sourceView(s,{day=Number(s.editor?.chatSourceDay||s.day),embedded=false}={}){
 day=Number.isInteger(day)&&day>=1&&day<=55?day:1;
 const all=readChatSources(s,day);
 const term=String(s.editor?.chatSourceSearch||'').trim().toLocaleLowerCase();
 const filter=String(s.editor?.chatSourceKind||'all');
 const found=all.filter(item=>{
   if(filter==='group'&&item.chat!=='group'||filter==='direct'&&item.chat==='group'||filter==='node'&&item.type!=='node')return false;
   if(!term)return true;
   return [item.title,item.key,item.chat,item.timingLabel,...item.lines.map(l=>l.who+' '+l.text)]
    .join(' ').toLocaleLowerCase().includes(term);
 });
 const nodes=story55Config(s).nodes.filter(n=>n.day===day);
 return '<section class="chat-source-dashboard">'+
 '<div class="chat-source-heading"><h2>D01–D55 · 正式聊天原稿</h2><p>这里读取<strong>尚未触发的剧情来源</strong>，不是只查看手机里已经出现的聊天气泡。剧情数据仍由原引擎管理。</p></div>'+
 (embedded?'':`<div class="chat-source-day-controls">
 <button type="button" data-action="chat-source-prev" ${day===1?'disabled':''}>← 前一天</button>
 <label>选择原稿日期<select id="chat-source-day">${Array.from({length:55},(_,i)=>optionDay(s,i+1)).join('')}</select></label>
 <button type="button" data-action="chat-source-next" ${day===55?'disabled':''}>后一天 →</button></div>
 <div class="chat-source-filter"><label>搜索台词／人物<input id="chat-source-search" type="search" value="${esc(s.editor?.chatSourceSearch||'')}" placeholder="输入后按 Enter"></label>
 <label>类型<select id="chat-source-kind"><option value="all" ${filter==='all'?'selected':''}>全部来源</option>
 <option value="group" ${filter==='group'?'selected':''}>群聊</option><option value="direct" ${filter==='direct'?'selected':''}>私聊</option>
 <option value="node" ${filter==='node'?'selected':''}>主线场景</option></select></label></div>`) +
 '<div class="chat-source-overview"><strong>D'+String(day).padStart(2,'0')+' · '+date55(day)+'</strong>'+
 '<span>'+all.length+' 段有原文来源 · '+all.reduce((n,x)=>n+x.lines.length,0)+' 句 · '+nodes.length+' 个主线节点</span></div>'+
 (found.length?found.map((x,i)=>sceneCard(x,{first:i===0})).join(''):
 '<div class="chat-source-empty"><strong>本日没有符合条件的可读取聊天原稿</strong><p>'+
 (all.length?'请清除搜索或改为「全部来源」。':
 '这一天尚未登记独立的聊天原稿；不代表已经播放的消息被删除。你仍可在「全部消息」查看手机存档，或到「剧情预设」新建规则。')+
 '</p></div>')+
 (nodes.length?'<details class="chat-source-node-index"><summary>本日其他主线节点（'+nodes.length+'）</summary>'+
 nodes.map(n=>'<div class="chat-source-node-row"><span>'+esc(n.title)+' · '+esc(n.kind)+(n.at?' · '+esc(n.at):'')+'</span>'+
 btn('chat-source-open-node','到剧情树编辑','button-quiet',`data-node="${esc(n.id)}"`)+
 '</div>').join('')+'</details>':'')+
 '<p class="editor-help">修改只保存到当前浏览器的游戏存档；在原剧情播放器触发之前有效。导出文件用于跨设备保存，勿清除浏览器网站数据。</p></section>';
}
