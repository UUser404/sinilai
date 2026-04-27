/**
 * utils/security.js
 * Security — utilitas keamanan sederhana untuk frontend.
 *
 * CATATAN PENTING:
 * Karena aplikasi ini menggunakan Google Apps Script sebagai backend,
 * hashing di frontend bersifat "defense in depth" — melindungi dari:
 *   1. Password plain-text tersimpan di localStorage/session
 *   2. Password plain-text tersimpan di Google Sheets
 *   3. Kebocoran password asli jika log tersadap
 *
 * Algoritma: SHA-256 via Web Crypto API (native browser, tanpa library).
 * Untuk login baru, admin harus set password yang sudah di-hash,
 * atau backend Apps Script yang melakukan hash saat addGuru.
 */
const Security = (() => {

  /**
   * Hash password dengan SHA-256 + salt aplikasi (sinkron via cache).
   * Mengembalikan string hex 64 karakter.
   * Gunakan hashPasswordAsync untuk hasil pasti, hashPassword untuk UI quick-check.
   */
  const APP_SALT = 'sinilai_v2_';

  /**
   * Hash async (dianjurkan untuk API call)
   * @param {string} password
   * @returns {Promise<string>} hex string
   */
  async function hashPasswordAsync(password) {
    const data = new TextEncoder().encode(APP_SALT + password);
    const buf  = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Wrapper sinkron — mengembalikan promise, tapi bisa di-await.
   * Agar kompatibel dengan kode yang memanggil Security.hashPassword(pw).
   */
  function hashPassword(password) {
    return hashPasswordAsync(password);
  }

  /**
   * Validasi kekuatan password.
   * Mengembalikan { ok: bool, msg: string }
   */
  function validatePasswordStrength(password) {
    if (!password || password.length < 8) {
      return { ok: false, msg: 'Password minimal 8 karakter' };
    }
    if (!/[A-Za-z]/.test(password)) {
      return { ok: false, msg: 'Password harus mengandung huruf' };
    }
    if (!/[0-9]/.test(password)) {
      return { ok: false, msg: 'Password harus mengandung angka' };
    }
    return { ok: true, msg: '' };
  }

  /**
   * Sanitasi input: potong spasi, hapus karakter berbahaya.
   */
  function sanitizeInput(str) {
    return String(str || '').trim().replace(/[<>"'`]/g, '');
  }

  /**
   * Rate limiter sederhana berbasis localStorage.
   * Mencegah brute-force login dari sisi frontend.
   */
  const RATE_KEY  = 'sinilai_login_attempts';
  const MAX_TRIES = 5;
  const LOCK_MS   = 10 * 60 * 1000; // 10 menit

  function checkRateLimit() {
    try {
      const raw  = localStorage.getItem(RATE_KEY);
      const data = raw ? JSON.parse(raw) : { count: 0, until: 0 };

      if (data.until && Date.now() < data.until) {
        const sisa = Math.ceil((data.until - Date.now()) / 60000);
        return { allowed: false, msg: `Terlalu banyak percobaan. Coba lagi dalam ${sisa} menit.` };
      }

      // Reset jika sudah lewat lockout
      if (data.until && Date.now() >= data.until) {
        localStorage.removeItem(RATE_KEY);
      }

      return { allowed: true, msg: '', count: data.count };
    } catch {
      return { allowed: true, msg: '' };
    }
  }

  function recordFailedLogin() {
    try {
      const raw  = localStorage.getItem(RATE_KEY);
      const data = raw ? JSON.parse(raw) : { count: 0, until: 0 };
      data.count++;
      if (data.count >= MAX_TRIES) {
        data.until = Date.now() + LOCK_MS;
      }
      localStorage.setItem(RATE_KEY, JSON.stringify(data));
    } catch {}
  }

  function clearLoginAttempts() {
    try { localStorage.removeItem(RATE_KEY); } catch {}
  }

  return {
    hashPassword,
    hashPasswordAsync,
    validatePasswordStrength,
    sanitizeInput,
    checkRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
  };
})();
