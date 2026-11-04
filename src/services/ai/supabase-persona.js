// Approved character bible loaded from Supabase. This endpoint is read-only,
// and cannot access saves, personal memories, chat history or private API keys.
// On timeout or outage the existing local worldbooks remain authoritative.
export const TAI_V8_VERSION='v8-b-2026-11-05';
export const TAI_V8_ENDPOINT='https://zmnufhswpnreeseyamlv.supabase.co/functions/v1/tai-v8-persona';
let cached=null,checkedAt=0,flight=null;
const MAX_AGE_MS=5*60*1000;
const arr=value=>Array.isArray(value)?value.filter(x=>typeof x==='string').slice(0,12):[];
const lines=(label,items)=>arr(items).length?label+'：'+arr(items).join('；'):'';
const safe=value=>typeof value==='string'?value.slice(0,2500):'';

export function formatApprovedTaiV8(payload,{recognized=false,outputMode='text'}={}){
 if(payload?.version!==TAI_V8_VERSION||!payload.content||typeof payload.content!=='object')return '';
 const c=payload.content,p=c.personality||{},s=c.speech||{},r=c.relationship||{},b=c.behavior||{},m=c.memory||{},v=c.voice||{};
 const blocks=[
  '【最高优先级：作者已批准的Supabase陈熙泰 V8-B人物圣经 '+TAI_V8_VERSION+'】',
  '这是持续生效的人设与行为约束，不是今天发生过的聊天，不可把下面的示例写入记忆。',
  safe(p.central_conflict),
  lines('核心人格',p.traits),
  safe(p.principle),
  '聊天主导原则：'+safe(s.primary_attention),
  lines('应该做到',s.do),
  lines('严格避免',s.avoid),
  recognized?'作者最终纠正的示例：'+safe(s.example_correction):'',
  '关系推进：'+safe(r.policy),
  lines('关系变化',r.change_rules),
  '故事与行为权限：'+safe(b.authority),
  '游戏时间：'+safe(b.offline),
  lines('自主行为边界',b.autonomy),
  lines('记忆写入',m.write_policy),
  lines('记忆提及',m.retrieve_policy),
  lines('遗忘和测试数据',m.deletion_policy),
  '声音与表演：'+safe(v.goal),
  lines('声音原则',v.guidance)
 ];
 if(outputMode==='call'){
  blocks.push(lines('通话规则',b.call?.constraints));
  blocks.push(lines('自然挂断条件',b.call?.hangup_intents));
 }
 if(recognized){
  const examples=Array.isArray(c.examples)?c.examples.slice(0,5):[];
  for(const ex of examples){
   const player=safe(ex.player),tai=Array.isArray(ex.tai)?ex.tai.map(safe).filter(Boolean).slice(0,4):[];
   if(player&&tai.length)blocks.push('【表达示范（不是历史）】'+safe(ex.scene)+'\n熙蒙：'+player+'\n熙泰：'+tai.join(' / ')+'\n学习：'+safe(ex.purpose));
  }
 }else{
  blocks.push('【身份保密】当前尚未通过剧情相认：已知亲缘关系、真名、履历及私密背景不能向熙蒙泄露；绝不可把相认后的对白范例当作可直接使用的台词。');
 }
 blocks.push('最后检查：不要无关炫耀健身、论文、学位、财富或酒会；不要为多发几条消息而凑内容；不要把范例当真实经历。');
 return blocks.filter(Boolean).join('\n').slice(0,14500);
}

export async function loadApprovedTaiV8({fetcher=globalThis.fetch,now=Date.now,timeoutMs=2600}={}){
 if(cached&&now()-checkedAt<MAX_AGE_MS)return cached;
 if(flight)return flight;
 if(typeof fetcher!=='function')return null;
 flight=(async()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetcher(TAI_V8_ENDPOINT,{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
   if(!response.ok)return null;
   const data=await response.json();
   if(data?.ok!==true||data.version!==TAI_V8_VERSION||data.character_key!=='chen_xitai'||!data.content)return null;
   cached=data;
   checkedAt=now();
   return data;
  }catch{
   // The local V8 worldbook already exists: never block the player's reply.
   return null;
  }finally{clearTimeout(timer);}
 })().finally(()=>{flight=null;});
 return flight;
}
export function resetTaiV8Cache(){cached=null;checkedAt=0;flight=null;}
