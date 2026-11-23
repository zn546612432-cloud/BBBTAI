// Safari may not expose network information. Start with four background
// downloads there, and learn from completed transfers instead of assuming 2G.
export function createDownloadPolicy({connection=globalThis.navigator?.connection}={}){
 let fastSamples=0;
 return {
  concurrency(priority='high'){
   const type=connection?.effectiveType;
   if(connection?.saveData||type==='slow-2g'||type==='2g')return priority==='low'?1:2;
   if(type==='3g')return priority==='low'?2:4;
   const fast=Number(connection?.downlink)>=5||fastSamples>=2;
   return priority==='low'?(fast?6:4):(fast?8:6);
  },
  observe(bytes,elapsedMs){
   // Ignore tiny files: a quick JSON response cannot establish bandwidth.
   if(bytes>=65536&&elapsedMs>0&&bytes/elapsedMs>=512)fastSamples++;
  }
 };
}
