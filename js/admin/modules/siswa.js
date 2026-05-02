/**
 * admin/modules/siswa.js
 * SiswaModule — CRUD siswa: tambah satu/batch, edit, soft-delete dengan konfirmasi.
 */
class SiswaModule {
  constructor() {
    this.data        = [];
    this._deleteNis  = null; // NIS yang sedang dikonfirmasi hapus
    this._batchRows  = [];   // preview baris batch sebelum disimpan
  }

  // ── Load & Render ──────────────────────────────────────────────────────────
  async load() {
    try {
      const res = await api.getSiswaAll();
      if (res.status === 'ok') {
        this.data = res.siswa || [];
        this.render();
      }
    } catch {
      UI.showToast('Gagal memuat data siswa', 'error');
    }
    return this.data;
  }

  render(data = this.data) {
    // Hanya tampilkan siswa aktif di tabel
    const aktif = data.filter(s => (s.status || 'aktif') !== 'nonaktif');
    UI.$('siswaBody').innerHTML = aktif.length
      ? aktif.map(s => `
          <tr>
            <td class="name">${s.nis}</td>
            <td>${s.nama}</td>
            <td><span class="badge blue">${s.kelas}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="Admin.siswa.openEdit('${s.nis}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="Admin.siswa.confirmDelete('${s.nis}')">Hapus</button>
            </div></td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:40px">Belum ada data siswa</td></tr>';

    const klsSet = [...new Set(this.data.filter(s=>(s.status||'aktif')!=='nonaktif').map(s => s.kelas))].sort();
    UI.$('filterKelas').innerHTML =
      '<option value="">Semua Kelas</option>' +
      klsSet.map(k => `<option>${k}</option>`).join('');
  }

  filterByKelas() {
    const kelas = UI.$('filterKelas').value;
    this.render(kelas ? this.data.filter(s => s.kelas === kelas) : this.data);
  }

  // ── Tambah Satu ───────────────────────────────────────────────────────────
  openAdd() {
    this._clearForm();
    this._populateKelasDropdown();
    TahunAjar.populateInputPair('siswaTaAwal', 'siswaTaAkhirLabel');
    UI.$('modalSiswaTitle').textContent = 'Tambah Siswa Baru';
    // Tampilkan tab batch saat tambah
    UI.$('siswaTabNav').style.display = '';
    UI.$('tabBatch').style.display = '';
    const nisInput = UI.$('siswaNis');
    if (nisInput) nisInput.readOnly = false;
    this._switchTab('single');
    openModal('modalSiswa');
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  openEdit(nis) {
    const s = this.data.find(x => x.nis === nis);
    if (!s) return;
    UI.$('modalSiswaTitle').textContent = 'Edit Data Siswa';
    UI.$('siswaNis').value   = s.nis;
    UI.$('siswaNama').value  = s.nama;
    this._populateKelasDropdown(s.kelas);
    TahunAjar.populateInputPair('siswaTaAwal', 'siswaTaAkhirLabel', s.tahunAjar || '');
    // Sembunyikan tab batch saat edit
    UI.$('siswaTabNav').style.display = 'none';
    this._switchTab('single');
    const nisInput = UI.$('siswaNis');
    if (nisInput) nisInput.readOnly = true;
    openModal('modalSiswa');
  }

  async save() {
    const payload = this._readForm();
    const errMsg  = Validator.siswaForm(payload);
    if (errMsg) { UI.showToast(errMsg, 'error'); return; }

    const isEdit = UI.$('modalSiswaTitle').textContent.includes('Edit');
    UI.showLoading();
    try {
      const res = await (isEdit ? api.editSiswa(payload) : api.addSiswa(payload));
      if (res.status === 'ok') {
        UI.showToast(`✓ Siswa "${payload.nama}" berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success');
        closeModal('modalSiswa');
        this._clearForm();
        await this.load();
      } else {
        UI.showToast('Gagal: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Batch Add ─────────────────────────────────────────────────────────────
  downloadFormat() {
    const ta      = TahunAjar.defaultAktif();
    const header = `NIS,Nama Lengkap,Kelas,TA`;
    const contoh = [
      `12345,Ahmad Fauzi,X-1,${ta}`,
      `12346,Siti Nurhaliza,X-1,${ta}`,
      `12347,Budi Santoso,XI-2,${ta}`,
    ].join('\n');
    const csv  = header + '\n' + contoh;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'format_batch_siswa.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      this._parseCsv(text);
    };
    reader.readAsText(file);
  }

  _parseCsv(text) {
    const lines  = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      UI.showToast('File kosong atau tidak ada data selain header', 'error');
      return;
    }
    // Skip header baris pertama
    const rows = lines.slice(1).map((line, i) => {
      const cols = line.split(',').map(c => c.trim());
      return {
        no        : i + 1,
        nis       : cols[0] || '',
        nama      : cols[1] || '',
        kelas     : cols[2] || '',
        tahunAjar : cols[3] || '',
        valid     : !!(cols[0] && cols[1] && cols[2] && cols[3]),
      };
    });
    this._batchRows = rows;
    this._renderBatchPreview(rows);
  }

  _renderBatchPreview(rows) {
    const valid   = rows.filter(r => r.valid).length;
    const invalid = rows.length - valid;
    const preview = UI.$('batchPreview');
    if (!preview) return;

    preview.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:600;color:var(--success)">✓ ${valid} valid</span>
      ${invalid ? `<span style="font-size:12px;font-weight:600;color:var(--error)">✗ ${invalid} bermasalah (NIS/Nama/Kelas kosong)</span>` : ''}
    </div>
    <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead style="position:sticky;top:0;background:var(--surface2)">
          <tr>
            ${['#','NIS','Nama','Kelas','TA','Status'].map(h =>
              `<th style="padding:6px 8px;text-align:left;font-weight:700;color:var(--text3);border-bottom:1px solid var(--border)">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
          <tr style="border-bottom:1px solid var(--border);background:${r.valid?'':'var(--error-bg)'}">
            <td style="padding:5px 8px;color:var(--text3)">${r.no}</td>
            <td style="padding:5px 8px;font-weight:600;color:var(--text)">${r.nis||'—'}</td>
            <td style="padding:5px 8px;color:var(--text)">${r.nama||'—'}</td>
            <td style="padding:5px 8px"><span class="badge blue" style="font-size:10px">${r.kelas||'—'}</span></td>
            <td style="padding:5px 8px;color:var(--text2)">${r.tahunAjar||'—'}</td>
            <td style="padding:5px 8px;font-size:10px;font-weight:700;color:${r.valid?'var(--success)':'var(--error)'}">
              ${r.valid ? '✓ OK' : '✗ Lengkapi'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:10px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary" onclick="Admin.siswa.saveBatch()" ${valid===0?'disabled':''}>
        ✓ Import ${valid} Siswa
      </button>
    </div>`;
  }

  async saveBatch() {
    const validRows = this._batchRows.filter(r => r.valid);
    if (!validRows.length) { UI.showToast('Tidak ada data valid untuk diimport', 'error'); return; }

    UI.showLoading('Mengimport data siswa...');
    try {
      const res = await api.batchAddSiswa(validRows.map(r => ({
        nis: r.nis, nama: r.nama, kelas: r.kelas, tahunAjar: r.tahunAjar,
      })));
      if (res.status === 'ok') {
        let msg = `✓ ${res.berhasil} siswa berhasil diimport`;
        if (res.gagal > 0) msg += ` | ${res.gagal} gagal (NIS duplikat)`;
        UI.showToast(msg, res.gagal > 0 ? 'warning' : 'success');
        closeModal('modalSiswa');
        this._batchRows = [];
        await this.load();
      } else {
        UI.showToast('Gagal import: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Soft Delete dengan Konfirmasi ─────────────────────────────────────────
  async confirmDelete(nis) {
    const siswa = this.data.find(s => s.nis === nis);
    if (!siswa) return;

    this._deleteNis = nis;

    // Ambil jumlah nilai siswa dari server
    UI.showLoading('Memeriksa data nilai...');
    let jumlahNilai = 0;
    try {
      const res = await api.getNilaiCountSiswa(nis);
      if (res.status === 'ok') jumlahNilai = res.jumlahNilai;
    } catch {}
    UI.hideLoading();

    // Isi modal konfirmasi
    UI.$('deleteNamaSiswa').textContent  = siswa.nama;
    UI.$('deleteNisSiswa').textContent   = nis;
    UI.$('deleteKelasSiswa').textContent = siswa.kelas;

    const nilaiInfo = UI.$('deleteNilaiInfo');
    if (jumlahNilai > 0) {
      nilaiInfo.innerHTML = `
      <div style="background:var(--error-bg);border:1px solid var(--error);border-radius:var(--radius-sm);padding:10px 12px;margin:12px 0">
        <div style="font-size:12px;font-weight:700;color:var(--error);margin-bottom:6px">
          ⚠️ Siswa ini memiliki ${jumlahNilai} data nilai tersimpan
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="cbHapusNilai" style="width:14px;height:14px;cursor:pointer" />
          <span style="font-size:12px;color:var(--text)">Hapus juga semua data nilai siswa ini</span>
        </label>
        <div style="font-size:11px;color:var(--text3);margin-top:4px;margin-left:22px">
          Jika tidak dicentang, data nilai tetap tersimpan di sheet Nilai
        </div>
      </div>`;
    } else {
      nilaiInfo.innerHTML = `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;margin:12px 0">
        <div style="font-size:12px;color:var(--text2)">ℹ️ Siswa ini belum memiliki data nilai</div>
      </div>`;
    }

    openModal('modalDeleteSiswa');
  }

  async executeDelete() {
    const nis       = this._deleteNis;
    const hapusNilai = UI.$('cbHapusNilai') ? UI.$('cbHapusNilai').checked : false;
    if (!nis) return;

    UI.showLoading('Menonaktifkan siswa...');
    try {
      const res = await api.deleteSiswa(nis, hapusNilai);
      if (res.status === 'ok') {
        let msg = '✓ Siswa berhasil dinonaktifkan';
        if (hapusNilai && res.jumlahNilaiDihapus > 0)
          msg += ` — ${res.jumlahNilaiDihapus} data nilai dihapus`;
        UI.showToast(msg, 'info');
        closeModal('modalDeleteSiswa');
        this._deleteNis = null;
        await this.load();
      } else {
        UI.showToast('Gagal: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  _readForm() {
    const taAwal  = UI.$('siswaTaAwal')?.value || '';
    const taAkhir = taAwal ? String(parseInt(taAwal) + 1) : '';
    return {
      nis       : UI.$('siswaNis').value.trim(),
      nama      : UI.$('siswaNama').value.trim(),
      kelas     : UI.$('siswaKelas').value,
      tahunAjar : taAwal && taAkhir ? `${taAwal}/${taAkhir}` : '',
    };
  }

  // ── Kelas Dropdown ────────────────────────────────────────────────────────
  /**
   * Isi dropdown kelas dari data siswa aktif yang sudah ada.
   * Jika selected diberikan (mode edit), pastikan nilainya terpilih
   * dan tampilkan note jika tidak ada di data existing.
   */
  _populateKelasDropdown(selected = '') {
    const kelasSet = [...new Set(
      this.data.filter(s => (s.status || 'aktif') !== 'nonaktif').map(s => s.kelas)
    )].sort();

    const sel = UI.$('siswaKelas');
    sel.innerHTML = '<option value="">— Pilih Kelas —</option>' +
      kelasSet.map(k =>
        `<option value="${k}" ${k === selected ? 'selected' : ''}>${k}</option>`
      ).join('');

    // Jika selected ada tapi tidak ada di kelasSet, tambahkan sebagai opsi "(kelas baru)"
    if (selected && !kelasSet.includes(selected)) {
      const opt = document.createElement('option');
      opt.value    = selected;
      opt.text     = `${selected} ✦ (kelas baru)`;
      opt.selected = true;
      opt.dataset.baru = 'true';
      sel.appendChild(opt);
    }

    // Reset note & manual input
    UI.$('siswaKelasBaruNote').style.display = 'none';
    if (UI.$('siswaKelasManual')) UI.$('siswaKelasManual').value = '';

    // Tampilkan note jika pilihan saat ini adalah kelas baru
    sel.onchange = () => this._onKelasChange();
    this._onKelasChange();
  }

  /** Tampilkan/sembunyikan note kelas baru saat dropdown berubah */
  _onKelasChange() {
    const sel      = UI.$('siswaKelas');
    const note     = UI.$('siswaKelasBaruNote');
    const selected = sel.options[sel.selectedIndex];
    if (selected && selected.dataset.baru === 'true') {
      note.style.display = '';
    } else {
      note.style.display = 'none';
    }
  }

  /** Tambahkan kelas baru dari input manual ke dropdown */
  _addKelasManual() {
    const input = UI.$('siswaKelasManual');
    const val   = input.value.trim().toUpperCase();
    if (!val) { UI.showToast('Ketik nama kelas terlebih dahulu', 'error'); return; }

    const sel = UI.$('siswaKelas');

    // Cek apakah sudah ada di dropdown
    const sudahAda = [...sel.options].some(o => o.value === val);
    if (sudahAda) {
      sel.value = val;
      input.value = '';
      this._onKelasChange();
      return;
    }

    // Tambahkan sebagai opsi baru dengan marker
    const opt = document.createElement('option');
    opt.value        = val;
    opt.text         = `${val} ✦ (kelas baru)`;
    opt.selected     = true;
    opt.dataset.baru = 'true';
    sel.appendChild(opt);
    input.value = '';
    this._onKelasChange();
    UI.showToast(`Kelas "${val}" ditambahkan`, 'info');
  }

  _switchTab(tab) {
    const isSingle = tab === 'single';
    UI.$('panelSingle').style.display  = isSingle ? '' : 'none';
    UI.$('panelBatch').style.display   = isSingle ? 'none' : '';
    UI.$('footerSingle').style.display = isSingle ? '' : 'none';
    UI.$('footerBatch').style.display  = isSingle ? 'none' : '';
    const actColor = 'var(--primary)', actBorder = '2px solid var(--primary)';
    const offColor = 'var(--text2)',   offBorder = '2px solid transparent';
    UI.$('tabSingle').style.color        = isSingle ? actColor : offColor;
    UI.$('tabSingle').style.borderBottom = isSingle ? actBorder : offBorder;
    UI.$('tabBatch').style.color         = isSingle ? offColor : actColor;
    UI.$('tabBatch').style.borderBottom  = isSingle ? offBorder : actBorder;
  }

  _clearForm() {
    ['siswaNis', 'siswaNama'].forEach(id => {
      const el = UI.$(id);
      if (el) el.value = '';
    });
    // Reset dropdown kelas (isi ulang dari data, tanpa selection)
    this._populateKelasDropdown();
    TahunAjar.populateInputPair('siswaTaAwal', 'siswaTaAkhirLabel');
    // Reset NIS ke mode editable
    const nisInput = UI.$('siswaNis');
    if (nisInput) nisInput.readOnly = false;
    this._batchRows = [];
  }
}
