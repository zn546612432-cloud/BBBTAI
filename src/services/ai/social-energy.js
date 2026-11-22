// Private, game-day social energy. Never expose counts in dialogue or UI.
const limits={call:[20,27,30],message:[10,13,15]};
const pending=new WeakMap();
export function taiSocialEnergy(s,kind){
 const [tired,closing,max]=limits[kind];
 const used=s.aiDraft?.taiSocialEnergy?.day===s.day?Math.max(0,Number(s.aiDraft.taiSocialEnergy[kind])||0):0;
 return {used,remaining:Math.max(0,max-used),stage:used>=max?'rest':used>=closing?'closing':used>=tired?'fatigue':'normal'};
}
function daily(s){
 s.aiDraft??={};
 if(s.aiDraft.taiSocialEnergy?.day!==s.day)s.aiDraft.taiSocialEnergy={day:s.day,call:0,message:0};
 return s.aiDraft.taiSocialEnergy;
}
export function taiCallCooling(s,now=Date.now()){
 return s.aiDraft?.taiSocialEnergy?.day===s.day&&Number(s.aiDraft.taiSocialEnergy.callUntil)>now;
}
export function canTaiCall(s,now=Date.now()){
 return taiSocialEnergy(s,'call').remaining>3&&!taiCallCooling(s,now);
}
export function markTaiCallRest(s,now=Date.now()){daily(s).callUntil=now+90000;}
export function socialEnergyPrompt(s,kind,{connected=false}={}){
 const {stage}=taiSocialEnergy(s,kind);
 if(stage==='rest'||kind==='call'&&!connected&&!canTaiCall(s))return '【私人時間】現在不方便再用這種語音媒介，文字仍可正常聊。自然表達自己的界線，不說任何額度、次數或技術原因，不承諾立即再打。';
 if(kind==='call'&&stage==='closing')return '【私人時間】你已經聊得有些累了。簡短接住對方最後一句，再自然告別並選擇 hang_up；不要另開話題。';
 if(kind==='message'&&stage==='closing')return '【私人時間】如果還願意發語音，簡短回應後自然說晚點再聊，不另開話題。文字仍可正常回覆。';
 if(stage==='fatigue'||stage==='closing')return '【私人時間】你有些累了，不必勉強自己一直說話。可以簡短回答，或自然說晚點再聊；不必交代原因或報備行程。';
 return '';
}
export async function withTaiSocialVoice(store,kind,synthesize){
 const day=store.get().day,key=day+':'+kind,slots=pending.get(store)||new Map();pending.set(store,slots);
 if(taiSocialEnergy(store.get(),kind).remaining<=(slots.get(key)||0))throw Object.assign(Error('Tai is resting'),{code:'TAI_SOCIAL_REST'});
 slots.set(key,(slots.get(key)||0)+1);
 try{
  const result=await synthesize();
  store.update(s=>{if(s.day===day){const d=daily(s);d[kind]=(Number(d[kind])||0)+1;}});
  return result;
 }finally{const n=slots.get(key)-1;if(n)slots.set(key,n);else slots.delete(key);}
}
