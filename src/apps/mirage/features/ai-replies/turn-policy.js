// MIRAGE free-chat policy. Inspect only real conversation turns, not story
// clocks, authored scenes or NoApp dialogue. A refusal is saved on the source
// message by the existing MIRAGE reply pipeline; no parallel history is kept.
const normalize=value=>String(value||'').normalize('NFKC').trim().toLowerCase()
 .replace(/[\s，,。.!！?？;；:：、"“”「」『』‘’']/gu,'');
const requestedLabel=/(?:叫|喊|稱|称|稱呼|称呼|說|说|講|讲|復述|复述|重複|重复|念).{0,16}(?:哥哥|弟弟|老公|老婆|主人|寶貝|宝贝|親愛的|亲爱的|哥)(?:$|呢|吧|啊|呀|哦|喔)/u;
const labelOnly=/^(?:哥哥|哥|弟弟|老公|老婆|主人|寶貝|宝贝|親愛的|亲爱的)$/u;
const condescending=/^(?:真乖|乖|好乖|真聽話|真听话|這才乖|这才乖|聽話|听话)$/u;
const awaitingLabel=/(?:你|那你|請你|请你|快|能不能|可不可以)?(?:叫|喊|稱|称|稱呼|称呼)(?:我|一聲|一声|一下|什麼|什么)?$/u;

// Silence is a legitimate choice for empty attempts to make an anonymous
// contact perform intimacy/obedience. Real questions, technical requests,
// family references and ordinary small talk are left to the model.
export function mirageTaiTurnPolicy(messages=[]){
 const recent=Array.isArray(messages)?messages.slice(-12):[];
 const last=recent.at(-1);
 if(!last||last.from!=='me'||last.kind!=='text')return {action:'reply'};
 const text=normalize(last.text);
 if(!text)return {action:'ignore',reason:'empty'};
 if(requestedLabel.test(text))return {action:'ignore',reason:'forced-address'};
 const precedingUser=recent.slice(0,-1).filter(m=>m.from==='me'&&m.kind==='text').at(-1);
 const prior=normalize(precedingUser?.text);
 if(labelOnly.test(text)&&(awaitingLabel.test(prior)||text.length<=4))return {action:'ignore',reason:'forced-address'};
 if(condescending.test(text))return {action:'ignore',reason:'empty-obedience'};
 return {action:'reply'};
}

// Output-level veto in case a generative reply still parrots an unwanted
// personal title. Never inspect authored scene lines or NoApp messages.
export function mirageTaiForbiddenAddress(text){
 const answer=String(text||'').normalize('NFKC').trim().replace(/^[“"「『]+|[”"」』]+$/gu,'');
 return /^(?:(?:好|好的|行|嗯|當然|当然)[，,、\s]*)?(?:哥哥|哥|弟弟|老公|老婆|主人|寶貝|宝贝|親愛的|亲爱的)(?=$|[，,。.!！?？;；:：、\s（(])/u.test(answer)
  || /^(?:我)?(?:就|會|会|可以)?(?:叫|喊|稱|称)(?:你|您)(?:哥哥|哥|弟弟|老公|老婆|主人|寶貝|宝贝)/u.test(answer)
  || /(?:我是你(?:的)?(?:親|亲)?(?:弟弟|兄弟)|你是我(?:的)?(?:親|亲)?(?:哥哥|兄弟)|(?:我們|我们)(?:是|三個|三个)?三胞胎)/u.test(answer);
}
