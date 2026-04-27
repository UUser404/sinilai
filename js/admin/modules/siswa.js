/**
 * admin/modules/siswa.js
 * SiswaModule — CRUD data siswa.
 */
class SiswaModule {
  constructor() {
    this.data = [];
  }

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
    UI.$('siswaBody').innerHTML = data.length
      ? data.map(s => `
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

    // Populate filter kelas
    const klsSet = [...new Set(this.data.map(s => s.kelas))].sort();
    UI.$('filterKelas').innerHTML =
      '<option value="">Semua Kelas</option>' +
      klsSet.map(k => `<option>${k}</option>`).join('');
  }

  filterByKelas() {
    const kelas = UI.$('filterKelas').value;
    this.render(kelas ? this.data.filter(s => s.kelas === kelas) : this.data);
  }

  openAdd() {
    this._clearForm();
    UI.$('modalSiswaTitle').textContent = 'Tambah Siswa Baru';
    openModal('modalSiswa');
  }

  openEdit(nis) {
    const s = this.data.find(x => x.nis === nis);
    if (!s) return;
    UI.$('modalSiswaTitle').textContent = 'Edit Data Siswa';
    UI.$('siswaNis').value   = s.nis;
    UI.$('siswaNama').value  = s.nama;
    UI.$('siswaKelas').value = s.kelas;
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

  async confirmDelete(nis) {
    if (!confirm(`Hapus siswa NIS "${nis}"? Data tidak bisa dikembalikan.`)) return;
    UI.showLoading();
    try {
      const res = await api.deleteSiswa(nis);
      if (res.status === 'ok') {
        UI.showToast('Siswa berhasil dihapus', 'info');
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

  // ── Private ───────────────────────────────────────────────

  _readForm() {
    return {
      nis:         UI.$('siswaNis').value.trim(),
      nama:        UI.$('siswaNama').value.trim(),
      kelas:       UI.$('siswaKelas').value,
      keterangan:  UI.$('siswaKet').value.trim(),
    };
  }

  _clearForm() {
    ['siswaNis', 'siswaNama', 'siswaKet'].forEach(id => UI.$(id).value = '');
    UI.$('siswaKelas').value = '';
  }
}
