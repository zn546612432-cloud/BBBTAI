// Text is not an action. Only a genuine in-character commitment, after an
// explicit current player request, may produce a NoApp incoming-call event.
const request=/(?:给我打(?:个)?电话|打(?:个)?电话给我|你现在打(?:个)?电话|现在给我打|打过来|拨给我|拨过来|语音通话|call me|ring me)/i;
const withdraw=/(?:别|不要|先别|不用|取消|不准|禁止).{0,6}(?:打电话|打过来|拨过来|call me)/i;
const promise=/(?:现在|马上|立刻|这就|这便|即刻|就)\s*(?:给你|向你)?\s*(?:打|拨)(?:个)?(?:电话|过去|给你)?|(?:给你|我这就)\s*(?:打|拨)(?:电话)?|我现在打|行.?我现在打/i;
const defer=/(?:等我|过几分钟|一会儿|晚点|先洗|洗完|待会|稍后|明天|改天|不能|不方便)/i;
const traditional='給個電話過來撥語別準發條錄聲聽現幾分鐘會點後這';
const simplified='给个电话过来拨语别准发条录声听现几分钟会点后这';
export const normalizeTaiPhoneRequest=text=>String(text||'').replace(/[給個電話過來撥語別準發條錄聲聽現幾分鐘會點後這]/g,char=>simplified[traditional.indexOf(char)]);
export const taiPlayerRequestedCall=text=>request.test(normalizeTaiPhoneRequest(text))&&!withdraw.test(normalizeTaiPhoneRequest(text));
// Only current availability or a refusal, not general conversation about phones.
export function taiCallAvailabilityQuestion(text){
 const x=normalizeTaiPhoneRequest(text).replace(/[為麼甚沒開掛斷]/g,c=>({'為':'为','麼':'么','甚':'什','沒':'没','開':'开','掛':'挂','斷':'断'}[c]));
 return /(?:为什么|怎么|干嘛|为何).{0,12}(?:不接|没接|拒接|打不了)|(?:不接|没接).{0,6}(?:电话|吗|呢|我)|(?:方便|可以|能不能|能否|要不要).{0,8}(?:打电话|通话|接电话)/.test(x);
}
export const taiShortCallBoundaryPrompt='【電話請求／未接後的文字】如果目前在忙、拒接、無法接聽或不想打電話，一條很短的自然口語即可。不要反覆解釋、不連發、不另找話題，也不要用對比句辯解。作者示例：在忙，晚點再說。／沒什麼要緊事別打電話了。／知道你想我了，但現在不行。僅學習簡潔和態度。若確實願意接通，按既有真實來電協議執行。';
export function shortTaiCallReply(entries){
 if(entries.some(e=>e.action==='phone'))return entries;
 const first=entries[0];if(!first)return entries;
 const line=first.text.match(/^[^。！？!?]+[。！？!?]?/)?.[0]||first.text;
 return [{...first,text:line.length<=32?line:'現在不方便，晚點再說。',mode:'text',speechText:undefined,translation:undefined}];
}
export const taiPlayerDeclinedCall=text=>/^(?:不要|别|先别|不准|别打|不用|取消|stop|no[!.]?)(?:[，,！!。.?？\s]|$)/i.test(normalizeTaiPhoneRequest(text).trim())||withdraw.test(normalizeTaiPhoneRequest(text));
export function taiShouldCallAfterText({lastUser='',entries=[],alreadyCalled=false}={}){
 if(alreadyCalled||!taiPlayerRequestedCall(lastUser))return false;
 const final=(Array.isArray(entries)?entries:[]).filter(e=>e?.mode!=='voice'&&typeof e?.text==='string'&&e.text.trim()).at(-1)?.text||'';
 return !!final&&promise.test(normalizeTaiPhoneRequest(final))&&!defer.test(normalizeTaiPhoneRequest(final));
}
