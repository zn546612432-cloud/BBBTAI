// The authored line is immutable unless its developer saves the editor.
import {story55Config} from '../../../../services/story55/state.js';
import {dateParts} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {esc} from '../../../../system/ui.js';
import {voicePreview} from '../../../../services/ai/gateway.js';
import {saveClip} from '../../../../services/voice/audio-store.js';
import {createGestureAudio} from '../../../../services/voice/playback.js';
const safe=p=>!p||/^\/assets\/[a-z0-9_./-]+\.(mp3|m4a|ogg|wav)$/i.test(p);
export function voicePanel(s){
 const cfg=story55Config(s),lines=Object.entries(cfg.scenes||{}).filter(([,v])=>v.some(a=>a[0]==='call'));
 const phone=lines.map(([node,dialogue])=>{
  const items=dialogue.map((item,i)=>!['tai','ouroboros'].includes(item[0])?'':'<div class="editor-trigger-row"><small>陈熙泰 · '+(i+1)+'</small><p>'+esc(item[1])+'</p><label>站内MP3<input name="clip_'+i+'" value="'+esc(cfg.voiceAssets?.[node]?.[i]||'')+'" placeholder="/assets/voices/xitai-'+node+'-'+i+'.mp3"></label><button type="button" data-action="tai-voice-generate" data-node="'+node+'" data-index="'+i+'">合成试听下载</button></div>').join('');
  return '<details class="card"><summary>'+esc(node)+' · 固定剧情电话</summary><form data-form="tai-voice-call" data-node="'+esc(node)+'">'+items+'<button type="submit">保存音频路径</button></form></details>';
 }).join('');
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai'),messages=(chat?.messages||[]).filter(m=>m.kind==='voice'&&m.from==='tai'&&m.authored);
 const bubble=messages.map(m=>'<form class="card" data-form="tai-voice-chat" data-id="'+esc(m.id)+'"><label>台词<textarea name="text">'+esc(m.text)+'</textarea></label><label>MP3路径<input name="src" value="'+esc(m.voiceSrc||'')+'" placeholder="/assets/voices/xitai-'+esc(m.id)+'.mp3"></label><button type="submit">保存语音条</button><button type="button" data-action="tai-voice-generate" data-id="'+esc(m.id)+'">合成试听下载</button></form>').join('');
 return '<div class="editor-panel"><h2>熙泰 · 预设配音</h2><p>只有熙泰的普通语音需要合成；熙蒙仅保留D55密钥原音。固定剧情电话中熙蒙台词显示为字幕。</p><h3>剧情电话</h3>'+phone+'<h3>NoApp语音消息</h3><button type="button" data-action="tai-voice-add">＋ 新增熙泰语音条</button>'+bubble+'<p>生成的MP3会下载并保存在本机试听缓存。让其他玩家听到，需把文件发布在public/assets/voices/，然后填写 /assets/voices/...。填写路径不会上传文件。</p></div>';
}
export function voiceAction(action,t,ctx){
 if(action==='tai-voice-add'){
  ctx.store.update(s=>{const c=s.content.conversations.noapp?.find(c=>c.id==='tai');if(!c)throw Error('NoApp会话不存在');const id=uid(),text='熙泰的预设语音台词';c.messages.push({id,from:'tai',kind:'voice',text,voiceCaption:text,audioId:'tai-author-'+id,authored:true,schedule:{mode:'immediate'},day:s.day,time:s.clock,sentDate:dateParts(s).iso});});return true;
 }
 if(action!=='tai-voice-generate')return false;
 const s=ctx.store.get();let line,name,clipId=null;
 if(t.dataset.node){
  const node=t.dataset.node,index=Number(t.dataset.index),entry=story55Config(s).scenes?.[node]?.[index];
  if(!entry||!['tai','ouroboros'].includes(entry[0]))throw Error('熙蒙不能生成配音');
  line=entry[1];name='xitai-'+node+'-'+index;
 }else{
  const m=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===t.dataset.id);
  if(m?.from!=='tai'||m.kind!=='voice')throw Error('语音条不存在');
  line=m.text;name='xitai-'+m.id;clipId=m.audioId||m.id;
 }
 const audio=createGestureAudio();
 void voicePreview({text:line,tone:'dry'}).then(async blob=>{
  if(clipId)await saveClip(clipId,blob);
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.mp3';a.click();
  if(audio){audio.src=url;audio.onended=()=>URL.revokeObjectURL(url);try{await audio.play();}catch{ctx.toast('已下载MP3；iPhone可能需要点语音条重听');}}
  else setTimeout(()=>URL.revokeObjectURL(url),30000);
  ctx.toast('熙泰音频生成成功：本机可试听；发布后填写站内路径');
 }).catch(err=>ctx.toast('MiniMax配音失败：'+(err?.message||err)));
 return true;
}
export function voiceSubmit(form,ctx){
 if(!['tai-voice-call','tai-voice-chat'].includes(form.dataset.form))return false;
 const d=new FormData(form),v=k=>String(d.get(k)||'').trim();
 if(form.dataset.form==='tai-voice-call'){
  ctx.store.update(s=>{const node=form.dataset.node,lines=s.story55?.config?.scenes[node];if(!lines?.some(l=>l[0]==='call'))throw Error('非电话剧情');const mapped={};
   lines.forEach((line,i)=>{if(!['tai','ouroboros'].includes(line[0]))return;const src=v('clip_'+i);if(!safe(src))throw Error('音频路径只能是/assets/下的文件');if(src)mapped[i]=src;});
   s.story55.config.voiceAssets??={};s.story55.config.voiceAssets[node]=mapped;
  });
 }else{
  ctx.store.update(s=>{const m=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===form.dataset.id);
   if(m?.kind!=='voice'||m.from!=='tai'||!m.authored)throw Error('只能修改熙泰预设语音');
   if(!v('text')||!safe(v('src')))throw Error('台词不能为空，音频路径必须是站内MP3');
   m.text=v('text');m.voiceCaption=m.text;m.voiceSrc=v('src');
  });
 }
 ctx.toast('预设语音已保存');return true;
}
