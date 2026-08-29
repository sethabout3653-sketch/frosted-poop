// ckv.sw.js - Root Service Worker Interceptor
const CKV_CONFIG = {
    prefix: '/ckv/service/',
    bare: 'https://cherrion.top', // Change to your preferred bare server
};

importScripts('https://jsdelivr.net');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    if (event.request.url.startsWith(self.location.origin + CKV_CONFIG.prefix)) {
        event.respondWith(uv.fetch(event));
    }
});
