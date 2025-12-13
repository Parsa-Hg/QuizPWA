const CACHE_NAME = 'quiz-app-v1';
// لیست تمام فایل‌هایی که باید کش شوند تا برنامه آفلاین کار کند
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// نصب سرویس ورکر و کش کردن فایل‌ها
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('فایل‌ها با موفقیت کش شدند.');
      return cache.addAll(ASSETS);
    })
  );
});

// خواندن فایل‌ها از کش وقتی آفلاین هستیم
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
