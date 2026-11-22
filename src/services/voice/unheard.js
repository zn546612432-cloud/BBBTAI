// No guessed transcript and no invented player speech. One repair, not a burst.
const lines=['嗯？剛才沒聽清，再說一遍。','你那邊訊號不太好，我聽不清你說話。','剛才那段斷了。你說什麼？'];
export function unheardReply(seed=''){
 const n=[...String(seed)].reduce((h,ch)=>(h*31+ch.charCodeAt(0))>>>0,0);
 return {text:lines[n%lines.length],tone:'neutral',mode:'text'};
}
