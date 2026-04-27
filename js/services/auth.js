/**
 * services/auth.js
 * AuthService — logika autentikasi untuk guru dan admin.
 * Menggunakan ApiService + SessionService + Security.
 * Fitur tambahan v2.1:
 *   - Rate limiting frontend (max 5 percobaan / 10 menit)
 *   - Sanitasi input sebelum dikirim
 *   - Password di-hash sebelum dikirim ke Apps Script
 */
class AuthService {
  constructor(role, callbacks) {
    this.role      = role;
    this._onSuccess = callbacks.onSuccess;
    this._onError   = callbacks.onError;
  }

  async login(username, password) {
    // Sanitasi input
    const user = Security.sanitizeInput(username);
    const pass = password; // password tidak di-trim agar spasi signifikan

    const err = Validator.loginForm(user, pass);
    if (err) { this._onError(err); return; }

    if (Config.SCRIPT_URL.includes('GANTI_DENGAN')) {
      this._onError('Sistem belum dikonfigurasi. Hubungi administrator.');
      return;
    }

    // Rate limiting
    const rate = Security.checkRateLimit();
    if (!rate.allowed) {
      this._onError(rate.msg);
      return;
    }

    try {
      // Hash password sebelum dikirim ke Apps Script (SHA-256 + salt)
      const hashedPass = await Security.hashPasswordAsync(pass);
      const res = await api.login(user, hashedPass);

      if (res.status !== 'ok') {
        Security.recordFailedLogin();
        this._onError(res.message || 'Username atau password salah');
        return;
      }

      if (this.role === 'admin' && res.role !== 'admin') {
        Security.recordFailedLogin();
        this._onError('Akun ini tidak memiliki akses admin');
        return;
      }

      // Login sukses — reset rate limit
      Security.clearLoginAttempts();

      const data = this.role === 'guru'
        ? {
            nama:     res.nama,
            username: res.username,
            nip:      res.nip,
            role:     res.role,
            mapel:    Sanitizer.parseCSV(res.mapel),
            kelas:    Sanitizer.parseCSV(res.kelas),
          }
        : username;

      if (this.role === 'guru') sessionService.saveGuru(data);
      else                      sessionService.saveAdmin(data);

      this._onSuccess(data);
    } catch {
      this._onError('Gagal terhubung ke server. Periksa koneksi internet.');
    }
  }

  logout() {
    if (this.role === 'guru') sessionService.clearGuru();
    else                      sessionService.clearAdmin();
  }

  restoreSession() {
    return this.role === 'guru'
      ? sessionService.loadGuru()
      : sessionService.loadAdmin()?.user || null;
  }
}
