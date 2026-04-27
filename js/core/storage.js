/**
 * core/storage.js
 * Storage — abstraksi tipis atas sessionStorage.
 * Memisahkan concerns: siapa yang menyimpan apa (Session Service)
 * dari cara penyimpanan (Storage).
 */
class Storage {
  /**
   * @param {string} namespace — prefix untuk semua key
   */
  constructor(namespace) {
    this.ns = namespace;
  }

  _key(k) { return `${this.ns}:${k}`; }

  set(key, value) {
    try {
      sessionStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  get(key) {
    try {
      const raw = sessionStorage.getItem(this._key(key));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  remove(key) {
    sessionStorage.removeItem(this._key(key));
  }

  clear() {
    // Hanya hapus key milik namespace ini
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(this.ns + ':'))
      .forEach(k => sessionStorage.removeItem(k));
  }
}
