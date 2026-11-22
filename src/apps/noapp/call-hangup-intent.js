// Explicit player instruction about WHO should end a live NoApp phone call.
// Only use this inside a connected phone session. A mention of a past hang-up
// or a refusal to hang up is NOT a command.
export function taiShouldHangUpCall(text){
 const raw=String(text||'').trim();
 if(!raw)return false;
 const s=raw.replace(/[\s，,。．！!？?~～、：:；;“”"'‘’]/g,'').replace(/掛/g,'挂').replace(/斷/g,'断').replace(/電/g,'电').replace(/話/g,'话').replace(/見/g,'见').replace(/別/g,'别').replace(/麼/g,'么').replace(/讓/g,'让');
 if(!s||s.length>44)return false;
 if(/(?:不想|不准|不许|不能|不可以|不要|别|先别|别急|不是|没让|不舍得|不许你|不要你)(?:.{0,10})(?:挂|断(?:电话|线))/.test(s))return false;
 if(/(?:刚才|之前|上次|昨天|怎么|为什么|为什么要|不是刚|你是不是|我不是|我已经|电话被|谁|听说|以为|还能|又|你说|要不然|假如|如果|等会|等一下).{0,12}(?:挂了|挂电话|挂断)/.test(s))return false;
 // Explicitly delegates pressing the hang-up button to Tai.
 if(/^(?:行了|好了|那|那就|可以了|拜拜|晚安)?(?:你|熙泰|你那边)(?:现在|直接|先|来|就|替我|帮我)?(?:把(?:电话|通话))?(?:挂(?:电话|断|机|掉)?|结束(?:通话|电话))(?:了|吧|掉|一下|呗|哈)?(?:88|拜拜|晚安|再见|bye)?$/i.test(s))return true;
 // A direct request to do it for the player is also executable.
 if(/^(?:请|麻烦|能不能)?(?:帮我|替我)(?:把(?:电话|这通电话))?挂(?:断|了|掉|吧|一下)?(?:88|拜拜|晚安)?$/i.test(s))return true;
 // Common speech-to-text phrasing: "那你挂我电话吧，再见".
 if(/^(?:那(?:就)?|好(?:了)?|行(?:了)?|嗯)?(?:请|麻烦|能不能|可以)?(?:你|熙泰)?(?:现在|直接|先|就)?(?:把)?挂(?:我(?:的)?(?:电话|通话)|了我的电话|掉我的电话)(?:吧|了|啦|呗|一下)?(?:88|拜拜|晚安|再见|bye)?$/i.test(s))return true;
 // The player says the call is over, not that a third party once hung up.
 if(/^(?:那|那就|好|好的|行|行了|好了|先|就|现在|咱们|我们)?(?:挂(?:电话|断|机)?(?:了|吧|掉|啦)?(?:吧|了)?|结束(?:通话|电话)(?:吧|了)?)(?:88|拜拜|晚安|再见|bye)?$/i.test(s))return true;
 if(/^(?:88|拜拜|再[见見]|bye|晚安)(?:了|啦)?$/i.test(s))return true;
 if(/^(?:好(?:了)?|那(?:就)?|行(?:了)?|嗯)?(?:不聊了|先不聊了|下次聊|晚[点點]聊|我(?:要|先|去)睡了|你先忙(?:吧|去吧)?)(?:88|拜拜|再[见見]|bye|晚安)?$/i.test(s))return true;
 return false;
}

// A spoken self-directed goodbye is executable; conditional warnings are not.
export function taiCallFarewellIntent(text){
 const s=String(text||'').trim().replace(/掛/g,'挂').replace(/斷/g,'断').replace(/電/g,'电').replace(/話/g,'话').replace(/點/g,'点').replace(/見/g,'见').replace(/說/g,'说').replace(/這/g,'这').replace(/裡/g,'里');
 if(/(?:再不|如果|要是|你不).{0,18}(?:说[话話]|出声|出聲|回應|回[话話]|回答|理我|開口|开口|繼續沉默|继续沉默).{0,12}(?:就|可要|要|会|會).{0,5}挂/.test(s))return 'warn';
 if(/[「『“”」』]|(?:不要|不想|不會|不会|不能|别|別|不舍得|捨不得|你說|你说|剛才|刚才).{0,8}挂/.test(s))return '';
 if(/(?:^|[，。！？、,；;\s])(?:我|那我|好那我|那就|好|嗯)?(?:先挂(?:电话|断)?(?:了|吧)?|我挂(?:了|电话)|我要挂(?:了|电话))(?:[。！？!，,；;\s]|$)/.test(s))return 'end';
 if(/(?:^|[，。！？、,；;\s])(?:那就|那|好(?:了)?|嗯|行(?:了)?|我)?(?:先挂(?:电话|断)?(?:了|吧)?|要挂(?:了|电话)|我挂(?:了|电话)|先聊到这里(?:吧)?|聊到这里(?:吧)?|晚安|再见|拜拜|下次聊|晚点再聊|先这样)(?:[。！？!，,；;\s]*)(?:晚安|再见|拜拜)?[。！？!\s]*$/.test(s))return 'end';
 return '';
}
