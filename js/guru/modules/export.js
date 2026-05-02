/**
 * guru/modules/export.js
 * ExportModule — Export nilai ke CSV untuk guru.
 *
 * Guru hanya bisa export kelas & mapel yang dia ajar.
 * Format dan nama file sama persis dengan admin:
 *   rekap-nilai-{kelas}-{mapel}-{semester}-{tahun}.csv
 */
class ExportModule {
  constructor() {
    this._calc = new NilaiCalculator();
    this._guru = null; // diset oleh controller setelah login
  }

  /** Dipanggil controller setelah login berhasil */
  setGuru(guru) {
    this._guru = guru;
  }

  /** Dipanggil setelah renderPage() dimasukkan ke DOM */
  afterRender() {
    TahunAjar.populate('expTahun', '', true);
    App.absensiMod?.afterRender();
  }

  /** Render halaman export — isi dropdown sesuai mapel/kelas guru */
  renderPage() {
    if (!this._guru) return;
    // Render section absensi di bawah
    const absensiSection = App.absensiMod?.renderSection() || '';

    const mapelOpts = (this._guru.mapel || [])
      .map(m => `<option value="${m}">${m}</option>`).join('');
    const kelasOpts = (this._guru.kelas || [])
      .map(k => `<option value="${k}">${k}</option>`).join('');

    UI.$('export-content').innerHTML = `
      <div class="export-card">
        <div class="export-card-header">
          <span class="export-card-title">📤 Export Nilai ke CSV</span>
          <span class="export-card-sub">Hanya menampilkan kelas &amp; mata pelajaran yang Anda ajar</span>
        </div>

        <div class="export-form">
          <div class="export-form-grid">
            <div class="export-field">
              <label>Tahun Ajaran</label>
              <select id="expTahun" class="export-select">
                <option value="">— Semua Tahun —</option>
                <!-- populated by TahunAjar -->
              </select>
            </div>
            <div class="export-field">
              <label>Semester</label>
              <select id="expSemester" class="export-select">
                <option value="">— Semua Semester —</option>
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
            <div class="export-field">
              <label>Mata Pelajaran</label>
              <select id="expMapel" class="export-select">
                <option value="">— Semua Mapel —</option>
                ${mapelOpts}
              </select>
            </div>
            <div class="export-field">
              <label>Kelas</label>
              <select id="expKelas" class="export-select">
                <option value="">— Semua Kelas —</option>
                ${kelasOpts}
              </select>
            </div>
          </div>

          <div class="export-actions">
            <button class="btn-export-preview" onclick="App.exportMod.preview()">
              👁 Pratinjau Data
            </button>
            <button class="btn-export-csv" id="btnExportCSV"
                    onclick="App.exportMod.exportCSV()" disabled>
              ⬇ Export ke CSV
            </button>
          </div>
        </div>
      </div>

      <!-- Preview tabel -->
      <div class="export-card" id="exportPreviewCard" style="display:none">
        <div class="export-card-header">
          <span class="export-card-title">Pratinjau Data</span>
          <span class="export-card-sub" id="exportPreviewInfo">—</span>
        </div>
        <div style="overflow-x:auto">
          <table class="export-preview-table">
            <thead>
              <tr>
                <th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Mapel</th>
                <th>Semester</th><th>Tahun</th>
                <th>UH1</th><th>UH2</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th>
                <th>P1</th><th>P2</th><th>PTS</th><th>ASAS</th>
                <th>Nilai Proses</th><th>Nilai Raport</th>
              </tr>
            </thead>
            <tbody id="exportPreviewBody">
              <tr><td colspan="19" style="text-align:center;color:var(--text3);padding:32px">
                Klik "Pratinjau Data" untuk melihat data
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${absensiSection}
    `;
  }

  /** Pratinjau data sebelum export */
  async preview() {
    const params = this._getParams();

    UI.showLoading('Memuat pratinjau...');
    try {
      const res   = await api.getNilaiAdmin(params);
      const items = res.nilai ?? res.data ?? [];

      const card = UI.$('exportPreviewCard');
      card.style.display = 'block';

      if (!items.length) {
        UI.$('exportPreviewBody').innerHTML =
          '<tr><td colspan="19" style="text-align:center;color:var(--text3);padding:32px">Tidak ada data untuk filter ini</td></tr>';
        UI.$('exportPreviewInfo').textContent = '0 data ditemukan';
        UI.$('btnExportCSV').disabled = true;
        return;
      }

      // Simpan items untuk digunakan saat export
      this._cachedItems  = items;
      this._cachedParams = params;

      this._calc.update(items);
      UI.$('exportPreviewInfo').textContent = `${items.length} data ditemukan`;
      UI.$('btnExportCSV').disabled = false;

      UI.$('exportPreviewBody').innerHTML = items.map((n, i) => {
        const proses = this._calc.nilaiProses(n);
        const raport = this._calc.nilaiRaport(n);
        const nama   = n.namaSiswa || n.nama || '—';
        const raportColor = raport >= 90 ? '#166534' : raport >= 80 ? '#1e40af' : raport >= 70 ? '#854d0e' : raport > 0 ? '#991b1b' : '#94a3b8';
        const raportBg    = raport >= 90 ? '#d1fae5' : raport >= 80 ? '#dbeafe' : raport >= 70 ? '#fef9c3' : raport > 0 ? '#fee2e2' : '';
        return `<tr>
          <td>${i + 1}</td>
          <td>${n.nis || '—'}</td>
          <td style="font-weight:600;text-align:left">${nama}</td>
          <td>${n.kelas || '—'}</td>
          <td>${n.mapel || '—'}</td>
          <td>${n.semester || '—'}</td>
          <td>${n.tahun || '—'}</td>
          <td>${n.uh1 != null && n.uh1 !== '' ? n.uh1 : '—'}</td>
          <td>${n.uh2 != null && n.uh2 !== '' ? n.uh2 : '—'}</td>
          <td>${n.t1  != null && n.t1  !== '' ? n.t1  : '—'}</td>
          <td>${n.t2  != null && n.t2  !== '' ? n.t2  : '—'}</td>
          <td>${n.t3  != null && n.t3  !== '' ? n.t3  : '—'}</td>
          <td>${n.t4  != null && n.t4  !== '' ? n.t4  : '—'}</td>
          <td>${n.p1  != null && n.p1  !== '' ? n.p1  : '—'}</td>
          <td>${n.p2  != null && n.p2  !== '' ? n.p2  : '—'}</td>
          <td>${n.pts  != null && n.pts  !== '' ? n.pts  : '—'}</td>
          <td>${n.asas != null && n.asas !== '' ? n.asas : '—'}</td>
          <td>${Formatter.nilai(proses)}</td>
          <td style="font-weight:800;color:${raportColor};background:${raportBg};border-radius:4px">
            ${Formatter.nilai(raport)}
          </td>
        </tr>`;
      }).join('');

      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      UI.showToast(`✓ ${items.length} data siap diekspor`, 'success');
    } catch (err) {
      console.error('[ExportGuru] preview error:', err);
      UI.showToast(`Gagal memuat data: ${err.message}`, 'error');
    } finally {
      UI.hideLoading();
    }
  }

  /** Export ke CSV — gunakan cache dari preview jika ada dan params sama */
  async exportCSV() {
    const params = this._getParams();

    // Pakai cache jika params belum berubah
    let items = this._cachedItems;
    if (!items?.length || JSON.stringify(params) !== JSON.stringify(this._cachedParams)) {
      UI.showLoading('Mengambil data...');
      try {
        const res = await api.getNilaiAdmin(params);
        items = res.nilai ?? res.data ?? [];
      } catch (err) {
        UI.showToast(`Gagal mengambil data: ${err.message}`, 'error');
        return;
      } finally {
        UI.hideLoading();
      }
    }

    if (!items.length) {
      UI.showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }

    this._calc.update(items);

    // Header sama persis dengan admin
    const header = [
      'No','NIS','Nama','Kelas','Mapel','Semester','Tahun',
      'UH1','UH2','T1','T2','T3','T4','P1','P2','PTS','ASAS',
      'Nilai Proses','Nilai Raport',
    ];
    const rows = [header.join(',')];

    items.forEach((n, i) => {
      const nama = n.namaSiswa || n.nama || '';
      rows.push([
        i + 1,
        n.nis,
        `"${nama}"`,
        n.kelas,
        `"${n.mapel}"`,
        n.semester,
        n.tahun,
        n.uh1 ?? '', n.uh2 ?? '',
        n.t1  ?? '', n.t2  ?? '', n.t3 ?? '', n.t4 ?? '',
        n.p1  ?? '', n.p2  ?? '',
        n.pts  ?? '',
        n.asas ?? '',
        this._calc.nilaiProses(n).toFixed(2),
        this._calc.nilaiRaport(n).toFixed(2),
      ].join(','));
    });

    // Nama file sama persis dengan admin
    const kelas    = (params.kelas    || 'semua').replace(/[^a-zA-Z0-9-]/g, '_');
    const mapel    = (params.mapel    || 'semua').replace(/[^a-zA-Z0-9-]/g, '_');
    const semester = (params.semester || 'semua').replace(/[^a-zA-Z0-9-]/g, '_');
    const tahun    = (params.tahun    || 'all').replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `rekap-nilai-${kelas}-${mapel}-${semester}-${tahun}.csv`;

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);

    UI.showToast(`✓ ${items.length} data berhasil diekspor ke ${filename}`, 'success');
  }

  // ── Private ───────────────────────────────────────────────

  _getParams() {
    return {
      tahun:    UI.$('expTahun')?.value    || '',
      semester: UI.$('expSemester')?.value || '',
      mapel:    UI.$('expMapel')?.value    || '',
      kelas:    UI.$('expKelas')?.value    || '',
    };
  }
}
