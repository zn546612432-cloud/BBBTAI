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
 const c=payload.content,b=c.behavior||{},m=c.memory||{},v=c.voice||{};
 const blocks=[
  '【最高优先级：作者已批准的Supabase陈熙泰 V8-B行为、记忆和声音兼容约束 '+TAI_V8_VERSION+'】',
  '这是持续生效的人设与行为约束，不是今天发生过的聊天，不可把下面的示例写入记忆。',
  '旧版人格、语言、关系与对白示范已经由作者最新本地世界书替代，不再注入。',
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
 if(!recognized){
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
