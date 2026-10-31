// Repair only under-filled conversational turns, never a deliberate short goodbye.
// The model still chooses what to say; a second generation is not a template reply.
const TINY_PLAYER=/^(?:嗯+|哦+|噢+|啊+|哈+|好+|行+|ok|okay|收到|知道了|晚安|早安|拜拜|再见|谢谢|睡了|先睡了|\.{1,3}|。+|[👍❤️]+)[。！!~\s]*$/i;
const RESPECT_BRIEF=/只回一句|一句话(回答|就好)|简短回答|别多说|不用回|不要回复|不必回复|晚点再聊|我要睡了/;
const SELF_CLOSING=/^(?:晚安|早安|先这样|我先忙|在开会|忙着呢|晚点说|有事先挂|下次再聊)[。！!~\s]*$/;
export function needsTaiResponseRepair({entries=[],lastUser='',behavior={},outputMode='text'}={}){
 const player=String(lastUser).trim();
 const reply=entries?.[0]?.text?.trim()||'';
 return outputMode==='text'&&behavior.verbosity==='expansive'&&Number(behavior.maxMessages)>=2&&
  entries.length===1&&reply.length>0&&reply.length<110&&
  player.length>=2&&!TINY_PLAYER.test(player)&&!RESPECT_BRIEF.test(player)&&!SELF_CLOSING.test(reply);
}
export function taiResponseRepairScene(original=''){
 const anchor=String(original).trim().slice(0,160);
 return '上一稿只生成了一个很短的聊天气泡，未达到本轮展开交流的要求。请重新生成整轮回复，而不是接着重复上一句。'+
  '自然地给哥哥发2至5条有内容的独立消息：先接住他的具体话题，然后可以补一件你自己的真实近况、细节或看法，必要时再轻轻延伸。'+
  '不能凑数、不能每条都问句结尾、不能把同一句换说法重复。若这轮确实应该拒绝或结束交流，保留简短答复。'+
  '之前的一稿仅供理解语义（不要原样复制）：'+anchor+'。严格返回JSON对象，messages数组内每项一个text/mode/tone。';
}
