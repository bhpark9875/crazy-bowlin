// Crazy Bowl-in service worker: 앱을 고친 뒤 다시 올릴 때는 VERSION 숫자를 올려주세요.
const VERSION = "bowlin-v20";
const MODELS = "bowlin-models-1"; // AI files (pose / text recognition) kept across app updates
const MODEL_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com"];
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== MODELS).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (MODEL_HOSTS.indexOf(url.hostname) >= 0) {
    // 자세·글자 인식 파일: 한 번 받으면 저장해두고 다음부터는 인터넷 없이 사용
    e.respondWith(caches.open(MODELS).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return; // 폰트 등 외부 요청은 그대로 통과
  if (e.request.mode === "navigate") {
    // 화면(HTML)은 인터넷 우선, 끊기면 저장해둔 걸로 실행
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put("./index.html", copy));
      return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
