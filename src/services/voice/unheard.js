// No guessed transcript and no invented player speech. One repair, not a burst.
const lines=['嗯？刚才没听清，再说一遍。','你那边信号不太好，我听不清你说话。','刚才那段断了。你说什么？'];
export function unheardReply(seed=''){
 const n=[...String(seed)].reduce((h,ch)=>(h*31+ch.charCodeAt(0))>>>0,0);
 return {text:lines[n%lines.length],tone:'neutral',mode:'text'};
}
