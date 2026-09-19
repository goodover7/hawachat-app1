// Service Worker — هوا شات v10
// يمسح كل cache قديم فوراً عند أي تحديث

const CACHE_NAME    = 'hawa-v12-static';
const RUNTIME_CACHE = 'hawa-v12-runtime';
// قائمة كل الإصدارات القديمة لضمان مسحها
const OLD_CACHES = [
  'hawa-v1-static','hawa-v1-runtime',
  'hawa-v2-static','hawa-v2-runtime',
  'hawa-v3-static','hawa-v3-runtime',
  'hawa-v4-static','hawa-v4-runtime',
  'hawa-v5-static','hawa-v5-runtime',
  'hawa-v6-static','hawa-v6-runtime',
  'hawa-v7-static','hawa-v7-runtime',
  'hawa-v8-static','hawa-v8-runtime',
];

const ENTRY_JS = '/_expo/static/js/web/entry-730b963e74d9a7ff15bc83f47491dff0.js';

const PRECACHE_URLS = [
  '/index.html',
  '/logo.png',
  '/favicon.png',
  '/manifest.json',
  '/fonts/Ionicons.ttf',
  '/fonts/MaterialIcons.ttf',
];

self.addEventListener('install', function(e) {
  // skipWaiting: يُنشّط SW الجديد فوراً بدون انتظار إغلاق التبويبات
  self.skipWaiting();
  // PRECACHE بدون entry.js الكبير — يُحمَّل من network ثم يُخزَّن عند أول طلب
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names
          .filter(function(n) {
            // احذف كل cache قديم أو غير معروف
            return n !== CACHE_NAME && n !== RUNTIME_CACHE;
          })
          .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      // claim: يُطبَّق على كل التبويبات المفتوحة فوراً
      return self.clients.claim();
    })
  );
});

// استقبال رسالة SKIP_WAITING من الصفحة
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  // شبكة-فقط: Supabase + APIs + خارجي
  if (
    url.includes('supabase.co') || url.includes('supabase.in') ||
    url.includes('youtube')     || url.includes('googleapis') ||
    url.includes('s3cdn')       || url.includes('miaoda')
  ) return;

  // bundle JS الرئيسي: cache-first
  if (url.includes('/_expo/static/js/web/entry-')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) {
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        }).catch(function() { return caches.match('/'); });
      })
    );
    return;
  }

  // أصول ثابتة: cache-first
  if (
    url.includes('/_expo/static/') ||
    url.includes('/assets/')       ||
    url.includes('/fonts/')        ||
    url.match(/\.(png|jpg|jpeg|webp|svg|woff2?|ttf|otf|ico)(\?.*)?$/)
  ) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(resp) {
          if (resp && resp.status === 200) {
            var clone = resp.clone();
            caches.open(RUNTIME_CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        }).catch(function() {
          return caches.match(e.request).then(function(cached) {
            return cached || new Response('', { status: 503, statusText: 'Offline' });
          });
        });
      })
    );
    return;
  }

  // HTML: شبكة مباشرة دائماً. لا نخزن صفحة الدخول كي لا تُعرض نسخة قديمة
  // بعد نشر تحديث جديد أو أثناء انتقال Service Worker بين الإصدارات.
  if (url.endsWith('/') || url.includes('/index.html') || !url.includes('.')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function() {
        return caches.match('/index.html').then(function(cached) {
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }
});
