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

  /**
   * Sanitasi realtime saat mengetik — clamp 0-100, max 3 digit integer.
   * Dipanggil di oninput sebelum disimpan ke data.
   * @returns {{ value: string, clamped: boolean }}
   */
  static nilaiInputLive(raw) {
    if (raw === '' || raw === null || raw === undefined)
      return { value: '', clamped: false };

    // Buang semua karakter non-numerik kecuali satu titik
    let clean = String(raw).replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');

    // Batasi bagian integer max 3 digit agar tidak bisa ketik 4+ digit
    const intPart = clean.split('.')[0];
    const decPart = clean.split('.')[1];
    let trimmed = intPart.slice(0, 3);
    if (decPart !== undefined) trimmed += '.' + decPart.slice(0, 1);

    const v = parseFloat(trimmed);
    if (isNaN(v)) return { value: '', clamped: false };

    // Clamp 0-100
    if (v > 100) return { value: '100', clamped: true };
    if (v < 0)   return { value: '0',   clamped: true };

    return { value: trimmed, clamped: false };
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

  /** Validasi form guru/kurikulum — mapel & kelas hanya wajib jika role guru */
  static guruForm({ nama, username, password, mapel, kelas, role }) {
    if (!nama)     return 'Nama lengkap wajib diisi';
    if (!username) return 'Username wajib diisi';
    if (!password) return 'Password wajib diisi';
    if (role === 'guru' || !role) {
      if (!mapel) return 'Mata pelajaran wajib diisi';
      if (!kelas) return 'Kelas wajib diisi';
    }
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
