/**
 * utils/formatter.js
 * Formatter — fungsi pure untuk format tampilan data.
 * Tidak ada DOM, tidak ada state.
 */
const Formatter = {
  /** Format angka nilai dengan 1 desimal, atau '—' jika nol/kosong */
  nilai(v) {
    const n = parseFloat(v);
    return (!isNaN(n) && n > 0) ? n.toFixed(1) : '—';
  },

  /** Inisial dari nama (huruf pertama kapital) */
  inisial(nama) {
    return (nama || '').charAt(0).toUpperCase() || '?';
  },

  /** Gabungkan semester + tahun ajaran */
  labelSemester(semester, tahun) {
    return [semester, tahun].filter(Boolean).join(' ');
  },

  /** Format timestamp histori "DD/MM/YYYY HH.MM.SS" → Date */
  parseTimestamp(tsStr) {
    if (!tsStr) return null;
    try {
      const clean = tsStr.replace(/\./g, ':').replace(',', '');
      const [datePart, timePart = '00:00:00'] = clean.trim().split(' ');
      const [d, m, y] = datePart.split('/');
      const [h, min, s] = timePart.split(':');
      return new Date(+y, +m - 1, +d, +h || 0, +min || 0, +s || 0);
    } catch { return null; }
  },

  /** Format Date ke string waktu lokal Indonesia */
  waktuLokal(date = new Date()) {
    return date.toLocaleTimeString('id-ID');
  },

  /** Format Date ke string tanggal + waktu lokal Indonesia */
  tanggalWaktu(date = new Date()) {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }) + ' · ' + date.toLocaleTimeString('id-ID');
  },
};
