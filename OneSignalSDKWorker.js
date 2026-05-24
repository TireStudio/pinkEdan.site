// OneSignalと独自キャッシュを共存させるために、OneSignal公式のサービスワーカーファイルを先にインポートします
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'momoiro-e-団-v1';
const ASSETS_TO_CACHE = [
  './',
  './index_2.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// インストール時にコアアセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ネットワークリクエストの傍受（GASの通信、POST通信、OneSignal関連はキャッシュさせずに常にリアルタイムで通信します）
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // GASのAPI、OneSignalのトラフィック、POST・PUT等の送信リクエストはキャッシュしない
  if (
    event.request.method !== 'GET' || 
    url.includes('script.google.com') || 
    url.includes('onesignal') || 
    url.includes('google.com/macros')
  ) {
    return;
  }

  // それ以外のリソースは、一度読み込んだらオフラインでも超爆速で起動できるようにキャッシュから返却
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // 正常な応答であれば新しくキャッシュに保存
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
