/**
 * admin/modules/nilai.js
 * NilaiAdminModule — rekap nilai & export CSV untuk admin.
 * Menggunakan NilaiCalculator untuk menghitung ulang di sisi client.
 */
class NilaiAdminModule {
  constructor() {
    this._calc = new NilaiCalculator();
  }

  /**
   * Isi dropdown mapel (dari guru) DAN kelas (dari siswa) di halaman
   * Rekap Nilai dan Export Laporan.
   * @param {Array} guruData
   * @param {Array} siswaData
   */
  populateFilterSelects(guruData, siswaData) {
    // Mapel dari data guru
    const mapelSet = [...new Set(
      guruData.flatMap(g => Sanitizer.parseCSV(g.mapel))
    )].sort();

    // Kelas dari data siswa (lebih akurat daripada dari guru)
    const kelasSet = [...new Set(
      siswaData.map(s => s.kelas).filter(Boolean)
    )].sort();

    // Populate semua select mapel
    ['fNilaiMapel', 'fExportMapel'].forEach(id => {
      const el = UI.$(id);
      if (!el) return;
      el.innerHTML =
        '<option value="">Semua Mapel</option>' +
        mapelSet.map(m => `<option value="${m}">${m}</option>`).join('');
    });

    // Populate semua select kelas
    ['fNilaiKelas', 'fExportKelas'].forEach(id => {
      const el = UI.$(id);
      if (!el) return;
      el.innerHTML =
        '<option value="">Semua Kelas</option>' +
        kelasSet.map(k => `<option value="${k}">${k}</option>`).join('');
    });
  }

  async loadRekap() {
    const params = {
      tahun:    UI.$('fNilaiTahun').value,
      semester: UI.$('fNilaiSem').value,
      kelas:    UI.$('fNilaiKelas').value,
      mapel:    UI.$('fNilaiMapel').value,
    };

    UI.$('nilaiRekapBody').innerHTML =
      '<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:24px">⏳ Memuat data...</td></tr>';

    try {
      const res = await api.getNilaiAdmin(params);

      // Debug ke console — bisa dihapus setelah konfirmasi
      console.log('[NilaiAdmin] params:', params);
      console.log('[NilaiAdmin] response:', res);

      // Response dari Apps Script: { status, nilai: [...] }
      // Setiap item adalah flat: { nis, namaSiswa, kelas, mapel, semester,
      //   tahun, namaGuru, uh1, uh2, t1..t4, p1, p2, pts, asas }
      const items = res.nilai ?? res.data ?? [];

      if (res.status === 'ok' && items.length) {
        // Update kalkulator dengan array nilai flat
        this._calc.update(items);
        UI.$('nilaiRekapBody').innerHTML = items.map((n, i) => {
          const proses = this._calc.nilaiProses(n);
          const raport = this._calc.nilaiRaport(n);
          const nama   = n.namaSiswa || n.nama || '—';
          return `<tr>
            <td>${i + 1}</td>
            <td>${n.nis || '—'}</td>
            <td class="name">${nama}</td>
            <td>${n.kelas || '—'}</td>
            <td>${n.mapel || '—'}</td>
            <td>${n.uh1 !== '' && n.uh1 != null ? n.uh1 : '—'}</td>
            <td>${n.uh2 !== '' && n.uh2 != null ? n.uh2 : '—'}</td>
            <td>${n.pts !== '' && n.pts != null ? n.pts : '—'}</td>
            <td>${n.asas !== '' && n.asas != null ? n.asas : '—'}</td>
            <td>${Formatter.nilai(proses)}</td>
            <td><strong>${Formatter.nilai(raport)}</strong></td>
          </tr>`;
        }).join('');
      } else {
        const info = res.status !== 'ok'
          ? `Status: ${res.status} — ${res.message || ''}`
          : `Data kosong. Keys: ${Object.keys(res).join(', ')}`;
        UI.$('nilaiRekapBody').innerHTML =
          `<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:40px">
            Tidak ada data nilai<br>
            <small style="font-size:11px;color:#94a3b8">${info}</small>
          </td></tr>`;
      }
    } catch (err) {
      console.error('[NilaiAdmin] loadRekap error:', err);
      UI.$('nilaiRekapBody').innerHTML =
        `<tr><td colspan="11" style="text-align:center;color:var(--error);padding:24px">
          Gagal memuat data nilai<br>
          <small style="font-size:11px;color:#94a3b8">${err.message}</small>
        </td></tr>`;
    }
  }

  async exportNilaiCSV() {
    const params = {
      tahun:    UI.$('fExportTahun').value,
      semester: UI.$('fExportSem').value,
      kelas:    UI.$('fExportKelas').value,
      mapel:    UI.$('fExportMapel').value,
    };
    UI.showLoading();
    try {
      const res = await api.getNilaiAdmin(params);
      const items = res.nilai ?? res.data ?? [];

      if (!items.length) {
        UI.showToast('Tidak ada data untuk diekspor', 'error');
        return;
      }

      // Kalkulator pakai flat items langsung
      this._calc.update(items);

      const header = ['No','NIS','Nama','Kelas','Mapel','Semester','Tahun',
        'UH1','UH2','T1','T2','T3','T4','P1','P2','PTS','ASAS',
        'Nilai Proses','Nilai Raport'];
      const rows = [header.join(',')];

      items.forEach((n, i) => {
        const nama = n.namaSiswa || n.nama || '';
        rows.push([
          i + 1, n.nis, `"${nama}"`, n.kelas, `"${n.mapel}"`,
          n.semester, n.tahun,
          n.uh1||'', n.uh2||'', n.t1||'', n.t2||'', n.t3||'', n.t4||'',
          n.p1||'', n.p2||'', n.pts||'', n.asas||'',
          this._calc.nilaiProses(n).toFixed(2),
          this._calc.nilaiRaport(n).toFixed(2),
        ].join(','));
      });

      this._downloadCSV(rows.join('\n'),
        `rekap-nilai-${params.kelas||'semua'}-${params.tahun||'all'}.csv`);
      UI.showToast(`✓ ${items.length} data berhasil diekspor`, 'success');
    } catch (err) {
      console.error('[NilaiAdmin] export error:', err);
      UI.showToast(`Gagal export: ${err.message}`, 'error');
    } finally {
      UI.hideLoading();
    }
  }

  async exportGuruCSV() {
    UI.showLoading();
    try {
      const res = await api.getGuru();
      if (!res.guru?.length) { UI.showToast('Tidak ada data guru', 'error'); return; }

      const header = ['No','Nama Guru','Username','NIP','Mata Pelajaran','Kelas','Status'];
      const rows   = [header.join(',')];
      res.guru.forEach((g, i) => {
        rows.push([i+1, `"${g.nama}"`, g.username, g.nip||'', `"${g.mapel}"`, `"${g.kelas}"`, g.status].join(','));
      });

      this._downloadCSV(rows.join('\n'), 'data-guru.csv');
      UI.showToast(`✓ ${res.guru.length} data guru berhasil diekspor`, 'success');
    } catch {
      UI.showToast('Gagal export data guru', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Private ───────────────────────────────────────────────

  _downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }
}
