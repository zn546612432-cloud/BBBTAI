// Explicit player instruction about WHO should end a live NoApp phone call.
// Only use this inside a connected phone session. A mention of a past hang-up
// or a refusal to hang up is NOT a command.
export function taiShouldHangUpCall(text){
 const raw=String(text||'').trim();
 if(!raw)return false;
 const s=raw.replace(/[\s，,。．！!？?~～、：:；;“”"'‘’]/g,'');
 if(!s||s.length>44)return false;
 if(/(?:不想|不准|不许|不能|不可以|不要|别|先别|别急|不是|没让|不舍得|不许你|不要你)(?:.{0,10})(?:挂|断(?:电话|线))/.test(s))return false;
 if(/(?:刚才|之前|上次|昨天|怎么|为什么|为什么要|不是刚|你是不是|我不是|我已经|电话被|谁|听说|以为|还能|又|你说|要不然|假如|如果|等会|等一下).{0,12}(?:挂了|挂电话|挂断)/.test(s))return false;
 // Explicitly delegates pressing the hang-up button to Tai.
 if(/^(?:行了|好了|那|那就|可以了|拜拜|晚安)?(?:你|熙泰|你那边)(?:现在|直接|先|来|就|替我|帮我)?(?:把(?:电话|通话))?(?:挂(?:电话|断|机|掉)?|结束(?:通话|电话))(?:了|吧|掉|一下|呗|哈)?(?:88|拜拜|晚安|再见|bye)?$/i.test(s))return true;
 // A direct request to do it for the player is also executable.
 if(/^(?:请|麻烦|能不能)?(?:帮我|替我)(?:把(?:电话|这通电话))?挂(?:断|了|掉|吧|一下)?(?:88|拜拜|晚安)?$/i.test(s))return true;
 // The player says the call is over, not that a third party once hung up.
 if(/^(?:那|那就|好|好的|行|行了|好了|先|就|现在|咱们|我们)?(?:挂(?:电话|断|机)?(?:了|吧|掉|啦)?(?:吧|了)?|结束(?:通话|电话)(?:吧|了)?)(?:88|拜拜|晚安|再见|bye)?$/i.test(s))return true;
 if(/^(?:88|拜拜|再见|bye|晚安)(?:了|啦)?$/i.test(s))return true;
 return false;
}
