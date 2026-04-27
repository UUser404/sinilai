/**
 * core/guard.js
 * RouteGuard — exception handling URL.
 *
 * Halaman yang diizinkan: index.html (portal guru) dan admin.html.
 * Semua URL lain diredirect ke index.html.
 *
 * Diload PALING PERTAMA di semua HTML sebelum script apapun.
 */
(function () {
  const path     = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';

  const ALLOWED = ['index.html', 'admin.html', 'kurikulum.html', ''];   // '' = root/folder = index.html

  const isAllowed = ALLOWED.some(p => filename === p || filename.endsWith('/' + p));

  if (!isAllowed) {
    // Redirect ke index.html di root yang sama
    const base = path.substring(0, path.lastIndexOf('/') + 1);
    window.location.replace(base + 'index.html');
  }
})();
