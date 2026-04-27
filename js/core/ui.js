/**
 * core/ui.js
 * UI — helper DOM stateless.
 * Tidak menyimpan state. Setiap method adalah pure side-effect ke DOM.
 */
class UI {
  /** Shortcut getElementById */
  static $(id) { return document.getElementById(id); }

  static showLoading(text = 'Memuat data...') {
    const el = UI.$('loadingText');
    if (el) el.textContent = text;
    UI.$('loadingOverlay')?.classList.add('show');
  }

  static hideLoading() {
    UI.$('loadingOverlay')?.classList.remove('show');
  }

  /** @param {'success'|'error'|'info'} type */
  static showToast(msg, type = 'info') {
    const t = UI.$('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => { t.className = 'toast'; }, Config.TOAST_MS);
  }

  /** Sematkan listener 'Enter key' ke array id input */
  static bindEnterKey(ids, callback) {
    ids.forEach(id => {
      UI.$(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') callback();
      });
    });
  }
}
