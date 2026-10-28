/* Minimal service worker so Android can install TV Search and list it in the share menu.
   It caches nothing: every request goes to the network as usual. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* network as normal */ });
