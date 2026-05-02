/**
 * guru/modules/absensi.js
 * AbsensiModule — Export Daftar Hadir & Daftar Nilai ke Excel (.xlsx)
 */
class AbsensiModule {
  constructor() {
    this._guru = null;
  }

  setGuru(guru) { this._guru = guru; }

  /** Dipanggil setelah renderSection() dimasukkan ke DOM */
  afterRender() {
    TahunAjar.populate('absTahun', '', true);
  }

  // ── Render UI ─────────────────────────────────────────────

  renderSection() {
    const guru = this._guru;
    if (!guru) return '';

    const mapelOpts = (guru.mapel || [])
      .map(m => `<option value="${m}">${m}</option>`).join('');

    return `
      <div class="export-card" style="margin-top:20px">
        <div class="export-card-header">
          <span class="export-card-title">📋 Export Absensi &amp; Daftar Nilai (.xlsx)</span>
          <span class="export-card-sub">
            Format resmi madrasah — Daftar Hadir &amp; Daftar Nilai dalam satu file,
            lengkap dengan formatting asli (warna, border, ukuran F4)
          </span>
        </div>

        <div class="export-form">
          <div class="export-form-grid">
            <div class="export-field">
              <label>Tahun Ajaran</label>
              <select id="absTahun" class="export-select">
                <option value="">— Pilih Tahun —</option>
                <!-- populated by TahunAjar -->
              </select>
            </div>
            <div class="export-field">
              <label>Semester</label>
              <select id="absSemester" class="export-select">
                <option value="">— Pilih Semester —</option>
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
            <div class="export-field">
              <label>Mata Pelajaran</label>
              <select id="absMapel" class="export-select"
                      onchange="App.absensiMod._onMapelChange()">
                <option value="">— Pilih Mapel —</option>
                ${mapelOpts}
              </select>
            </div>
            <div class="export-field">
              <label>Kelas</label>
              <select id="absKelas" class="export-select">
                <option value="">— Pilih Kelas —</option>
              </select>
            </div>
          </div>

          <div class="export-actions">
            <button class="btn-export-csv"
                    style="background:var(--green,#16a34a)"
                    onclick="App.absensiMod.exportExcel()">
              📥 Download Absensi &amp; Nilai (.xlsx)
            </button>
          </div>

          <p style="margin:12px 0 0;font-size:12px;color:var(--text3,#94a3b8)">
            ⏱ Proses 5–15 detik karena file dibuat di server.
            File akan otomatis terunduh setelah selesai.
          </p>

          <!-- Area link download manual jika otomatis gagal -->
          <div id="absDownloadLink" style="display:none;margin-top:12px;
               padding:12px 16px;background:var(--bg2,#f1f5f9);border-radius:8px;
               border:1px solid var(--border,#e2e8f0)">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:var(--text1,#1e293b)">
              ✅ File berhasil dibuat!
            </p>
            <p style="margin:0 0 10px;font-size:12px;color:var(--text2,#64748b)">
              Jika download tidak otomatis, klik tombol di bawah:
            </p>
            <a id="absDownloadBtn" href="#" target="_blank"
               style="display:inline-block;padding:8px 16px;background:#16a34a;color:#fff;
                      border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">
              ⬇ Download File .xlsx
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // ── Dropdown mapel → kelas ────────────────────────────────

  _onMapelChange() {
    const guru     = this._guru;
    const selected = UI.$('absMapel')?.value;
    const kelasSel = UI.$('absKelas');
    if (!kelasSel) return;
    kelasSel.innerHTML = '<option value="">— Pilih Kelas —</option>';
    if (!selected || !guru) return;
    const entry = (guru.penugasan || []).find(p => p.mapel === selected);
    (entry?.kelas || guru.kelas || []).forEach(k => {
      kelasSel.innerHTML += `<option>${k}</option>`;
    });
  }

  // ── Main export ───────────────────────────────────────────

  async exportExcel() {
    const tahun    = UI.$('absTahun')?.value?.trim()    || '';
    const semester = UI.$('absSemester')?.value?.trim() || '';
    const mapel    = UI.$('absMapel')?.value?.trim()    || '';
    const kelas    = UI.$('absKelas')?.value?.trim()    || '';

    if (!tahun || !semester || !mapel || !kelas) {
      UI.showToast('Lengkapi semua pilihan (tahun, semester, mapel, kelas)', 'error');
      return;
    }

    // Sembunyikan link lama
    const linkBox = UI.$('absDownloadLink');
    if (linkBox) linkBox.style.display = 'none';

    UI.showLoading('Membuat file Excel di server… (5–15 detik)');

    try {
      const res = await api.exportAbsensiNilai({
        kelas,
        mapel,
        semester,
        tahun,
        namaGuru: this._guru?.nama || '',
      });

      if (res.status !== 'ok') {
        UI.showToast('Gagal: ' + (res.message || 'Error tidak diketahui'), 'error');
        return;
      }

      // Tampilkan link download manual (selalu tersedia)
      if (linkBox) {
        const btn = UI.$('absDownloadBtn');
        if (btn) btn.href = res.url;
        linkBox.style.display = 'block';
        linkBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Coba download otomatis via hidden <a>
      // Ini berhasil jika browser tidak blok cross-origin download
      setTimeout(() => {
        const a = document.createElement('a');
        a.href     = res.url;
        a.target   = '_blank';
        a.rel      = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
      }, 300);

      UI.showToast('File berhasil dibuat!', 'success');

    } catch (err) {
      console.error('[AbsensiModule] exportExcel error:', err);
      UI.showToast('Gagal: ' + err.message, 'error');
    } finally {
      UI.hideLoading();
    }
  }
}
