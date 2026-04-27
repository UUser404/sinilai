/**
 * services/bus.js
 * EventBus — komunikasi antar module tanpa coupling langsung.
 *
 * Contoh:
 *   bus.on('nilai:changed', () => updateChangeIndicator());
 *   bus.emit('nilai:changed');
 *
 * Events yang digunakan:
 *   'auth:login'        — guru/admin berhasil login
 *   'auth:logout'       — logout
 *   'nilai:changed'     — ada perubahan nilai belum disimpan
 *   'nilai:saved'       — nilai berhasil disimpan
 *   'nilai:reset'       — nilai di-reset
 *   'context:loaded'    — tabel siswa berhasil dimuat
 */
class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn); // kembalikan unsubscribe fn
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
  }

  emit(event, payload) {
    (this._listeners[event] || []).forEach(fn => fn(payload));
  }
}

const bus = new EventBus();
