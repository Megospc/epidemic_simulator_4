const CACHE_KEY = "epidemic_simulator_cache_4.5.4";
const NETWORK_TIMEOUT = 2000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_KEY).then((cache) => cache.addAll([
      'assets/music0.mp3',
      'assets/music1.mp3',
      'assets/icon.svg',
      'assets/logo.svg',
      'assets/lssg.svg',
      'assets/lsog.svg',
      'assets/play.svg',
      'assets/delete.svg',
      'assets/copy.svg',
      'assets/open.svg',
      'assets/up.svg',
      'assets/down.svg',
      'assets/help.svg',
      'assets/source.svg',
      'assets/info.svg',
      'assets/edit.svg',
      'assets/download.svg',
      'source.html',
      'index.html',
      'game.html',
      'about.html',
      'logs.html',
      'source.html',
      'help.html',
      'examples.html',
      'example.html',
      'game.js',
      'maingame.js',
      'editor.js',
      'logs.js',
      'cheats.js',
      'source.js',
      'styles.css'
    ])
  ));
});
self.addEventListener('fetch', e => {
  return e.respondWith(network(e.request, NETWORK_TIMEOUT).catch(() => cache(e.request)));
  function network(request, time) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(reject, timeout);
      fetch(request).then(r => {
        clearTimeout(timeout);
        resolve(r);
      }, reject);
    });
  }
  function cache(request) {
    return new Promise((resolve, reject) => caches.open(CACHE_KEY).then(c => c.match(request).then(m => m || reject(''))));
  }
});