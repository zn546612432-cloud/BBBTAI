// V9: deterministic, evidence-bound curiosity. No model-generated memories are trusted here.
// This module never sends messages or reads other characters' private conversations.
const TOPICS=[
 ['technical',/代码|源码|程序|工具|编译|修复|漏洞|项目|部署|测试/],
 ['family',/熙旺|哥哥|家里|家人|孤儿院|仔仔|胡枫|小辛|阿威/],
 ['promise',/约好|答应|下次|改天|说好了|记得|别忘/],
 ['worry',/难过|烦|累|生气|担心|睡不着|害怕/],
 ['daily',/吃饭|电影|好看|好吃|照片|旅行|天气/]
];
export function extractTaiCuriosities(messages,{day=1,channel='noapp',limit=6}={}){
 if(!Array.isArray(messages))return [];
 const result=[],seen=new Set();
 for(let i=messages.length-1;i>=0;i--){
  const m=messages[i];
  if(!m||m.from!=='me'||m.actual===false||m.demo||m.deleted||m.kind==='call'||m.kind==='system'||m.day>day||typeof m.text!=='string')continue;
  if(m.channel&&m.channel!==channel&&m.visibility!=='shared')continue;
  const quote=m.text.trim().slice(0,180);
  if(!quote||/^\[.*系统事件/.test(quote))continue;
  // Chess is a story-triggered activity, never a recurring curiosity topic.
  const topic=TOPICS.find(([,pattern])=>pattern.test(quote))?.[0];
  if(!topic||seen.has(topic))continue;
  seen.add(topic);
  result.push({id:'tai-curiosity-'+topic,topic,day:Number.isInteger(m.day)?m.day:day,sourceId:String(m.id||''),quote,status:'open'});
  if(result.length>=limit)break;
 }
 return result;
}
export function taiCuriosityPrompt(items,{day=1}={}){
 const eligible=(Array.isArray(items)?items:[]).filter(x=>x&&x.status==='open'&&Number.isInteger(x.day)&&x.day<=day&&typeof x.quote==='string').slice(0,6);
 if(!eligible.length)return '';
 return '熙蒙曾亲口提过、可以继续关注的真实话题（不是熙蒙此刻正在做的事，也不是必须提问的任务）：\n'+eligible.map(x=>'D'+x.day+' '+x.topic+'：'+x.quote.slice(0,180)).join('\n')+'\n如果当前谈话自然适合，可以关注其中一件的后续；不主动报备自己的行程，不凭空假设对方已完成，也不每轮重复询问。';
}
