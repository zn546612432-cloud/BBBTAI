import {esc} from '../../../system/ui.js';
import {DEFAULT_TAI_BEHAVIOR} from '../../../services/ai/behavior.js';
export function readBehaviorForm(form){
 return Object.fromEntries(Object.keys(DEFAULT_TAI_BEHAVIOR).map(k=>[k,['proactive','autonomousVoice','callDedupe','callInterrupt'].includes(k)?form.has('behavior_'+k):form.get('behavior_'+k)]));
}
export function behaviorSettings(saved,draft={},events=[]){
 const c={...saved};
 for(const key of Object.keys(c))if(draft['behavior_'+key]!==undefined)c[key]=draft['behavior_'+key];
 const number=(key,label,min,max,unit='秒')=>`<label>${label}（${unit}）<input type="number" inputmode="decimal" name="behavior_${key}" min="${min}" max="${max}" step="any" value="${esc(c[key])}" required></label>`;
 const select=(key,label,options)=>`<label>${label}<select name="behavior_${key}">${options.map(([value,text])=>`<option value="${value}"${c[key]===value?' selected':''}>${text}</option>`).join('')}</select></label>`;
 const recent=(Array.isArray(events)?events:[]).filter(e=>e.type==='tai_call_v2_turn').slice(-8);
 const count=recent.reduce((n,e)=>n+Number(e.blocked||0),0);
 return `<section class="tai-behavior-settings"><h3>熙泰怎么聊天</h3><form data-form="tai-save-behavior">
 ${select('verbosity','表达长度',[['brief','偏简短'],['balanced','自然，有话就多说'],['expansive','偏展开，多讲看法和细节']])}
 ${number('maxMessages','一次最多几条独立消息',1,6,'条')}
 ${select('initiative','主动带话题',[['off','顺着当前内容聊'],['natural','自然关注熙蒙的近况'],['active','更主动追踪熙蒙真正说过的事']])}
 <label class="tai-test-toggle"><input type="checkbox" name="behavior_autonomousVoice" ${c.autonomousVoice?'checked':''}> 允许熙泰自行选择发语音（默认开启）</label>
 <p>接通 MiniMax 后，熙泰可以按话题选择文字或一条语音，也可以主动发语音联系你；不用先要求他发，不受第60天限制。</p>
 <details open><summary>回复速度</summary><p>连续发送新消息后等 3 秒再一起理解；首条等待会计入模型响应时间，后续逐条发出。</p>
 <div class="tai-setting-pair">${number('firstDelayMin','首条最短等待',0,60)}${number('firstDelayMax','首条最长等待',0,120)}</div>
 <div class="tai-setting-pair">${number('messageGapMin','连发最短间隔',.5,30)}${number('messageGapMax','连发最长间隔',.5,60)}</div></details>
 <details open><summary>主动联系与未回复</summary>
 <label class="tai-test-toggle"><input type="checkbox" name="behavior_proactive" ${c.proactive?'checked':''}> 允许熙泰主动发消息与追问</label>
 ${select('triggerClock','等待时间按哪个时钟',[['game','游戏时间'],['real','现实时间']])}
 <p>主动消息只在页面运行且熙泰在线时触发；你回复、说去睡觉或需要安静，会撤销本次追问。同一条未回复消息只跟进一次。</p>
 ${number('idleMinutes','安静多久后可以主动开话题',1,1440,'分钟')}
 ${number('followupMinutes','他发完消息，你多久没回才跟进',1,1440,'分钟')}
 ${number('cooldownMinutes','两次自主联系至少间隔',1,1440,'分钟')}
 ${number('dailyLimit','每天最多自主联系几次',1,12,'次')}
 </details><details open><summary>电话停顿与沉默</summary>
 ${number('callPause','两段发言之间停顿',.3,4)}
 ${number('callNudgeSeconds','你沉默多久后他再开口',10,300)}
 ${number('callCloseSeconds','追问后再沉默多久，他可以告别挂断',20,600)}
 </details>
 <details open><summary>NoApp V2 · 动态通话</summary>
 <p>电话仅生成一轮完整答复，分段朗读，不再为凑足语音条数额外请求 AI。熙蒙按麦克风或发文字可打断；只将完整播放的段落记入正式通话记忆。</p>
 <label class="tai-test-toggle"><input type="checkbox" name="behavior_callDedupe" ${c.callDedupe?'checked':''}> 启用语义重复防护</label>
 <label class="tai-test-toggle"><input type="checkbox" name="behavior_callInterrupt" ${c.callInterrupt?'checked':''}> 允许文字与麦克风打断</label>
 ${number('callMaxSegments','每轮最多播放几段',1,5,'段')}
 ${select('callIdleMode','沉默模式',[['natural','自然判断（推荐）'],['active','更主动'],['quiet','更安静']])}
 ${number('callQuietSeconds','熙蒙要求安静后至少等待',30,900)}
 <p>仅当前通话有效；系统会阻止旧请求返回后继续播放。最近 ${recent.length} 轮通话里过滤了 ${count} 段重复或不完整内容。</p>
 </details><button type="submit" class="button-primary">保存聊天与通话设置</button></form>
 <div class="tai-test-actions"><button type="button" data-action="tai-test-outreach">测试主动开话题</button><button type="button" data-action="tai-test-followup">测试未回复跟进</button></div></section>`;
}
