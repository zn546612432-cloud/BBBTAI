// The only phone-call action tag supported in free NoApp text.
// The tag is an internal signal from the AI reply, not something a player
// should see in a chat bubble, a notification or hear in a voice message.
// It MUST be the prefix, not a quoted mention halfway through a sentence.
const prefix=/^\s*(?:\(phone\)|（phone）)\s*(?:\+\s*)?/i;
const later=/(?:等我|等一会|过几分钟|待会|稍后|晚点|明天|改天|先洗|洗完|不方便|现在不能|暂时不能)/i;

export function parseTaiPhoneDirective(value){
 const raw=String(value??'').trim();
 const phone=prefix.test(raw);
 const text=phone?raw.replace(prefix,'').trim():raw;
 return {phone,text};
}
export function mayStartTaggedCall(entries){
 if(!Array.isArray(entries)||!entries.length)return false;
 const marked=entries.filter(e=>e?.phone===true);
 return marked.length>0&&marked.some(e=>typeof e.text==='string'&&e.text.trim()&&!later.test(e.text));
}
