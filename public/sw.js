// Static published game package. The current game activates its cache only
// after every bundled resource has been downloaded successfully.
const PREFIX='ximeng-game-package-';
let active='';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_PACKAGE'&&typeof event.data.cache==='string'&&event.data.cache.startsWith(PREFIX))active=event.data.cache;
});
async function fromDisk(request){
 if(active){const cache=await caches.open(active);const value=await cache.match(request.url);if(value)return value;}
 const names=(await caches.keys()).filter(name=>name.startsWith(PREFIX)).reverse();
 for(const name of names){if(name===active)continue;const cache=await caches.open(name);const value=await cache.match(request.url);if(value)return value;}
 return null;
}
async function ranged(request,cached){
 const match=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range')||'');
 if(!match||(!match[1]&&!match[2]))return fetch(request);
 const whole=await cached.arrayBuffer(),size=whole.byteLength;
 const begin=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
 if(begin>=size||end<begin)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
 const headers=new Headers(cached.headers);
 headers.set('Content-Range',`bytes ${begin}-${end}/${size}`);
 headers.set('Content-Length',String(end-begin+1));
 headers.set('Accept-Ranges','bytes');
 return new Response(whole.slice(begin,end+1),{status:206,statusText:'Partial Content',headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode==='navigate')return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 // The manifest itself always checks the latest published version.
 if(url.pathname.endsWith('/assets/startup/full-assets.json')||url.searchParams.has('__xm_package'))return;
 event.respondWith((async()=>{
  const cached=await fromDisk(request);
  if(cached)return request.headers.has('range')?ranged(request,cached):cached;
  return fetch(request);
 })());
});
