/**
 * admin/modules/guru.js
 * GuruModule — CRUD data guru + akun kurikulum.
 * Hanya urusan: load, render, tambah, edit, hapus guru/kurikulum.
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
      ? data.map(g => {
          const isKuri = g.role === 'kurikulum';

          // Baca mapel & kelas dari penugasan (kolom 7 JSON)
          const penugasan  = Array.isArray(g.penugasan) ? g.penugasan : [];
          const mapelList  = penugasan.map(p => p.mapel).filter(Boolean);
          const kelasList  = [...new Set(penugasan.flatMap(p => p.kelas || []).filter(Boolean))].sort();
          const mapelStr   = mapelList.length  ? mapelList.join(', ')  : '—';
          const kelasStr   = kelasList.length  ? kelasList.join(', ')  : '—';

          return `
            <tr>
              <td class="name">${g.nama}</td>
              <td><span class="badge gray">${g.username}</span></td>
              <td>${isKuri ? '—' : mapelStr}</td>
              <td>${isKuri ? '—' : kelasStr}</td>
              <td>
                <span class="badge ${isKuri ? 'amber' : 'blue'}" style="margin-right:4px">
                  ${isKuri ? 'Kurikulum' : 'Guru'}
                </span>
                <span class="badge ${g.status === 'Aktif' ? 'green' : 'gray'}">${g.status}</span>
              </td>
              <td><div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="Admin.guru.openEdit('${g.username}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.guru.confirmDelete('${g.username}')">Hapus</button>
              </div></td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:40px">Belum ada data</td></tr>';
  }

  openAdd() {
    this._clearForm();
    UI.$('modalGuruTitle').textContent = 'Tambah Akun Baru';
    this._updateFormByRole('guru');
    openModal('modalGuru');
  }

  openEdit(username) {
    const g = this.data.find(x => x.username === username);
    if (!g) return;
    UI.$('modalGuruTitle').textContent = 'Edit Data Akun';
    UI.$('guruNama').value      = g.nama;
    UI.$('guruUsername').value  = g.username;
    UI.$('guruNip').value       = g.nip   || '';
    UI.$('guruStatus').value    = g.status || 'Aktif';
    UI.$('guruStatusAlt').value = g.status || 'Aktif';
    UI.$('guruRole').value      = g.role   || 'guru';
    this._updateFormByRole(g.role || 'guru');
    openModal('modalGuru');
  }

  async save() {
    const payload = this._readForm();
    const errMsg  = Validator.guruForm(payload);
    if (errMsg) { UI.showToast(errMsg, 'error'); return; }

    const isEdit = UI.$('modalGuruTitle').textContent.includes('Edit');

    // Hash password sebelum dikirim ke Apps Script
    // Jika edit dan password kosong, biarkan kosong (backend akan pertahankan password lama)
    if (payload.password && payload.password.trim() !== '') {
      payload.password = await Security.hashPasswordAsync(payload.password);
    }

    UI.showLoading();
    try {
      const res = await (isEdit ? api.editGuru(payload) : api.addGuru(payload));
      if (res.status === 'ok') {
        const label = payload.role === 'kurikulum' ? 'Akun kurikulum' : 'Guru';
        UI.showToast(`✓ ${label} "${payload.nama}" berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success');
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
    if (!confirm(`Hapus akun "${username}"? Data tidak bisa dikembalikan.`)) return;
    UI.showLoading();
    try {
      const res = await api.deleteGuru(username);
      if (res.status === 'ok') {
        UI.showToast('Akun berhasil dihapus', 'info');
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
    const role    = UI.$('guruRole').value;
    const isGuru  = role === 'guru';
    const status  = isGuru
      ? UI.$('guruStatus').value
      : (UI.$('guruStatusAlt')?.value || 'Aktif');
    return {
      nama:     UI.$('guruNama').value.trim(),
      username: UI.$('guruUsername').value.trim(),
      password: UI.$('guruPassword').value,
      nip:      isGuru ? UI.$('guruNip').value.trim() : '',
      mapel:    '',
      kelas:    '',
      status,
      role,
    };
  }

  _clearForm() {
    ['guruNama', 'guruUsername', 'guruPassword', 'guruNip']
      .forEach(id => { if (UI.$(id)) UI.$(id).value = ''; });
    UI.$('guruStatus').value    = 'Aktif';
    UI.$('guruStatusAlt').value = 'Aktif';
    UI.$('guruRole').value      = 'guru';
    this._updateFormByRole('guru');
  }

  _updateFormByRole(role) {
    const isGuru  = role === 'guru';
    UI.$('guruFieldsGuru').style.display   = isGuru ? '' : 'none';
    UI.$('guruFieldsStatus').style.display = isGuru ? 'none' : '';
    UI.$('guruSaveBtn').textContent = isGuru ? 'Simpan Guru' : 'Simpan Akun';
  }
}
