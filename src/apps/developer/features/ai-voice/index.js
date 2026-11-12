import {ttsParameterFields,readTtsForm} from '../../../noapp/settings/parameters.js';
import {btn,card,esc} from '../../../../system/ui.js';
import {aiStatus,voicePreview,XITAI_VOICE_ID,XITAI_VOICE_OPTIONS,normalizeXitaiVoiceId,apiConfig,saveApiConfig} from '../../../../services/ai/gateway.js';
import {taiReviewPanel,handleTaiReview,submitTaiReview} from '../ai-profile/index.js';

const defaults={voiceId:XITAI_VOICE_ID,model:'speech-2.8-turbo',language:'Chinese',speed:1};
const opt=(value,label,selected)=>'<option value="'+esc(value)+'"'+(selected===value?' selected':'')+'>'+esc(label)+'</option>';

export function aiVoicePanel(s){
  const p={...defaults,...apiConfig(),model:apiConfig().ttsModel||defaults.model};
  return '<div class="editor-panel">'+
    card('<h3>MIRAGE · 固定對話</h3><p class="editor-help">MIRAGE 使用既有固定劇情與分享預設對白，不接入自由聊天 AI；NoApp、電話與國際象棋沿用原 AI 設定。</p>')+
    card('<span class="eyebrow">DEEPSEEK × MINIMAX / LOCAL GATEWAY</span><h2>熙泰 · AI 接口与音色实验室</h2>'+
    '<p class="editor-help">文字大脑：DeepSeek · 语音合成：MiniMax。GitHub Pages 可在 NoApp → AI 设置配置会话密钥；开发服务器也可使用环境变量。此处可调整声音并试听。</p>'+
    '<p>文字接口 <code>POST /api/ai/chat</code><br>语音接口 <code>POST /api/voice/tts</code><br>检查接口 <code>GET /api/ai/status</code></p>'+
    btn('ai-check-ports','检查 DeepSeek / MiniMax 连接','button-quiet wide')+
    '<p id="ai-port-status" class="editor-help" role="status">尚未检测接口</p>')+
    '<form data-form="ai-voice-config" class="card">'+
    '<h3>MiniMax · 熙泰音色</h3>'+
    '<label>熙泰音色（voice_id）</label><select name="voiceId">'+XITAI_VOICE_OPTIONS.map(([id,label])=>opt(id,label+' · '+id,p.voiceId)).join('')+'</select>'+
    '<label>语音模型</label><select name="model">'+opt('speech-2.8-turbo','Speech 2.8 Turbo',p.model)+opt('speech-2.8-hd','Speech 2.8 HD',p.model)+'</select>'+
    '<label>语种增强</label><select name="language">'+opt('Chinese','普通话',p.language)+opt('Chinese,Yue','粤语',p.language)+opt('auto','自动判断',p.language)+'</select>'+
    ttsParameterFields(p)+
    '<button class="button-primary wide" type="submit">保存音色设置</button></form>'+
    card('<h3>试听（会消耗 MiniMax 额度）</h3><textarea id="ai-voice-sample" rows="2" maxlength="800">别急。你把文件发我，我看看。</textarea>'+
    btn('ai-test-voice','生成并播放试听','button-primary wide')+
    '<audio id="ai-voice-player" controls hidden style="width:100%;margin-top:12px"></audio>')+
    '<p class="editor-help">参数用于之后新合成的音频；预设配音页支持为每句保存独立参数。</p>'+
  '</div>'+taiReviewPanel(s);
}
function show(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
export async function handleAIVoice(action,t,ctx){
  if(await handleTaiReview(action,t,ctx))return true;
  if(!['ai-check-ports','ai-test-voice'].includes(action))return false;
  try {
    if(action==='ai-check-ports'){
      show('ai-port-status','检测中…');
      const status=await aiStatus();
      show('ai-port-status','本地服务正常 · DeepSeek '+(status.deepseek?'已配置密钥':'未配置密钥')+' · MiniMax '+(status.minimax?'已配置密钥':'未配置密钥'));
    }
    if(action==='ai-test-voice'){
      const config={...defaults,...apiConfig(),model:apiConfig().ttsModel||defaults.model};
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
  }catch(e){
    if(action==='ai-check-ports')show('ai-port-status',e.message);
    ctx.toast(e.message);
  }
  return true;
}
export function submitAIVoice(form,ctx){
  if(submitTaiReview(form,ctx))return true;
  if(form.dataset.form!=='ai-voice-config')return false;
  const values=new FormData(form);
  const voiceId=String(values.get('voiceId')||'').trim();
  const speed=Number(values.get('speed'));
  const model=String(values.get('model')),language=String(values.get('language'));
  if(voiceId&&!/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId))throw Error('voice_id 只能包含字母、数字、下划线及短横线');
  if(!Number.isFinite(speed)||speed<.5||speed>2)throw Error('语速应在 0.5–2.0 之间');
  if(!['speech-2.8-turbo','speech-2.8-hd'].includes(model)||!['Chinese','Chinese,Yue','auto'].includes(language))throw Error('不支持的语音设置');
  ctx.store.update(s=>{s.aiVoiceSettings={voiceId:normalizeXitaiVoiceId(voiceId),model,...readTtsForm(values)};});
  saveApiConfig({...apiConfig(),voiceId:normalizeXitaiVoiceId(voiceId),ttsModel:model,...readTtsForm(values)});
  ctx.toast('熙泰声音参数已保存，NoApp 电话与语音共用');
  return true;
}
