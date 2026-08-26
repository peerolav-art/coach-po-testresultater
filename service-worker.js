const CACHE='coach-po-v2-2-editfix';
const CORE=[
  './','./index.html','./manifest.webmanifest','./config.js','./cloud.js',
  './icons/coach-po-32.png','./icons/coach-po-64.png','./icons/coach-po-180.png',
  './icons/coach-po-192.png','./icons/coach-po-512.png','./icons/coach-po-maskable-512.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
    return;
  }
  // Cache PDF.js module/worker after first successful online use.
  if(u.hostname==='cdnjs.cloudflare.com' && u.pathname.includes('/pdf.js/')){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;})));
  }
});
