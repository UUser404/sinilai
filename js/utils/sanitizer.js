/**
 * utils/sanitizer.js
 * Sanitizer — bersihkan/kompres data sebelum dikirim ke server.
 * Pure functions: input → output baru, tidak mutasi argumen.
 */
const Sanitizer = {
  /**
   * Kompres array data nilai: buang kolom yang kosong/null/undefined.
   * Mengurangi panjang URL agar tidak melampaui batas browser.
   * @param {Array<{nis, nama, nilai}>} data
   * @returns {Array<{nis, nama, nilai}>}
   */
  kompresNilai(data) {
    return data.map(siswa => ({
      nis:   siswa.nis,
      nama:  siswa.nama,
      nilai: Object.fromEntries(
        Object.entries(siswa.nilai).filter(
          ([, v]) => v !== '' && v !== null && v !== undefined
        )
      ),
    }));
  },

  /**
   * Parse mapel/kelas dari string CSV atau array
   * @param {string|string[]} val
   * @returns {string[]}
   */
  parseCSV(val) {
    if (Array.isArray(val)) return val.filter(Boolean);
    return (val || '').split(',').map(s => s.trim()).filter(Boolean);
  },
};
