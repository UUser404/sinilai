/**
 * core/config.js
 * Satu-satunya tempat konfigurasi global.
 * Semua file lain import dari sini — tidak ada magic string yang tersebar.
 */
const Config = Object.freeze({
  SCRIPT_URL:           'https://script.google.com/macros/s/AKfycbx9T4wbsdDTrHBN6esAmD875OA3uWIoZWVHL15s4LCssL26q04SQVCN9ZT9xpkvvjdUtQ/exec',
  SESSION_KEY_GURU:     'sinilai_guru_session',
  SESSION_KEY_CONTEXT:  'sinilai_guru_context',
  SESSION_KEY_ADMIN:    'sinilai_admin_session',
  BATCH_SIZE:           20,     // 20 siswa/batch — 1 kelas (≤40 siswa) = maks 2 batch
  TOAST_MS:             3200,
  DASHBOARD_REFRESH_MS: 30_000,
  URL_MAX_LEN:          7000,   // Apps Script mendukung URL hingga ~8KB
});
