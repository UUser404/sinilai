/**
 * services/session.js
 * SessionService — abstraksi sesi login guru & admin.
 * Menggunakan Storage (core). Tahu tentang struktur data sesi.
 */
class SessionService {
  constructor() {
    this._guru    = new Storage('sinilai_guru');
    this._admin   = new Storage('sinilai_admin');
  }

  // ── Guru ────────────────────────────────────────────────

  saveGuru(guru)     { this._guru.set('session', guru); }
  loadGuru()         { return this._guru.get('session'); }
  clearGuru()        { this._guru.clear(); }

  saveKonteks(ctx)   { this._guru.set('context', ctx); }
  loadKonteks()      { return this._guru.get('context'); }

  // ── Admin ────────────────────────────────────────────────

  saveAdmin(user)    { this._admin.set('session', { user }); }
  loadAdmin()        { return this._admin.get('session'); }
  clearAdmin()       { this._admin.clear(); }
}

const sessionService = new SessionService();
