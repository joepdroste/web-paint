const staticCacheName = 'site-static'
const assets = [
    "/",
    "/@vite/client",
    "/socket.io/socket.io.js",
    "/main.js",
    "/manifest.json",
    "/app.css",
    "/app.svelte",
    "/shapes.js",
    "/api.js",
    "/frontend/icons/skrobbl.png",
    "/icons/skrobbl.png",
    "/screenshots/screenshot1.png",
]

self.addEventListener("install", (event) => {
    console.log("Service Worker installed");
    event.waitUntil(
        caches.open(staticCacheName).then(cache => {
            console.log("Caching assets");
            cache.addAll(assets);
        })
    );
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activated");
});

self.addEventListener("fetch", (event) => {
    console.log("Fetching:", event);
    event.respondWith(
        caches.match(event.request).then(cacheResponse => {
            return cacheResponse || fetch(event.request);
        })
    )
    
});