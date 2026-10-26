// Saathi service worker: keeps the app shell (page, scripts, styles, icons) so Saathi opens instantly.
// It NEVER touches /api, /login or any data. Bump CACHE (v3, v4...) whenever you deploy changes.
const CACHE='saathi-v2';
const SHELL=['/','/index.html','/app.js','/config.js','/style.css','/manifest.json','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const p=r.mode==='navigate'?'/':u.pathname;if(!SHELL.includes(p))return;
  // show the saved copy immediately, refresh it in the background for next time
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(p);
    const net=fetch(r).then(res=>{if(res.ok)c.put(p,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return (await net)||new Response('Offline. Please check your internet.',{status:503})}))});
