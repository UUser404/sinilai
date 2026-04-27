/**
 * admin/modules/guru.js
 * GuruModule — CRUD data guru.
 * Hanya urusan: load, render, tambah, edit, hapus guru.
 */
class GuruModule {
  constructor() {
    this.data = [];
  }

  async load() {
    try {
      const res = await api.getGuru();
      if (res.status === 'ok') {
        this.data = res.guru || [];
        this.render();
      }
    } catch {
      UI.showToast('Gagal memuat data guru', 'error');
    }
    return this.data;
  }

  render(data = this.data) {
    UI.$('guruBody').innerHTML = data.length
      ? data.map(g => `
          <tr>
            <td class="name">${g.nama}</td>
            <td><span class="badge gray">${g.username}</span></td>
            <td>${g.mapel}</td>
            <td>${g.kelas}</td>
            <td><span class="badge ${g.status === 'Aktif' ? 'green' : 'gray'}">${g.status}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="Admin.guru.openEdit('${g.username}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="Admin.guru.confirmDelete('${g.username}')">Hapus</button>
            </div></td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:40px">Belum ada data guru</td></tr>';
  }

  openAdd() {
    this._clearForm();
    UI.$('modalGuruTitle').textContent = 'Tambah Guru Baru';
    openModal('modalGuru');
  }

  openEdit(username) {
    const g = this.data.find(x => x.username === username);
    if (!g) return;
    UI.$('modalGuruTitle').textContent = 'Edit Data Guru';
    UI.$('guruNama').value     = g.nama;
    UI.$('guruUsername').value = g.username;
    UI.$('guruNip').value      = g.nip || '';
    UI.$('guruMapel').value    = g.mapel;
    UI.$('guruKelas').value    = g.kelas;
    UI.$('guruStatus').value   = g.status || 'Aktif';
    UI.$('guruRole').value     = g.role   || 'guru';
    openModal('modalGuru');
  }

  async save() {
    const payload = this._readForm();
    const errMsg  = Validator.guruForm(payload);
    if (errMsg) { UI.showToast(errMsg, 'error'); return; }

    const isEdit = UI.$('modalGuruTitle').textContent.includes('Edit');
    UI.showLoading();
    try {
      const res = await (isEdit ? api.editGuru(payload) : api.addGuru(payload));
      if (res.status === 'ok') {
        UI.showToast(`✓ Guru "${payload.nama}" berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success');
        closeModal('modalGuru');
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

  async confirmDelete(username) {
    if (!confirm(`Hapus guru "${username}"? Data tidak bisa dikembalikan.`)) return;
    UI.showLoading();
    try {
      const res = await api.deleteGuru(username);
      if (res.status === 'ok') {
        UI.showToast('Guru berhasil dihapus', 'info');
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
      nama:     UI.$('guruNama').value.trim(),
      username: UI.$('guruUsername').value.trim(),
      password: UI.$('guruPassword').value,
      nip:      UI.$('guruNip').value.trim(),
      mapel:    UI.$('guruMapel').value.trim(),
      kelas:    UI.$('guruKelas').value.trim(),
      status:   UI.$('guruStatus').value,
      role:     UI.$('guruRole').value,
    };
  }

  _clearForm() {
    ['guruNama', 'guruUsername', 'guruPassword', 'guruNip', 'guruMapel', 'guruKelas']
      .forEach(id => UI.$(id).value = '');
    UI.$('guruStatus').value = 'Aktif';
    UI.$('guruRole').value   = 'guru';
  }
}
