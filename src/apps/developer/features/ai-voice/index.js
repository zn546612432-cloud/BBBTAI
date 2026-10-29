import {btn,card,esc} from '../../../../system/ui.js';
import {aiStatus,askTai,voicePreview} from '../../../../services/ai/gateway.js';

const defaults={voiceId:'',model:'speech-2.8-turbo',language:'Chinese',speed:1};
const opt=(value,label,selected)=>'<option value="'+esc(value)+'"'+(selected===value?' selected':'')+'>'+esc(label)+'</option>';

export function aiVoicePanel(s){
  const p={...defaults,...s.aiVoiceSettings};
  return '<div class="editor-panel">'+
    card('<span class="eyebrow">DEEPSEEK × MINIMAX / LOCAL GATEWAY</span><h2>熙泰 · AI 接口与音色实验室</h2>'+
    '<p class="editor-help">文字大脑：DeepSeek · 语音合成：MiniMax。接口仅在本机开发服务器启用；正式 GitHub Pages 无服务端。密钥只写入本机 .env.local，绝不填在游戏里。</p>'+
    '<p>文字接口 <code>POST /api/ai/chat</code><br>语音接口 <code>POST /api/voice/tts</code><br>检查接口 <code>GET /api/ai/status</code></p>'+
    btn('ai-check-ports','检查 DeepSeek / MiniMax 连接','button-quiet wide')+
    '<p id="ai-port-status" class="editor-help" role="status">尚未检测接口</p>')+
    '<form data-form="ai-voice-config" class="card">'+
    '<h3>MiniMax · 熙泰音色</h3>'+
    '<label>音色 ID（voice_id）</label><input name="voiceId" value="'+esc(p.voiceId)+'" placeholder="从 MiniMax 控制台复制 voice_id" maxlength="100">'+
    '<label>语音模型</label><select name="model">'+opt('speech-2.8-turbo','Speech 2.8 Turbo',p.model)+opt('speech-2.8-hd','Speech 2.8 HD',p.model)+'</select>'+
    '<label>语种增强</label><select name="language">'+opt('Chinese','普通话',p.language)+opt('Chinese,Yue','粤语',p.language)+opt('auto','自动判断',p.language)+'</select>'+
    '<label>语速（0.5–2.0）</label><input name="speed" type="number" min=".5" max="2" step=".05" value="'+esc(p.speed)+'">'+
    '<button class="button-primary wide" type="submit">保存音色设置</button></form>'+
    card('<h3>试听（会消耗 MiniMax 额度）</h3><textarea id="ai-voice-sample" rows="2" maxlength="800">别急。你把文件发我，我看看。</textarea>'+
    btn('ai-test-voice','生成并播放试听','button-primary wide')+
    '<audio id="ai-voice-player" controls hidden style="width:100%;margin-top:12px"></audio>')+
    card('<h3>DeepSeek · 熙泰试聊</h3>'+
    '<p class="editor-help">只验证文字端口，不写入正式剧情、记忆或聊天存档。</p>'+
    '<textarea id="ai-chat-sample" rows="2" maxlength="2000">你今天在忙什么？</textarea>'+
    btn('ai-test-chat','试聊熙泰（会消耗 DeepSeek 额度）','button-quiet wide')+
    '<p id="ai-chat-result" class="editor-help" aria-live="polite">尚无测试回复</p>')+
    '<p class="editor-help">注意：语音识别、实时通话与跨 App 长期记忆尚未接入。本页仅调试本地 API 和语音参数。</p>'+
  '</div>';
}
function show(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
export async function handleAIVoice(action,t,ctx){
  if(!['ai-check-ports','ai-test-voice','ai-test-chat'].includes(action))return false;
  try {
    if(action==='ai-check-ports'){
      show('ai-port-status','检测中…');
      const status=await aiStatus();
      show('ai-port-status','本地服务正常 · DeepSeek '+(status.deepseek?'已配置密钥':'未配置密钥')+' · MiniMax '+(status.minimax?'已配置密钥':'未配置密钥'));
    }
    if(action==='ai-test-voice'){
      const config={...defaults,...ctx.store.get().aiVoiceSettings};
      if(!config.voiceId)throw Error('请先填写音色 ID 并保存');
      const sample=document.getElementById('ai-voice-sample')?.value?.trim();
      if(!sample)throw Error('请填写试听文字');
      const blob=await voicePreview({...config,text:sample});
      const player=document.getElementById('ai-voice-player');
      if(player){
        if(player.dataset.objectUrl)URL.revokeObjectURL(player.dataset.objectUrl);
        player.dataset.objectUrl=URL.createObjectURL(blob);
        player.src=player.dataset.objectUrl;player.hidden=false;
        player.play().catch(()=>ctx.toast('音频已生成，请点播放器上的播放键'));
      }
    }
    if(action==='ai-test-chat'){
      const sample=document.getElementById('ai-chat-sample')?.value?.trim();
      if(!sample)throw Error('请先填写试聊文字');
      show('ai-chat-result','正在生成回复…');
      const day=ctx.store.get().day, channel=day>=56?'noapp':'mirage';
      const data=await askTai({day,channel,messages:[{role:'user',content:sample}]});
      show('ai-chat-result',data.text);
    }
  }catch(e){
    if(action==='ai-test-chat')show('ai-chat-result',e.message);
    else if(action==='ai-check-ports')show('ai-port-status',e.message);
    ctx.toast(e.message);
  }
  return true;
}
export function submitAIVoice(form,ctx){
  if(form.dataset.form!=='ai-voice-config')return false;
  const values=new FormData(form);
  const voiceId=String(values.get('voiceId')||'').trim();
  const speed=Number(values.get('speed'));
  const model=String(values.get('model')),language=String(values.get('language'));
  if(voiceId&&!/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId))throw Error('voice_id 只能包含字母、数字、下划线及短横线');
  if(!Number.isFinite(speed)||speed<.5||speed>2)throw Error('语速应在 0.5–2.0 之间');
  if(!['speech-2.8-turbo','speech-2.8-hd'].includes(model)||!['Chinese','Chinese,Yue','auto'].includes(language))throw Error('不支持的语音设置');
  ctx.store.update(s=>{s.aiVoiceSettings={voiceId,model,language,speed};});
  ctx.toast('熙泰音色设置已保存在本机存档中');
  return true;
}
