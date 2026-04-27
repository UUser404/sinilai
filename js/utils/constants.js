/**
 * utils/constants.js
 * Konstanta domain — definisi kolom nilai, urutan tab, bobot perhitungan.
 * Dipakai oleh NilaiCalculator, NilaiModule, ExcelModule.
 */
const NILAI_COLS = Object.freeze({
  UH:      ['uh1', 'uh2'],
  TUGAS:   ['t1', 't2', 't3', 't4'],
  PRAKTIK: ['p1', 'p2'],
  PTS:     ['pts'],
  AKHIR:   ['asas'],
});

/** Urutan tab navigasi antar kolom input */
const TAB_ORDER = Object.freeze([
  'uh1','uh2','t1','t2','t3','t4','p1','p2','pts','asas',
]);

/** Semua kolom input yang bisa diisi guru */
const ALL_INPUT_COLS = Object.freeze([...TAB_ORDER]);

/** Bobot kalkulasi nilai raport */
const BOBOT = Object.freeze({
  PROSES: 0.50,
  PTS:    0.20,
  AKHIR:  0.30,
});

/** Nilai kosong default satu siswa */
function nilaiKosong() {
  return Object.fromEntries(ALL_INPUT_COLS.map(k => [k, '']));
}
