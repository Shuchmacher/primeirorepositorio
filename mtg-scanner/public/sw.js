self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
  // Estratégia básica: apenas deixa passar as requisições
  e.respondWith(fetch(e.request));
});