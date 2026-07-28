// const CACHE_NAME = "al-faqih-shell-v3";
// const CORE = [
//   "/logo.png",
//   "/sidebar.png",
//   "/hadith-search.worker.js",
//   "/hadith-retrieval-core.mjs",
// ];

// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
//   );
// });

// self.addEventListener("activate", (event) => {
//   event.waitUntil(
//     caches
//       .keys()
//       .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
//       .then(() => self.clients.claim()),
//   );
// });

// self.addEventListener("fetch", (event) => {
//   if (event.request.method !== "GET") return;
//   const requestUrl = new URL(event.request.url);
//   if (requestUrl.origin !== self.location.origin) return;
//   if (requestUrl.pathname.startsWith("/_next/")) return;

//   const cacheable = CORE.includes(requestUrl.pathname)
//     || requestUrl.pathname.startsWith("/hadith-data/");
//   if (!cacheable) return;

//   event.respondWith(
//     fetch(event.request)
//       .then((response) => {
//         if (response.ok) {
//           const clone = response.clone();
//           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
//         }
//         return response;
//       })
//       .catch(async () => {
//         const cached = await caches.match(event.request);
//         if (cached) return cached;
//         throw new Error("Offline asset is not cached");
//       }),
//   );
// });
const CACHE_NAME = "al-faqih-shell-v16";
const CORE = [
  "/logo.png",
  "/sidebar.png",
  "/hadith-search.worker.js",
  "/hadith-retrieval-core.mjs",
  "/local-llm.worker.js",
  "/local-output-guard.mjs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/_next/")) return;

  const cacheable = CORE.includes(requestUrl.pathname)
    || requestUrl.pathname.startsWith("/hadith-data/");
  if (!cacheable) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw new Error("Offline asset is not cached");
      }),
  );
});
