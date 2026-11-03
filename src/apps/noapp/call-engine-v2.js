// NoApp V2: deterministic guards around an otherwise autonomous call.
// This module is intentionally pure so provider failures cannot reset its rules.
const clean=value=>String(value||'').replace(/[\s，。！？!?、：:；;,.…"“”‘’（）()\-]/g,'').toLowerCase();
const grams=s=>{const result=new Set();for(let i=0;i<s.length-1;i++)result.add(s.slice(i,i+2));return result;};
const comfort=text=>/(?:累|休息|缓过来|别说话|不想说话|没力气)/.test(text)&&/(?:陪|听你|先别|别费劲|放着|缓过来)/.test(text);
const promise=text=>/(?:等.{0,5}(?:事|事情).{0,4}(?:结|完)|等我见到|事情结束)/.test(text)&&/(?:见|找|抱|去|结束|完)/.test(text);
export function sameCallMeaning(a,b){
 const x=clean(a),y=clean(b);
 if(!x||!y)return false;
 if(x===y)return true;
 if(Math.min(x.length,y.length)>=8&&(x.includes(y)||y.includes(x)))return true;
 if(Math.min(x.length,y.length)>=10){
  const gx=grams(x),gy=grams(y),intersection=[...gx].filter(t=>gy.has(t)).length;
  if(intersection/Math.max(1,Math.min(gx.size,gy.size))>=0.78)return true;
 }
 // High-confidence repeated emotional intentions; do not globally ban empathy.
 if(comfort(a)&&comfort(b))return true;
 if(promise(a)&&promise(b)&&/(?:事情|这件事|那件事)/.test(a)&&/(?:事情|这件事|那件事)/.test(b))return true;
 return false;
}
export function isQuietCallRequest(value){
 const s=String(value||'');
 return /(?:别|不要|先别)(?:再)?(?:问|说话|讲话|吵)|(?:不想|不愿|懒得)(?:再)?(?:说话|讲话)|(?:安静|静静)(?:陪|待|一会|一下)|(?:陪我|陪着我).{0,8}(?:安静|待会|不说话)|(?:让我|我想)(?:安静|静静)/.test(s);
}
export function selectCallSegments(entries=[],{maxSegments=3,recent=[],dedupe=true}={}){
 const cap=Math.max(1,Math.min(5,Math.round(Number(maxSegments)||3)));
 const selected=[],blocked=[];
 for(const entry of (Array.isArray(entries)?entries:[]).slice(0,6)){
  const text=String(entry?.text||'').trim();
  if(!text)continue;
  // A trailing comma/colon is an unfinished thought, not a standalone voice clip.
  if(/[，,、：:；;]$/.test(text)){blocked.push({text,reason:'unfinished'});continue;}
  if(dedupe&&[...selected.map(x=>x.text),...recent].some(prior=>sameCallMeaning(prior,text))){
   blocked.push({text,reason:'duplicate'});continue;
  }
  selected.push({...entry,text});
  if(selected.length>=cap)break;
 }
 return {segments:selected,blocked};
}
export function nextNaturalCallIdleEvent(snapshot,now=Date.now(),settings={}){
 if(snapshot.state!=='connected'||snapshot.busy||snapshot.listening||snapshot.requestingMic||snapshot.audioReady||!snapshot.lastTaiEndAt)return '';
 if(snapshot.quietUntil&&now<snapshot.quietUntil)return '';
 const mode=settings.callIdleMode||'natural';
 const scale=mode==='active'?0.65:mode==='quiet'?2:1;
 const elapsed=now-snapshot.lastTaiEndAt;
 if(snapshot.nudgeCount===0&&elapsed>=Math.max(10000,Number(settings.callNudgeSeconds||45)*1000*scale))return 'nudge';
 if(snapshot.nudgeCount===1&&elapsed>=Math.max(20000,Number(settings.callCloseSeconds||125)*1000*scale))return 'closing';
 return '';
}
