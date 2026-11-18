// Offline concept-aware sparse vectors. No paid API or third-party data access.
// This is not a pretrained neural embedding model; the engine also accepts
// actual provider cosine scores via its vectorScores interface.
const concepts=[
 ['call','電話','电话','來電','来电','打給','打给','撥號','拨号','通話','通话','回撥','回拨'],
 ['hangup','掛斷','挂断','掛了','挂了','斷線','断线','沒說完','没说完','中斷','中断'],
 ['voice','語音','语音','聽你','听你','聲音','声音','錄音','录音','發聲','发声'],
 ['conflict','爭執','争执','吵架','不高興','不高兴','生氣','生气','不滿','不满','失言','道歉','誤會','误会'],
 ['affection','想念','想你','想我','想聽','想听','喜歡','喜欢','親近','亲近','在意','抱抱'],
 ['family','熙旺','兄弟','哥哥','弟弟','親情','亲情','家人','三胞胎'],
 ['tech','代碼','代码','源碼','源码','程序','算法','研究','工具','bug','架構','架构'],
 ['busy','忙碌','開會','开会','工作','有事','不方便','疲憊','疲惫','休息'],
 ['repair','道歉','對不起','对不起','說重','说重','澄清','誤解','误解','誤會','误会'],
 ['ignore','不理','不回','沒回','没回','已讀','已读','晾著','晾着','忽略','沉默']
];
function vector(text){
 const t=String(text||'').normalize('NFKC').toLowerCase(),v=new Map();const add=(key,n=1)=>v.set(key,(v.get(key)||0)+n);
 for(const word of t.match(/[a-z0-9_]{2,}/g)||[])add('w:'+word);
 const chars=t.match(/[\u3400-\u9fff]+/g)||[];
 for(const word of chars){for(let i=0;i<word.length-1;i++)add('b:'+word.slice(i,i+2),.5);}
 for(const [id,...aliases] of concepts)if(aliases.some(s=>t.includes(s)))add('concept:'+id,4);
 return v;
}
function cosine(a,b){let dot=0,na=0,nb=0;for(const [k,x] of a){dot+=x*(b.get(k)||0);na+=x*x;}for(const x of b.values())nb+=x*x;return na&&nb?dot/Math.sqrt(na*nb):0;}
export function localWorldbookVectorScores(entries,messages){
 const q=vector(messages.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join('\n'));
 return Object.fromEntries(entries.filter(e=>e.vectorized&&!e.disable).map(e=>[e.id,cosine(q,vector([e.comment,...e.key,e.content].join('\n')))]));
}
