// Service worker：讓遊戲可以安裝、離線玩。
// 策略是「網路優先」：連得上就抓最新版（並更新快取），所以部署後不會卡在舊版；
// 連不上才用快取。改了檔案清單時順便把 CACHE 的版本號加 1，舊快取會被清掉。

const CACHE = 'spin-bubbles-v1';

// 開啟一次就先存好、之後離線也能玩的檔案（tests/core.test.js 會檢查每個都存在）
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './css/style.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/main.js',
  './js/core/hexgrid.js',
  './js/core/match.js',
  './js/core/rng.js',
  './js/core/rules.js',
  './js/core/score.js',
  './js/ui/audio.js',
  './js/ui/hud.js',
  './js/ui/i18n.js',
  './js/ui/storage.js',
  './js/view/animator.js',
  './js/view/director.js',
  './js/view/fx.js',
  './js/view/palette.js',
  './js/view/pieces.js',
  './js/view/scene.js',
  './vendor/three/build/three.module.min.js',
  './vendor/three/build/three.core.min.js',
  './vendor/three/addons/environments/RoomEnvironment.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    // no-cache：一定向伺服器確認有沒有新版，不吃瀏覽器的 HTTP 快取
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        // 離線時打開首頁網址（含 ?參數 等）一律回傳快取的 index.html
        return cached ?? (request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      }),
  );
});
