import {completed,isStory55} from '../../../services/story55/state.js';
import {deploymentPercent} from '../../../services/story55/projects.js';
import {DAILY_CONTRACTS,D04_MAIL,D04_STEP,markD04AttachmentOpened,armD04Ghost,d04CanRun} from '../../../story/d04/contract.js';
import {begin,finish} from '../state.js';
import {renderTearOrbit} from './tear-ui/view.js';

// A local, fictional software executor. No real network or system access.
// The same existing Ghost stages and manual Mirage submission own settlement.
const def=id=>DAILY_CONTRACTS.find(c=>c.id===id&&c.marketDaily);
const order=(s,id)=>s.content?.orders?.find(x=>x.id===id);
const runs=s=>s.story55?.tearRuns||{};
const STEP_MS=3200;
export const tearUnlocked=s=>isStory55(s)&&s.day>=25&&!s.story55.ended&&completed(s,'base')&&deploymentPercent(s,'base')===100;
export const tearUsesToday=s=>Object.values(runs(s)).filter(r=>r.day===s.day).length;
export function tearRunAvailability(s,id){
 const c=def(id),o=order(s,id),r=runs(s)[id];
 if(!tearUnlocked(s)||!c||o?.status!=='ACCEPTED'||!s.content.mail?.some(m=>m.id===D04_MAIL(id)))return {visible:false,allowed:false};
 if(r?.status==='running')return {visible:true,allowed:true,resume:true};
 if(Object.values(runs(s)).some(x=>x.status==='running'&&order(s,x.id)?.status==='ACCEPTED'))return {visible:true,allowed:false,reason:'執行中'};
 const allowed=tearUsesToday(s)<2&&!r;
 return {visible:true,allowed,reason:allowed?'':'本日授權額度已用完'};
}
export function startTearRun(s,id,now=Date.now()){
 const a=tearRunAvailability(s,id);if(!a.allowed)return false;
 if(a.resume)return true;
 if(!markD04AttachmentOpened(s,id))return false;
 const c=def(id),i=c.stages.findIndex((_,n)=>s.ghost?.orders?.[D04_STEP(id,n)]?.status!=='success');
 if(i<0)return false;
 const step=armD04Ghost(s,id,i);if(!step)return false;
 const r=(s.story55.tearRuns??={})[id]={id,day:s.day,status:'running',index:i,startedAt:now,nextAt:now+STEP_MS};
 return !!r;
}
export function tickTearRun(s,id,now=Date.now()){
 const r=runs(s)[id],c=def(id);if(r?.status!=='running'||!c||now<r.nextAt)return false;
 if(['READY','COMPLETED'].includes(order(s,id)?.status)){r.status='complete';return true;}
 if(!tearUnlocked(s)||order(s,id)?.status!=='ACCEPTED'){r.status='failed';return true;}
 const i=c.stages.findIndex((_,n)=>s.ghost?.orders?.[D04_STEP(id,n)]?.status!=='success');
 if(i<0){r.status='complete';return true;}
 const step=armD04Ghost(s,id,i),o=step&&s.ghost.orders[step];
 if(!o||!d04CanRun(s,step)){r.status='failed';return true;}
 if(['authorized','failed'].includes(o.status)&&!begin(s,step,now)){r.status='failed';return true;}
 // The authorized software performs the simulated step; the canonical
 // finish handler writes the real result and arms the next stage.
 if(o.status==='preview-win'&&now<o.previewUntil){r.nextAt=o.previewUntil;return true;}
 finish(s,step,true,now);
 if(o.status!=='success'){r.status='failed';return true;}
 r.index=i+1;r.nextAt=now+STEP_MS;
 if(order(s,id).status==='READY')r.status='complete';
 return true;
}
export function renderTearRun(s,id){
 const r=runs(s)[id],c=def(id);if(!r||!c)return '';
 return renderTearOrbit({id,title:order(s,id)?.title||id,status:r.status,index:r.index,count:c.stages.length});
}
