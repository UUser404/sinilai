/**
 * core/validator.js
 * Validator — validasi input nilai tanpa sentuh DOM.
 * Semua method pure function (input -> hasil).
 */
class Validator {
  /**
   * Sanitasi string nilai angka: buang karakter non-numerik, clamp 0-100
   * @param {string} raw
   * @returns {{ value: string|number, valid: boolean }}
   */
  static nilaiInput(raw) {
    if (raw === '' || raw === null || raw === undefined) {
      return { value: '', valid: null };
    }

    let clean = String(raw).replace(/[^0-9.]/g, '');
    // Hanya boleh satu titik desimal
    const parts = clean.split('.');
    if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');

    const v = parseFloat(clean);
    if (isNaN(v)) return { value: '0', valid: false };
    if (v < 0)   return { value: '0', valid: false };
    if (v > 100) return { value: '100', valid: false };

    return { value: clean, valid: true };
  }

  /** Apakah karakter keyboard ini diblokir untuk input nilai? */
  static isBlockedKey(key) {
    return ['-', '+', 'e', 'E'].includes(key);
  }

  /** Validasi login form — kembalikan pesan error atau null */
  static loginForm(username, password) {
    if (!username || !password) return 'Username dan password wajib diisi';
    return null;
  }

  /** Validasi form guru — kembalikan pesan error atau null */
  static guruForm({ nama, username, password, mapel, kelas }) {
    if (!nama)     return 'Nama lengkap wajib diisi';
    if (!username) return 'Username wajib diisi';
    if (!password) return 'Password wajib diisi';
    if (!mapel)    return 'Mata pelajaran wajib diisi';
    if (!kelas)    return 'Kelas wajib diisi';
    return null;
  }

  /** Validasi form siswa — kembalikan pesan error atau null */
  static siswaForm({ nis, nama, kelas }) {
    if (!nis)   return 'NIS wajib diisi';
    if (!nama)  return 'Nama wajib diisi';
    if (!kelas) return 'Kelas wajib diisi';
    return null;
  }
}
