/**
 * sw.js — SiNilai Service Worker
 * Strategi: cache-first untuk aset statis, network-only untuk API GAS.
 * Update versi CACHE_NAME setiap kali ada perubahan file statis.
 */

const CACHE_NAME  = 'sinilai-v1';
const ASSETS      = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/base.css',
  './css/guru.css',
  './css/theme-dark.css',
  './css/theme-light.css',
  './js/core/validator.js',
  './js/services/api.js',
  './js/services/auth.js',
  './js/guru/modules/nilai.js',
  './js/guru/modules/excel.js',
  './js/guru/modules/analisis.js',
  './js/guru/modules/absensi.js',
  './js/guru/modules/export.js',
  './js/guru/modules/home.js',
  './js/guru/modules/profil.js',
  './js/guru/controllers/GuruController.js',
];

// ── Install: cache semua aset statis ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Langsung aktif tanpa tunggu tab lama tutup
  self.skipWaiting();
});

// ── Activate: hapus cache lama ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: strategi per tipe request ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Request ke Google Apps Script (API) → selalu network, jangan cache
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ status: 'error', message: 'Tidak ada koneksi internet' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 2. Aset statis → cache-first, fallback ke network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Simpan ke cache kalau response valid
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback untuk navigasi
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
