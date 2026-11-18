// Provider recovery only. Auth and one quota reservation remain in index.ts.
// Never turn reasoning_content, a fake reply, or an error into character speech.
function usable(content,operation){
 if(typeof content!=='string'||!content.trim())return false;
 const text=content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let value;
 try{value=JSON.parse(text);}catch{return operation==='chat'&&!/^[{[]/.test(text);}
 if(operation==='decision')return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0;
 const hasText=(v,depth=0)=>{
  if(depth>5)return false;
  if(typeof v==='string')return !!v.trim();
  if(Array.isArray(v))return v.some(item=>hasText(item,depth+1));
  if(!v||typeof v!=='object')return false;
  return ['messages','replies','text','reply','content'].some(k=>hasText(v[k],depth+1));
 };
 return hasText(value);
}
export async function deepseekReply(request,{operation='chat',send}={}){
 let result=await send(request);
 let content=result?.choices?.[0]?.message?.content;
 if(usable(content,operation))return content.trim();
 // DeepSeek documents that JSON mode may replace invalid JSON with spaces,
 // including finish_reason=stop. Retry exactly once without JSON enforcement
 // for chat, preserving the same model, persona and observed conversation.
 const instruction=operation==='chat'
  ?'【本輪格式補充】請給出至少一句非空的角色回覆。可按原格式返回含 text 的 messages JSON，或直接返回角色的自然文字。不要說明接口或格式錯誤，不要輸出空物件或空陣列。'
  :'【本輪格式補充】請根據原決策規則返回完整、非空且合法的 JSON 物件，不要解釋，不要輸出空物件。';
 const history=request.messages.map(m=>({...m}));
 if(history[0]?.role==='system')history[0].content+='\n\n'+instruction;
 else history.unshift({role:'system',content:instruction});
 result=await send({...request,messages:history,
  response_format:{type:operation==='chat'?'text':'json_object'}});
 content=result?.choices?.[0]?.message?.content;
 if(usable(content,operation))return content.trim();
 const error=new Error('empty_model_reply');error.code=502;throw error;
}
