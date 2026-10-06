/*
 * Situation X service worker.
 *
 * What it does (and deliberately does not do):
 *   - makes the site installable (Android / Windows / iPhone "Add to Home Screen");
 *   - keeps the built, hashed files under /assets/ so the app opens faster on the next visit;
 *   - shows a friendly "you are offline" page when there is no connection.
 * It never stores or answers /api/ calls, sign-in, AI or payment traffic: those always go to the server,
 * so nothing about a user's readings, credits or payments can be served stale or from another account.
 */
const VERSION = "v1";
const STATIC_CACHE = "sx-static-" + VERSION;
const BASE = new URL("./", self.location).pathname; // "/" (or the sub-path the site is served from)
const OFFLINE_URL = BASE + "offline.html";
const PRECACHE = [OFFLINE_URL, BASE + "icon-192.png", BASE + "favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sx-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Clerk, Razorpay, fonts, ... are never touched
  if (url.pathname.startsWith(BASE + "api/")) return; // the API is never cached

  // Pages: always the live site; only when the network fails, the offline page.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
    return;
  }

  // Built files have content-hashed names, so a cached copy is always the right one.
  if (url.pathname.startsWith(BASE + "assets/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Precached extras (icons, offline page): cache first. Anything else goes to the network untouched.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
