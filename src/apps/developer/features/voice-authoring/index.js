import {story55Config} from '../../../../services/story55/state.js';
import {dateParts} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {esc} from '../../../../system/ui.js';
import {voicePreview,apiConfig} from '../../../../services/ai/gateway.js';
import {saveClip} from '../../../../services/voice/audio-store.js';
import {normalizeTtsSettings,TTS_CUES} from '../../../../services/voice/tts-settings.js';
import {ttsParameterFields,readTtsForm} from '../../../noapp/settings/parameters.js';
import {createGestureAudio} from '../../../../services/voice/playback.js';
const safe=p=>!p||/^\/assets\/[a-z0-9_./-]+\.(mp3|m4a|ogg|wav)$/i.test(p);
const pending=new Set();
const shortcuts=()=>'<div class="tai-test-actions" aria-label="语气快捷键">'+TTS_CUES.filter(([key])=>['chuckle','sighs','emm','breath','clear-throat'].includes(key)).map(([key,label])=>'<button type="button" data-action="tai-voice-cue" data-cue="'+key+'">＋ '+label+'</button>').join('')+'</div>';
export function voicePanel(s){
 const cfg=story55Config(s),lines=Object.entries(cfg.scenes||{}).filter(([,v])=>v.some(a=>a[0]==='call'));
 const phone=lines.map(([node,dialogue])=>{
  const items=dialogue.map((item,i)=>!['tai','ouroboros'].includes(item[0])?'':'<div class="editor-trigger-row"><small>陈熙泰 · '+(i+1)+'</small><label>台词<textarea data-voice-line name="line_'+i+'">'+esc(item[1])+'</textarea></label>'+shortcuts()+ttsParameterFields(normalizeTtsSettings(cfg.voiceSettings?.[node]?.[i],apiConfig()),'clip'+i+'_')+'<label>站内MP3<input name="clip_'+i+'" value="'+esc(cfg.voiceAssets?.[node]?.[i]||'')+'" placeholder="/assets/voices/xitai-'+node+'-'+i+'.mp3"></label><button type="button" data-action="tai-voice-generate" data-node="'+node+'" data-index="'+i+'">合成试听下载</button></div>').join('');
  return '<details class="card"><summary>'+esc(node)+' · 固定剧情电话</summary><form data-form="tai-voice-call" data-node="'+esc(node)+'">'+items+'<button type="submit">保存台词、参数与路径</button></form></details>';
 }).join('');
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai'),messages=(chat?.messages||[]).filter(m=>m.kind==='voice'&&m.from==='tai'&&m.authored);
 const bubble=messages.map(m=>'<form class="card" data-form="tai-voice-chat" data-id="'+esc(m.id)+'"><label>台词<textarea data-voice-line name="text">'+esc(m.text)+'</textarea></label>'+shortcuts()+ttsParameterFields(normalizeTtsSettings(m.voiceSettings,apiConfig()))+'<label>MP3路径<input name="src" value="'+esc(m.voiceSrc||'')+'" placeholder="/assets/voices/xitai-'+esc(m.id)+'.mp3"></label><button type="submit">保存语音条与参数</button><button type="button" data-action="tai-voice-generate" data-id="'+esc(m.id)+'">合成试听下载</button></form>').join('');
 return '<div class="editor-panel"><h2>熙泰 · 预设配音</h2><p>每句可独立调速度、音调、情绪与语气。快捷键在光标处插入语气标记；试听使用当前填写值。已生成音频需重新合成才会改变。熙蒙D55密钥保留原音，不经过MiniMax。</p><h3>剧情电话</h3>'+phone+'<h3>NoApp语音消息</h3><button type="button" data-action="tai-voice-add">＋ 新增熙泰语音条</button>'+bubble+'<p>合成后可在当前浏览器直接使用，并下载MP3。换设备使用时需把文件发布在public/assets/voices/并填写站内路径。</p></div>';
}
export function voiceAction(action,t,ctx){
 if(action==='tai-voice-cue'){
  const textarea=t.closest('.editor-trigger-row,form')?.querySelector('[data-voice-line]');
  if(textarea&&TTS_CUES.some(([key])=>key===t.dataset.cue)){
   const start=textarea.selectionStart??textarea.value.length,end=textarea.selectionEnd??start,tag='('+t.dataset.cue+')';
   textarea.setRangeText(tag,start,end,'end');textarea.focus();textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }
  return true;
 }
 if(action==='tai-voice-add'){
  ctx.store.update(s=>{const c=s.content.conversations.noapp?.find(c=>c.id==='tai');if(!c)throw Error('NoApp会话不存在');const id=uid(),text='熙泰的预设语音台词';c.messages.push({id,from:'tai',kind:'voice',text,voiceCaption:text,audioId:'tai-author-'+id,voiceSettings:normalizeTtsSettings(apiConfig()),authored:true,schedule:{mode:'immediate'},day:s.day,time:s.clock,sentDate:dateParts(s).iso});});return true;
 }
 if(action!=='tai-voice-generate')return false;
 const s=ctx.store.get(),form=t.closest('form');let line,name,clipId,settings,index,node;
 if(t.dataset.node){
  node=t.dataset.node;index=Number(t.dataset.index);const entry=story55Config(s).scenes?.[node]?.[index];
  if(!entry||!['tai','ouroboros'].includes(entry[0]))throw Error('熙蒙不能生成配音');
  line=form?.querySelector('[name="line_'+index+'"]')?.value||entry[1];name='xitai-'+node+'-'+index;clipId='tai-story-'+node+'-'+index;
  settings=normalizeTtsSettings(form?readTtsForm(form,'clip'+index+'_'):story55Config(s).voiceSettings?.[node]?.[index],apiConfig());
 }else{
  const m=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===t.dataset.id);
  if(m?.from!=='tai'||m.kind!=='voice')throw Error('语音条不存在');
  line=form?.querySelector('[name="text"]')?.value||m.text;name='xitai-'+m.id;clipId=m.audioId||m.id;
  settings=normalizeTtsSettings(form?readTtsForm(form):m.voiceSettings,apiConfig());
 }
 if(pending.has(name)){ctx.toast('这条正在合成');return true;}
 pending.add(name);t.disabled=true;
 const audio=createGestureAudio();
 void voicePreview({text:line,...settings}).then(async blob=>{
  await saveClip(clipId,blob);
  ctx.store.update(state=>{
   if(node){const cfg=state.story55?.config;if(!cfg)return;
    cfg.voiceSettings??={};cfg.voiceSettings[node]??={};cfg.voiceSettings[node][index]=settings;
    cfg.voiceClipIds??={};cfg.voiceClipIds[node]??={};cfg.voiceClipIds[node][index]=clipId;cfg.scenes[node][index][1]=line;
   }else{const m=state.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===t.dataset.id);if(m){m.text=line;m.voiceCaption=line;m.voiceSettings=settings;m.audioId=clipId;}}
  });
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.mp3';a.click();
  if(audio){audio.src=url;audio.onended=()=>URL.revokeObjectURL(url);try{await audio.play();}catch{ctx.toast('已保存并下载MP3；可点击语音条重听');}}
  else setTimeout(()=>URL.revokeObjectURL(url),30000);
  ctx.toast('已按本条参数生成；剧情播放会使用本机音频');
 }).catch(err=>ctx.toast('MiniMax配音失败：'+(err?.message||err))).finally(()=>{pending.delete(name);t.disabled=false;});
 return true;
}
export function voiceSubmit(form,ctx){
 if(!['tai-voice-call','tai-voice-chat'].includes(form.dataset.form))return false;
 const d=new FormData(form),v=k=>String(d.get(k)||'').trim();
 if(form.dataset.form==='tai-voice-call'){
  const node=form.dataset.node,lines=story55Config(ctx.store.get()).scenes[node];if(!lines?.some(l=>l[0]==='call'))throw Error('非电话剧情');
  const edits=lines.map((line,i)=>{
   if(!['tai','ouroboros'].includes(line[0]))return null;
   const src=v('clip_'+i),text=v('line_'+i)||line[1];if(!safe(src))throw Error('音频路径只能是/assets/下的文件');
   return {i,src,text,settings:normalizeTtsSettings(readTtsForm(d,'clip'+i+'_'),apiConfig())};
  }).filter(Boolean);
  ctx.store.update(s=>{const cfg=s.story55.config;cfg.voiceAssets??={};cfg.voiceSettings??={};cfg.voiceClipIds??={};cfg.voiceAssets[node]={};cfg.voiceSettings[node]??={};
   for(const e of edits){
    if(cfg.scenes[node][e.i][1]!==e.text||JSON.stringify(cfg.voiceSettings[node][e.i])!==JSON.stringify(e.settings))delete cfg.voiceClipIds[node]?.[e.i];
    cfg.scenes[node][e.i][1]=e.text;cfg.voiceSettings[node][e.i]=e.settings;if(e.src)cfg.voiceAssets[node][e.i]=e.src;
   }
  });
 }else{
  if(!v('text')||!safe(v('src')))throw Error('台词不能为空，音频路径必须是站内MP3');
  const settings=normalizeTtsSettings(readTtsForm(d),apiConfig());
  ctx.store.update(s=>{const m=s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(m=>m.id===form.dataset.id);
   if(m?.kind!=='voice'||m.from!=='tai'||!m.authored)throw Error('只能修改熙泰预设语音');
   m.text=v('text');m.voiceCaption=m.text;m.voiceSrc=v('src');m.voiceSettings=settings;
  });
 }
 ctx.toast('预设台词与参数已保存；修改声音后请重新合成');return true;
}
