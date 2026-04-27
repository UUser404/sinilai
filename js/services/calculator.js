/**
 * services/calculator.js
 * NilaiCalculator — semua kalkulasi nilai raport.
 * Pure logic: tidak ada DOM, tidak ada API call.
 *
 * Rumus:
 *   Rata-rata per kelompok  = rata dari kolom AKTIF (ada ≥1 siswa terisi)
 *   Nilai Proses            = rata kelompok (UH + Tugas + Praktik) yang aktif
 *   Nilai Raport            = Proses×50% + PTS×20% + ASAS×30%
 */
class NilaiCalculator {
  /**
   * @param {Object[]} nilaiArr  — seluruh array objek nilai satu kelas
   *                               { uh1, uh2, t1..t4, p1, p2, pts, asas }
   */
  constructor(nilaiArr = []) {
    this._arr = nilaiArr;
  }

  update(nilaiArr) { this._arr = nilaiArr; }

  // ── Kolom aktif ──────────────────────────────────────────

  isKolomAktif(kolom) {
    return this._arr.some(n => {
      const v = n[kolom];
      return v !== '' && v !== null && v !== undefined && !isNaN(parseFloat(v));
    });
  }

  activeKoloms(group) {
    return group.filter(k => this.isKolomAktif(k));
  }

  // ── Rata per kelompok ────────────────────────────────────

  rataUH(n)      { return this._rataGroup(n, NILAI_COLS.UH); }
  rataTugas(n)   { return this._rataGroup(n, NILAI_COLS.TUGAS); }
  rataPraktik(n) { return this._rataGroup(n, NILAI_COLS.PRAKTIK); }

  // ── Nilai gabungan ───────────────────────────────────────

  nilaiProses(n) {
    const kelompok = [
      { val: this.rataUH(n),      aktif: this.activeKoloms(NILAI_COLS.UH).length > 0 },
      { val: this.rataTugas(n),   aktif: this.activeKoloms(NILAI_COLS.TUGAS).length > 0 },
      { val: this.rataPraktik(n), aktif: this.activeKoloms(NILAI_COLS.PRAKTIK).length > 0 },
    ].filter(k => k.aktif);

    if (!kelompok.length) return 0;
    return kelompok.reduce((s, k) => s + k.val, 0) / kelompok.length;
  }

  nilaiRaport(n) {
    return (
      this.nilaiProses(n) * BOBOT.PROSES +
      (+n.pts  || 0)      * BOBOT.PTS    +
      (+n.asas || 0)      * BOBOT.AKHIR
    );
  }

  adaNilai(n) {
    return ALL_INPUT_COLS.some(
      k => n[k] !== '' && n[k] !== null && n[k] !== undefined && !isNaN(n[k])
    );
  }

  // ── Private ──────────────────────────────────────────────

  _rataGroup(n, cols) {
    const aktif = this.activeKoloms(cols);
    if (!aktif.length) return 0;
    return aktif.reduce((s, k) => s + (+n[k] || 0), 0) / aktif.length;
  }
}
