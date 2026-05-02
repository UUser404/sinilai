/**
 * js/utils/tahun.js
 * Utility untuk generate dan populate dropdown Tahun Ajar.
 * Dipakai di guru (index.html), admin (admin.html), kurikulum (kurikulum.html).
 */
const TahunAjar = {
  /**
   * Generate list tahun ajar dari (tahun sekarang - 2) s/d (tahun sekarang + 2).
   * Format: "2023/2024", "2024/2025", dst.
   * @returns {string[]}
   */
  generateList() {
    const now  = new Date().getFullYear();
    const list = [];
    for (let y = now - 2; y <= now + 2; y++) {
      list.push(`${y}/${y + 1}`);
    }
    return list;
  },

  /**
   * Default tahun ajar aktif = tahun sekarang/tahun depan
   * (Juli-Desember = tahun ini/tahun depan, Jan-Juni = tahun lalu/tahun ini)
   */
  defaultAktif() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const start = month >= 7 ? year : year - 1;
    return `${start}/${start + 1}`;
  },

  /**
   * Populate elemen <select> dengan opsi tahun ajar.
   * @param {string} selectId - ID elemen select
   * @param {string} selected - Nilai yang dipilih (opsional, default: tahun aktif)
   * @param {boolean} withEmpty - Tambah opsi "— Pilih —" di awal
   */
  populate(selectId, selected, withEmpty = false) {
    const el = document.getElementById(selectId);
    if (!el) return;

    const list    = this.generateList();
    const current = selected || this.defaultAktif();

    el.innerHTML = (withEmpty ? '<option value="">— Pilih —</option>' : '') +
      list.map(ta =>
        `<option value="${ta}" ${ta === current ? 'selected' : ''}>${ta}</option>`
      ).join('');
  },

  /**
   * Populate dropdown dari data server (getAvailableTahunAjar).
   * Merge dengan generate lokal agar tahun aktif selalu ada meski belum ada data.
   * @param {string} selectId
   * @param {string[]} serverList - dari api.getAvailableTahunAjar()
   * @param {string} selected
   * @param {boolean} withEmpty
   */
  populateFromServer(selectId, serverList, selected, withEmpty = false) {
    const el = document.getElementById(selectId);
    if (!el) return;

    const generated = this.generateList();
    const merged    = [...new Set([...serverList, ...generated])].sort().reverse();
    const current   = selected || this.defaultAktif();

    el.innerHTML = (withEmpty ? '<option value="">— Pilih —</option>' : '') +
      merged.map(ta =>
        `<option value="${ta}" ${ta === current ? 'selected' : ''}>${ta}</option>`
      ).join('');
  },

  /**
   * Parse input dua dropdown (taAwal + taAkhir) menjadi string "2025/2026".
   */
  fromInputs(awalId, akhirId) {
    const a = document.getElementById(awalId)?.value;
    const b = document.getElementById(akhirId)?.value;
    if (!a || !b) return '';
    return `${a}/${b}`;
  },

  /**
   * Populate dua dropdown tahun awal/akhir untuk form input individu siswa.
   * Tahun akhir = tahun awal + 1 (otomatis, tidak bisa dipilih bebas).
   */
  populateInputPair(awalId, akhirId, selectedTA) {
    const awalEl  = document.getElementById(awalId);
    const akhirEl = document.getElementById(akhirId);
    if (!awalEl || !akhirEl) return;

    const now     = new Date().getFullYear();
    const years   = [];
    for (let y = now - 2; y <= now + 2; y++) years.push(y);

    // Parse selected jika ada
    let selYear = now;
    if (selectedTA && selectedTA.includes('/')) {
      selYear = parseInt(selectedTA.split('/')[0]) || now;
    } else {
      // Default ke tahun aktif
      const month = new Date().getMonth() + 1;
      selYear = month >= 7 ? now : now - 1;
    }

    awalEl.innerHTML = years.map(y =>
      `<option value="${y}" ${y === selYear ? 'selected' : ''}>${y}</option>`
    ).join('');

    // Tahun akhir otomatis ikut tahun awal
    akhirEl.textContent = `/${selYear + 1}`;

    // Update akhir saat awal berubah
    awalEl.onchange = () => {
      akhirEl.textContent = `/${parseInt(awalEl.value) + 1}`;
    };
  },
};
