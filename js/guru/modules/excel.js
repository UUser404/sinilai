/**
 * guru/modules/excel.js
 * ExcelModule — download template & upload import nilai dari Excel.
 * Bergantung pada SheetJS (XLSX) yang dimuat di HTML.
 *
 * Bug fixes:
 *   1. Nama file download sekarang spesifik: format-nilai-{kelas}-{mapel}-{semester}.xlsx
 *   2. Nilai yang sudah ada ikut terisi di template yang didownload
 *   3. Upload: DOM input di-update dulu sebelum recalc sehingga nilai pasti terbaca
 */
class ExcelModule {
  /** @param {NilaiModule} nilaiMod */
  constructor(nilaiMod) {
    this._nilai = nilaiMod;
  }

  // ── Download ─────────────────────────────────────────────

  downloadFormat() {
    const ctx  = this._nilai.ctx;
    const data = this._nilai.data;

    if (!data.length) {
      UI.showToast('Tidak ada data siswa untuk diunduh', 'error');
      return;
    }

    // Header tetap
    const header = ['No', 'NIS', 'Nama', 'UH1', 'UH2', 'T1', 'T2', 'T3', 'T4', 'P1', 'P2', 'PTS', 'ASAS'];

    // Setiap baris siswa: sertakan nilai yang sudah ada (FIX #2)
    const rows = [
      header,
      ...data.map((s, i) => {
        const n = s.nilai;
        return [
          i + 1,
          s.nis,
          s.nama,
          n.uh1 !== '' && n.uh1 != null ? n.uh1 : '',
          n.uh2 !== '' && n.uh2 != null ? n.uh2 : '',
          n.t1  !== '' && n.t1  != null ? n.t1  : '',
          n.t2  !== '' && n.t2  != null ? n.t2  : '',
          n.t3  !== '' && n.t3  != null ? n.t3  : '',
          n.t4  !== '' && n.t4  != null ? n.t4  : '',
          n.p1  !== '' && n.p1  != null ? n.p1  : '',
          n.p2  !== '' && n.p2  != null ? n.p2  : '',
          n.pts  !== '' && n.pts  != null ? n.pts  : '',
          n.asas !== '' && n.asas != null ? n.asas : '',
        ];
      }),
    ];

    // Buat worksheet dengan tipe kolom numerik agar Excel tidak salah baca
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Paksa kolom nilai (D–M, index 3–12) sebagai angka bukan string
    data.forEach((_, ri) => {
      for (let ci = 3; ci <= 12; ci++) {
        const cellAddr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (ws[cellAddr] && ws[cellAddr].v !== '') {
          ws[cellAddr].t = 'n'; // numerik
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai');

    // Nama file spesifik: kelas-mapel-semester (FIX #1)
    const kelas    = (ctx?.kelas    || 'kelas').replace(/[^a-zA-Z0-9-]/g, '_');
    const mapel    = (ctx?.mapel    || 'mapel').replace(/[^a-zA-Z0-9-]/g, '_');
    const semester = (ctx?.semester || '').replace(/[^a-zA-Z0-9-]/g, '_');
    const tahun    = (ctx?.tahun    || '').replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `format-nilai_${kelas}_${mapel}_${semester}_${tahun}.xlsx`;

    XLSX.writeFile(wb, filename);
    UI.showToast(`✓ Format nilai ${kelas} - ${ctx?.mapel} berhasil diunduh`, 'success');
  }

  // ── Upload ────────────────────────────────────────────────

  upload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Validasi header minimal ada NIS dan satu kolom nilai
        if (!rows.length || rows[0].length < 4) {
          UI.showToast('Format file tidak sesuai. Gunakan template yang diunduh.', 'error');
          return;
        }

        const result = this._parseRows(rows);

        if (result.count === 0) {
          UI.showToast('Tidak ada nilai valid yang ditemukan dalam file.', 'error');
          return;
        }

        // Trigger recalc + mark modified (FIX #3: DOM sudah diupdate di _parseRows)
        this._nilai.syncFromImport(result.imported);
        UI.showToast(`✓ ${result.count} nilai berhasil diimport dari Excel`, 'success');
      } catch (err) {
        console.error('Upload error:', err);
        UI.showToast('Gagal membaca file Excel. Pastikan format sesuai.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = ''; // reset agar file yang sama bisa diupload ulang
  }

  // ── Private ───────────────────────────────────────────────

  /**
   * Parse baris Excel dan update data + DOM sekaligus.
   * DOM diupdate di sini (bukan di syncFromImport) agar nilai langsung
   * terlihat di tabel SEBELUM recalc dijalankan. (FIX #3)
   */
  _parseRows(rows) {
    const COL_MAP = {
      UH1:'uh1', UH2:'uh2',
      T1:'t1', T2:'t2', T3:'t3', T4:'t4',
      P1:'p1', P2:'p2',
      PTS:'pts', ASAS:'asas',
    };

    // Petakan header (case-insensitive, toleran spasi)
    const headerRow = (rows[0] || []).map(h => String(h).trim().toUpperCase());

    let count      = 0;
    const imported = [];

    rows.slice(1).forEach(row => {
      // Kolom NIS ada di index 1 (No, NIS, Nama, ...)
      const nis = String(row[1] ?? '').trim();
      if (!nis) return;

      const idx = this._nilai.data.findIndex(s => String(s.nis) === nis);
      if (idx === -1) return; // NIS tidak ada di kelas ini

      let changed = false;

      headerRow.forEach((h, ci) => {
        const col = COL_MAP[h];
        if (!col) return;

        const raw = row[ci];

        // Kosong = skip, tidak menimpa nilai yang sudah ada
        if (raw === '' || raw === null || raw === undefined) return;

        const v = parseFloat(raw);
        if (isNaN(v) || v < 0 || v > 100) return;

        // 1. Update data model
        this._nilai.data[idx].nilai[col] = v;

        // 2. Update DOM input langsung agar nilai tampil di tabel (FIX #3)
        const domInput = document.querySelector(
          `.nilai-input[data-col="${col}"][data-idx="${idx}"]`
        );
        if (domInput) {
          domInput.value = v;
          domInput.classList.add('valid');
          domInput.classList.remove('invalid');
        }

        changed = true;
        count++;
      });

      if (changed) imported.push({ idx });
    });

    return { count, imported };
  }
}
