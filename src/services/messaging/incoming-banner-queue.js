// Serialized, UIKit-like incoming banners: no notification overwrites the
// previous banner before it has had a visible dwell/exit interval.
// The queue only displays unread notifications which still exist; tapping a
// conversation cancels its stale queued banners without losing chat history.
// Outstanding one-shot receipts survive lock, reload, and developer-date
// reconstruction. Ordinary chat notices retain their original live-only rule.
export function queueableNotices(notices,seenIds=new Set()){
 return (notices||[]).filter(n=>n?.id&&!n.silent
  &&(!seenIds.has(n.id)||(n.bannerPending===true&&n.bannerShown!==true)));
}
export class IncomingBannerQueue{
 constructor({show,stillUnread,eligible,schedule=(fn,ms)=>setTimeout(fn,ms),interval=1750}){
  this.show=show;this.stillUnread=stillUnread;this.eligible=eligible;
  this.schedule=schedule;this.interval=interval;this.pending=[];this.running=false;
  this.queuedIds=new Set();
 }
 enqueue(notices){
  for(const n of notices||[]){
   if(!n?.id||n.silent||this.queuedIds.has(n.id))continue;
   this.queuedIds.add(n.id);this.pending.push(n);
  }
  this.next();
 }
 next(){
  if(this.running)return;
  while(this.pending.length){
   const n=this.pending.shift();this.queuedIds.delete(n.id);
   if(!this.stillUnread(n)||!this.eligible(n))continue;
   this.running=true;
   this.show(n,{duration:Math.max(700,this.interval-170)});
   this.schedule(()=>{this.running=false;this.next();},this.interval);
   return;
  }
 }
}
