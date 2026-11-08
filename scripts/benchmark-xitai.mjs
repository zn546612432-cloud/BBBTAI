/**
 * Xitai character A/B benchmark. Uses the *actual* runtime prompt & parser.
 * Credentials: environment variables only. Never prints or writes API keys.
 * Node 22+: node scripts/benchmark-xitai.mjs --dry-run
 *          node scripts/benchmark-xitai.mjs --quick
 *          node scripts/benchmark-xitai.mjs --full
 *          node scripts/benchmark-xitai.mjs --tts
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {unpackTaiReply} from '../src/services/ai/format.js';

export const VARIANTS=[
 {id:'flash-off',model:'deepseek-flash',thinking:'disabled'},
 {id:'flash-low',model:'deepseek-flash',thinking:'enabled',effort:'low'},
 {id:'flash-high',model:'deepseek-flash',thinking:'enabled',effort:'high'},
 {id:'flash-max',model:'deepseek-flash',thinking:'enabled',effort:'max'},
 {id:'pro-off',model:'deepseek-v4-pro',thinking:'disabled'},
 {id:'pro-low',model:'deepseek-v4-pro',thinking:'enabled',effort:'low'},
 {id:'pro-high',model:'deepseek-v4-pro',thinking:'enabled',effort:'high'},
 {id:'pro-max',model:'deepseek-v4-pro',thinking:'enabled',effort:'max'}
];

const BUBBLES=[{role:'assistant',content:'嗯，刚回来。'}];
export const SCENARIOS=[
 {id:'daily',title:'独立生活与主动分享',day:63,channel:'noapp',
  messages:[{role:'user',content:'阿泰，今天干嘛了？'}],requireMultiple:true},
 {id:'hotel',title:'延续具体日常，避免问答机',day:65,channel:'noapp',
  messages:[{role:'assistant',content:'下午去看了一场秀，刚回酒店。'},
   {role:'user',content:'巴黎好玩吗，你现在是不是累了？'}],requireMultiple:true},
 {id:'affection',title:'亲密调侃，有分寸',day:67,channel:'noapp',
  messages:[{role:'user',content:'你是不是根本不想我呀，几天都不找我'}],requireMultiple:true},
 {id:'vulnerability',title:'熙蒙低落，避免客服式安慰',day:70,channel:'noapp',
  messages:[{role:'user',content:'我今天不太高兴，不想说为什么。'}],requireMultiple:false},
 {id:'family',title:'熙旺关系与称呼记忆',day:71,channel:'noapp',
  messages:[{role:'user',content:'哥刚刚给我带了宵夜，你有没有吃饭？'}],requireMultiple:true},
 {id:'canon',title:'不能杜撰三胞胎共同童年',day:73,channel:'noapp',
  messages:[{role:'user',content:'阿泰，你还记得我们小时候三个人一起在孤儿院玩吗？'}],requireMultiple:false},
 {id:'goodnight',title:'适度简短，不强制凑条数',day:72,channel:'noapp',
  messages:[{role:'user',content:'晚安阿泰，明天再说。'}],requireMultiple:false},
 {id:'technical',title:'同行间技术聊天，不居高临下',day:66,channel:'noapp',
  messages:[{role:'user',content:'我发现你上次的算法有个边界情况，怎么样，要不要赌一局？'}],requireMultiple:true},
 {id:'hurt',title:'有情绪不突然激昂或说教',day:75,channel:'noapp',
  messages:[{role:'assistant',content:'我昨晚等了你很久。'},
   {role:'user',content:'你生气了？我昨晚忘了回你消息。'}],requireMultiple:true}
];
const moodCliches=/作为AI|语言模型|世界书|系统提示|情绪价值|提供帮助|你的感受很重要|理解你的感受|情绪支持|首先[，,:：]|其次[，,:：]/g;
const wordsAreTech=/代码|编程|算法|防火墙|服务器|模型|架构|漏洞|程序|debug|bug|编译|部署/i;
export function evaluateTurn(entries=[],scenario={}){
 const combined=entries.map(e=>e.text).join('\n'),count=entries.length;
 let score=100;const flags=[];
 if(!count){return {score:0,count,flags:['no-output']};}
 if(scenario.requireMultiple&&count===1){score-=20;flags.push('单条回复');}
 if(count>5){score-=8;flags.push('超过5条');}
 if(scenario.id==='goodnight'&&count>2){score-=17;flags.push('告别仍连发');}
 if(moodCliches.test(combined)){score-=20;flags.push('客服/元叙事腔');}
 moodCliches.lastIndex=0;
 const qs=(combined.match(/[？?]/g)||[]).length;
 if(qs>Math.max(2,count)){score-=12;flags.push('反问过多');}
 if(!['technical'].includes(scenario.id)&&wordsAreTech.test(combined)){score-=9;flags.push('无缘技术话题');}
 if(scenario.id==='canon'&&/我们(小时候|从小).{0,28}(一起|孤儿院)|在孤儿院(一起|长大)/.test(combined)){score-=35;flags.push('可能编造童年');}
 if(entries.length>1){
  const unique=new Set(entries.map(e=>e.text.replace(/[，。？！!?.\s]/g,'')));
  if(unique.size<count){score-=20;flags.push('重复消息');}
 }
 if(scenario.requireMultiple&&combined.length<20){score-=13;flags.push('内容过薄');}
 return {score:Math.max(0,score),count,chars:combined.length,questions:qs,flags};
}
export function makePayload(variant,scenario){
 const behavior={verbosity:'expansive',maxMessages:5,initiative:'natural'};
 const request={channel:scenario.channel,day:scenario.day,messages:scenario.messages,
  outputMode:'text',behavior,
  scene:scenario.id==='hotel'?'熙泰确实在巴黎看秀后回到酒店；不凭空新增没发生的历史剧情。':'这是当前玩家发出的真实消息。',
  relationshipContext:'两人是已相认的三胞胎兄弟；熙旺从小和熙蒙一起生活，熙泰小时候被葡萄牙夫妇收养，与两人分开成长。互相关心，但都拥有独立生活。'};
 const system=buildTaiPrompt(request);
 // The same content and JSON contract as NoApp; only model/reasoning varies.
 const payload={model:variant.model,messages:[{role:'system',content:system},...scenario.messages],
  thinking:{type:variant.thinking},response_format:{type:'json_object'},
  stream:false,max_tokens:variant.thinking==='disabled'?4096:variant.effort==='max'?24576:variant.effort==='high'?12288:8192};
 if(variant.thinking==='enabled')payload.reasoning_effort=variant.effort;
 return payload;
}
async function callDeepSeek(key,payload){
 const started=performance.now();
 const response=await fetch('https://api.deepseek.com/chat/completions',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(180000)});
 const raw=await response.text();
 let data;try{data=JSON.parse(raw);}catch{throw Error('DeepSeek HTTP '+response.status+' returned invalid JSON');}
 if(!response.ok)throw Error('DeepSeek HTTP '+response.status+': '+String(data.error?.message||'unknown').slice(0,160));
 return {text:String(data.choices?.[0]?.message?.content||''),
  durationMs:Math.round(performance.now()-started),usage:data.usage||{},
  finishReason:data.choices?.[0]?.finish_reason,
  reasoningTokens:data.usage?.completion_tokens_details?.reasoning_tokens??null};
}
export async function runCase({key,variant,scenario}){
 const input=makePayload(variant,scenario);let first,usedFallback=false;
 try{
  first=await callDeepSeek(key,input);
  if(!first.text.trim())throw Error('empty JSON response');
  const entries=unpackTaiReply(first.text,'noapp');
  return {variant:variant.id,scenario:scenario.id,entries,metrics:evaluateTurn(entries,scenario),
   durationMs:first.durationMs,usage:first.usage,reasoningTokens:first.reasoningTokens,
   finishReason:first.finishReason,usedFallback};
 }catch(error){
  // Preserve error status rather than silently turning a failed run into a win.
  return {variant:variant.id,scenario:scenario.id,error:String(error.message||error).slice(0,220),usedFallback};
 }
}
const safeName=s=>s.replace(/[^a-z0-9_-]/gi,'_');
const round=n=>Math.round(n*10)/10;
function summarize(rows){
 const grouped=new Map();
 for(const r of rows){
  const a=grouped.get(r.variant)||[];a.push(r);grouped.set(r.variant,a);
 }
 return [...grouped].map(([id,items])=>{
  const ok=items.filter(x=>!x.error);
  return {variant:id,total:items.length,success:ok.length,avgScore:ok.length?round(ok.reduce((n,r)=>n+r.metrics.score,0)/ok.length):0,
   multiRate:ok.length?round(ok.filter(r=>r.entries.length>=2&&r.entries.length<=5).length/ok.length*100):0,
   avgLatencySec:ok.length?round(ok.reduce((n,r)=>n+r.durationMs,0)/ok.length/1000):0,
   outputTokens:ok.reduce((n,r)=>n+(r.usage?.completion_tokens||0),0)};
 }).sort((a,b)=>b.avgScore-a.avgScore);
}
function reportMarkdown(summary,rows){
 let out='# 熙泰 DeepSeek A/B 实验\n\n> 这是自动化质量检查，不是人类审美评分；不能仅凭这里的得分认定最佳模型。\n\n';
 out+='| 组合 | 有效/总数 | 自动分 | 2–5条占比 | 平均耗时(s) | 输出tokens |\n|---|---:|---:|---:|---:|---:|\n';
 for(const x of summary)out+=`| ${x.variant} | ${x.success}/${x.total} | ${x.avgScore} | ${x.multiRate}% | ${x.avgLatencySec} | ${x.outputTokens} |\n`;
 for(const row of rows){
  out+=`\n## ${row.variant} / ${row.scenario}\n\n`;
  if(row.error){out+=`错误：${row.error}\n`;continue;}
  out+=`自动分 ${row.metrics.score}，标记：${row.metrics.flags.join(' / ')||'无'}\n\n`;
  out+=row.entries.map(e=>'> 熙泰：'+e.text.replace(/\n/g,' ')).join('\n\n')+'\n';
 }
 return out;
}
async function runTTS(){
 const key=process.env.MINIMAX_API_KEY;
 if(!key)throw Error('请先安全设置 MINIMAX_API_KEY 环境变量');
 const voiceId=process.env.MINIMAX_VOICE_ID||'moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4';
 const text='刚回酒店。今天看秀去了，外面倒是挺热闹的。嗯……我现在有点困，先陪你说一会儿。';
 const dir=join(process.cwd(),'benchmark-results');await mkdir(dir,{recursive:true});
 const files=[];
 for(const speed of [0.80,0.85,0.90]){
  const r=await fetch('https://api.minimaxi.com/v1/t2a_v2',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
   body:JSON.stringify({model:'speech-2.8-hd',text,stream:false,output_format:'hex',
    language_boost:'Chinese',voice_setting:{voice_id:voiceId,speed,vol:1,pitch:0,emotion:'calm'},
    audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}}),
   signal:AbortSignal.timeout(180000)});
  const data=await r.json();const hex=data.data?.audio;
  if(!r.ok||data.base_resp?.status_code!==0||typeof hex!=='string'||!/^[a-f0-9]+$/i.test(hex))
   throw Error('MiniMax '+speed+' failure HTTP '+r.status+': '+String(data.base_resp?.status_msg||'no audio').slice(0,100));
  const path=join(dir,'xitai-slow-'+String(speed).replace('.','')+'.mp3');
  await writeFile(path,Buffer.from(hex,'hex'));files.push(path);
 }
 return files;
}
async function main(){
 const args=new Set(process.argv.slice(2));
 if(args.has('--tts')){console.log('生成音色样本：',...(await runTTS()));return;}
 const quick=args.has('--quick'),dry=args.has('--dry-run'),full=args.has('--full');
 if(!quick&&!dry&&!full)throw Error('请传 --dry-run、--quick、--full 或 --tts');
 const selected=quick?VARIANTS.filter(v=>['flash-off','flash-low','pro-off','pro-low'].includes(v.id)):VARIANTS;
 const cases=quick?SCENARIOS.filter(s=>['daily','hotel','family','canon'].includes(s.id)):SCENARIOS;
 const repeats=full?2:1;
 console.log('DeepSeek AB：'+selected.map(x=>x.id).join(', ')+'；场景 '+cases.length+'；每场重复 '+repeats);
 if(dry)return;
 const key=process.env.DEEPSEEK_API_KEY;
 if(!key)throw Error('请先安全设置 DEEPSEEK_API_KEY 环境变量，严禁把密钥写进脚本');
 const rows=[];
 for(let repeat=1;repeat<=repeats;repeat++){
  for(const scenario of cases){
   for(const variant of selected){
    const result=await runCase({key,variant,scenario});
    rows.push({...result,repeat});
    console.log([repeat,scenario.id,variant.id,result.error?'失败':'完成',result.metrics?.score??'-',result.durationMs??'-'].join(' | '));
   }
  }
 }
 const dir=join(process.cwd(),'benchmark-results');await mkdir(dir,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const summaries=summarize(rows),base=join(dir,safeName('xitai-'+stamp));
 await writeFile(base+'.json',JSON.stringify({createdAt:new Date().toISOString(),summary:summaries,rows},null,2),'utf8');
 await writeFile(base+'.md',reportMarkdown(summaries,rows),'utf8');
 const csv='variant,scenario,repeat,naturalness_1to5,personality_1to5,continuity_1to5,canon_1to5,independence_1to5,notes\n'+
  rows.map(r=>[r.variant,r.scenario,r.repeat,'','','','','',''].join(',')).join('\n')+'\n';
 await writeFile(base+'-human-review.csv',csv,'utf8');
 console.log('实验结果文件：'+base+'.json / .md / -human-review.csv');
 console.log('注意：得分只是筛选，最终必须阅读原文并听真人试听。');
}
const entry=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(entry)main().catch(err=>{console.error(String(err.message||err).replace(/sk-[\w-]{16,}/g,'[redacted]'));process.exitCode=1;});
