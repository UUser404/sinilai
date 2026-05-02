/**
 * guru/modules/excel.js
 * ExcelModule — download template & upload import nilai dari Excel.
 * v2: validasi berlapis + modal preview sebelum import dieksekusi.
 */
class ExcelModule {
  constructor(nilaiMod) {
    this._nilai   = nilaiMod;
    this._pending = null; // hasil parse yang menunggu konfirmasi user
  }

  // ── Download ──────────────────────────────────────────────────────────────
  downloadFormat() {
    const ctx  = this._nilai.ctx;
    const data = this._nilai.data;

    if (!data.length) {
      UI.showToast('Tidak ada data siswa untuk diunduh', 'error');
      return;
    }

    const header = ['No','NIS','Nama','UH1','UH2','T1','T2','T3','T4','P1','P2','PTS','ASAS'];
    const rows = [
      header,
      ...data.map((s, i) => {
        const n = s.nilai;
        return [
          i + 1, s.nis, s.nama,
          n.uh1  != null && n.uh1  !== '' ? n.uh1  : '',
          n.uh2  != null && n.uh2  !== '' ? n.uh2  : '',
          n.t1   != null && n.t1   !== '' ? n.t1   : '',
          n.t2   != null && n.t2   !== '' ? n.t2   : '',
          n.t3   != null && n.t3   !== '' ? n.t3   : '',
          n.t4   != null && n.t4   !== '' ? n.t4   : '',
          n.p1   != null && n.p1   !== '' ? n.p1   : '',
          n.p2   != null && n.p2   !== '' ? n.p2   : '',
          n.pts  != null && n.pts  !== '' ? n.pts  : '',
          n.asas != null && n.asas !== '' ? n.asas : '',
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    data.forEach((_, ri) => {
      for (let ci = 3; ci <= 12; ci++) {
        const cellAddr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (ws[cellAddr] && ws[cellAddr].v !== '') ws[cellAddr].t = 'n';
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai');

    const kelas    = (ctx?.kelas    || 'kelas').replace(/[^a-zA-Z0-9-]/g, '_');
    const mapel    = (ctx?.mapel    || 'mapel').replace(/[^a-zA-Z0-9-]/g, '_');
    const semester = (ctx?.semester || '').replace(/[^a-zA-Z0-9-]/g, '_');
    const tahun    = (ctx?.tahun    || '').replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `format-nilai_${kelas}_${mapel}_${semester}_${tahun}.xlsx`;

    XLSX.writeFile(wb, filename);
    UI.showToast(`✓ Format nilai ${kelas} - ${ctx?.mapel} berhasil diunduh`, 'success');
  }

  // ── Upload entry point ────────────────────────────────────────────────────
  upload(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    // Validasi 1: tipe file
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls'].includes(ext)) {
      this._showError(
        'Format File Salah',
        `File yang diunggah berformat <strong>.${ext}</strong>, bukan Excel.<br>
         Gunakan file <strong>.xlsx</strong> yang diunduh dari tombol "⬇ Format Excel".`
      );
      return;
    }

    // Validasi 2: ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this._showError('File Terlalu Besar', 'Ukuran file melebihi batas 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => this._process(e.target.result, file.name);
    reader.onerror = () => this._showError('Gagal Membaca File', 'File tidak dapat dibaca. Pastikan file tidak rusak.');
    reader.readAsArrayBuffer(file);
  }

  // ── Proses & validasi isi file ────────────────────────────────────────────
  _process(buffer, filename) {
    let wb, ws, rows;
    try {
      wb   = XLSX.read(buffer, { type: 'array' });
      ws   = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    } catch {
      this._showError(
        'File Tidak Dapat Dibaca',
        'File Excel rusak atau formatnya tidak dikenali. Coba unduh ulang template dari tombol "⬇ Format Excel".'
      );
      return;
    }

    // Validasi 3: sheet kosong
    if (!rows.length || rows.every(r => r.every(c => c === ''))) {
      this._showError('File Kosong', 'File Excel tidak memiliki data sama sekali.');
      return;
    }

    // Validasi 4: header wajib ada (NIS di kolom 1, kolom nilai di 3+)
    const headerRow = (rows[0] || []).map(h => String(h).trim().toUpperCase());
    const REQUIRED  = ['NIS', 'NAMA'];
    const NILAI_COLS = ['UH1','UH2','T1','T2','T3','T4','P1','P2','PTS','ASAS'];
    const missingRequired = REQUIRED.filter(r => !headerRow.includes(r));
    const hasNilaiCol     = NILAI_COLS.some(c => headerRow.includes(c));

    if (missingRequired.length || !hasNilaiCol) {
      this._showError(
        'Header Tidak Sesuai Template',
        `File ini bukan template nilai SiNilai yang valid.<br><br>
         ${missingRequired.length ? `Kolom wajib tidak ditemukan: <strong>${missingRequired.join(', ')}</strong><br>` : ''}
         ${!hasNilaiCol ? 'Tidak ada kolom nilai yang dikenali (UH1, UH2, T1~T4, PTS, ASAS).' : ''}
         <br>Gunakan file yang diunduh dari tombol "⬇ Format Excel".`
      );
      return;
    }

    // Validasi 5: cek kesesuaian data dengan kelas yang sedang dibuka
    const ctx       = this._nilai.ctx;
    const siswaNis  = new Set(this._nilai.data.map(s => String(s.nis)));
    const fileNis   = rows.slice(1)
      .map(r => String(r[headerRow.indexOf('NIS')] ?? '').trim())
      .filter(Boolean);

    const nisMatch  = fileNis.filter(n => siswaNis.has(n)).length;
    const nisMiss   = fileNis.filter(n => !siswaNis.has(n)).length;

    // Validasi 6: tidak ada satu pun NIS yang cocok = file salah kelas
    if (nisMatch === 0 && fileNis.length > 0) {
      this._showError(
        'File Tidak Sesuai Kelas',
        `Tidak ada satu pun NIS dalam file yang cocok dengan kelas <strong>${ctx?.kelas} - ${ctx?.mapel}</strong> yang sedang dibuka.<br><br>
         Kemungkinan kamu mengunggah file untuk kelas atau mapel yang berbeda.<br>
         Pastikan kamu membuka kelas yang benar sebelum upload.`
      );
      return;
    }

    // Parse nilai + kumpulkan warning
    const result = this._parseRows(rows, headerRow);

    // Tampilkan modal preview
    this._pending = result;
    this._showPreview(result, filename, nisMatch, nisMiss);
  }

  // ── Parse baris Excel ─────────────────────────────────────────────────────
  _parseRows(rows, headerRow) {
    const COL_MAP = {
      UH1:'uh1', UH2:'uh2',
      T1:'t1', T2:'t2', T3:'t3', T4:'t4',
      P1:'p1', P2:'p2',
      PTS:'pts', ASAS:'asas',
    };

    const imported = [];
    const warnings = []; // baris bermasalah tapi tidak fatal
    let totalNilai = 0;

    rows.slice(1).forEach((row, ri) => {
      const nisIdx = headerRow.indexOf('NIS');
      const nis    = String(row[nisIdx] ?? '').trim();
      if (!nis) return;

      const idx = this._nilai.data.findIndex(s => String(s.nis) === nis);
      if (idx === -1) {
        warnings.push({ baris: ri + 2, nis, alasan: 'NIS tidak terdaftar di kelas ini' });
        return;
      }

      const siswa    = this._nilai.data[idx];
      const nilaiMap = {};
      let rowWarns   = [];

      headerRow.forEach((h, ci) => {
        const col = COL_MAP[h];
        if (!col) return;
        const raw = row[ci];
        if (raw === '' || raw === null || raw === undefined) return;

        const v = parseFloat(raw);
        if (isNaN(v)) {
          rowWarns.push(`${h}="${raw}" (bukan angka, dilewati)`);
          return;
        }
        if (v < 0 || v > 100) {
          rowWarns.push(`${h}=${v} (di luar 0–100, dilewati)`);
          return;
        }

        nilaiMap[col] = v;
        totalNilai++;
      });

      if (rowWarns.length) {
        warnings.push({ baris: ri + 2, nis, nama: siswa.nama, alasan: rowWarns.join('; ') });
      }

      if (Object.keys(nilaiMap).length > 0) {
        imported.push({ idx, nilaiMap });
      }
    });

    return { imported, warnings, totalNilai, totalSiswa: imported.length };
  }

  // ── Modal preview sebelum eksekusi ────────────────────────────────────────
  _showPreview(result, filename, nisMatch, nisMiss) {
    const { imported, warnings, totalNilai, totalSiswa } = result;
    const ctx = this._nilai.ctx;

    const warnHtml = warnings.length ? `
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:700;color:var(--warn);margin-bottom:6px">
          ⚠️ ${warnings.length} baris dengan peringatan (tidak diimport):
        </div>
        <div style="max-height:120px;overflow-y:auto;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px">
          ${warnings.map(w => `
            <div style="font-size:11px;color:var(--text2);padding:3px 0;border-bottom:1px solid var(--border)">
              Baris ${w.baris} · NIS ${w.nis}${w.nama?' ('+w.nama+')':''} — ${w.alasan}
            </div>`).join('')}
        </div>
      </div>` : '';

    const html = `
    <div style="font-size:13px;color:var(--text);margin-bottom:14px">
      File: <strong>${filename}</strong>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--success-bg);border:1px solid var(--success);border-radius:var(--radius-sm);padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--success)">${totalSiswa}</div>
        <div style="font-size:11px;color:var(--success)">siswa akan diupdate</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--text)">${totalNilai}</div>
        <div style="font-size:11px;color:var(--text2)">kolom nilai diimport</div>
      </div>
    </div>
    ${nisMiss > 0 ? `
    <div style="font-size:11px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;margin-bottom:8px">
      ℹ️ ${nisMiss} NIS di file tidak cocok dengan kelas <strong>${ctx?.kelas}</strong> (dilewati)
    </div>` : ''}
    <div style="font-size:11px;color:var(--text3);margin-bottom:4px">
      ⚠️ Nilai yang sudah ada hanya akan ditimpa jika kolom di file terisi. Kolom kosong di file tidak mengubah nilai yang sudah ada.
    </div>
    ${warnHtml}`;

    // Render ke modal
    UI.$('uploadPreviewBody').innerHTML = html;
    UI.$('btnKonfirmasiUpload').disabled = totalSiswa === 0;
    openModal('modalUploadPreview');
  }

  // ── Eksekusi import setelah konfirmasi ────────────────────────────────────
  confirm() {
    if (!this._pending) return;
    const { imported } = this._pending;

    imported.forEach(({ idx, nilaiMap }) => {
      Object.entries(nilaiMap).forEach(([col, v]) => {
        this._nilai.data[idx].nilai[col] = v;
        const domInput = document.querySelector(
          `.nilai-input[data-col="${col}"][data-idx="${idx}"]`
        );
        if (domInput) {
          domInput.value = v;
          domInput.classList.add('valid');
          domInput.classList.remove('invalid');
        }
      });
    });

    this._nilai.syncFromImport(imported);
    closeModal('modalUploadPreview');
    this._pending = null;
    UI.showToast(`✓ ${imported.length} siswa berhasil diimport`, 'success');
  }

  cancel() {
    this._pending = null;
    closeModal('modalUploadPreview');
  }

  // ── Modal error ───────────────────────────────────────────────────────────
  _showError(judul, pesan) {
    UI.$('uploadErrorJudul').textContent = judul;
    UI.$('uploadErrorPesan').innerHTML   = pesan;
    openModal('modalUploadError');
  }
}
