// Text is not an action. Only a genuine in-character commitment, after an
// explicit current player request, may produce a NoApp incoming-call event.
const request=/(?:给我打(?:个)?电话|打(?:个)?电话给我|你现在打(?:个)?电话|现在给我打|打过来|拨给我|拨过来|语音通话|call me|ring me)/i;
const withdraw=/(?:别|不要|先别|不用|取消|不准|禁止).{0,6}(?:打电话|打过来|拨过来|call me)/i;
const promise=/(?:现在|马上|立刻|这就|这便|即刻|就)\s*(?:给你|向你)?\s*(?:打|拨)(?:个)?(?:电话|过去|给你)?|(?:给你|我这就)\s*(?:打|拨)(?:电话)?|我现在打|行.?我现在打/i;
const defer=/(?:等我|过几分钟|一会儿|晚点|先洗|洗完|待会|稍后|明天|改天|不能|不方便)/i;
export const taiPlayerRequestedCall=text=>request.test(String(text||''))&&!withdraw.test(String(text||''));
export const taiPlayerDeclinedCall=text=>/^(?:不要|别|先别|不准|别打|不用|取消|stop|no[!.]?)(?:[，,！!。.?？\s]|$)/i.test(String(text||'').trim())||withdraw.test(String(text||''));
export function taiShouldCallAfterText({lastUser='',entries=[],alreadyCalled=false}={}){
 if(alreadyCalled||!taiPlayerRequestedCall(lastUser))return false;
 const final=(Array.isArray(entries)?entries:[]).filter(e=>e?.mode!=='voice'&&typeof e?.text==='string'&&e.text.trim()).at(-1)?.text||'';
 return !!final&&promise.test(final)&&!defer.test(final);
}
