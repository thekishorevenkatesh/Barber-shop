const CACHE_NAME = "kshaura-angadi-v7";
const APP_SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "css/player-extras.css",
  "data/playlist.js",
  "js/player.js",
  "js/room.js",
  "js/config.js",
  "js/walkie-talkie.js",
  "css/room.css",
  "favicon.svg",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
