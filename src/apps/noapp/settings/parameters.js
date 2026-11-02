import {esc} from '../../../system/ui.js';
import {normalizeTtsSettings,TTS_EMOTIONS,TTS_LANGUAGES,TTS_CUES,TTS_EFFECTS} from '../../../services/voice/tts-settings.js';
// Decimal parameters accept any in-range decimal. HTML steps are offset from
// min: min=0.01 with step=0.1 incorrectly rejects the normal volume value 1.
const number=(name,label,value,min,max,step)=>`<label>${label}<input name="${esc(name)}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step<1?'any':step}" value="${esc(value)}"></label>`;
const select=(name,label,value,options)=>`<label>${label}<select name="${esc(name)}">${options.map(([v,l])=>`<option value="${esc(v)}"${String(value)===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
export function aiParameterFields(c){return '<details open class="tai-parameter-group"><summary>AI 生成参数</summary><p>温度越高表达越多变；top_p 控制候选范围。通常先调其中一个。保持非思考模式。</p>'+
 number('temperature','温度 temperature（0–2）',c.temperature??1.3,0,2,.05)+number('topP','核采样 top_p（0.01–1）',c.topP??1,.01,1,.01)+number('maxTokens','单次回复上限 max_tokens',c.maxTokens??4096,128,32768,1)+
 '<p>Flash 的非思考模式会忽略 top_p；V4 Pro 可调。频率惩罚、存在惩罚已被 DeepSeek 停用，因此不显示无效旋钮。</p></details>';}
export function ttsParameterFields(input={},prefix=''){
 const c=normalizeTtsSettings(input),n=(key,label,min,max,step)=>number(prefix+key,label,c[key],min,max,step),s=(key,label,opts)=>select(prefix+key,label,c[key],opts);
 return '<details open class="tai-parameter-group"><summary>速度、语调与语气</summary>'+n('speed','语速（0.5–2）',.5,2,.05)+n('pitch','音调（-12–12，0为原调）',-12,12,1)+n('volume','合成音量（0.01–10）',.01,10,.1)+s('emotion','情绪',TTS_EMOTIONS)+s('cue','开头语气快捷键',TTS_CUES)+s('language','语种增强',TTS_LANGUAGES)+'</details>'+
 '<details class="tai-parameter-group"><summary>高级声音与音质</summary>'+n('modifyPitch','声音明亮度（-100低沉，100明亮）',-100,100,1)+n('intensity','声音力度（-100刚劲，100柔和）',-100,100,1)+n('timbre','音色质感（-100浑厚，100清脆）',-100,100,1)+s('soundEffect','声音效果',TTS_EFFECTS)+s('normalization','数字 / 文本规范化',[['off','默认'],['basic','快速规范化'],['quality','高质量规范化']])+s('sampleRate','采样率',[8000,16000,22050,24000,32000,44100].map(x=>[x,x+' Hz']))+s('bitrate','MP3码率',[32000,64000,128000,256000].map(x=>[x,x/1000+' kbps']))+s('channel','声道',[[1,'单声道'],[2,'双声道']])+'</details>';
}
export function readTtsForm(form,prefix=''){
 const data=form instanceof FormData?form:new FormData(form),out={};
 for(const key of ['speed','pitch','volume','emotion','cue','language','modifyPitch','intensity','timbre','soundEffect','normalization','sampleRate','bitrate','channel'])out[key]=data.get(prefix+key);
 return out;
}
export const readAiForm=data=>({temperature:data.get('temperature'),topP:data.get('topP'),maxTokens:data.get('maxTokens')});
