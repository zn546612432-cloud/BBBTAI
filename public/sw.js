// One package per client: new releases must never borrow changed artwork from
// an older package. Persist selection because Safari can restart this worker.
const PREFIX='ximeng-game-package-',SELECTION='ximeng-package-clients-v1';
const clientsConfig=new Map(),pending=new Map();
const selectionUrl=id=>new URL('__package_client__/'+encodeURIComponent(id),self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='ACTIVATE_PACKAGE'||!event.source?.id||!event.data.cache?.startsWith(PREFIX))return;
 event.waitUntil((async()=>{
  const config={cache:event.data.cache,manifestUrl:event.data.manifestUrl,base:event.data.base};
  if(!config.manifestUrl||!config.base)return;
  const scope=new URL(self.registration.scope),base=new URL(config.base,scope);
  if(base.origin!==scope.origin||!base.pathname.startsWith(scope.pathname))return;
  const stored=await caches.open(SELECTION);
  await stored.put(selectionUrl(event.source.id),new Response(JSON.stringify(config)));
  clientsConfig.set(event.source.id,await readPackage(config));
  // Drop only selections for closed clients; no saves or game resources are deleted.
  const live=new Set((await self.clients.matchAll({includeUncontrolled:true})).map(client=>selectionUrl(client.id)));
  for(const request of await stored.keys())if(!live.has(request.url))await stored.delete(request);
  event.ports[0]?.postMessage({ready:true});
 })());
});
async function readPackage(config){
 const cache=await caches.open(config.cache),response=await cache.match(config.manifestUrl);
 if(!response)return null;
 const manifest=await response.json(),scope=new URL(self.registration.scope),items=new Map();
 for(const item of manifest.assets){
  const stable=/^(?:apps|assets|icons|wallpapers)\//.test(item.path);
  items.set(new URL(item.path,stable?scope:new URL(config.base,scope)).href,item);
 }
 return {...config,cacheStore:cache,items};
}
async function packageFor(id){
 if(!id)return null;
 if(clientsConfig.has(id))return clientsConfig.get(id);
 const response=await (await caches.open(SELECTION)).match(selectionUrl(id));
 if(!response)return null;
 const config=await readPackage(await response.json());clientsConfig.set(id,config);return config;
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
 headers.set('Content-Length',String(end-begin+1));headers.set('Accept-Ranges','bytes');
 return new Response(whole.slice(begin,end+1),{status:206,statusText:'Partial Content',headers});
}
async function serve(event){
 const request=event.request,config=await packageFor(event.clientId);
 if(!config)return fetch(request);
 const url=new URL(request.url);url.searchParams.delete('__xm_package');
 // Music's fallback URL has an explicit retry hint but the same file bytes.
 url.searchParams.delete('audio');
 const item=config.items.get(url.href);
 if(!item)return fetch(request);
 const cached=await config.cacheStore.match(url.href);
 if(cached)return request.headers.has('range')?ranged(request,cached):cached;
 const key=config.cache+' '+url.href;
 if(!pending.has(key)){
  const download=(async()=>{
   const fresh=new URL(url);fresh.searchParams.set('__xm_package',item.hash);
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
   try{
    // Fetch a complete response so an audio range request also fills the cache.
    const response=await fetch(fresh,{cache:'force-cache',signal:controller.signal});
    if(response.ok&&response.status===200){
     try{await config.cacheStore.put(url.href,response.clone());}catch{}
    }
    return response;
   }finally{clearTimeout(timeout);}
  })();
  pending.set(key,download);void download.finally(()=>pending.delete(key)).catch(()=>{});
 }
 const response=(await pending.get(key)).clone();
 return request.headers.has('range')&&response.status===200?ranged(request,response):response;
}
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode==='navigate')return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(url.pathname.endsWith('/assets/startup/full-assets.json'))return;
 event.respondWith(serve(event));
});
