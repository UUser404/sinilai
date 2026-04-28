/**
 * core/guard.js
 * RouteGuard — diload PALING PERTAMA di semua halaman.
 *
 * Tugas:
 *  1. Cek apakah URL halaman diizinkan (whitelist).
 *     Jika tidak → redirect unauthorized.html?reason=notfound
 *
 *  2. Cek apakah role session sesuai dengan halaman yang dibuka.
 *     Jika ada session role lain → redirect unauthorized.html?reason=role
 *     (tidak login sama sekali dibiarkan → halaman login masing-masing yang handle)
 *
 * Session keys:
 *   Guru      → sessionStorage["sinilai_guru:session"]
 *   Admin     → sessionStorage["sinilai_admin:session"]
 *   Kurikulum → sessionStorage["sinilai_kuri_session"]
 */
(function () {

  // ── Helper baca session ──────────────────────────────────────────────────
  function readSession() {
    try {
      if (sessionStorage.getItem('sinilai_guru:session'))   return 'guru';
    } catch {}
    try {
      if (sessionStorage.getItem('sinilai_admin:session'))  return 'admin';
    } catch {}
    try {
      if (sessionStorage.getItem('sinilai_kuri_session'))   return 'kurikulum';
    } catch {}
    return null; // belum login
  }

  // ── Tentukan halaman saat ini ────────────────────────────────────────────
  const path     = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';
  const base     = path.substring(0, path.lastIndexOf('/') + 1);

  // Whitelist halaman yang valid beserta role yang boleh mengaksesnya.
  // null = semua role boleh (unauthorized.html sendiri)
  const PAGE_RULES = {
    'index.html'       : ['guru'],
    'admin.html'       : ['admin'],
    'kurikulum.html'   : ['kurikulum'],
    'unauthorized.html': null,
    ''                 : ['guru'],
  };

  const currentPage = Object.keys(PAGE_RULES).find(p =>
    filename === p || filename.endsWith('/' + p)
  );

  // ── Cek 1: URL tidak dikenal ─────────────────────────────────────────────
  if (currentPage === undefined) {
    window.location.replace(
      base + 'unauthorized.html?reason=notfound&from=' + encodeURIComponent(filename)
    );
    return;
  }

  // Halaman tanpa role restriction (unauthorized.html)
  if (PAGE_RULES[currentPage] === null) return;

  // ── Cek 2: Ada session dengan role yang salah ────────────────────────────
  const sessionRole  = readSession();
  const allowedRoles = PAGE_RULES[currentPage];

  if (sessionRole && !allowedRoles.includes(sessionRole)) {
    window.location.replace(
      base + 'unauthorized.html' +
      '?reason=role' +
      '&from=' + encodeURIComponent(filename)
    );
    return;
  }

  // ── Lolos semua cek ──────────────────────────────────────────────────────
  // sessionRole === null (belum login) → biarkan, form login di halaman
  // masing-masing yang handle.

})();
