
(()=>{'use strict';
const $=id=>document.getElementById(id);
const tags=['laughs','chuckle','coughs','clear-throat','groans','breath','pant','inhale','exhale','gasps','sniffs','sighs','snorts','burps','lip-smacking','humming','hissing','emm','sneezes'];
const bookSeed=[
 {title:'熙泰的独立人格',words:'',phase:'all',priority:100,on:true,body:'熙泰是谨慎、聪明、有自己的事情的黑客。对熙蒙有偏爱，但不以恋爱为全部生活，不做客服，不为每句话找补，不必迎合。'},
 {title:'技术话题',words:'电脑,黑客,防火墙,漏洞,端口,密钥,代码,病毒,木马,入侵',phase:'all',priority:95,on:true,body:'熙泰和熙蒙都是有经验的黑客。他们可以相互较量技术和效率，但熙泰不居高临下科普基础知识。'},
 {title:'相认之前',words:'身份,认识,名字,见面,父亲,孤儿院,相认',phase:'before',priority:110,on:true,body:'尚未相认时，熙泰不得提前知道熙蒙的真实身份、具体家庭秘密和未来的电影剧情。'},
 {title:'相认之后',words:'哥,阿蒙,熙蒙,担心,想,睡,喜欢',phase:'after',priority:95,on:true,body:'相认后的信任是既定关系，但熙泰的关心通常是实际、轻巧、克制的，不因关系亲近突然变成黏人的甜言蜜语机器。'},
 {title:'国际象棋',words:'棋,国际象棋,开局,王后,输了,赢了',phase:'all',priority:88,on:true,body:'熙泰喜欢脑力较量。对弈时会轻声挑衅、调侃熙蒙，但不反复使用同一台词或每次必赢。'},
 {title:'危机判断',words:'危险,有人,跟踪,警方,监控,暴露,出事,死',phase:'all',priority:120,on:true,body:'真正的危险里熙泰不会调情、冷笑或说无用的漂亮话；先确认事实、定位与风险，再简短提出行动。'},
 {title:'独立生活',words:'今天,忙,吃,困,工作,电影,游戏,晚安',phase:'all',priority:82,on:true,body:'熙泰有自己的工作、精力状态与兴趣，可以偶尔主动起话题或结束聊天，但不能编造已经发生的重大剧情或机械离线。'},
 {title:'亲密与边界',words:'喜欢,爱,关系,亲,亲密,想你',phase:'after',priority:84,on:true,body:'他可以情绪柔软，也可以嘴硬或拒绝；亲密不代表全天围绕熙蒙旋转，不需要频繁告白。'}
];
const regexSeed=[
 {find:'^\\s*(?:陈熙泰|熙泰|Xitai)\\s*[:：]\\s*',flags:'i',replace:'',target:'both',on:true},
 {find:'[（(](?:冷笑|轻笑|叹气|停顿|皱眉|低声说)[）)]',flags:'g',replace:'',target:'display',on:true}
];
const fresh=()=>({phase:'before',day:35,mood:'dry',wit:70,care:45,independence:85,initiative:32,brevity:77,typos:9,laugh:20,breath:15,sigh:10,hesitate:8,pause:0.25,maxTags:2,speed:0.95,pitch:-1,vol:1,json:true,autoTags:true,autoMood:true,normalize:true,lang:'auto',sample:32000,bitrate:128000,channel:1,modify:false,fxPitch:0,fxIntensity:0,fxTimbre:0,fx:'',extra:'',books:JSON.parse(JSON.stringify(bookSeed)),regex:JSON.parse(JSON.stringify(regexSeed))});
let state=fresh(),lastCue=null;
const fields={labPhase:'phase',labDay:'day',labMood:'mood',labWit:'wit',labCare:'care',labIndependent:'independence',labInitiative:'initiative',labBrevity:'brevity',labTypos:'typos',labLaugh:'laugh',labBreath:'breath',labSigh:'sigh',labHesitate:'hesitate',labPause:'pause',labMaxTags:'maxTags',labSpeed:'speed',labPitch:'pitch',labVolume:'vol',labJson:'json',labAutoTags:'autoTags',labAutoMood:'autoMood',labNormalize:'normalize',labLang:'lang',labSample:'sample',labBitrate:'bitrate',labChannel:'channel',labModify:'modify',labFxPitch:'fxPitch',labFxIntensity:'fxIntensity',labFxTimbre:'fxTimbre',labFx:'fx',labExtra:'extra'};
function slider(id,title,min,max,step){return "<div class='lab-slider'><div class='lab-slider-top'><span>"+title+"</span><strong id='"+id+"Value'></strong></div><input type='range' id='"+id+"' min='"+min+"' max='"+max+"' step='"+step+"'></div>";}
function field(id,title,html){return "<div class='field'><label for='"+id+"'>"+title+"</label>"+html+"</div>";}
function select(id,title,options){return field(id,title,"<select id='"+id+"'>"+options.map(x=>"<option value='"+x[0]+"'>"+x[1]+"</option>").join('')+"</select>");}
function checkbox(id,text){return "<label class='lab-check'><input type='checkbox' id='"+id+"'> "+text+"</label>";}
const html=[
 "<div class='lab-nav'><button type='button' data-jump='labVoice'>声音</button><button type='button' data-jump='labPerson'>人格</button><button type='button' data-jump='labBook'>世界书</button><button type='button' data-jump='labReg'>正则</button></div>",
 "<section class='lab-card' id='labVoice'><h2>03 · MiniMax 声音与活人感</h2><p class='lab-desc'>官方参数和表演算法分开控制。先选下面的情境预设，再手动微调声线。</p>",
 "<div class='lab-buttons'><button type='button' data-preset='dry'>淡淡冷笑</button><button type='button' data-preset='playful'>轻佻逗人</button><button type='button' data-preset='soft'>低声亲近</button><button type='button' data-preset='danger'>严肃紧张</button></div>",
 "<div class='lab-grid'>",
 select('labMood','表演情境',[['dry','冷嘲'],['playful','戏谑'],['soft','轻柔'],['danger','危险'],['neutral','平常']]),
 field('labStatic','声音提示',"<div class='lab-caption'>上方的音色 ID 可粘贴你自己的、经授权使用的克隆音色 ID。</div>"),
 "</div>",
 slider('labSpeed','语速 speed',0.5,2,0.05),
 "<div class='lab-grid'>",slider('labPitch','音调 pitch',-12,12,1),slider('labVolume','音量 vol',0.1,10,0.1),"</div>",
 checkbox('labAutoMood','根据情境适度调节 API emotion（上方手动选择的情绪优先）'),
 "<h3>表演偏好 · 不是 MiniMax 原生滑块</h3>",
 "<div class='lab-grid'>",slider('labLaugh','轻笑概率 %',0,100,1),slider('labBreath','呼吸概率 %',0,100,1),slider('labSigh','鼻息 / 叹气概率 %',0,100,1),slider('labHesitate','犹豫音概率 %',0,100,1),slider('labPause','标点停顿 / 秒',0,1.5,0.05),slider('labMaxTags','单条最多表演标签',0,4,1),"</div>",
 checkbox('labAutoTags','自动添加标签（不会每句都插入）'),
 "<div class='lab-caption'>危险模式不自动添加冷笑；手动插入的 Sound Tag 不会被概率滑块覆盖。</div>",
 "<h3>把声音动作插到台词光标处</h3><div class='lab-tag-cloud' id='labTags'></div>",
 "<div class='lab-buttons'><button type='button' id='labInsertPause'>插入停顿</button><button type='button' id='labPreview'>预览发声内容</button></div><div class='lab-output' id='labPreviewOut'>点击预览检查这次实际送给 TTS 的文本。</div>",
 "<details class='advanced'><summary>官方高级音频设置 / 声线效果器</summary><div class='lab-grid'>",
 select('labLang','语言增强',[['auto','自动'],['Chinese','中文普通话'],['Chinese,Yue','粤语'],['English','英语'],['Japanese','日语']]),
 select('labSample','采样率',[['16000','16 kHz'],['24000','24 kHz'],['32000','32 kHz'],['44100','44.1 kHz']]),
 select('labBitrate','MP3 码率',[['64000','64 kbps'],['128000','128 kbps'],['256000','256 kbps']]),
 select('labChannel','声道',[['1','单声道'],['2','立体声']]),"</div>",
 checkbox('labNormalize','中英文本规范化（数字 / 符号）'),checkbox('labModify','开启 MiniMax voice_modify 实验参数'),
 "<div class='lab-grid'>",slider('labFxPitch','效果器音高',-100,100,5),slider('labFxIntensity','效果器力度',-100,100,5),slider('labFxTimbre','效果器音色',-100,100,5),
 select('labFx','音效',[['','无'],['lofi_telephone','电话质感'],['spacious_echo','空间回声'],['auditorium_echo','大厅回声'],['robotic','机器人']]),"</div>",
 "<p class='lab-caption'>voice_modify 可影响音质或遭遇账号限制，首次试听建议保持关闭；Speech 2.8 不支持 whisper 情绪，请用轻气息、慢速和音量尝试。</p></details></section>",
 "<section class='lab-card' id='labPerson'><h2>04 · 陈熙泰的独立人格</h2><p class='lab-desc'>下列是 DeepSeek 的行为倾向；不直接修改电影固定事件，也不会替你决定关系进度。</p>",
 "<div class='lab-grid'>",
 slider('labWit','毒舌 / 幽默',0,100,1),slider('labCare','对熙蒙的特殊偏爱',0,100,1),
 slider('labIndependent','独立性 / 边界',0,100,1),slider('labInitiative','主动提起自己的事',0,100,1),
 slider('labBrevity','话少 / 克制',0,100,1),slider('labTypos','非工整打字倾向',0,100,1),"</div>",
 "<div class='lab-grid'>",
 select('labPhase','剧情认知阶段',[['before','尚未相认'],['after','已相认'],['danger','危机状态']]),
 field('labDay','当前游戏日',"<input type='number' id='labDay' min='1' max='90' inputmode='numeric'>"),"</div>",
 field('labExtra','自定义人格补充',"<textarea id='labExtra' rows='3' placeholder='写你独有的熙泰细节，不要把别人世界书全文贴进公开网页'></textarea>"),
 checkbox('labJson','DeepSeek 输出 JSON：说话文字 + 语气 + 音效标签'),
 "<div class='lab-buttons'><button type='button' id='labShowPrompt'>查看本轮完整人格 Prompt</button><button type='button' id='labCopyPrompt'>复制 Prompt</button></div>",
 "<div class='lab-output' id='labPromptOut' hidden></div>",
 "<p class='lab-caption'>该页面只能在你发送后生成回答。真正的离线、主动消息、回复延迟需后续连接《熙蒙的手机》游戏时钟。</p></section>",
 "<section class='lab-card' id='labBook'><h2>05 · 世界书编辑器</h2><p class='lab-desc'>支持添加、删除、启用、关键词和剧情阶段过滤。只有符合条件的条目才进入这轮 DeepSeek 提示词，防止提前剧透。</p><div id='labBookList'></div>",
 "<div class='lab-buttons'><button type='button' id='labAddBook'>＋ 新建世界书</button><button type='button' id='labActiveBook'>检查本轮激活条目</button></div><div class='lab-output' id='labBookOut' hidden></div></section>",
 "<section class='lab-card' id='labReg'><h2>06 · 正则规则与配置导出</h2><p class='lab-desc'>用于去掉角色名前缀、动作括号等，聊天显示和语音可以分别处理。新增规则要先测试，别误删台词。</p><div id='labRegexList'></div>",
 "<div class='lab-buttons'><button type='button' id='labAddRegex'>＋ 添加正则</button><button type='button' id='labTestRegex'>测试正则</button></div>",
 field('labRegexSample','正则测试文字',"<textarea id='labRegexSample'>熙泰：你还真敢试。（冷笑）</textarea>"),
 "<div id='labRegexOut' class='lab-output' hidden></div><h3>预设文件</h3>",
 "<div class='lab-buttons'><button type='button' id='labSave'>保存本机配置</button><button type='button' id='labRestore'>读取本机配置</button><button type='button' id='labExport'>导出 JSON</button><button type='button' id='labImportBtn'>导入 JSON</button><button type='button' id='labReset'>恢复默认</button></div>",
 "<input type='file' id='labImport' accept='.json,application/json' hidden><p class='lab-caption'>任何导出、保存都不包含 DeepSeek / MiniMax 的 Key。上传资料中有限制转载的原文没有嵌入网站。</p></section>",
 "<div class='lab-sticky'><button type='button' id='labToTts'>用这个设置试听</button><button type='button' id='labToChat'>和熙泰聊天</button></div>"
].join('');
const host=document.createElement('div');host.innerHTML=html;const tabs=document.querySelector('.tabs');tabs.parentNode.insertBefore(host,tabs);
function read(){for(const [id,k] of Object.entries(fields)){const x=$(id);if(!x)continue;state[k]=x.type==='checkbox'?x.checked:(x.type==='range'||x.type==='number')?Number(x.value):x.value;if(x.type==='range')$(id+'Value').textContent=x.value;}}
function fill(){for(const [id,k] of Object.entries(fields)){const x=$(id);if(!x)continue;if(x.type==='checkbox')x.checked=!!state[k];else x.value=state[k];if(x.type==='range')$(id+'Value').textContent=String(state[k]);}}
function info(s){if($('statusText'))$('statusText').textContent=s;}
function regexRun(s,target){let t=String(s||'');for(const r of state.regex){if(!r.on||!r.find||(r.target!=='both'&&r.target!==target))continue;try{t=t.replace(new RegExp(r.find,(r.flags||'g').replace(/[^gimsuy]/g,'')),r.replace||'');}catch(e){info('正则错误：'+e.message);}}return t;}
function newBook(x){const n=document.createElement('div');n.className='lab-wentry';n.innerHTML="<div class='lab-wtitle'><input class='bkTitle' aria-label='世界书名称'><button type='button' class='bkDel lab-btn'>删除</button></div><div class='lab-wcontrols'><div><label>触发关键词</label><input class='bkWords'></div><div><label>生效阶段</label><select class='bkPhase'><option value='all'>全部</option><option value='before'>相认前</option><option value='after'>相认后</option><option value='danger'>危机</option></select></div><div><label>优先级</label><input type='number' class='bkPriority' min='0' max='200'></div><label class='lab-check'><input type='checkbox' class='bkOn'>启用</label></div><label>条目正文</label><textarea class='bkBody'></textarea>";
 for(const [sel,key] of [['.bkTitle','title'],['.bkWords','words'],['.bkPhase','phase'],['.bkPriority','priority'],['.bkOn','on'],['.bkBody','body']]){const v=n.querySelector(sel);if(v.type==='checkbox')v.checked=!!x[key];else v.value=x[key];const sync=()=>{x[key]=v.type==='checkbox'?v.checked:v.type==='number'?Number(v.value):v.value;};v.addEventListener('input',sync);v.addEventListener('change',sync);}
 n.querySelector('.bkDel').onclick=()=>{state.books=state.books.filter(y=>y!==x);n.remove();};return n;}
function drawBooks(){const n=$('labBookList');n.replaceChildren();state.books.forEach(x=>n.appendChild(newBook(x)));}
function newRegex(x){const n=document.createElement('div');n.className='lab-regexrow';n.innerHTML="<label class='lab-check'><input type='checkbox' class='rxOn'>启用</label><div class='lab-grid'><div><label>正则查找</label><input class='rxFind'></div><div><label>替换文字</label><input class='rxReplace'></div><div><label>匹配 flags</label><input class='rxFlags'></div><div><label>作用范围</label><select class='rxTarget'><option value='both'>文字和语音</option><option value='display'>只聊天显示</option><option value='speech'>只语音</option></select></div></div><button type='button' class='lab-btn rxDel'>删除</button>";
 for(const [sel,key] of [['.rxOn','on'],['.rxFind','find'],['.rxReplace','replace'],['.rxFlags','flags'],['.rxTarget','target']]){const v=n.querySelector(sel);if(v.type==='checkbox')v.checked=!!x[key];else v.value=x[key];const sync=()=>{x[key]=v.type==='checkbox'?v.checked:v.value;};v.addEventListener('input',sync);v.addEventListener('change',sync);}
 n.querySelector('.rxDel').onclick=()=>{state.regex=state.regex.filter(y=>y!==x);n.remove();};return n;}
function drawRegex(){const n=$('labRegexList');n.replaceChildren();state.regex.forEach(x=>n.appendChild(newRegex(x)));}
function activeBooks(raw){const s=String(raw||'').toLowerCase();return state.books.filter(x=>x.on&&(x.phase==='all'||x.phase===state.phase)&&(!x.words||x.words.split(/[,，;；]/).some(k=>k.trim()&&s.includes(k.trim().toLowerCase())))).sort((a,b)=>b.priority-a.priority).slice(0,9);}
function rolePrompt(){
 read();let p=$('systemPrompt').value+'\n【陈熙泰专属补充】谨慎的海外黑客，聪明、有主见、有点坏心眼，会冷不丁取笑熙蒙，但不恶毒。毒舌时应轻巧，不油滑不强行耍帅。对熙蒙有明确偏爱，但不失去工作、兴趣和边界。切忌客服话术、无意义追问、过度解释以及每条都调情。真实危险里收起调侃，保持高效。只能知道当前时间线上自己确实有渠道知道的事；不能推测玩家屏幕外动作，也不能提前剧透死亡、相认或未来阴谋。';
 p+='\n【本轮状态】游戏第'+state.day+'天。关系阶段：'+({before:'相认前',after:'相认后',danger:'危险中'}[state.phase])+'。毒舌 '+state.wit+'/100、偏爱 '+state.care+'/100、独立 '+state.independence+'/100、主动话题 '+state.initiative+'/100、简洁 '+state.brevity+'/100、偶尔打字不工整 '+state.typos+'/100。这些只是倾向，不是固定频率。';
 if(state.extra.trim())p+='\n【自定义特征】'+state.extra.trim();
 const book=activeBooks(($('chatInput').value||'')+'\n'+$('chatLog').textContent.slice(-1100));
 if(book.length)p+='\n【本轮世界书】\n'+book.map(x=>x.title+'：'+x.body).join('\n');
 if(state.json)p+='\n仅输出合法 JSON，对象结构为 {"reply":"发给熙蒙的短信原文","tone":"dry|playful|soft|danger|neutral","vocal_cue":"none|chuckle|sighs|breath|snorts"}。不要 JSON 之外的文字。reply 不要舞台描写，也不要自称熙泰。声音标签不能出现在聊天显示文本中。';
 return p;
}
function parseReply(raw){
 let data=null;try{const txt=String(raw||'').replace(/^\s*[\x60]{3}(?:json)?/i,'').replace(/[\x60]{3}\s*$/,'').trim();data=JSON.parse(txt);}catch{}
 const reply=regexRun((data&&typeof data.reply==='string')?data.reply:raw,'display').trim();
 const tone=data&&typeof data.tone==='string'?data.tone:state.mood;
 const vocal_cue=data&&typeof data.vocal_cue==='string'?data.vocal_cue:'none';
 return {reply,tone,vocal_cue};
}
function setCurrentCue(c){lastCue=c||null;}
function insertAtCaret(s){const n=$('ttsText');n.focus();const start=n.selectionStart??n.value.length,end=n.selectionEnd??start;n.setRangeText(s,start,end,'end');}
function maybePlace(text,tag){const m=/[，。！？!?]/.exec(text);return m?text.slice(0,m.index+1)+tag+text.slice(m.index+1):text+' '+tag;}
function ttsConfig(source,voice){
 read();let speech=regexRun(String(source||''),'speech').trim();
 speech=speech.replace(/\(gasp\)/g,'(gasps)').replace(/\(laugh\)/g,'(laughs)').replace(/\(chuckles\)/g,'(chuckle)');
 speech=speech.replace(/\(([a-z-]{3,20})\)/gi,(all,word)=>tags.includes(word)?all:'');
 let count=(speech.match(/\([a-z-]+\)/g)||[]).length,max=Math.max(0,state.maxTags-count);
 const mood=lastCue?.tone||state.mood;
 const tryTag=(percent,tag)=>{if(state.autoTags&&max>0&&Math.random()*100<percent){speech=maybePlace(speech,'('+tag+')');max--;}};
 if(mood==='dry'||mood==='playful')tryTag(state.laugh,'chuckle');
 if(mood==='soft')tryTag(state.sigh,'exhale');
 if(mood!=='danger'&&tags.includes(lastCue?.vocal_cue)&&Math.random()*100<state.laugh)tryTag(100,lastCue.vocal_cue);
 if(speech.length>20)tryTag(state.breath,'breath');
 if(mood!=='danger')tryTag(state.sigh,'sighs');
 if(speech.length>18&&mood!=='danger')tryTag(state.hesitate,'emm');
 if(state.autoTags&&state.pause>0&&/[。！？]/.test(speech)&&!/<#/.test(speech))speech=speech.replace(/([。！？])(?=.{2,})/,'$1 <#'+Number(state.pause).toFixed(2)+'#> ');
 const vs={...voice,speed:state.speed,pitch:Math.round(state.pitch),vol:state.vol,text_normalization:state.normalize};
 if(state.autoMood&&!$('emotion').value){const e={soft:'calm',danger:'calm',playful:'fluent'}[mood];if(e)vs.emotion=e;}
 if($('emotion').value)vs.emotion=$('emotion').value;
 if(vs.emotion==='whisper'&&!/^speech-2\.6/.test($('ttsModel').value)){delete vs.emotion;info('2.8 不支持 whisper，已取消该参数。');}
 const extra={language_boost:state.lang,audio_setting:{sample_rate:state.sample,bitrate:state.bitrate,format:'mp3',channel:state.channel}};
 if(state.modify){extra.voice_modify={pitch:state.fxPitch,intensity:state.fxIntensity,timbre:state.fxTimbre};if(state.fx)extra.voice_modify.sound_effects=state.fx;}
 return {text:speech,voice_setting:vs,extra};
}
function preview(){const sample=$('ttsText').value;const r=ttsConfig(sample,{voice_id:$('voiceId').value,speed:1,vol:1,pitch:0});$('labPreviewOut').textContent='实际发声文本：\n'+r.text+'\n\nAPI 请求参数（不含 Key）：\n'+JSON.stringify({model:$('ttsModel').value,voice_setting:r.voice_setting,...r.extra},null,2);}
function setPreset(which){const presets={dry:{mood:'dry',speed:0.95,pitch:-1,laugh:20,breath:12,sigh:6,pause:0.20},playful:{mood:'playful',speed:1.04,pitch:0,laugh:38,breath:9,sigh:3,pause:0.15},soft:{mood:'soft',speed:0.88,pitch:-1,laugh:5,breath:25,sigh:12,pause:0.35},danger:{mood:'danger',speed:0.93,pitch:-2,laugh:0,breath:18,sigh:0,pause:0.22}};if(presets[which]){Object.assign(state,presets[which]);fill();lastCue=null;info('已切换「'+which+'」预设。');}}
function store(){read();return {schema:'xitai-voice-lab-v2',settings:state,voiceId:$('voiceId').value,ttsModel:$('ttsModel').value,dsModel:$('dsModel').value,systemPrompt:$('systemPrompt').value};}
function load(d){if(!d||d.schema!=='xitai-voice-lab-v2'||!d.settings||!Array.isArray(d.settings.books)||!Array.isArray(d.settings.regex))throw Error('配置格式不符合 v2');state=Object.assign(fresh(),d.settings);state.books=state.books.slice(0,80);state.regex=state.regex.slice(0,60);fill();drawBooks();drawRegex();if(d.voiceId)$('voiceId').value=d.voiceId;if(d.ttsModel)$('ttsModel').value=d.ttsModel;if(d.dsModel)$('dsModel').value=d.dsModel;if(d.systemPrompt)$('systemPrompt').value=d.systemPrompt;info('已导入设置。API Key 没有保存，也不会被覆盖。');}
function download(s,name){const u=URL.createObjectURL(new Blob([s],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
async function copy(s){try{await navigator.clipboard.writeText(s);info('已复制。');}catch{info('iPhone 浏览器可能不允许复制，请长按文本复制。');}}
const callbacks={
 labInsertPause:()=>insertAtCaret('<#'+Number(state.pause||.3).toFixed(2)+'#>'),labPreview:preview,
 labToTts:()=>{$('tabTts').click();$('ttsSection').scrollIntoView({behavior:'smooth',block:'center'});},
 labToChat:()=>{$('tabChat').click();$('chatSection').scrollIntoView({behavior:'smooth',block:'center'});},
 labShowPrompt:()=>{$('labPromptOut').hidden=false;$('labPromptOut').textContent=rolePrompt();},
 labCopyPrompt:()=>copy(rolePrompt()),
 labAddBook:()=>{const x={title:'新条目',words:'',phase:'all',priority:50,on:true,body:''};state.books.push(x);$('labBookList').appendChild(newBook(x));},
 labActiveBook:()=>{$('labBookOut').hidden=false;const b=activeBooks($('chatInput').value+' '+$('ttsText').value);$('labBookOut').textContent=b.length?b.map(x=>x.title+'\n'+x.body).join('\n\n'):'当前关键词没有触发额外条目。';},
 labAddRegex:()=>{const x={find:'',flags:'g',replace:'',target:'both',on:true};state.regex.push(x);$('labRegexList').appendChild(newRegex(x));},
 labTestRegex:()=>{$('labRegexOut').hidden=false;const t=$('labRegexSample').value;$('labRegexOut').textContent='聊天显示：\n'+regexRun(t,'display')+'\n\n语音文本：\n'+regexRun(t,'speech');},
 labSave:()=>{try{localStorage.setItem('xitai-lab-v2',JSON.stringify(store()));info('设置已保存本机。API Key 未保存。');}catch(e){info(e.message);}},
 labRestore:()=>{try{const d=localStorage.getItem('xitai-lab-v2');if(!d)throw Error('尚未保存配置');load(JSON.parse(d));}catch(e){info(e.message);}},
 labExport:()=>download(JSON.stringify(store(),null,2),'xitai-voice-lab-v2.json'),
 labImportBtn:()=>$('labImport').click(),
 labReset:()=>{if(!confirm('恢复全部默认调试设置？'))return;state=fresh();fill();drawBooks();drawRegex();info('已重置默认配置。');}
};
for(const [id,fn] of Object.entries(callbacks))$(id).addEventListener('click',fn);
for(const b of document.querySelectorAll('[data-jump]'))b.onclick=()=>$((b.dataset.jump))?.scrollIntoView({behavior:'smooth',block:'start'});
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>setPreset(b.dataset.preset);
for(const t of tags){const b=document.createElement('button');b.type='button';b.textContent='('+t+')';b.onclick=()=>insertAtCaret('('+t+')');$('labTags').appendChild(b);}
$('labImport').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{load(JSON.parse(await f.text()));}catch(err){info('导入失败：'+err.message);}e.target.value='';};
for(const [id] of Object.entries(fields)){const n=$(id);n?.addEventListener('input',()=>{read();if(id==='labMood')lastCue=null;});}
$('ttsText').addEventListener('input',()=>lastCue=null);
const e=$('emotion');for(const [value,label] of [['fearful','恐惧'],['disgusted','厌恶'],['surprised','惊讶'],['fluent','生动流畅']])if(!e.querySelector('option[value="'+value+'"]')){const o=document.createElement('option');o.value=value;o.textContent=label;e.appendChild(o);}
$('speed').closest('.field').style.display='none';
$('ttsModel').addEventListener('change',()=>{if($('emotion').value==='whisper'&&!/^speech-2\.6/.test($('ttsModel').value)){$('emotion').value='';info('2.8 不支持低语参数，已改成自动。');}});
fill();drawBooks();drawRegex();
window.voiceLab={systemPrompt:rolePrompt,jsonEnabled:()=>state.json,parseReply,setCurrentCue,ttsConfig,preview,getConfig:()=>state};
})();
